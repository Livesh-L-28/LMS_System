import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { isValidObjectId } from '@/lib/validation';

export async function POST(
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
        trainingCalendar: true,
        students: {
          include: {
            attendances: true,
            tasks: {
              include: { evaluation: true, trainingDay: true },
            },
            evaluations: true,
            certificate: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const totalDays = batch.trainingDays || batch.trainingCalendar.length || 1;
    const maxSessions = batch.trainingCalendar.length > 0
      ? batch.trainingCalendar.reduce((sum, day) => sum + (day.hasForenoon !== false ? 1 : 0) + (day.hasAfternoon !== false ? 1 : 0), 0)
      : totalDays * 2;

    let reqBody: any = {};
    try {
      reqBody = await request.json();
    } catch {
      reqBody = {};
    }
    const overrideExam = reqBody.overrideExamAttendance === true;

    // Fetch threshold setting - defaults to 100% attendance requirement
    const thresholdSetting = await prisma.systemSetting.findUnique({
      where: { key: 'ATTENDANCE_THRESHOLD' },
    });
    const minAttendancePct = reqBody.minAttendancePct
      ? parseInt(reqBody.minAttendancePct, 10)
      : (thresholdSetting ? parseInt(thresholdSetting.value, 10) : 100);

    // Batch code derivation e.g. "ARVR-AUG26" from "ARVR-AUG-2026" or batch name
    const cleanBatchCode = batch.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);

    // Identify Exam Date (max dayNumber in trainingCalendar or batch.endDate)
    const sortedDays = [...batch.trainingCalendar].sort((a, b) => b.dayNumber - a.dayNumber);
    const examDayObj = sortedDays[0];
    const examDateStr = examDayObj ? format(new Date(examDayObj.date), 'yyyy-MM-dd') : format(new Date(batch.endDate), 'yyyy-MM-dd');

    let completedCount = 0;
    const studentBreakdown: any[] = [];

    // Run completion checks inside transaction for atomic certificate number sequence assignment
    await prisma.$transaction(async (tx) => {
      // Find existing count for sequence prefix
      const existingCerts = await tx.certificateRecord.count({
        where: {
          certificateNo: { startsWith: `ARVR-${cleanBatchCode}-` },
        },
      });

      let nextSequence = existingCerts + 1;

      for (const student of batch.students) {
        const attendancePct = maxSessions > 0
          ? Math.min(100, Math.round((student.attendances.length / maxSessions) * 100))
          : 100;
        const acceptedTasks = student.tasks.filter((t) => t.status === 'ACCEPTED').length;
        const hasEvaluations = student.evaluations.length > 0;

        // Requirement: Check if student marked attendance on the Exam Date (if sessions were held)
        const examDayHasSessions = (examDayObj?.hasForenoon !== false) || (examDayObj?.hasAfternoon !== false);
        const hasExamAttendance = !examDayHasSessions || student.attendances.some((a) => {
          const attDateStr = format(new Date(a.date), 'yyyy-MM-dd');
          return attDateStr === examDateStr;
        });

        const isExamSatisfied = hasExamAttendance || overrideExam;
        const isManuallyOverridden = student.certificate?.isManualOverride === true;
        const is100PctSatisfied = attendancePct >= minAttendancePct;

        // Certificate Validity Criteria:
        // Automatically requires 100% attendance, accepted tasks, evaluations, and exam attendance.
        // If student is < 100%, certificate is invalid unless manually overridden by Admin.
        const isEligible = isManuallyOverridden || (is100PctSatisfied && acceptedTasks > 0 && hasEvaluations && isExamSatisfied);

        let invalidReason: string | null = null;
        if (!isEligible) {
          if (!is100PctSatisfied) {
            invalidReason = `Attendance is ${attendancePct}% (${student.attendances.length}/${maxSessions} sessions), which is less than the required 100%. Certificate is invalid.`;
          } else if (!isExamSatisfied) {
            invalidReason = 'Exam day attendance not marked.';
          } else if (acceptedTasks === 0) {
            invalidReason = 'No accepted tasks submitted.';
          } else if (!hasEvaluations) {
            invalidReason = 'Pending trainer evaluation.';
          }
        }

        studentBreakdown.push({
          studentId: student.id,
          registerNo: student.registerNo,
          name: student.name,
          attendancePct,
          acceptedTasks,
          hasEvaluations,
          hasExamAttendance,
          isEligible,
          isManualOverride: isManuallyOverridden,
          invalidReason,
          hasExistingCert: !!student.certificate,
          certValid: student.certificate ? (isManuallyOverridden || isEligible) : false,
        });

        if (isEligible) {
          // Identify Final Exam evaluation from the last training day
          const examDayTask = student.tasks.find((t) => 
            t.trainingDayId === examDayObj?.id || 
            (examDayObj && t.trainingDay?.dayNumber === examDayObj.dayNumber)
          );
          const examEval = examDayTask?.evaluation || student.evaluations.find((e) => e.taskId === examDayTask?.id);

          let finalGrade = 'A';
          if (examEval && examEval.grade) {
            // Institutional Rule: Final grade is awarded from the Final Exam on the last day
            finalGrade = examEval.grade;
          } else {
            // Fallback to average score across evaluated tasks
            const scores = student.evaluations.map((e) => e.score);
            const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 80;

            if (avgScore >= 90) finalGrade = 'O';
            else if (avgScore >= 80) finalGrade = 'A+';
            else if (avgScore >= 70) finalGrade = 'A';
            else if (avgScore >= 60) finalGrade = 'B+';
            else if (avgScore >= 50) finalGrade = 'B';
            else finalGrade = 'C';
          }

          const finalLevel = examEval?.trainingLevel || student.evaluations[0]?.trainingLevel || 'Level 1';

          if (!student.certificate) {
            const seqStr = String(nextSequence).padStart(3, '0');
            const certNo = `ARVR-${cleanBatchCode}-${seqStr}`;

            await tx.certificateRecord.create({
              data: {
                studentId: student.id,
                certificateNo: certNo,
                finalGrade,
                finalLevel,
                isValid: true,
                isManualOverride: false,
                completedAt: new Date(),
                attendancePctAtIssue: attendancePct,
              },
            });
            nextSequence++;
            completedCount++;
          } else {
            // Update existing certificate final metrics (respect manual override if active)
            const resolvedGrade = student.certificate.isManualOverride
              ? student.certificate.finalGrade
              : (examEval?.grade || student.certificate.finalGrade || finalGrade);

            await tx.certificateRecord.update({
              where: { id: student.certificate.id },
              data: {
                finalGrade: resolvedGrade,
                finalLevel: student.certificate.finalLevel || finalLevel,
                isValid: true,
                completedAt: student.certificate.completedAt || new Date(),
                attendancePctAtIssue: attendancePct,
              },
            });
            completedCount++;
          }
        } else if (student.certificate && !isManuallyOverridden) {
          // Invalidate existing certificate if student is < 100% and not manually overridden
          await tx.certificateRecord.update({
            where: { id: student.certificate.id },
            data: {
              isValid: false,
              overrideReason: invalidReason || 'Less than 100% attendance - Invalidated',
            },
          });
        }
      }
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({
      success: true,
      message: `Completion check finished. ${completedCount} student(s) certified for ${batch.name}!`,
      completedCount,
      diagnostics: studentBreakdown,
      minAttendancePct,
      examDateStr,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Check completion error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process completion check' }, { status: 500 });
  }
}
