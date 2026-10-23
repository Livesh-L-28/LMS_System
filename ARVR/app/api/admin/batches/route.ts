import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { batchSchema } from '@/lib/validation';
import { getDriveClientForAdmin, ensureRootFolder, ensureBatchFolder, ensureDayFolder } from '@/lib/googleDrive';

export async function GET() {
  try {
    await requireAuth(['ADMIN']);

    const batches = await prisma.batch.findMany({
      include: {
        trainingCalendar: {
          orderBy: { dayNumber: 'asc' },
        },
        _count: {
          select: { students: true, trainingCalendar: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({ batches });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth(['ADMIN']);
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid batch data' }, { status: 400 });
    }

    const {
      name,
      batchNo,
      level,
      startDate,
      endDate,
      trainingDays,
      status,
      curriculumStatus,
      fnStartTime,
      fnCutoffTime,
      anStartTime,
      anCutoffTime,
    } = parsed.data;

    // Check unique batchNo
    if (batchNo) {
      const existingNo = await prisma.batch.findFirst({ where: { batchNo } });
      if (existingNo) {
        return NextResponse.json({ error: `Batch No "${batchNo}" already exists.` }, { status: 409 });
      }
    }

    // Check unique name
    const existingName = await prisma.batch.findUnique({ where: { name } });
    if (existingName) {
      return NextResponse.json({ error: `Batch Name "${name}" already exists.` }, { status: 409 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const bLevel = level || 'Level 1';
    
    // Check if custom level task configuration exists in SystemSetting
    const levelCode = bLevel.toUpperCase().replace(/\s+/g, '_');
    const customSetting = await prisma.systemSetting.findUnique({
      where: { key: `TASK_CONFIG_${levelCode}` },
    });

    let customTasks: any[] | null = null;
    let effectiveDays = trainingDays;

    if (customSetting?.value) {
      try {
        const parsed = JSON.parse(customSetting.value);
        if (Array.isArray(parsed)) {
          customTasks = parsed;
        } else if (parsed && Array.isArray(parsed.tasks)) {
          customTasks = parsed.tasks;
          if (!trainingDays && parsed.days) effectiveDays = parsed.days;
        }
      } catch (e) {}
    }

    const calendarGen = (await import('@/lib/batchUtils')).generateTrainingDaysCalendar(start, bLevel, effectiveDays);

    const finalCalendarItems = calendarGen.map((day) => {
      const isLastDay = day.dayNumber === effectiveDays || day.isExam;
      const customItem = customTasks ? customTasks.find((t: any) => t.dayNumber === day.dayNumber) : null;
      
      let tasksList = (customItem?.tasks && Array.isArray(customItem.tasks) && customItem.tasks.length > 0)
        ? customItem.tasks
        : day.tasks || [{ id: `task-${day.dayNumber}-1`, title: customItem?.taskTitle || day.taskTitle, description: customItem?.taskDescription || day.taskDescription }];

      let resourcesList = (customItem?.resources && Array.isArray(customItem.resources))
        ? customItem.resources
        : day.resources || [];

      let taskTitle = tasksList[0]?.title || customItem?.taskTitle || day.taskTitle;
      let taskDescription = tasksList[0]?.description || customItem?.taskDescription || day.taskDescription;

      // In every batch, the last day is the Final Exam
      if (isLastDay) {
        if (!taskTitle.toLowerCase().includes('final exam') && !taskTitle.toLowerCase().includes('examination')) {
          taskTitle = `Final Examination: ${bLevel} Comprehensive Practical Assessment`;
        }
        if (!taskDescription.toLowerCase().includes('final') && !taskDescription.toLowerCase().includes('exam')) {
          taskDescription = `Final practical examination and capstone assessment for ${bLevel}. Complete the required exam module, build and test your solution, and submit your final execution output for grading. Your instructor will evaluate this exam and assign your final certificate grade.`;
        }
        if (tasksList.length === 1 && !tasksList[0].title.toLowerCase().includes('final exam')) {
          tasksList = [{ id: `task-${day.dayNumber}-1`, title: taskTitle, description: taskDescription }];
        }
      }

      return {
        dayNumber: day.dayNumber,
        date: day.date,
        taskTitle,
        taskDescription,
        tasks: tasksList,
        resources: resourcesList,
        hasForenoon: day.hasForenoon !== false,
        hasAfternoon: day.hasAfternoon !== false,
      };
    });

    // Create batch and populate training calendar in database
    const batch = await prisma.batch.create({
      data: {
        name,
        batchNo: batchNo || null,
        level: bLevel,
        startDate: start,
        endDate: end,
        trainingDays,
        status: status || 'ACTIVE',
        curriculumStatus: 'Completed',
        fnStartTime: fnStartTime || null,
        fnCutoffTime: fnCutoffTime || null,
        anStartTime: anStartTime || null,
        anCutoffTime: anCutoffTime || null,
        trainingCalendar: {
          create: finalCalendarItems,
        },
      },
      include: {
        trainingCalendar: {
          orderBy: { dayNumber: 'asc' },
        },
      },
    });

    // Create Google Drive Folder & Day Subfolders immediately if Google Drive is connected
    try {
      const { drive, connection } = await getDriveClientForAdmin();
      if (drive) {
        const rootFolderId = await ensureRootFolder(drive, connection?.id);
        const batchFolderId = await ensureBatchFolder(drive, rootFolderId, batch.id, batch.name);

        // Pre-create Day subfolders for all training days in the new batch
        for (let dayNum = 1; dayNum <= batch.trainingDays; dayNum++) {
          await ensureDayFolder(drive, batchFolderId, dayNum);
        }
      }
    } catch (driveErr) {
      console.error('Google Drive folder pre-creation error on batch create:', driveErr);
    }

    return NextResponse.json({
      success: true,
      message: `Batch '${batch.name}' created successfully with ${batch.trainingDays}-day training calendar and Google Drive folder!`,
      batch,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create batch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create batch' }, { status: 500 });
  }
}
