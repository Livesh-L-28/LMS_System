import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generatePresignedDownloadUrl } from '@/lib/s3';
import { getDriveFileStream } from '@/lib/googleDrive';
import { getClientIp, logSecurityEvent, formatSafeError } from '@/lib/security';
import { isValidObjectId } from '@/lib/validation';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    const { id } = await params;
    const user = await requireAuth(['STUDENT', 'ADMIN']);

    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submission = await prisma.taskSubmission.findUnique({
      where: { id },
      include: {
        student: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // RBAC Authorization Check:
    // Students can ONLY view/download their OWN submissions!
    // Admins and Instructors can view all submissions.
    if (user.role === 'STUDENT' && submission.studentId !== user.id) {
      logSecurityEvent({
        type: 'FILE_DOWNLOAD_BLOCKED',
        ip,
        userAgent,
        actorId: user.id,
        actorRole: user.role,
        targetIdentifier: id,
        details: { reason: 'IDOR_ATTEMPT_UNAUTHORIZED_STUDENT', ownerStudentId: submission.studentId },
      });

      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to access this submission.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get('download') === 'true';

    logSecurityEvent({
      type: 'FILE_DOWNLOAD_ACCESS',
      ip,
      userAgent,
      actorId: user.id,
      actorRole: user.role,
      targetIdentifier: id,
      details: {
        isDownload,
        storageProvider: submission.storageProvider,
        googleDriveFileId: submission.googleDriveFileId,
        s3Key: submission.s3Key,
      },
    });

    // 1. PRIMARY: If stored in Google Drive, stream directly from Google Drive
    if (submission.googleDriveFileId) {
      try {
        const driveFile = await getDriveFileStream(submission.googleDriveFileId);
        if (driveFile) {
          const filename =
            submission.originalFilename || submission.storedFilename || driveFile.filename || 'submission_file';
          const disposition = isDownload ? 'attachment' : 'inline';

          // Convert Node Readable to Web ReadableStream
          const webStream = new ReadableStream({
            start(controller) {
              driveFile.stream.on('data', (chunk) => controller.enqueue(chunk));
              driveFile.stream.on('end', () => controller.close());
              driveFile.stream.on('error', (err) => controller.error(err));
            },
          });

          const headers = new Headers();
          headers.set('Content-Type', driveFile.mimeType || 'application/octet-stream');
          headers.set('Content-Disposition', `${disposition}; filename="${encodeURIComponent(filename)}"`);
          if (driveFile.size) {
            headers.set('Content-Length', driveFile.size.toString());
          }
          headers.set('Cache-Control', 'private, max-age=3600');

          return new Response(webStream, { status: 200, headers });
        }
      } catch (driveErr) {
        console.warn('[File Delivery] Failed to stream from Google Drive, falling back to secondary storage:', driveErr);
      }
    }

    // 2. SECONDARY / FALLBACK: If stored in S3, generate secure temporary presigned download URL
    if (submission.s3Key) {
      const presignedUrl = await generatePresignedDownloadUrl({
        s3Key: submission.s3Key,
        filename: submission.originalFilename || submission.storedFilename || 'submission_file',
        isDownload,
        expiresInSeconds: 900,
      });

      return NextResponse.redirect(presignedUrl, 307);
    }

    // 2. Legacy fallback for pre-migration submissions (e.g. Google Drive or existing local paths)
    if (submission.screenshotUrl) {
      if (submission.screenshotUrl.startsWith('http://') || submission.screenshotUrl.startsWith('https://')) {
        return NextResponse.redirect(submission.screenshotUrl, 307);
      }
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      return NextResponse.redirect(`${protocol}://${host}${submission.screenshotUrl}`, 307);
    }

    return NextResponse.json({ error: 'No file associated with this submission' }, { status: 404 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(formatSafeError(error, 'Submission File Download'), { status: 500 });
  }
}
