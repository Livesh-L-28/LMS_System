import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Megabytes

export const ALLOWED_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'pdf',
  'mp4',
  'zip',
  'docx',
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export const EXTENSION_TO_MIME: Record<AllowedExtension, string[]> = {
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  pdf: ['application/pdf'],
  mp4: ['video/mp4'],
  zip: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/octet-stream',
  ],
};

let s3ClientInstance: S3Client | null = null;

export function getS3Client(): S3Client {
  if (s3ClientInstance) return s3ClientInstance;

  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'test';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'test';
  const endpoint = process.env.AWS_S3_ENDPOINT || undefined;

  s3ClientInstance = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    endpoint,
    forcePathStyle: !!endpoint, // Required for LocalStack / local S3 emulator
  });

  return s3ClientInstance;
}

export function getBucketName(): string {
  return process.env.AWS_S3_BUCKET_NAME || 'arvr-submissions-private';
}

/**
 * Sanitizes input filename to avoid path-traversal, dangerous chars, and excessive length.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'submission_file';
  // Strip path directory information (e.g. ../../../etc/passwd)
  const base = path.basename(filename);
  const ext = path.extname(base).toLowerCase();
  const nameWithoutExt = path.basename(base, ext);
  
  const cleanName = nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 80);
  
  return `${cleanName || 'file'}${ext}`;
}

/**
 * Validates file extension, MIME type, and size against security constraints.
 */
