import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { evaluationSchema } from '@/lib/validation';
import { logAdminAudit } from '@/lib/auditLog';
import { getClientIp } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['ADMIN']);
    const body = await request.json();

    const parsed = evaluationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid evaluation data' },
        { status: 400 }
      );
    }

    const { taskId, score, grade, trainingLevel, comments } = parsed.data;

    // Fetch TaskSubmission with student, batch, trainingDay, and certificate
    const task = await prisma.taskSubmission.findUnique({
      where: { id: taskId },
      include: {
        trainingDay: true,
        student: {
          include: {
            batch: {
              include: {
                trainingCalendar: { orderBy: { dayNumber: 'desc' } },
              },
            },
            certificate: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task submission not found' }, { status: 404 });
    }

    // Determine if this is the Final Exam (last training day of the batch or titled Final Exam)
    const calendarDays = task.student.batch?.trainingCalendar || [];
    const maxDayNumber = calendarDays[0]?.dayNumber || task.student.batch?.trainingDays || 0;
    const isFinalExam = task.trainingDay.dayNumber === maxDayNumber || 
      task.trainingDay.taskTitle.toLowerCase().includes('final exam') || 
      task.trainingDay.taskTitle.toLowerCase().includes('examination');

    // Determine status
    const submissionStatus = score > 0 ? 'ACCEPTED' : 'REJECTED';

    // Transaction to create/update Evaluation, update TaskSubmission status, and sync Certificate if Final Exam
    const result = await prisma.$transaction(async (tx) => {
      const evaluation = await tx.evaluation.upsert({
        where: { taskId },
        update: {
          score,
          grade,
          trainingLevel,
          comments: comments || null,
          evaluatedAt: new Date(),
        },
        create: {
          studentId: task.studentId,
          taskId,
          score,
          grade,
          trainingLevel,
          comments: comments || null,
        },
      });

      const updatedTask = await tx.taskSubmission.update({
        where: { id: taskId },
        data: { status: submissionStatus },
      });

      // If evaluating the Final Exam on the last day, sync the final grade to the student's Certificate
      let updatedCertificate = null;
      if (isFinalExam && task.student.certificate) {
        updatedCertificate = await tx.certificateRecord.update({
          where: { id: task.student.certificate.id },
          data: {
            finalGrade: grade,
            finalLevel: trainingLevel,
          },
        });
      }

      return { evaluation, updatedTask, updatedCertificate };
    });

    await logAdminAudit({
      actorId: user.id,
      actorEmail: user.email,
      ipAddress: getClientIp(request),
      action: isFinalExam ? 'CHANGE_FINAL_EXAM_GRADE' : 'RECORD_TASK_EVALUATION',
      targetType: 'EVALUATION',
      targetId: result.evaluation.id,
      targetIdentifier: task.student.registerNo || task.student.email,
      details: {
        studentId: task.studentId,
        taskId,
        score,
        grade,
        trainingLevel,
        isFinalExam,
        submissionStatus,
      },
    });

    const successMessage = isFinalExam
      ? `Final Exam evaluation saved! Grade "${grade}" (${score}/100) has been awarded as the student's Final Exam & Certificate Grade.`
      : 'Evaluation saved successfully!';

    return NextResponse.json({
      success: true,
      message: successMessage,
      evaluation: result.evaluation,
      taskStatus: result.updatedTask.status,
      isFinalExam,
      certificateGrade: result.updatedCertificate?.finalGrade || null,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Evaluation submit error:', error);
    return NextResponse.json({ error: 'Failed to submit evaluation' }, { status: 500 });
  }
}
