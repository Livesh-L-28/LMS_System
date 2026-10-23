import crypto from 'crypto';

// Standard RFC 4648 Base32 alphabet
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generates a random Base32 secret for TOTP authenticator apps (Google Authenticator, Authy).
 */
export function generateBase32Secret(length = 20): string {
  const randomBytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < randomBytes.length; i++) {
    secret += BASE32_ALPHABET[randomBytes[i] % 32];
  }
  return secret;
}

/**
 * Decodes a Base32 string into a binary Buffer.
 */
function base32ToBuffer(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = '';
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Calculates an RFC 6238 TOTP 6-digit code for a given secret at current time.
 */
export function generateTOTPCode(secret: string, timeStep = 30): string {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter), 0);

  const key = base32ToBuffer(secret);
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = codeInt % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP code against an authenticator secret with window drift tolerance (±1 step = ±30s).
 */
export function verifyTOTPCode(secret: string, token: string, window = 1, timeStep = 30): boolean {
  if (!secret || !token || token.length !== 6) return false;
  const currentCounter = Math.floor(Date.now() / 1000 / timeStep);
  const key = base32ToBuffer(secret);

  for (let i = -window; i <= window; i++) {
    const counter = currentCounter + i;
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigUInt64BE(BigInt(counter), 0);

    const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const codeInt =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = (codeInt % 1000000).toString().padStart(6, '0');
    if (crypto.timingSafeEqual(Buffer.from(otp), Buffer.from(token))) {
      return true;
    }
  }

  return false;
}

/**
 * Formats a key URI for Google Authenticator / Authy QR code setup.
 */
export function getTOTPUri(secret: string, email: string, issuer = 'ARVR LMS'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a cryptographically random 6-digit numeric OTP for email verification fallback.
 */
export function generateEmailOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}
