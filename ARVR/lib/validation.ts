import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
    registerNo: z
      .string()
      .min(2, 'Register Number is required')
      .transform((val) => val.trim().toUpperCase()),
    contactNumber: z.string().min(10, 'Contact number must be at least 10 digits'),
    email: z.string().email('Invalid email address'),
    department: z.string().min(2, 'Department is required'),
    year: z.string().min(1, 'Year is required'),
    section: z.enum(['A', 'B', 'C', 'D'], { message: 'Section must be A, B, C, or D' }),
    batchId: z.string().min(1, 'Batch selection is required'),
    pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 numeric digits'),
    confirmPin: z.string().regex(/^\d{6}$/, 'Confirm PIN must be exactly 6 numeric digits'),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: 'PINs do not match',
    path: ['confirmPin'],
  });

export const studentLoginSchema = z.object({
  registerNo: z
    .string()
    .min(1, 'Register Number is required')
    .transform((val) => val.trim().toUpperCase()),
  pin: z.string().regex(/^\d{6}$/, 'PIN must be 6 numeric digits'),
});

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const evaluationSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  score: z.number().int().min(0).max(100, 'Score must be between 0 and 100'),
  grade: z.enum(['O', 'A_PLUS', 'A', 'B_PLUS', 'B', 'C', 'A+', 'B+']),
  trainingLevel: z.string().min(1, 'Training level is required'),
  comments: z.string().optional(),
});

export const batchSchema = z
  .object({
    name: z.string().min(3, 'Batch name is required'),
    batchNo: z.string().optional(),
    level: z.string().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    trainingDays: z.number().int().min(1, 'Training days must be at least 1'),
    status: z.enum(['ACTIVE', 'CLOSED', 'UPCOMING', 'Completed']).default('ACTIVE'),
    curriculumStatus: z.enum(['Not Set', 'In Progress', 'Completed']).default('Not Set'),
    fnStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)').optional().nullable(),
    fnCutoffTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)').optional().nullable(),
    anStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)').optional().nullable(),
    anCutoffTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)').optional().nullable(),
  })
  .refine((data) => {
    if (data.fnStartTime && data.fnCutoffTime) {
      return data.fnStartTime < data.fnCutoffTime;
    }
    return true;
  }, {
    message: 'Morning (FN) Start Time must be earlier than Cutoff Time',
    path: ['fnCutoffTime'],
  })
  .refine((data) => {
    if (data.anStartTime && data.anCutoffTime) {
      return data.anStartTime < data.anCutoffTime;
    }
    return true;
  }, {
    message: 'Afternoon (AN) Start Time must be earlier than Cutoff Time',
    path: ['anCutoffTime'],
  })
  .refine((data) => {
    if (data.fnCutoffTime && data.anStartTime) {
      return data.fnCutoffTime <= data.anStartTime;
    }
    return true;
  }, {
    message: 'Morning (FN) Cutoff Time must be earlier than Afternoon (AN) Start Time',
    path: ['anStartTime'],
  });

export const feedbackSchema = z.object({
  message: z.string().min(5, 'Feedback message must be at least 5 characters'),
});

export function isValidObjectId(id?: string | null): boolean {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{10,40}$/.test(id);
}
