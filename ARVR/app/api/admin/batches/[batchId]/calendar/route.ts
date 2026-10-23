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
    await requireAuth(['ADMIN']);

    if (!isValidObjectId(batchId)) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const calendar = await prisma.trainingDay.findMany({
      where: { batchId },
      orderBy: { dayNumber: 'asc' },
    });

    return NextResponse.json({ calendar });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    await requireAuth(['ADMIN']);
    const body = await request.json();

    if (!isValidObjectId(batchId)) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Bulk save curriculum days
    if (body.days && Array.isArray(body.days)) {
      const daysList = body.days as {
        dayNumber: number;
        taskTitle?: string;
        taskDescription?: string;
        tasks?: any[];
        resources?: any[];
        date?: string;
        dateStr?: string;
        hasForenoon?: boolean;
        hasAfternoon?: boolean;
      }[];
      
      const start = new Date(batch.startDate);

      await prisma.$transaction(async (tx) => {
        let maxDayDate = start;

        for (const item of daysList) {
          const rawDate = item.dateStr || item.date;
          const dayDate = rawDate ? new Date(rawDate) : new Date(start.getTime() + (item.dayNumber - 1) * 86400000);
          if (dayDate > maxDayDate) maxDayDate = dayDate;

          const isLastDay = Number(item.dayNumber) === daysList.length || Number(item.dayNumber) === batch.trainingDays;
          
          let tasksList = Array.isArray(item.tasks) && item.tasks.length > 0 ? item.tasks : [
            { id: `task-${item.dayNumber}-1`, title: item.taskTitle || `Day ${item.dayNumber} Task`, description: item.taskDescription || '' }
          ];

          let resourcesList = Array.isArray(item.resources) ? item.resources : [];

          let taskTitle = tasksList[0]?.title || item.taskTitle || `Day ${item.dayNumber} Module & Task`;
          let taskDescription = tasksList[0]?.description || item.taskDescription || `Complete Day ${item.dayNumber} practical assignment.`;

          if (isLastDay && !taskTitle.toLowerCase().includes('final exam') && !taskTitle.toLowerCase().includes('examination')) {
            taskTitle = `Final Examination: ${batch.level} Comprehensive Practical Assessment`;
            taskDescription = `Final practical examination and capstone assessment for ${batch.level}. Complete the required exam module, build and test your solution, and submit your final execution output for grading. Your instructor will evaluate this exam and assign your final certificate grade.`;
            if (tasksList.length === 1 && !tasksList[0].title.toLowerCase().includes('final exam')) {
              tasksList = [{ id: `task-${item.dayNumber}-1`, title: taskTitle, description: taskDescription }];
            }
          }

          await tx.trainingDay.upsert({
            where: {
              batchId_dayNumber: {
                batchId,
                dayNumber: Number(item.dayNumber),
              },
            },
            update: {
              date: dayDate,
              taskTitle,
              taskDescription,
              tasks: tasksList,
              resources: resourcesList,
              hasForenoon: item.hasForenoon !== false,
              hasAfternoon: item.hasAfternoon !== false,
            },
            create: {
              batchId,
              dayNumber: Number(item.dayNumber),
              date: dayDate,
              taskTitle,
              taskDescription,
              tasks: tasksList,
              resources: resourcesList,
              hasForenoon: item.hasForenoon !== false,
              hasAfternoon: item.hasAfternoon !== false,
            },
          });
        }

        // Update batch curriculumStatus and derived endDate from final training date
        const isComplete = daysList.length >= batch.trainingDays;
        await tx.batch.update({
          where: { id: batchId },
          data: {
            curriculumStatus: isComplete ? 'Completed' : 'In Progress',
            endDate: maxDayDate,
          },
        });
      });

      const updatedCalendar = await prisma.trainingDay.findMany({
        where: { batchId },
        orderBy: { dayNumber: 'asc' },
      });

      return NextResponse.json({ success: true, calendar: updatedCalendar, curriculumStatus: daysList.length >= batch.trainingDays ? 'Completed' : 'In Progress' });
    }

    // Single day update
    const { dayNumber, date, taskTitle, taskDescription, tasks, resources, hasForenoon, hasAfternoon } = body;
    if (!dayNumber) {
      return NextResponse.json({ error: 'Day number is required' }, { status: 400 });
    }

    const tasksList = Array.isArray(tasks) && tasks.length > 0 ? tasks : [
      { id: `task-${dayNumber}-1`, title: taskTitle || `Day ${dayNumber} Task`, description: taskDescription || '' }
    ];
    const resourcesList = Array.isArray(resources) ? resources : [];
    const resolvedTitle = tasksList[0]?.title || taskTitle || `Day ${dayNumber} Task`;
    const resolvedDescription = tasksList[0]?.description || taskDescription || '';

    const trainingDay = await prisma.trainingDay.upsert({
      where: {
        batchId_dayNumber: {
          batchId,
          dayNumber: parseInt(dayNumber, 10),
        },
      },
      update: {
        date: date ? new Date(date) : undefined,
        taskTitle: resolvedTitle,
        taskDescription: resolvedDescription,
        tasks: tasksList,
        resources: resourcesList,
        hasForenoon: hasForenoon !== undefined ? hasForenoon : true,
        hasAfternoon: hasAfternoon !== undefined ? hasAfternoon : true,
      },
      create: {
        batchId,
        dayNumber: parseInt(dayNumber, 10),
        date: date ? new Date(date) : new Date(),
        taskTitle: resolvedTitle,
        taskDescription: resolvedDescription,
        tasks: tasksList,
        resources: resourcesList,
        hasForenoon: hasForenoon !== undefined ? hasForenoon : true,
        hasAfternoon: hasAfternoon !== undefined ? hasAfternoon : true,
      },
    });

    await prisma.batch.update({
      where: { id: batchId },
      data: { curriculumStatus: 'In Progress' },
    });

    return NextResponse.json({ success: true, trainingDay, curriculumStatus: 'In Progress' });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update calendar error:', error);
    return NextResponse.json({ error: 'Failed to update calendar day' }, { status: 500 });
  }
}
