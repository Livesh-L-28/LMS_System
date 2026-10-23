import { NextResponse } from 'next/server';
import { prisma, withPrismaRetry } from '@/lib/prisma';
import { studentLoginSchema } from '@/lib/validation';
import { comparePinOrPassword, createSession } from '@/lib/auth';
import { checkDualRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rateLimit';
import { getClientIp, logSecurityEvent, dummyBcryptCompare, formatSafeError } from '@/lib/security';
import { getCachedSystemSettings } from '@/lib/settings';
import { verifyAccessRestriction } from '@/lib/geofence';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsed = studentLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid register number or PIN format' }, { status: 400 });
    }

    const { registerNo, pin } = parsed.data;
    const normalizedRegNo = registerNo.trim().toUpperCase();

    // 1. Dual-Key Throttling: Enforce IP rate limiting and Student Account Lockout (5 attempts -> 15 min lock)
    const rateCheck = await checkDualRateLimit({
      ip,
      accountIdentifier: normalizedRegNo,
      maxIpAttempts: 20,
      maxAccountAttempts: 5,
      ipWindowSec: 60,
      accountLockoutSec: 900, // 15 minutes lockout
    });

    if (!rateCheck.allowed) {
      logSecurityEvent({
        type: rateCheck.reason === 'ACCOUNT_LOCKED' ? 'ACCOUNT_LOCKED' : 'RATE_LIMIT_EXCEEDED',
        ip,
        userAgent,
        targetIdentifier: normalizedRegNo,
        actorRole: 'STUDENT',
        details: { reason: rateCheck.reason, remainingSec: rateCheck.remainingSec },
      });

      return NextResponse.json(
        {
          error:
            rateCheck.reason === 'ACCOUNT_LOCKED'
              ? `Account temporarily locked due to multiple failed PIN attempts. Please wait ${rateCheck.remainingSec} seconds before trying again.`
              : `Too many failed login attempts from this network. Security lock active. Please wait ${rateCheck.remainingSec} seconds before trying again.`,
          remainingSec: rateCheck.remainingSec,
        },
        { status: 429 }
      );
    }

    // 2. Geofence & WiFi Network Access Restriction Verification
    const settingsMap = await getCachedSystemSettings();
    const accessCheck = verifyAccessRestriction({
      clientIp: ip,
      latitude:
        typeof body.latitude === 'number'
          ? body.latitude
          : body.latitude
          ? parseFloat(body.latitude)
          : undefined,
      longitude:
        typeof body.longitude === 'number'
          ? body.longitude
          : body.longitude
          ? parseFloat(body.longitude)
          : undefined,
      accuracy:
        typeof body.accuracy === 'number'
          ? body.accuracy
          : body.accuracy
          ? parseFloat(body.accuracy)
          : undefined,
      action: 'LOGIN',
      settings: settingsMap,
    });

    if (!accessCheck.allowed) {
      logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS',
        ip,
        userAgent,
        targetIdentifier: normalizedRegNo,
        actorRole: 'STUDENT',
        details: {
          reason: accessCheck.reason,
          distanceMeters: accessCheck.distanceMeters,
          allowedRadiusMeters: accessCheck.allowedRadiusMeters,
          geofencePassed: accessCheck.geofencePassed,
          networkPassed: accessCheck.networkPassed,
        },
      });

      return NextResponse.json(
        {
          error:
            accessCheck.reason ||
            'Login restricted: You must be connected to the Academy WiFi network and present within campus boundaries.',
          code: 'ACCESS_RESTRICTED',
          details: {
            distanceMeters: accessCheck.distanceMeters,
            allowedRadiusMeters: accessCheck.allowedRadiusMeters,
            networkPassed: accessCheck.networkPassed,
            geofencePassed: accessCheck.geofencePassed,
            clientIp: accessCheck.clientIp,
          },
        },
        { status: 403 }
      );
    }

    // 3. Fetch student record with connection retry resilience
    const student = await withPrismaRetry(() =>
      prisma.student.findUnique({
        where: { registerNo: normalizedRegNo },
      })
    );

    if (!student) {
      // Side-channel timing attack mitigation: perform constant-time bcrypt compare
      await dummyBcryptCompare();
      await recordFailedAttempt(normalizedRegNo, 900);

      logSecurityEvent({
        type: 'AUTH_LOGIN_FAILURE',
        ip,
        userAgent,
        targetIdentifier: normalizedRegNo,
        actorRole: 'STUDENT',
        details: { reason: 'ACCOUNT_NOT_FOUND' },
      });

      return NextResponse.json({ error: 'Invalid register number or PIN' }, { status: 401 });
    }

    // 3. Verify PIN
    const isMatch = await comparePinOrPassword(pin, student.pinHash);
    if (!isMatch) {
      await recordFailedAttempt(normalizedRegNo, 900);

      logSecurityEvent({
        type: 'AUTH_LOGIN_FAILURE',
        ip,
        userAgent,
        targetIdentifier: normalizedRegNo,
        actorRole: 'STUDENT',
        details: { reason: 'INVALID_PIN' },
      });

      return NextResponse.json({ error: 'Invalid register number or PIN' }, { status: 401 });
    }

    // 4. Successful login: reset throttling counters for IP and student account
    await resetRateLimit(`ip:${ip}`);
    await resetRateLimit(normalizedRegNo);

    // 5. Establish secure session
    const sessionUser = {
      id: student.id,
      role: 'STUDENT' as const,
      name: student.name,
      registerNo: student.registerNo,
      batchId: student.batchId,
    };
    await createSession(sessionUser);

    logSecurityEvent({
      type: 'AUTH_LOGIN_SUCCESS',
      ip,
      userAgent,
      actorId: student.id,
      actorRole: 'STUDENT',
      targetIdentifier: student.registerNo,
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: sessionUser,
    });
  } catch (error: any) {
    return NextResponse.json(formatSafeError(error, 'Student Login POST'), { status: 500 });
  }
}
