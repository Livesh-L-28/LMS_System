import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { getOAuth2ClientAsync, encryptToken } from '@/lib/googleDrive';

function getRedirectUrl(request: Request, pathWithQuery: string): URL {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host');

  let baseUrl = '';
  if (forwardedHost && !forwardedHost.includes('0.0.0.0')) {
    baseUrl = `${forwardedProto}://${forwardedHost}`;
  } else if (host && !host.includes('0.0.0.0') && !host.includes('10000')) {
    const proto = host.includes('localhost') ? 'http' : 'https';
    baseUrl = `${proto}://${host}`;
  } else if (process.env.NEXT_PUBLIC_APP_URL) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  } else {
    baseUrl = 'https://lms.xarc.online';
  }

  return new URL(pathWithQuery, baseUrl);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth authorization error:', error);
      return NextResponse.redirect(getRedirectUrl(request, `/?drive_error=${encodeURIComponent(error)}#settings`));
    }

    if (!code) {
      return NextResponse.redirect(getRedirectUrl(request, '/?drive_error=no_code#settings'));
    }

    const oauth2Client = await getOAuth2ClientAsync(request.url);

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user info (email) from Google API
    let googleAccountEmail = 'Connected Admin Account';
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      if (userInfo.data.email) {
        googleAccountEmail = userInfo.data.email;
      }
    } catch (userInfoErr) {
      console.error('Failed to fetch Google user info:', userInfoErr);
    }

    // Save refresh token securely in GoogleDriveConnection table
    const refreshToken = tokens.refresh_token;

    if (refreshToken) {
      const encryptedRefreshToken = encryptToken(refreshToken);

      // Wipe old connections and save new authorized connection
      await prisma.googleDriveConnection.deleteMany();
      await prisma.googleDriveConnection.create({
        data: {
          googleAccountEmail,
          refreshTokenEncrypted: encryptedRefreshToken,
          status: 'CONNECTED',
        },
      });
    } else {
      // If refresh token wasn't returned, update existing or log warning
      const existingConn = await prisma.googleDriveConnection.findFirst();
      if (existingConn && existingConn.refreshTokenEncrypted) {
        await prisma.googleDriveConnection.update({
          where: { id: existingConn.id },
          data: {
            googleAccountEmail,
            status: 'CONNECTED',
            connectedAt: new Date(),
          },
        });
      } else {
        // Force new connection if no refresh token
        await prisma.googleDriveConnection.deleteMany();
      }
    }

    // Redirect to Admin Settings UI
    return NextResponse.redirect(getRedirectUrl(request, '/?drive_connected=true#settings'));
  } catch (err: any) {
    console.error('Google OAuth callback handler error:', err);
    const errorDetail = err?.response?.data?.error_description || err?.message || 'callback_failed';
    return NextResponse.redirect(getRedirectUrl(request, `/?drive_error=${encodeURIComponent(errorDetail)}#settings`));
  }
}

