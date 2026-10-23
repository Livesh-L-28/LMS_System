import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getMidnightDate, DEFAULT_TIMEZONE, getDetailedSessionStatus, getTodayDateString, isAttendanceMatchingDate, resolveBatchAttendanceWindows } from '@/lib/time';
import { getCachedSystemSettings } from '@/lib/settings';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(['STUDENT']);
    const { searchParams } = new URL(request.url);
    const requestedDay = searchParams.get('dayNumber');

    // Get student details
    const student = await prisma.student.findUnique({
      where: { id: user.id },
      include: { batch: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    const settingsMap = await getCachedSystemSettings();
    const timezone = settingsMap.get('PROGRAM_TIMEZONE') || DEFAULT_TIMEZONE;

    const todayDate = getMidnightDate(new Date(), timezone);
    const todayStr = getTodayDateString(new Date(), timezone);

    // Fetch all attendances for this student to robustly match across timezones
    const allStudentAttendances = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { markedAt: 'desc' },
    });

    const todayAttendances = allStudentAttendances.filter((a) =>
      isAttendanceMatchingDate(a, todayStr, timezone)
    );

    const hasFN = todayAttendances.some((a) => a.session === 'FN');
    const hasAN = todayAttendances.some((a) => a.session === 'AN');

    // Find today's training day for the student's batch
    // We match by date or day number within batch date range
    const trainingDays = await prisma.trainingDay.findMany({
      where: { batchId: student.batchId },
      orderBy: { dayNumber: 'asc' },
    });

    let currentDay: any = null;

    if (requestedDay) {
      const targetDayNum = parseInt(requestedDay, 10);
      currentDay = trainingDays.find((td) => td.dayNumber === targetDayNum);
    }

    if (!currentDay) {
      // Find training day closest to today or today's date
      currentDay = trainingDays.find(
        (td) => getMidnightDate(td.date, timezone).getTime() === todayDate.getTime()
      );
    }

    if (!currentDay && trainingDays.length > 0) {
      // Fallback: use first or active training day
      currentDay = trainingDays[0];
    }

    let submission = null;
    if (currentDay) {
      submission = await prisma.taskSubmission.findUnique({
        where: {
          studentId_trainingDayId: {
            studentId: student.id,
            trainingDayId: currentDay.id,
          },
        },
        include: { evaluation: true },
      });
    }

    let hasDayAttendance = false;
    if (currentDay) {
      const currentDayStr = getTodayDateString(new Date(currentDay.date), timezone);
      hasDayAttendance = allStudentAttendances.some((a) =>
        isAttendanceMatchingDate(a, currentDayStr, timezone)
      );
    }

    const hasAnyAttendance = hasFN || hasAN || hasDayAttendance;
    const isUnlocked = hasAnyAttendance || Boolean(submission);

    const { fnStart, fnCutoff, anStart, anCutoff } = resolveBatchAttendanceWindows(
      student.batch,
      settingsMap
    );
    const now = new Date();

    const fnAttendance = todayAttendances.find((a) => a.session === 'FN');
    const anAttendance = todayAttendances.find((a) => a.session === 'AN');

    const fnDetails = getDetailedSessionStatus('FN', fnStart, fnCutoff, now, timezone, hasFN, fnAttendance?.markedAt);
    const anDetails = getDetailedSessionStatus('AN', anStart, anCutoff, now, timezone, hasAN, anAttendance?.markedAt);

    const maxDayNumber = Math.max(...trainingDays.map((td) => td.dayNumber), 0);
    const isCurrentDayExam = currentDay
      ? currentDay.dayNumber === maxDayNumber ||
        currentDay.taskTitle.toLowerCase().includes('final exam') ||
        currentDay.taskTitle.toLowerCase().includes('examination')
      : false;

    const formatTrainingDay = (td: any) => ({
      id: td.id,
      dayNumber: td.dayNumber,
      taskTitle: td.taskTitle,
      taskDescription: td.taskDescription,
      tasks: (td.tasks && Array.isArray(td.tasks) && td.tasks.length > 0)
        ? td.tasks
        : [{ id: `task-${td.dayNumber}-1`, title: td.taskTitle, description: td.taskDescription }],
      resources: Array.isArray(td.resources) ? td.resources : [],
      date: td.date,
      hasForenoon: td.hasForenoon,
      hasAfternoon: td.hasAfternoon,
      isFinalExam: td.dayNumber === maxDayNumber ||
        td.taskTitle.toLowerCase().includes('final exam') ||
        td.taskTitle.toLowerCase().includes('examination'),
    });

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        registerNo: student.registerNo,
        batchName: student.batch.name,
      },
      attendanceToday: {
        fn: hasFN,
        an: hasAN,
        hasAnyAttendance,
        fnDetails,
        anDetails,
        currentZonedTime: fnDetails.currentZonedFormatted,
        timezone,
      },
      isTaskUnlocked: isUnlocked,
      isFinalExam: isCurrentDayExam,
      trainingDay: currentDay ? formatTrainingDay(currentDay) : null,
      allTrainingDays: trainingDays.map(formatTrainingDay),
      submission,
      cutoffs: {
        fnStart,
        fn: fnCutoff,
        anStart,
        an: anCutoff,
        timezone,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Task today GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch today task details' }, { status: 500 });
  }
}
