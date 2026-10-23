import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { isValidObjectId } from '@/lib/validation';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    const user = await requireAuth(['ADMIN']);

    if (!isValidObjectId(batchId)) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const dayNumber = searchParams.get('day');

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        trainingCalendar: {
          orderBy: { dayNumber: 'asc' },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    let dayFilter: any = {};
    if (dayNumber) {
      const selectedDay = batch.trainingCalendar.find((d) => d.dayNumber === parseInt(dayNumber, 10));
      if (selectedDay) {
        dayFilter = { trainingDayId: selectedDay.id };
      }
    }

    const students = await prisma.student.findMany({
      where: { batchId },
      select: {
        id: true,
        name: true,
        registerNo: true,
        department: true,
        section: true,
        attendances: true,
        tasks: {
          where: dayFilter,
          include: {
            evaluation: true,
            trainingDay: true,
          },
        },
        evaluations: true,
        certificate: true,
      },
      orderBy: { registerNo: 'asc' },
    });

    return NextResponse.json({
      batch,
      students,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Trainer fetch tasks error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks for review' }, { status: 500 });
  }
}
