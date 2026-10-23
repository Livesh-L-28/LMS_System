import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { calculateBatchMaxSessions } from '@/lib/batchUtils';
import { isValidObjectId } from '@/lib/validation';
import { logAdminAudit } from '@/lib/auditLog';
import { getClientIp } from '@/lib/security';

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
        trainingCalendar: {
          orderBy: { dayNumber: 'asc' },
        },
        _count: {
          select: { students: true },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const maxSessions = calculateBatchMaxSessions(batch.trainingCalendar, batch.trainingDays);

    return NextResponse.json({
      success: true,
      batch: {
        id: batch.id,
        name: batch.name,
        batchNo: batch.batchNo,
        level: batch.level,
        startDate: batch.startDate,
        endDate: batch.endDate,
        trainingDays: batch.trainingDays,
        status: batch.status,
        studentCount: batch._count.students,
        fnStartTime: batch.fnStartTime,
        fnCutoffTime: batch.fnCutoffTime,
        anStartTime: batch.anStartTime,
        anCutoffTime: batch.anCutoffTime,
        maxSessions,
        trainingCalendar: batch.trainingCalendar,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch batch schedule' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    const adminUser = await requireAuth(['ADMIN']);
    const ip = getClientIp(request);

    if (!isValidObjectId(batchId)) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const body = await request.json();

    const { days } = body;
    if (!days || !Array.isArray(days)) {
      return NextResponse.json({ error: 'Array of days configuration is required' }, { status: 400 });
    }

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { trainingCalendar: true },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Atomically update each day's session flags
    await prisma.$transaction(
      days.map((d: any) =>
        prisma.trainingDay.updateMany({
          where: {
            batchId,
            dayNumber: Number(d.dayNumber),
          },
          data: {
            hasForenoon: d.hasForenoon !== false,
            hasAfternoon: d.hasAfternoon !== false,
          },
        })
      )
    );

    const updatedCalendar = await prisma.trainingDay.findMany({
      where: { batchId },
      orderBy: { dayNumber: 'asc' },
    });

    const maxSessions = calculateBatchMaxSessions(updatedCalendar, batch.trainingDays);

    await logAdminAudit({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      ipAddress: ip,
      action: 'BATCH_SCHEDULE_UPDATE',
      targetType: 'BATCH',
      targetId: batch.id,
      targetIdentifier: batch.batchNo || batch.name,
      details: {
        batchName: batch.name,
        daysUpdated: days.length,
        newMaxSessions: maxSessions,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Batch attendance schedule updated! Total scheduled sessions: ${maxSessions}`,
      maxSessions,
      trainingCalendar: updatedCalendar,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update batch schedule error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update batch schedule' }, { status: 500 });
  }
}
