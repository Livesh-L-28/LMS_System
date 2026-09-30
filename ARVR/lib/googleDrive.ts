import { google } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Encryption setup for Refresh Token storage
const ENCRYPTION_KEY = process.env.SESSION_SECRET || 'arvr_secret_key_change_in_production_32chars_min';
const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

export function encryptToken(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptToken(text: string): string {
  if (!text) return '';
  // If plain text (e.g. env var or unencrypted legacy token)
  if (!text.includes(':')) return text;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = parts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return text;
  }
}

/**
 * Returns configured OAuth2 Client instance using database settings or environment variables
 */
export async function getOAuth2ClientAsync(reqUrl?: string) {
  let clientId = '';
  let clientSecret = '';

  try {
    const idSetting = await prisma.systemSetting.findUnique({ where: { key: 'GOOGLE_CLIENT_ID' } });
    const secSetting = await prisma.systemSetting.findUnique({ where: { key: 'GOOGLE_CLIENT_SECRET' } });
    if (idSetting?.value) clientId = idSetting.value.trim();
    if (secSetting?.value) clientSecret = secSetting.value.trim();
  } catch (e) {
    console.error('Failed to read Google credentials from SystemSetting:', e);
  }

  if (!clientId) clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  if (!clientSecret) clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();

  let redirectUri = process.env.GOOGLE_REDIRECT_URI || '';
  if (!redirectUri && reqUrl) {
    try {
      const parsedUrl = new URL(reqUrl);
      if (!parsedUrl.origin.includes('0.0.0.0') && !parsedUrl.origin.includes('127.0.0.1') && !parsedUrl.origin.includes('10000')) {
        redirectUri = `${parsedUrl.origin}/api/google-drive/oauth/callback`;
      }
    } catch {}
  }
  if (!redirectUri || redirectUri.includes('0.0.0.0') || redirectUri.includes('10000')) {
    redirectUri = 'https://lms.xarc.online/api/google-drive/oauth/callback';
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://lms.xarc.online/api/google-drive/oauth/callback';

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Retrieves current Admin Google Drive connection from DB or env fallback
 */
export async function getAdminDriveConnection() {
  try {
    const conn = await prisma.googleDriveConnection.findFirst({
      where: { status: 'CONNECTED' },
    });

    if (conn && conn.refreshTokenEncrypted) {
      return {
        id: conn.id,
        googleAccountEmail: conn.googleAccountEmail,
        refreshToken: decryptToken(conn.refreshTokenEncrypted),
        rootFolderId: conn.rootFolderId,
        connectedAt: conn.connectedAt,
        status: conn.status,
      };
    }

    // Fallback: Check environment variable GOOGLE_DRIVE_REFRESH_TOKEN
    if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
      return {
        id: 'env-connection',
        googleAccountEmail: 'Admin (Environment Credentials)',
        refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
        rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null,
        connectedAt: new Date(),
        status: 'CONNECTED',
      };
    }

    return null;
  } catch (e) {
    console.error('Error reading Google Drive connection:', e);
    return null;
  }
}

/**
 * Gets an authorized Google Drive API v3 client instance using Admin's Refresh Token
 */
export async function getDriveClientForAdmin() {
  const conn = await getAdminDriveConnection();
  if (!conn || !conn.refreshToken || conn.status !== 'CONNECTED') {
    return { drive: null, connection: null, error: 'Google Drive is not connected.' };
  }

  try {
    const oauth2Client = await getOAuth2ClientAsync();
    oauth2Client.setCredentials({
      refresh_token: conn.refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    return { drive, connection: conn, error: null };
  } catch (e: any) {
    console.error('Failed to initialize Google Drive client:', e);
    return { drive: null, connection: conn, error: e.message || 'Drive client initialization failed' };
  }
}

/**
 * Ensures root folder "ARVR_Student_Submissions" exists in Admin's Google Drive
 */
export async function ensureRootFolder(drive: any, connectionId?: string): Promise<string> {
  const rootFolderName = 'ARVR_Student_Submissions';

  // 1. Search for existing root folder
  const rootSearch = await drive.files.list({
    q: `name = '${rootFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });

  let rootFolderId: string;

  if (rootSearch.data.files && rootSearch.data.files.length > 0) {
    rootFolderId = rootSearch.data.files[0].id!;
  } else {
    // 2. Create root folder if it doesn't exist
    const rootFolder = await drive.files.create({
      requestBody: {
        name: rootFolderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });
    rootFolderId = rootFolder.data.id!;
  }

  // Update rootFolderId in DB if connectionId is provided
  if (connectionId && connectionId !== 'env-connection') {
    try {
      await prisma.googleDriveConnection.update({
        where: { id: connectionId },
        data: { rootFolderId },
      });
    } catch (e) {
      // ignore non-critical db update error
    }
  }

  return rootFolderId;
}

/**
 * Ensures Batch Folder exists inside ARVR_Student_Submissions in Admin's Google Drive.
 * Folder name format: "{Batch_Number} - {Level}" (e.g. "ARVR-L1-001 - Level 1")
 */
export async function ensureBatchFolder(
  drive: any,
  rootFolderId: string,
  batchId: string,
  defaultBatchName: string
): Promise<string> {
  let targetFolderName = defaultBatchName;

  if (batchId) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { name: true, batchNo: true, level: true, googleDriveFolderId: true },
    });

    if (batch) {
      const bName = batch.batchNo || batch.name;
      const bLevel = batch.level || '';
      if (bName && bLevel && !bName.toLowerCase().includes(bLevel.toLowerCase())) {
        targetFolderName = `${bName} - ${bLevel}`;
      } else {
        targetFolderName = bName;
      }

      if (batch.googleDriveFolderId) {
        try {
          const existingFolder = await drive.files.get({
            fileId: batch.googleDriveFolderId,
            fields: 'id, trashed',
          });
          if (existingFolder.data && !existingFolder.data.trashed) {
            return batch.googleDriveFolderId;
          }
        } catch (e) {
          // Folder deleted or invalid, recreate
        }
      }
    }
  }

  const cleanBatchFolderName = targetFolderName.trim().replace(/[/\\?%*:|"<>]/g, '_');

  const batchSearch = await drive.files.list({
    q: `name = '${cleanBatchFolderName}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });

  let batchFolderId: string;

  if (batchSearch.data.files && batchSearch.data.files.length > 0) {
    batchFolderId = batchSearch.data.files[0].id!;
  } else {
    const batchFolder = await drive.files.create({
      requestBody: {
        name: cleanBatchFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootFolderId],
      },
      fields: 'id',
    });
    batchFolderId = batchFolder.data.id!;
  }

  if (batchId) {
    try {
      await prisma.batch.update({
        where: { id: batchId },
        data: { googleDriveFolderId: batchFolderId },
      });
    } catch (e) {
      console.error('Failed to update batch googleDriveFolderId:', e);
    }
  }

  return batchFolderId;
}

/**
 * Ensures Day Folder (e.g. "Day 1", "Day 2", "Day 3") exists inside Batch Folder
 */
export async function ensureDayFolder(
  drive: any,
  batchFolderId: string,
  dayNumber: number
): Promise<string> {
  const dayFolderName = `Day ${dayNumber}`;

  const daySearch = await drive.files.list({
    q: `name = '${dayFolderName}' and '${batchFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });

  if (daySearch.data.files && daySearch.data.files.length > 0) {
    return daySearch.data.files[0].id!;
  }

  const dayFolder = await drive.files.create({
    requestBody: {
      name: dayFolderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [batchFolderId],
    },
    fields: 'id',
  });

  return dayFolder.data.id!;
}

/**
 * Uploads task submission file directly to Admin's Google Drive.
 * Structure: ARVR_Student_Submissions / {BatchNo - Level} / Day {DayNumber} / {USERNAME}_Day{TRAINING_DAY}.{EXTENSION}
 */
export async function uploadTaskSubmissionToDrive(options: {
  fileBuffer: Buffer;
  originalFilename: string;
  mimeType: string;
  batchId: string;
  batchName: string;
  dayNumber: number;
  registerNo: string;
}): Promise<{
  googleDriveFileId: string;
  googleDriveFolderId: string;
  storedFilename: string;
  originalFilename: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
}> {
  const { fileBuffer, originalFilename, mimeType, batchId, batchName, dayNumber, registerNo } = options;

  // Verify Google Drive connection
  const { drive, connection, error } = await getDriveClientForAdmin();

  if (!drive || error) {
    throw new Error('GOOGLE_DRIVE_NOT_CONNECTED');
  }

  // Sanitize student register number
  const cleanRegNo = registerNo.trim().replace(/[^a-zA-Z0-9_-]/g, '_');

  // Preserve original extension
  const rawExt = path.extname(originalFilename).toLowerCase();
  const ext = rawExt ? rawExt : '.pdf';

  // Standardized filename: {USERNAME}_Day{TRAINING_DAY}.{EXTENSION}
  const storedFilename = `${cleanRegNo}_Day${dayNumber}${ext}`;
  const fileSize = fileBuffer.length;

  try {
    // 1. Get or create root folder "ARVR_Student_Submissions"
    const rootFolderId = await ensureRootFolder(drive, connection?.id);

    // 2. Get or create Batch folder (e.g. "ARVR-L1-001 - Level 1") inside root folder
    const batchFolderId = await ensureBatchFolder(drive, rootFolderId, batchId, batchName);

    // 3. Get or create Day folder (e.g. "Day 1", "Day 2") inside batch folder
    const dayFolderId = await ensureDayFolder(drive, batchFolderId, dayNumber);

    // 4. Check if file with exact name already exists in Day folder
    const fileSearch = await drive.files.list({
      q: `name = '${storedFilename}' and '${dayFolderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
    });

    let driveFileId: string;
    const media = {
      mimeType: mimeType || 'application/octet-stream',
      body: Readable.from(fileBuffer),
    };

    if (fileSearch.data.files && fileSearch.data.files.length > 0) {
      // Update existing file content
      const existingId = fileSearch.data.files[0].id!;
      const updatedFile = await drive.files.update({
        fileId: existingId,
        media,
        fields: 'id, webViewLink, webContentLink',
      });
      driveFileId = updatedFile.data.id || existingId;
    } else {
      // Upload new file inside Day folder
      const newFile = await drive.files.create({
        requestBody: {
          name: storedFilename,
          parents: [dayFolderId],
        },
        media,
        fields: 'id, webViewLink, webContentLink',
      });
      driveFileId = newFile.data.id!;
    }

    // 5. Make file viewable via link
    try {
      await drive.permissions.create({
        fileId: driveFileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permErr) {
      // Ignore domain permission restriction errors
    }

    const fileUrl = `https://drive.google.com/file/d/${driveFileId}/view`;

    return {
      googleDriveFileId: driveFileId,
      googleDriveFolderId: dayFolderId,
      storedFilename,
      originalFilename,
      fileSize,
      fileType: mimeType || 'application/pdf',
      fileUrl,
    };
  } catch (err: any) {
    console.error('Google Drive Upload Failed:', err);
    throw new Error(err.message || 'Failed to upload file to Google Drive');
  }
}

/**
 * Tests stored Google Drive OAuth connection
 */
export async function testAdminDriveConnection(): Promise<{ success: boolean; message: string; account?: string }> {
  const { drive, connection, error } = await getDriveClientForAdmin();

  if (!drive || error) {
    return {
      success: false,
      message: '✗ Google Drive connection failed.',
    };
  }

  try {
    // Call Google Drive files.list to verify read access
    await drive.files.list({ pageSize: 1, fields: 'files(id)' });

    return {
      success: true,
      message: '✓ Google Drive connection is working.',
      account: connection?.googleAccountEmail || 'Connected Account',
    };
  } catch (err: any) {
    console.error('Google Drive connection test error:', err);
    return {
      success: false,
      message: '✗ Google Drive connection failed.',
    };
  }
}
