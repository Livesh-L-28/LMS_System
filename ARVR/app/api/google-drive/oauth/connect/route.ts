import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getOAuth2ClientAsync } from '@/lib/googleDrive';

export async function GET(request: Request) {
  try {
    await requireAuth(['ADMIN']);

    const oauth2Client = await getOAuth2ClientAsync(request.url);

    if (!oauth2Client._clientId || !oauth2Client._clientSecret) {
      return NextResponse.json(
        { error: 'Please enter and save your Google Client ID and Client Secret below before connecting.' },
        { status: 400 }
      );
    }

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'consent',
    });

    return NextResponse.json({ success: true, url: authUrl });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to initiate Google OAuth flow.' }, { status: 500 });
  }
}
