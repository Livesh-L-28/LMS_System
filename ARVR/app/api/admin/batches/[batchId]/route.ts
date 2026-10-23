import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { isValidObjectId } from '@/lib/validation';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

    return NextResponse.json({
      success: true,
      batch: {
        ...batch,
        studentCount: batch._count.students,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch batch details' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    await requireAuth(['ADMIN']);

    if (!isValidObjectId(batchId)) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      batchNo,
      level,
      status,
      curriculumStatus,
      fnStartTime,
      fnCutoffTime,
      anStartTime,
      anCutoffTime,
    } = body;

    const existing = await prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const updateData: any = {};

    // Validate and assign attendance timings if provided
    if (fnStartTime !== undefined) {
      if (fnStartTime !== null && fnStartTime !== '' && !TIME_REGEX.test(fnStartTime)) {
        return NextResponse.json({ error: 'Invalid Forenoon Start time format (HH:mm)' }, { status: 400 });
      }
      updateData.fnStartTime = fnStartTime || null;
    }

    if (fnCutoffTime !== undefined) {
      if (fnCutoffTime !== null && fnCutoffTime !== '' && !TIME_REGEX.test(fnCutoffTime)) {
        return NextResponse.json({ error: 'Invalid Forenoon Cutoff time format (HH:mm)' }, { status: 400 });
      }
      updateData.fnCutoffTime = fnCutoffTime || null;
    }

    if (anStartTime !== undefined) {
      if (anStartTime !== null && anStartTime !== '' && !TIME_REGEX.test(anStartTime)) {
        return NextResponse.json({ error: 'Invalid Afternoon Start time format (HH:mm)' }, { status: 400 });
      }
      updateData.anStartTime = anStartTime || null;
    }

    if (anCutoffTime !== undefined) {
      if (anCutoffTime !== null && anCutoffTime !== '' && !TIME_REGEX.test(anCutoffTime)) {
        return NextResponse.json({ error: 'Invalid Afternoon Cutoff time format (HH:mm)' }, { status: 400 });
      }
      updateData.anCutoffTime = anCutoffTime || null;
    }

    // Comprehensive timing order validation
    const effectiveFnStart = updateData.fnStartTime !== undefined ? updateData.fnStartTime : existing.fnStartTime;
    const effectiveFnCutoff = updateData.fnCutoffTime !== undefined ? updateData.fnCutoffTime : existing.fnCutoffTime;
    const effectiveAnStart = updateData.anStartTime !== undefined ? updateData.anStartTime : existing.anStartTime;
    const effectiveAnCutoff = updateData.anCutoffTime !== undefined ? updateData.anCutoffTime : existing.anCutoffTime;

    if (effectiveFnStart && effectiveFnCutoff && effectiveFnStart >= effectiveFnCutoff) {
      return NextResponse.json({
        error: `Morning (FN) Start Time (${effectiveFnStart}) must be earlier than Cutoff Time (${effectiveFnCutoff}).`
      }, { status: 400 });
    }

    if (effectiveAnStart && effectiveAnCutoff && effectiveAnStart >= effectiveAnCutoff) {
      return NextResponse.json({
        error: `Afternoon (AN) Start Time (${effectiveAnStart}) must be earlier than Cutoff Time (${effectiveAnCutoff}).`
      }, { status: 400 });
    }

    if (effectiveFnCutoff && effectiveAnStart && effectiveFnCutoff > effectiveAnStart) {
      return NextResponse.json({
        error: `Morning (FN) Cutoff Time (${effectiveFnCutoff}) must be earlier than Afternoon (AN) Start Time (${effectiveAnStart}).`
      }, { status: 400 });
    }

    // Optional metadata updates
    if (name && name !== existing.name) {
      const nameConflict = await prisma.batch.findUnique({ where: { name } });
      if (nameConflict) {
        return NextResponse.json({ error: `Batch name "${name}" already in use.` }, { status: 409 });
      }
      updateData.name = name;
    }

    if (batchNo !== undefined && batchNo !== existing.batchNo) {
      if (batchNo) {
        const noConflict = await prisma.batch.findFirst({ where: { batchNo } });
        if (noConflict) {
          return NextResponse.json({ error: `Batch No "${batchNo}" already in use.` }, { status: 409 });
        }
      }
      updateData.batchNo = batchNo || null;
    }

    if (level !== undefined) updateData.level = level;
    if (status !== undefined) updateData.status = status;
    if (curriculumStatus !== undefined) updateData.curriculumStatus = curriculumStatus;

    const updatedBatch = await prisma.batch.update({
      where: { id: batchId },
      data: updateData,
      include: {
        trainingCalendar: {
          orderBy: { dayNumber: 'asc' },
        },
        _count: {
          select: { students: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Batch '${updatedBatch.name}' attendance & settings updated successfully!`,
      batch: {
        ...updatedBatch,
        studentCount: updatedBatch._count.students,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update batch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update batch' }, { status: 500 });
  }
}
