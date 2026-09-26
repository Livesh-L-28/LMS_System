import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { getOAuth2ClientAsync, encryptToken } from '@/lib/googleDrive';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth authorization error:', error);
      return NextResponse.redirect(new URL('/?drive_error=auth_denied#settings', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/?drive_error=no_code#settings', request.url));
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
    return NextResponse.redirect(new URL('/?drive_connected=true#settings', request.url));
  } catch (err: any) {
    console.error('Google OAuth callback handler error:', err);
    return NextResponse.redirect(new URL('/?drive_error=callback_failed#settings', request.url));
  }
}
