import bcrypt from 'bcryptjs';

export type SecurityEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_LOGOUT'
  | 'ACCOUNT_LOCKED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED_ACCESS'
  | 'FILE_DOWNLOAD_ACCESS'
  | 'FILE_DOWNLOAD_BLOCKED'
  | 'INPUT_VALIDATION_FAILURE'
  | 'SUSPICIOUS_REQUEST'
  | 'MALWARE_DETECTED';

export interface SecurityEvent {
  type: SecurityEventType;
  ip: string;
  userAgent?: string;
  actorId?: string;
  actorRole?: string;
  targetIdentifier?: string; // registerNo, email, or submissionId
  details?: Record<string, any>;
}

/**
 * Extracts and sanitizes the true client IP from standard proxy headers.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // In multi-proxy setups, client is typically the first address in the chain
    const parts = forwardedFor.split(',');
    const rawIp = parts[0].trim();
    const cleanIp = sanitizeIp(rawIp);
    if (cleanIp) return cleanIp;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    const cleanIp = sanitizeIp(realIp.trim());
    if (cleanIp) return cleanIp;
  }

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    const cleanIp = sanitizeIp(cfIp.trim());
    if (cleanIp) return cleanIp;
  }

  return '127.0.0.1';
}

function sanitizeIp(ip: string): string | null {
  // Strip IPv6-mapped IPv4 prefix (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
  const normalized = ip.replace(/^::ffff:/, '').trim();

  // Basic IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(normalized)) {
    const octets = normalized.split('.').map(Number);
    const valid = octets.every((o) => o >= 0 && o <= 255);
    if (valid) return normalized;
  }

  // Basic IPv6 validation
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/;
  if (ipv6Regex.test(normalized) || normalized === '::1') {
    return normalized;
  }

  return null;
}

/**
 * Structured Security Audit Logger.
 * Outputs machine-readable JSON logs for ingestion by SIEM/CloudWatch/Datadog.
 */
export function logSecurityEvent(event: SecurityEvent): void {
  const logPayload = {
    timestamp: new Date().toISOString(),
    channel: 'SECURITY_AUDIT',
    event: event.type,
    ip: event.ip,
    actorId: event.actorId || 'anonymous',
    actorRole: event.actorRole || 'none',
    target: event.targetIdentifier || 'none',
    userAgent: event.userAgent || 'unknown',
    details: event.details || {},
  };

  console.log(`[SECURITY_AUDIT] ${JSON.stringify(logPayload)}`);
}

/**
 * Formats a safe production error message to prevent database/schema information leakage.
 */
export function formatSafeError(error: any, contextDescription?: string): { error: string; details?: string } {
  const errMsg = error?.message || (typeof error === 'string' ? error : 'Unknown error');
  console.error(`[SERVER_ERROR] ${contextDescription || 'Unhandled Exception'}:`, error);

  let userFriendlyError = 'An internal server error occurred. Please try again later.';

  if (error?.code === 'P2024' || errMsg.includes('connection pool') || errMsg.includes('Timed out fetching')) {
    userFriendlyError = 'Database is currently busy. Please wait a moment and try again.';
  } else if (
    error?.code === 'P1001' ||
    errMsg.includes('connect ECONNREFUSED') ||
    errMsg.includes("Can't reach database server")
  ) {
    userFriendlyError = 'Unable to reach the database server. Please check database connectivity.';
  } else if (errMsg.includes('__TURBOPACK__') || errMsg.includes('invocation in')) {
    userFriendlyError = 'A database request error occurred. Please try again.';
  } else if (
    errMsg.includes('password') ||
    errMsg.includes('authentication') ||
    errMsg.includes('relation') ||
    errMsg.includes('FATAL') ||
    errMsg.includes('postgres') ||
    errMsg.includes('mongo') ||
    errMsg.includes('public.')
  ) {
    userFriendlyError = 'An internal server error occurred. Please try again later.';
  } else if (errMsg && !errMsg.includes('node_modules') && !errMsg.includes('prisma')) {
    userFriendlyError = errMsg;
  }

  return {
    error: userFriendlyError,
    details: process.env.NODE_ENV !== 'production' ? errMsg : undefined,
  };
}

// Precomputed Bcrypt hash of a dummy password to mitigate side-channel timing attacks
const DUMMY_HASH = '$2a$10$7EqJtq98hPqEX7fNZaFWoO0VpI8Y.Gf5m0xH9N/X6o2G1aN9sB.8e';

/**
 * Performs a constant-time Bcrypt comparison to prevent username enumeration timing attacks.
 */
export async function dummyBcryptCompare(): Promise<void> {
  await bcrypt.compare('dummy_input_value', DUMMY_HASH);
}

/**
 * Validates critical production security environment configuration.
 * Fails fast if weak, default, or missing secrets are detected in production.
 */
export function validateProductionSecurityEnvironment(): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  const isProd = process.env.NODE_ENV === 'production';

  const sessionSecret = process.env.SESSION_SECRET || '';
  if (!sessionSecret) {
    errors.push('SESSION_SECRET is not defined. Session generation will fail.');
  } else if (sessionSecret === 'arvr_secret_key_change_in_production_32chars_min') {
    if (isProd) {
      errors.push('CRITICAL: Default placeholder SESSION_SECRET is in use in production! Generate a 64-char key using "openssl rand -hex 32".');
    } else {
      warnings.push('NOTICE: Default placeholder SESSION_SECRET is in use (development only).');
    }
  } else if (sessionSecret.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters long for cryptographic security.');
  }

  const cronSecret = process.env.CRON_SECRET || '';
  if (!cronSecret) {
    if (isProd) {
      warnings.push('CRON_SECRET is not set; falling back to SESSION_SECRET for scheduled cron watchdog authentication.');
    }
  } else if (cronSecret === sessionSecret) {
    warnings.push('CRON_SECRET should be distinct from SESSION_SECRET for principle of least privilege.');
  }

  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl && !dbUrl.includes('retryWrites=true')) {
    warnings.push('DATABASE_URL should include "retryWrites=true" for high-availability cloud resilience.');
  }

  return { valid: errors.length === 0, warnings, errors };
}
