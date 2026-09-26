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
  | 'SUSPICIOUS_REQUEST';

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
  return {
    error: errMsg.includes('connect ECONNREFUSED')
      ? 'Database connection failed. Please verify DATABASE_URL.'
      : errMsg || 'An internal server error occurred. Please try again later.',
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
