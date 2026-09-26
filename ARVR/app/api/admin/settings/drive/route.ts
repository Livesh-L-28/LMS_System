import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await requireAuth(['ADMIN']);

    const connection = await prisma.googleDriveConnection.findFirst();
    const hasConnectionRecord = Boolean(connection && connection.status === 'CONNECTED' && connection.refreshTokenEncrypted);

    let isHealthy = false;
    let statusText = 'Not Connected';
    let healthMessage = 'Google Drive is not linked.';

    if (hasConnectionRecord) {
      const { testAdminDriveConnection } = await import('@/lib/googleDrive');
      const testResult = await testAdminDriveConnection();
      isHealthy = testResult.success;
      if (isHealthy) {
        statusText = 'Connected & Verified ✓';
        healthMessage = 'Google Drive storage is operational.';
      } else {
        statusText = 'Action Needed (Token Expired)';
        healthMessage = 'OAuth token has expired or was revoked. Please click Reconnect.';
      }
    }

    // Retrieve saved credentials (from DB or env)
    const idSetting = await prisma.systemSetting.findUnique({ where: { key: 'GOOGLE_CLIENT_ID' } });
    const secSetting = await prisma.systemSetting.findUnique({ where: { key: 'GOOGLE_CLIENT_SECRET' } });
    
    const clientId = idSetting?.value || process.env.GOOGLE_CLIENT_ID || '';
    const hasSecret = Boolean(secSetting?.value || process.env.GOOGLE_CLIENT_SECRET);

    let redirectUri = process.env.GOOGLE_REDIRECT_URI || '';
    try {
      const origin = new URL(request.url).origin;
      redirectUri = `${origin}/api/google-drive/oauth/callback`;
    } catch {}

    return NextResponse.json({
      success: true,
      isConnected: hasConnectionRecord && isHealthy,
      hasConnectionRecord,
      isHealthy,
      status: statusText,
      message: healthMessage,
      connectedAccount: hasConnectionRecord ? connection?.googleAccountEmail || 'Connected Google Account' : null,
      connectedAt: hasConnectionRecord ? connection?.connectedAt : null,
      clientId,
      hasSecret,
      redirectUri: redirectUri || 'https://lms-system-zfzc.onrender.com/api/google-drive/oauth/callback',
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch Google Drive status' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth(['ADMIN']);
    const body = await request.json();
    const { clientId, clientSecret } = body;

    if (!clientId || typeof clientId !== 'string' || !clientId.trim()) {
      return NextResponse.json({ error: 'Valid Google Client ID is required.' }, { status: 400 });
    }

    // Upsert client ID
    await prisma.systemSetting.upsert({
      where: { key: 'GOOGLE_CLIENT_ID' },
      update: { value: clientId.trim() },
      create: { key: 'GOOGLE_CLIENT_ID', value: clientId.trim() },
    });

    // Upsert client secret if provided
    if (clientSecret && typeof clientSecret === 'string' && clientSecret.trim()) {
      await prisma.systemSetting.upsert({
        where: { key: 'GOOGLE_CLIENT_SECRET' },
        update: { value: clientSecret.trim() },
        create: { key: 'GOOGLE_CLIENT_SECRET', value: clientSecret.trim() },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Google OAuth credentials saved successfully in database!',
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to save credentials' }, { status: 500 });
  }
}