export function validateFileMetadata(
  filename: string,
  mimeType: string,
  fileSize: number
): {
  valid: boolean;
  error?: string;
  cleanExt?: AllowedExtension;
  normalizedMime?: string;
} {
  if (!filename || typeof filename !== 'string') {
    return { valid: false, error: 'Filename is required and must be a string.' };
  }

  const rawExt = path.extname(filename).toLowerCase().replace(/^\./, '');
  if (!ALLOWED_EXTENSIONS.includes(rawExt as AllowedExtension)) {
    return {
      valid: false,
      error: `Invalid file extension ".${rawExt}". Allowed formats: PNG, JPG, WebP, PDF, MP4, ZIP, DOCX.`,
    };
  }

  const cleanExt = rawExt as AllowedExtension;
  const allowedMimes = EXTENSION_TO_MIME[cleanExt];

  const normalizedMime = (mimeType || '').toLowerCase().trim();
  if (!allowedMimes.includes(normalizedMime)) {
    return {
      valid: false,
      error: `MIME type "${mimeType}" is not permitted for .${cleanExt} files.`,
    };
  }

  if (typeof fileSize !== 'number' || fileSize <= 0) {
    return { valid: false, error: 'File size must be greater than 0 bytes.' };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(fileSize / (1024 * 1024)).toFixed(1)} MB) exceeds maximum limit of 50 MB.`,
    };
  }

  return {
    valid: true,
    cleanExt,
    normalizedMime,
  };
}

/**
 * Verifies magic bytes signature on binary buffer.
 */
export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  const mime = mimeType.toLowerCase();

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (mime === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // JPEG: FF D8 FF
  if (mime === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // WebP: RIFF ... WEBP
  if (mime === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  // PDF: %PDF
  if (mime === 'application/pdf') {
    return buffer.length >= 4 && buffer.toString('ascii', 0, 4) === '%PDF';
  }

  // MP4: offset 4: 'ftyp'
  if (mime === 'video/mp4') {
    return buffer.length >= 8 && buffer.toString('ascii', 4, 8) === 'ftyp';
  }

  // ZIP / DOCX: 50 4B 03 04 ('PK..') or 50 4B 05 06 / 50 4B 07 08
  if (
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/octet-stream'
  ) {
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
    );
  }

  return true;
}

/**
 * Generates an S3 presigned PUT URL for direct browser upload.
 */
export async function generatePresignedUploadUrl(options: {
  batchId: string;
  trainingDayId: string;
  studentId: string;
  registerNo: string;
  dayNumber: number;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  expiresInSeconds?: number;
}): Promise<{
  uploadUrl: string;
  s3Key: string;
  storedFilename: string;
  expiresIn: number;
  bucket: string;
}> {
  const {
    batchId,
    trainingDayId,
    studentId,
    registerNo,
    dayNumber,
    originalFilename,
    mimeType,
    fileSize,
    expiresInSeconds = 900, // 15 minutes default
  } = options;

  const validation = validateFileMetadata(originalFilename, mimeType, fileSize);
  if (!validation.valid || !validation.cleanExt) {
    throw new Error(validation.error || 'Invalid upload metadata');
  }

  const cleanRegNo = registerNo.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const storedFilename = `${cleanRegNo}_Day${dayNumber}.${validation.cleanExt}`;
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  
  // Secure partitioned object key: submissions/{batchId}/{trainingDayId}/{studentId}_{timestamp}_{random}.{ext}
  const s3Key = `submissions/${encodeURIComponent(batchId)}/${encodeURIComponent(trainingDayId)}/${encodeURIComponent(studentId)}_${Date.now()}_${randomSuffix}.${validation.cleanExt}`;
  const bucket = getBucketName();
  const s3 = getS3Client();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: validation.normalizedMime,
    ContentLength: fileSize,
    Metadata: {
      studentId,
      registerNo: cleanRegNo,
      originalFilename: sanitizeFilename(originalFilename),
      trainingDayId,
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });

  return {
    uploadUrl,
    s3Key,
    storedFilename,
    expiresIn: expiresInSeconds,
    bucket,
  };
}

/**
 * Generates an S3 presigned GET URL for secure, temporary file viewing or download.
 */
export async function generatePresignedDownloadUrl(options: {
  s3Key: string;
  filename?: string;
  isDownload?: boolean;
  expiresInSeconds?: number;
}): Promise<string> {
  const { s3Key, filename, isDownload = false, expiresInSeconds = 900 } = options;
  const s3 = getS3Client();
  const bucket = getBucketName();

  let responseContentDisposition: string | undefined = undefined;
  if (isDownload && filename) {
    const safeName = sanitizeFilename(filename);
    responseContentDisposition = `attachment; filename="${safeName}"`;
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ResponseContentDisposition: responseContentDisposition,
  });

  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * Directly uploads a buffer to S3 (used for backward compatibility or automated scripts).
 */
export async function directUploadToS3(options: {
  buffer: Buffer;
  s3Key: string;
  mimeType: string;
  originalFilename?: string;
  studentId?: string;
}): Promise<{ s3Key: string; bucket: string; fileSize: number }> {
  const { buffer, s3Key, mimeType, originalFilename, studentId } = options;
  const s3 = getS3Client();
  const bucket = getBucketName();

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
      ContentLength: buffer.length,
      Metadata: {
        ...(originalFilename ? { originalFilename: sanitizeFilename(originalFilename) } : {}),
        ...(studentId ? { studentId } : {}),
      },
    })
  );

  return {
    s3Key,
    bucket,
    fileSize: buffer.length,
  };
}

/**
 * Verifies that the object exists in S3, matches size/MIME constraints,
 * and validates magic bytes using an efficient range request.
 */
export async function verifyS3Object(options: {
  s3Key: string;
  expectedMime: string;
  expectedSize: number;
}): Promise<{
  verified: boolean;
  actualSize: number;
  actualMime: string;
  error?: string;
}> {
  const { s3Key, expectedMime, expectedSize } = options;
  const s3 = getS3Client();
  const bucket = getBucketName();

  try {
    // 1. Verify object existence and metadata via HEAD
    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      })
    );

    const actualSize = head.ContentLength ?? 0;
    const actualMime = (head.ContentType || '').toLowerCase().trim();

    if (actualSize <= 0 || actualSize > MAX_FILE_SIZE) {
      return {
        verified: false,
        actualSize,
        actualMime,
        error: `Verified object size (${actualSize} bytes) is out of bounds.`,
      };
    }

    if (expectedSize > 0 && Math.abs(actualSize - expectedSize) > 1024) {
      return {
        verified: false,
        actualSize,
        actualMime,
        error: `Verified object size (${actualSize} bytes) differs significantly from expected size (${expectedSize} bytes).`,
      };
    }

    // 2. Fetch first 32 bytes to inspect binary magic bytes
    const rangeCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Range: 'bytes=0-31',
    });

    const rangeRes = await s3.send(rangeCommand);
    if (!rangeRes.Body) {
      return { verified: false, actualSize, actualMime, error: 'Could not read object bytes from S3.' };
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of rangeRes.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const headerBuffer = Buffer.concat(chunks);

    const magicValid = validateMagicBytes(headerBuffer, expectedMime);
    if (!magicValid) {
      return {
        verified: false,
        actualSize,
        actualMime,
        error: `Magic byte header verification failed for MIME type "${expectedMime}".`,
      };
    }

    return {
      verified: true,
      actualSize,
      actualMime,
    };
  } catch (err: any) {
    console.error('verifyS3Object error:', err);
    return {
      verified: false,
      actualSize: 0,
      actualMime: '',
      error: err.name === 'NotFound' ? 'Object does not exist in S3' : err.message || 'S3 verification failed',
    };
  }
}

/**
 * Deletes an object from private S3 bucket (used for orphan cleanup or resubmission replacement).
 */
export async function deleteS3Object(s3Key: string): Promise<void> {
  if (!s3Key) return;
  const s3 = getS3Client();
  const bucket = getBucketName();

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      })
    );
  } catch (err: any) {
    console.warn(`[S3 Cleanup Warning] Could not delete object ${s3Key}:`, err.message || err);
  }
}
