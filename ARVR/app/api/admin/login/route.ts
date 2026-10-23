import { NextResponse } from 'next/server';
import { prisma, withPrismaRetry } from '@/lib/prisma';
import { userLoginSchema } from '@/lib/validation';
import { comparePinOrPassword, createSession } from '@/lib/auth';
import { checkDualRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rateLimit';
import { getClientIp, logSecurityEvent, dummyBcryptCompare, formatSafeError } from '@/lib/security';
import { verifyTOTPCode, generateEmailOtp } from '@/lib/totp';
import { logAdminAudit } from '@/lib/auditLog';

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

    const parsed = userLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email or password format' }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Dual-Key Throttling: Check both IP volumetric and Account lockout
    const rateCheck = await checkDualRateLimit({
      ip,
      accountIdentifier: normalizedEmail,
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
        targetIdentifier: normalizedEmail,
        actorRole: 'ADMIN',
        details: { reason: rateCheck.reason, remainingSec: rateCheck.remainingSec },
      });

      return NextResponse.json(
        {
          error:
            rateCheck.reason === 'ACCOUNT_LOCKED'
              ? `Account temporarily locked due to multiple failed login attempts. Please wait ${rateCheck.remainingSec} seconds before trying again.`
              : `Too many requests from this network. Please wait ${rateCheck.remainingSec} seconds before retrying.`,
          remainingSec: rateCheck.remainingSec,
        },
        { status: 429 }
      );
    }

    // 2. Fetch administrator account with connection retry resilience
    const admin = await withPrismaRetry(() =>
      prisma.admin.findUnique({
        where: { email: normalizedEmail },
      })
    );

    if (!admin) {
      // Side-channel timing attack mitigation: perform constant-time bcrypt compare
      await dummyBcryptCompare();
      await recordFailedAttempt(normalizedEmail, 900);

      logSecurityEvent({
        type: 'AUTH_LOGIN_FAILURE',
        ip,
        userAgent,
        targetIdentifier: normalizedEmail,
        actorRole: 'ADMIN',
        details: { reason: 'ACCOUNT_NOT_FOUND' },
      });

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 3. Verify password
    const isMatch = await comparePinOrPassword(password, admin.passwordHash);
    if (!isMatch) {
      await recordFailedAttempt(normalizedEmail, 900);

      logSecurityEvent({
        type: 'AUTH_LOGIN_FAILURE',
        ip,
        userAgent,
        targetIdentifier: normalizedEmail,
        actorRole: 'ADMIN',
        details: { reason: 'INVALID_CREDENTIALS' },
      });

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 4. Two-Factor Authentication (2FA) verification
    const twoFactorCode = (body.twoFactorCode || body.code || body.otp || '').toString().trim();
    const is2FAEnforced = Boolean(
      admin.twoFactorEnabled ||
      admin.twoFactorSecret ||
      process.env.ADMIN_FORCE_2FA === 'true'
    );

    if (is2FAEnforced) {
      if (!twoFactorCode) {
        // Generate secure 6-digit Email OTP fallback
        const otpCode = generateEmailOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.admin.update({
          where: { id: admin.id },
          data: {
            tempTwoFactorCode: otpCode,
            tempTwoFactorExpires: expiresAt,
          },
        });

        console.log(`[Admin 2FA] Verification code dispatched for ${admin.email}: ${otpCode}`);

        return NextResponse.json({
          success: false,
          requireTwoFactor: true,
          email: admin.email,
          message: 'Two-factor authentication code required. Please enter the 6-digit code from your authenticator app or email.',
        });
      }

      // Verify submitted 2FA code (Check TOTP first, then temporary Email OTP)
      let is2FAValid = false;
      if (admin.twoFactorSecret) {
        is2FAValid = verifyTOTPCode(admin.twoFactorSecret, twoFactorCode);
      }

      if (!is2FAValid && admin.tempTwoFactorCode && admin.tempTwoFactorExpires) {
        const isNotExpired = new Date(admin.tempTwoFactorExpires) > new Date();
        if (isNotExpired && admin.tempTwoFactorCode === twoFactorCode) {
          is2FAValid = true;
        }
      }

      if (!is2FAValid) {
        await recordFailedAttempt(normalizedEmail, 900);

        logSecurityEvent({
          type: 'AUTH_LOGIN_FAILURE',
          ip,
          userAgent,
          targetIdentifier: normalizedEmail,
          actorRole: 'ADMIN',
          details: { reason: 'INVALID_2FA_CODE' },
        });

        return NextResponse.json(
          { error: 'Invalid or expired 2FA code. Please check your authenticator or email code.' },
          { status: 401 }
        );
      }

      // Clear consumed temporary code
      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          tempTwoFactorCode: null,
          tempTwoFactorExpires: null,
        },
      });

      await logAdminAudit({
        actorId: admin.id,
        actorEmail: admin.email,
        ipAddress: ip,
        action: 'ADMIN_2FA_VERIFIED',
        targetType: 'AUTH',
        targetId: admin.id,
        targetIdentifier: admin.email,
        details: { method: admin.twoFactorSecret ? 'TOTP' : 'EMAIL_OTP' },
      });
    }

    // 5. Successful login: reset throttling counters
    await resetRateLimit(`ip:${ip}`);
    await resetRateLimit(normalizedEmail);

    // 6. Establish secure session
    const sessionUser = {
      id: admin.id,
      role: 'ADMIN' as const,
      name: admin.name,
      email: admin.email,
    };
    await createSession(sessionUser);

    logSecurityEvent({
      type: 'AUTH_LOGIN_SUCCESS',
      ip,
      userAgent,
      actorId: admin.id,
      actorRole: 'ADMIN',
      targetIdentifier: admin.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Admin login successful',
      user: sessionUser,
    });
  } catch (error: any) {
    return NextResponse.json(formatSafeError(error, 'Admin Login POST'), { status: 500 });
  }
}
