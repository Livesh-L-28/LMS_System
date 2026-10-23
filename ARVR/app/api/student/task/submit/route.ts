import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getTodayDateString, isAttendanceMatchingDate, DEFAULT_TIMEZONE } from '@/lib/time';
import {
  getBucketName,
  getS3Client,
  verifyS3Object,
  deleteS3Object,
  sanitizeFilename,
  directUploadToS3,
  validateFileMetadata,
  validateMagicBytes,
} from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getDriveClientForAdmin, uploadTaskSubmissionToDrive } from '@/lib/googleDrive';
import { scanFileBuffer } from '@/lib/antivirus';
import { logSecurityEvent, getClientIp } from '@/lib/security';
import crypto from 'crypto';
import path from 'path';

export async function POST(request: Request) {
  let uploadedS3Key: string | null = null;
  const ip = getClientIp(request);
  try {
    const user = await requireAuth(['STUDENT']);

    let trainingDayId = '';
    let description = '';
    let s3Key = '';
    let originalFilename = '';
    let fileSize = 0;
    let mimeType = '';
    let directFile: File | null = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      trainingDayId = (formData.get('trainingDayId') as string) || '';
      description = (formData.get('description') as string) || '';
      s3Key = (formData.get('s3Key') as string) || '';
      originalFilename = (formData.get('originalFilename') as string) || '';
      fileSize = parseInt((formData.get('fileSize') as string) || '0', 10);
      mimeType = (formData.get('mimeType') as string) || '';
      directFile = formData.get('file') as File | null;
    } else {
      const body = await request.json();
      trainingDayId = body.trainingDayId || '';
      description = body.description || '';
      s3Key = body.s3Key || '';
      originalFilename = body.originalFilename || '';
      fileSize = Number(body.fileSize) || 0;
      mimeType = body.mimeType || '';
    }

    if (!trainingDayId) {
      return NextResponse.json({ error: 'Training day ID is required' }, { status: 400 });
    }

    // 1. Fetch authenticated student & batch
    const student = await prisma.student.findUnique({
      where: { id: user.id },
      include: { batch: true },
    });

    if (!student || !student.batch) {
      return NextResponse.json({ error: 'Student or batch record not found' }, { status: 404 });
    }

    // 2. Fetch TrainingDay details
    const trainingDay = await prisma.trainingDay.findUnique({
      where: { id: trainingDayId },
    });

    if (!trainingDay || trainingDay.batchId !== student.batchId) {
      return NextResponse.json({ error: 'Invalid training day or unauthorized batch' }, { status: 400 });
    }

    // Check if already has existing submission (allow update)
    const existingSubmission = await prisma.taskSubmission.findUnique({
      where: {
        studentId_trainingDayId: {
          studentId: student.id,
          trainingDayId: trainingDay.id,
        },
      },
    });

    // 3. Server-side Attendance Gate: Require attendance for today, or for the training day, or existing submission
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
    const timezone = settingsMap.get('PROGRAM_TIMEZONE') || DEFAULT_TIMEZONE;
    const todayStr = getTodayDateString(new Date(), timezone);
    const dayDateStr = getTodayDateString(new Date(trainingDay.date), timezone);

    const attendances = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { markedAt: 'desc' },
    });

    const hasTodayAtt = attendances.some((a) => isAttendanceMatchingDate(a, todayStr, timezone));
    const hasDayAtt = attendances.some((a) => isAttendanceMatchingDate(a, dayDateStr, timezone));

    if (!hasTodayAtt && !hasDayAtt && !existingSubmission) {
      return NextResponse.json(
        {
          error: 'Task submission is locked. You must mark attendance for today before submitting your task solution.',
        },
        { status: 403 }
      );
    }

    let verifiedSize = fileSize;
    let verifiedMime = mimeType;
    let finalS3Key = s3Key;
    let finalFilename = originalFilename;

    // 4. Handle S3 Direct Upload Verification (Primary Modern Path)
    if (s3Key) {
      uploadedS3Key = s3Key;
      const verification = await verifyS3Object({
        s3Key,
        expectedMime: mimeType,
        expectedSize: fileSize,
      });

      if (!verification.verified) {
        // Orphan cleanup on failed verification
        await deleteS3Object(s3Key);
        return NextResponse.json(
          { error: `File verification failed: ${verification.error || 'Invalid upload'}` },
          { status: 400 }
        );
      }

      verifiedSize = verification.actualSize;
      verifiedMime = verification.actualMime;
      finalS3Key = s3Key;
      finalFilename = sanitizeFilename(originalFilename || path.basename(s3Key));
    }
    // 5. Handle Direct Multipart File Upload (Backward-Compatibility Fallback)
    else if (directFile && directFile.size > 0) {
      const validation = validateFileMetadata(directFile.name, directFile.type, directFile.size);
      if (!validation.valid || !validation.cleanExt) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const bytes = await directFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Magic byte check
      if (!validateMagicBytes(buffer, validation.normalizedMime!)) {
        return NextResponse.json(
          { error: `File header magic bytes do not match declared format "${validation.cleanExt}".` },
          { status: 400 }
        );
      }

      const cleanRegNo = student.registerNo.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const randomSuffix = crypto.randomBytes(6).toString('hex');
      const key = `submissions/${encodeURIComponent(student.batch.id)}/${encodeURIComponent(trainingDay.id)}/${encodeURIComponent(student.id)}_${Date.now()}_${randomSuffix}.${validation.cleanExt}`;

      await directUploadToS3({
        buffer,
        s3Key: key,
        mimeType: validation.normalizedMime!,
        originalFilename: directFile.name,
        studentId: student.id,
      });

      uploadedS3Key = key;
      finalS3Key = key;
      verifiedSize = directFile.size;
      verifiedMime = validation.normalizedMime!;
      finalFilename = sanitizeFilename(directFile.name);
    } else if (!description.trim()) {
      return NextResponse.json({ error: 'Please select a task file to submit.' }, { status: 400 });
    }

    // 6. Extract fileBuffer and validate payload
    let fileBuffer: Buffer | null = null;

    if (directFile && directFile.size > 0) {
      const validation = validateFileMetadata(directFile.name, directFile.type, directFile.size);
      if (!validation.valid || !validation.cleanExt) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const bytes = await directFile.arrayBuffer();
      fileBuffer = Buffer.from(bytes);

      if (!validateMagicBytes(fileBuffer, validation.normalizedMime!)) {
        return NextResponse.json(
          { error: `File header magic bytes do not match declared format "${validation.cleanExt}".` },
          { status: 400 }
        );
      }

      verifiedSize = directFile.size;
      verifiedMime = validation.normalizedMime!;
      finalFilename = sanitizeFilename(directFile.name);
    } else if (s3Key) {
      // If client pre-uploaded to S3, fetch buffer for Google Drive primary sync
      try {
        const s3 = getS3Client();
        const s3Obj = await s3.send(new GetObjectCommand({ Bucket: getBucketName(), Key: s3Key }));
        if (s3Obj.Body) {
          const chunks: Buffer[] = [];
          for await (const chunk of s3Obj.Body as any) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          fileBuffer = Buffer.concat(chunks);
        }
      } catch (s3FetchErr) {
        console.warn('Could not read file from temporary S3 staging:', s3FetchErr);
      }
    } else if (!description.trim()) {
      return NextResponse.json({ error: 'Please select a task file to submit.' }, { status: 400 });
    }

    // 6.5. Automated Malware & Antivirus Scanning Inspection
    if (fileBuffer && fileBuffer.length > 0) {
      const scanResult = await scanFileBuffer(fileBuffer, finalFilename || 'upload', verifiedMime || '');
      if (!scanResult.isClean) {
        // Immediately purge staged S3 object if present
        if (uploadedS3Key) {
          try {
            await deleteS3Object(uploadedS3Key);
          } catch {}
        }

        logSecurityEvent({
          type: 'MALWARE_DETECTED',
          ip,
          actorId: student.id,
          targetIdentifier: student.registerNo,
          actorRole: 'STUDENT',
          details: {
            threatName: scanResult.threatName,
            filename: finalFilename,
            sha256: scanResult.sha256,
            scanEngine: scanResult.scanEngine,
          },
        });

        return NextResponse.json(
          {
            error: `Security scan alert: File upload rejected because suspicious content or malware signature was detected (${scanResult.threatName || 'Malicious Payload'}).`,
            threat: scanResult.threatName,
          },
          { status: 400 }
        );
      }
    }

    // 7. PRIMARY STORAGE UPLOAD: Google Drive
    let googleDriveFileId: string | undefined = undefined;
    let googleDriveFolderId: string | undefined = undefined;
    let primaryStoredFilename: string | undefined = undefined;

    if (fileBuffer && fileBuffer.length > 0) {
      try {
        const { drive } = await getDriveClientForAdmin();
        if (drive) {
          const batchName = student.batch.batchNo || student.batch.name;
          const driveResult = await uploadTaskSubmissionToDrive({
            fileBuffer,
            originalFilename: finalFilename || 'submission',
            mimeType: verifiedMime || 'application/octet-stream',
            batchId: student.batch.id,
            batchName,
            dayNumber: trainingDay.dayNumber,
            registerNo: student.registerNo,
          });

          googleDriveFileId = driveResult.googleDriveFileId;
          googleDriveFolderId = driveResult.googleDriveFolderId;
          primaryStoredFilename = driveResult.storedFilename;
        }
      } catch (driveErr: any) {
        console.warn('[Primary Storage Notice] Google Drive upload notice:', driveErr.message);
      }
    }

    // 8. SECONDARY STORAGE BACKUP: AWS S3 (optional fallback/secondary mirror)
    if (fileBuffer && !finalS3Key) {
      try {
        const cleanRegNo = student.registerNo.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        const randomSuffix = crypto.randomBytes(6).toString('hex');
        const ext = path.extname(finalFilename) || '.png';
        const key = `submissions/${encodeURIComponent(student.batch.id)}/${encodeURIComponent(trainingDay.id)}/${encodeURIComponent(student.id)}_${Date.now()}_${randomSuffix}${ext}`;

        await directUploadToS3({
          buffer: fileBuffer,
          s3Key: key,
          mimeType: verifiedMime || 'application/octet-stream',
          originalFilename: finalFilename,
          studentId: student.id,
        });

        uploadedS3Key = key;
        finalS3Key = key;
      } catch (s3BackupErr: any) {
        console.warn('[Secondary Storage Notice] S3 backup notice:', s3BackupErr.message);
      }
    }

    // Clean up previous S3 object if updated
    if (existingSubmission?.s3Key && finalS3Key && existingSubmission.s3Key !== finalS3Key) {
      await deleteS3Object(existingSubmission.s3Key);
    }

    const storedFilename =
      primaryStoredFilename ||
      (finalS3Key ? `${student.registerNo}_Day${trainingDay.dayNumber}${path.extname(finalS3Key)}` : undefined);

    const storageProvider = googleDriveFileId ? 'GOOGLE_DRIVE' : (finalS3Key ? 'S3' : 'LOCAL');

    // 9. Persist TaskSubmission in MongoDB
    const submission = await prisma.taskSubmission.upsert({
      where: {
        studentId_trainingDayId: {
          studentId: student.id,
          trainingDayId: trainingDay.id,
        },
      },
      update: {
        ...(finalS3Key ? { s3Key: finalS3Key } : {}),
        s3Bucket: finalS3Key ? getBucketName() : undefined,
        s3Region: finalS3Key ? (process.env.AWS_REGION || 'us-east-1') : undefined,
        storageProvider,
        googleDriveFileId: googleDriveFileId || undefined,
        googleDriveFolderId: googleDriveFolderId || undefined,
        ...(finalFilename ? { originalFilename: finalFilename } : {}),
        ...(storedFilename ? { storedFilename } : {}),
        ...(verifiedSize ? { fileSize: verifiedSize } : {}),
        ...(verifiedMime ? { fileType: verifiedMime } : {}),
        description: description || undefined,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      create: {
        studentId: student.id,
        trainingDayId: trainingDay.id,
        screenshotUrl: '',
        s3Key: finalS3Key || undefined,
        s3Bucket: finalS3Key ? getBucketName() : undefined,
        s3Region: finalS3Key ? (process.env.AWS_REGION || 'us-east-1') : undefined,
        storageProvider,
        googleDriveFileId: googleDriveFileId || undefined,
        googleDriveFolderId: googleDriveFolderId || undefined,
        originalFilename: finalFilename || undefined,
        storedFilename: storedFilename || undefined,
        fileSize: verifiedSize || undefined,
        fileType: verifiedMime || undefined,
        description: description || '',
        status: 'SUBMITTED',
      },
    });

    const secureUrl = `/api/submissions/${submission.id}/file`;
    const updated = await prisma.taskSubmission.update({
      where: { id: submission.id },
      data: { screenshotUrl: secureUrl },
    });

    return NextResponse.json({
      success: true,
      message: googleDriveFileId
        ? 'Task solution submitted successfully to Google Drive (Primary Storage)!'
        : 'Task solution submitted successfully to cloud storage.',
      submission: updated,
      storage: storageProvider,
    });
  } catch (error: any) {
    // If database upsert or processing failed, clean up the newly uploaded S3 file
    if (uploadedS3Key) {
      await deleteS3Object(uploadedS3Key);
    }

    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Task submission error:', error);
    return NextResponse.json(
      { error: error.message || 'Submission upload failed. Please try again.' },
      { status: 500 }
    );
  }
}
