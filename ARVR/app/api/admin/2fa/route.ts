import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generateBase32Secret, getTOTPUri, verifyTOTPCode } from '@/lib/totp';
import { logAdminAudit } from '@/lib/auditLog';
import { getClientIp } from '@/lib/security';

export async function GET() {
  try {
    const user = await requireAuth(['ADMIN']);
    const admin = await prisma.admin.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      twoFactorEnabled: Boolean(admin.twoFactorEnabled),
      hasSecret: Boolean(admin.twoFactorSecret),
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch 2FA status' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(['ADMIN']);
    const ip = getClientIp(request);
    const body = await request.json();
    const { action, code } = body;

    const admin = await prisma.admin.findUnique({
      where: { id: user.id },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }

    // 1. SETUP: Generate a new TOTP secret & QR code URI
    if (action === 'setup') {
      const secret = generateBase32Secret(20);
      const qrUri = getTOTPUri(secret, admin.email, 'ARVR LMS');

      await prisma.admin.update({
        where: { id: admin.id },
        data: { twoFactorSecret: secret },
      });

      return NextResponse.json({
        success: true,
        secret,
        qrUri,
        message: 'Scan the QR code or enter secret into Google Authenticator/Authy, then verify with a 6-digit code.',
      });
    }

    // 2. ENABLE: Confirm setup by verifying 6-digit code from authenticator app
    if (action === 'enable') {
      if (!admin.twoFactorSecret) {
        return NextResponse.json(
          { error: 'Please initiate 2FA setup first before enabling.' },
          { status: 400 }
        );
      }

      if (!code || !verifyTOTPCode(admin.twoFactorSecret, String(code).trim())) {
        return NextResponse.json(
          { error: 'Invalid 6-digit code. Please enter the current code from your authenticator app.' },
          { status: 400 }
        );
      }

      await prisma.admin.update({
        where: { id: admin.id },
        data: { twoFactorEnabled: true },
      });

      await logAdminAudit({
        actorId: admin.id,
        actorEmail: admin.email,
        ipAddress: ip,
        action: '2FA_ENABLED',
        targetType: 'ADMIN',
        targetId: admin.id,
        targetIdentifier: admin.email,
        details: { method: 'TOTP' },
      });

      return NextResponse.json({
        success: true,
        message: 'Two-Factor Authentication has been successfully enabled on your administrator account.',
      });
    }

    // 3. DISABLE: Turn off 2FA
    if (action === 'disable') {
      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          tempTwoFactorCode: null,
          tempTwoFactorExpires: null,
        },
      });

      await logAdminAudit({
        actorId: admin.id,
        actorEmail: admin.email,
        ipAddress: ip,
        action: '2FA_DISABLED',
        targetType: 'ADMIN',
        targetId: admin.id,
        targetIdentifier: admin.email,
      });

      return NextResponse.json({
        success: true,
        message: 'Two-Factor Authentication disabled.',
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('2FA management error:', error);
    return NextResponse.json({ error: 'Failed to update 2FA configuration' }, { status: 500 });
  }
}
