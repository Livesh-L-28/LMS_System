import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerSchema, isValidObjectId } from '@/lib/validation';
import { hashPinOrPassword } from '@/lib/auth';
import { formatSafeError } from '@/lib/security';

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid form data';
      return NextResponse.json({ error: firstError, details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;

    // Check register number uniqueness (case-normalized)
    const existingReg = await prisma.student.findUnique({
      where: { registerNo: data.registerNo },
    });
    if (existingReg) {
      return NextResponse.json({ error: 'Register number already registered' }, { status: 409 });
    }

    // Check email uniqueness
    const existingEmail = await prisma.student.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email address already registered' }, { status: 409 });
    }

    // Check active batch
    if (!isValidObjectId(data.batchId)) {
      return NextResponse.json({ error: 'Selected training batch is inactive or does not exist' }, { status: 400 });
    }

    const batch = await prisma.batch.findUnique({
      where: { id: data.batchId },
    });
    if (!batch || batch.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Selected training batch is inactive or does not exist' }, { status: 400 });
    }

    // Hash PIN
    const pinHash = await hashPinOrPassword(data.pin);

    // Create student
    const student = await prisma.student.create({
      data: {
        name: data.name,
        registerNo: data.registerNo,
        contactNumber: data.contactNumber,
        email: data.email,
        department: data.department,
        year: data.year,
        section: data.section,
        batchId: data.batchId,
        pinHash,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Please login with your Register Number and PIN.',
      studentId: student.id,
    });
  } catch (error: any) {
    return NextResponse.json(formatSafeError(error, 'Student Register POST'), { status: 500 });
  }
}
