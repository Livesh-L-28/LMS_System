import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generateCertificateExcel, CertificateExportRow } from '@/lib/excelExport';
import { format } from 'date-fns';
import { isValidObjectId } from '@/lib/validation';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    await requireAuth(['ADMIN']);

    if (!isValidObjectId(batchId)) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        students: {
          include: {
            certificate: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Filter students with valid certificates (must be 100% or manually approved)
    const certifiedStudents = batch.students.filter((s) => s.certificate !== null && s.certificate.isValid !== false);

    if (certifiedStudents.length === 0) {
      return NextResponse.json(
        { error: 'No certificate records found for this batch. Run completion check first.' },
        { status: 400 }
      );
    }

    const startDateStr = format(new Date(batch.startDate), 'dd/MM/yyyy');
    const endDateStr = format(new Date(batch.endDate), 'dd/MM/yyyy');

    const exportRows: CertificateExportRow[] = certifiedStudents.map((student) => ({
      studentName: student.name,
      registerNo: student.registerNo,
      startDate: startDateStr,
      endDate: endDateStr,
      grade: student.certificate!.finalGrade,
      level: student.certificate!.finalLevel,
      certificateNo: student.certificate!.certificateNo,
    }));

    const excelBuffer = await generateCertificateExcel(batch.name, exportRows);

    // Update exportedAt timestamp on exported CertificateRecords
    const certIds = certifiedStudents.map((s) => s.certificate!.id);
    await prisma.certificateRecord.updateMany({
      where: { id: { in: certIds } },
      data: { exportedAt: new Date() },
    });

    const fileName = `Certificate_Data_${batch.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;

    return new Response(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Certificate export error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate Excel export' }, { status: 500 });
  }
}
