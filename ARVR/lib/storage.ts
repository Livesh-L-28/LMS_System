import path from 'path';
import crypto from 'crypto';
import { directUploadToS3, getBucketName } from './s3';

/**
 * Uploads a file buffer directly to private AWS S3 storage.
 * Eliminates insecure local /public disk storage.
 */
export async function saveTaskScreenshot(
  fileBuffer: Buffer,
  fileName: string,
  batchName: string,
  dayNumber: number,
  registerNo: string
): Promise<string> {
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_');
  const rawExt = path.extname(fileName).toLowerCase();
  const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.mp4', '.zip', '.docx'];
  const ext = allowedExts.includes(rawExt) ? rawExt : '.png';

  const cleanBatchName = sanitize(batchName);
  const cleanRegNo = sanitize(registerNo);
  const randomSuffix = crypto.randomBytes(6).toString('hex');

  const s3Key = `submissions/${cleanBatchName}/Day-${dayNumber}/${cleanRegNo}_${Date.now()}_${randomSuffix}${ext}`;

  let mimeType = 'application/octet-stream';
  if (['.png'].includes(ext)) mimeType = 'image/png';
  else if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
  else if (['.webp'].includes(ext)) mimeType = 'image/webp';
  else if (['.pdf'].includes(ext)) mimeType = 'application/pdf';
  else if (['.mp4'].includes(ext)) mimeType = 'video/mp4';
  else if (['.zip'].includes(ext)) mimeType = 'application/zip';
  else if (['.docx'].includes(ext)) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  await directUploadToS3({
    buffer: fileBuffer,
    s3Key,
    mimeType,
    originalFilename: fileName,
  });

  return `s3://${getBucketName()}/${s3Key}`;
}
