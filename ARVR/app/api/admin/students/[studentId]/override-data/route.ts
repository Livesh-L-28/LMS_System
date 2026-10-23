import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { isValidObjectId } from '@/lib/validation';
import { logAdminAudit } from '@/lib/auditLog';
import { getClientIp } from '@/lib/security';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const adminUser = await requireAuth(['ADMIN']);
    const ip = getClientIp(request);

    if (!isValidObjectId(studentId)) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, score = 90, grade = 'O', level = 'Level 1 Foundation' } = body;

    let cleanGrade = String(grade || 'O').trim();
    if (cleanGrade === 'A_PLUS') cleanGrade = 'A+';
    if (cleanGrade === 'B_PLUS') cleanGrade = 'B+';
    const cleanLevel = String(level || 'Level 1 Foundation').trim();

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        batch: {
          include: {
            trainingCalendar: true,
          },
        },
        attendances: true,
        tasks: true,
        evaluations: true,
        certificate: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const calendar = student.batch.trainingCalendar;
    if (calendar.length === 0) {
      return NextResponse.json({ error: 'Batch has no training days scheduled' }, { status: 400 });
    }

    // Helper: Safely backfill missing attendance sessions
    const ensure100Attendance = async () => {
      const currentAttendances = await prisma.attendance.findMany({
        where: { studentId: student.id },
        select: { date: true, session: true },
      });

      const existingSet = new Set(
        currentAttendances.map((a) => `${format(new Date(a.date), 'yyyy-MM-dd')}_${a.session}`)
      );

      let added = 0;
      for (const day of calendar) {
        const dayDateStr = format(new Date(day.date), 'yyyy-MM-dd');
        const midnightDate = new Date(`${dayDateStr}T00:00:00.000Z`);

        const activeSessions: string[] = [];
        if (day.hasForenoon !== false) activeSessions.push('FN');
        if (day.hasAfternoon !== false) activeSessions.push('AN');

        for (const session of activeSessions) {
          const key = `${dayDateStr}_${session}`;
          if (!existingSet.has(key)) {
            try {
              await prisma.attendance.create({
                data: {
                  studentId: student.id,
                  date: midnightDate,
                  session,
                },
              });
              existingSet.add(key);
              added++;
            } catch (err: any) {
              if (err.code !== 'P2002') throw err;
            }
          }
        }
      }
      return added;
    };

    if (action === 'grant_100_attendance') {
      const sessionsAdded = await ensure100Attendance();

      // If student has a certificate that was invalid due to attendance, mark it valid now
      if (student.certificate && !student.certificate.isValid) {
        await prisma.certificateRecord.update({
          where: { id: student.certificate.id },
          data: {
            isValid: true,
            attendancePctAtIssue: 100,
          },
        });
      }

      await logAdminAudit({
        actorId: adminUser.id,
        actorEmail: adminUser.email,
        ipAddress: ip,
        action: 'OVERRIDE_ATTENDANCE',
        targetType: 'STUDENT',
        targetId: student.id,
        targetIdentifier: student.registerNo || student.email,
        details: { action, sessionsAdded, trainingDays: calendar.length },
      });

      return NextResponse.json({
        success: true,
        message: `Granted 100% attendance! Added ${sessionsAdded} missing session(s) across ${calendar.length} training days.`,
        sessionsAdded,
      });
    }

    if (action === 'grant_all_tasks') {
      let tasksAdded = 0;
      for (const day of calendar) {
        let taskSub = student.tasks.find((t) => t.trainingDayId === day.id);

        if (!taskSub) {
          taskSub = await prisma.taskSubmission.create({
            data: {
              studentId: student.id,
              trainingDayId: day.id,
              screenshotUrl: 's3://manual-admin-grant',
              status: 'ACCEPTED',
              description: 'Admin manual completion grant',
            },
          });
          tasksAdded++;
        } else if (taskSub.status !== 'ACCEPTED') {
          await prisma.taskSubmission.update({
            where: { id: taskSub.id },
            data: { status: 'ACCEPTED' },
          });
        }

        const existingEval = student.evaluations.find((e) => e.taskId === taskSub!.id);
        if (!existingEval) {
          await prisma.evaluation.create({
            data: {
              studentId: student.id,
              taskId: taskSub.id,
              score: Number(score) || 90,
              grade: cleanGrade,
              trainingLevel: cleanLevel,
              comments: 'Admin verified and evaluated via manual override.',
            },
          });
        }
      }

      await logAdminAudit({
        actorId: adminUser.id,
        actorEmail: adminUser.email,
        ipAddress: ip,
        action: 'OVERRIDE_TASKS_AND_EVALUATION',
        targetType: 'STUDENT',
        targetId: student.id,
        targetIdentifier: student.registerNo || student.email,
        details: { action, tasksAdded, score, grade: cleanGrade, level: cleanLevel },
      });

      return NextResponse.json({
        success: true,
        message: `Accepted all practical tasks and recorded evaluations for ${calendar.length} training days!`,
        tasksAdded,
      });
    }

    if (action === 'grant_full_qualification') {
      // 1. Grant 100% attendance safely
      await ensure100Attendance();

      // 2. Grant all tasks & evaluations
      for (const day of calendar) {
        let taskSub = student.tasks.find((t) => t.trainingDayId === day.id);
        if (!taskSub) {
          taskSub = await prisma.taskSubmission.create({
            data: {
              studentId: student.id,
              trainingDayId: day.id,
              screenshotUrl: 's3://manual-admin-grant',
              status: 'ACCEPTED',
              description: 'Admin manual full qualification grant',
            },
          });
        } else if (taskSub.status !== 'ACCEPTED') {
          await prisma.taskSubmission.update({
            where: { id: taskSub.id },
            data: { status: 'ACCEPTED' },
          });
        }

        const existingEval = student.evaluations.find((e) => e.taskId === taskSub!.id);
        if (!existingEval) {
          await prisma.evaluation.create({
            data: {
              studentId: student.id,
              taskId: taskSub.id,
              score: Number(score) || 90,
              grade: cleanGrade,
              trainingLevel: cleanLevel,
              comments: 'Full qualification granted by Admin override.',
            },
          });
        }
      }

      // 3. Issue or update certificate as officially valid
      const cleanBatchCode = student.batch.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
      const randomSuffix = String(student.registerNo).slice(-4) || '001';
      const certNo = student.certificate?.certificateNo || `ARVR-${cleanBatchCode}-${randomSuffix}`;

      if (student.certificate) {
        await prisma.certificateRecord.update({
          where: { id: student.certificate.id },
          data: {
            isValid: true,
            isManualOverride: true,
            overrideReason: 'Full Admin Qualification Override Granted',
            finalGrade: cleanGrade,
            finalLevel: cleanLevel,
            attendancePctAtIssue: 100,
          },
        });
      } else {
        await prisma.certificateRecord.create({
          data: {
            studentId: student.id,
            certificateNo: certNo,
            finalGrade: cleanGrade,
            finalLevel: cleanLevel,
            isValid: true,
            isManualOverride: true,
            overrideReason: 'Full Admin Qualification Override Granted',
            completedAt: new Date(),
            attendancePctAtIssue: 100,
          },
        });
      }

      await logAdminAudit({
        actorId: adminUser.id,
        actorEmail: adminUser.email,
        ipAddress: ip,
        action: 'OVERRIDE_FULL_QUALIFICATION',
        targetType: 'STUDENT',
        targetId: student.id,
        targetIdentifier: student.registerNo || student.email,
        details: { action, certificateNo: certNo, score, grade: cleanGrade, level: cleanLevel },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully qualified ${student.name} with 100% attendance, completed tasks, and verified certificate!`,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Student override-data error:', error);
    let errMsg = error.message || 'Failed to apply student data override';
    if (errMsg.includes('Unique constraint failed')) {
      errMsg = 'A duplicate record already exists for this date/session or certificate.';
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
