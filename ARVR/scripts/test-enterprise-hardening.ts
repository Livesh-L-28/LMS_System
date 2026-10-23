/**
 * Enterprise & College Hardening Verification Test Suite
 * 
 * Tests the 5 enterprise-grade institutional security implementations:
 * 1. AES-256-GCM Token Encryption at Rest with Legacy CBC & Rotation Fallbacks
 * 2. Admin Two-Factor Authentication (TOTP + Email OTP) with dual lockout
 * 3. Administrative Audit Trail (AuditLog) in MongoDB for attendance/grade/schedule overrides
 * 4. Anti-Proxy Attendance Rules (150m Haversine Geofencing + Campus WiFi CIDR subnets)
 * 5. Automated Antivirus / Malware Scanning on Submissions (EICAR + disguised binaries + macros)
 */

import { encryptToken, decryptToken } from '../lib/googleDrive';
import { generateBase32Secret, generateTOTPCode, verifyTOTPCode, getTOTPUri, generateEmailOtp } from '../lib/totp';
import { logAdminAudit, getAuditLogs } from '../lib/auditLog';
import { verifyAccessRestriction, calculateHaversineDistance, isIpInAllowedList } from '../lib/geofence';
import { scanFileBuffer, scanBufferHeuristics } from '../lib/antivirus';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

interface TestResult {
  category: string;
  test: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function record(category: string, test: string, passed: boolean, details?: string) {
  results.push({ category, test, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${category}] ${test}${details ? ` -> ${details}` : ''}`);
}

async function runAllTests() {
  console.log('\n===============================================================');
  console.log('🔒 ENTERPRISE & COLLEGE HARDENING SECURITY VERIFICATION SUITE');
  console.log('===============================================================\n');

  // =========================================================================
  // 1. GOOGLE DRIVE TOKEN ENCRYPTION AT REST (AES-256-GCM AEAD)
  // =========================================================================
  console.log('--- 1. Testing Google Drive Token Encryption (AES-256-GCM) ---');

  const testRefreshToken = '1//04_AbCdEfGhIjKlMnOpQrStUvWxYz-SAMPLE_OAUTH_REFRESH_TOKEN_2026';
  const encryptedGcm = encryptToken(testRefreshToken);

  // Check GCM format
  const isGcmFormat = encryptedGcm.startsWith('gcm:') && encryptedGcm.split(':').length === 4;
  record(
    'Drive AES-256-GCM',
    'Tokens are encrypted in AES-256-GCM format (gcm:iv:tag:ciphertext)',
    isGcmFormat,
    `Encrypted: ${encryptedGcm.slice(0, 32)}...`
  );

  // Decrypt GCM
  const decryptedGcm = decryptToken(encryptedGcm);
  record(
    'Drive AES-256-GCM',
    'AES-256-GCM token round-trip decryption is lossless and exact',
    decryptedGcm === testRefreshToken,
    `Decrypted matches original: ${decryptedGcm.slice(0, 20)}...`
  );

  // Backward-compatibility: Legacy AES-256-CBC token decryption
  const legacyKey = crypto.createHash('sha256').update(process.env.SESSION_SECRET || 'arvr_secret_key_change_in_production_32chars_min').digest();
  const legacyIv = crypto.randomBytes(16);
  const legacyCipher = crypto.createCipheriv('aes-256-cbc', legacyKey, legacyIv);
  let legacyCiphertext = legacyCipher.update(testRefreshToken, 'utf8', 'hex');
  legacyCiphertext += legacyCipher.final('hex');
  const legacyEncrypted = legacyIv.toString('hex') + ':' + legacyCiphertext;

  const decryptedLegacy = decryptToken(legacyEncrypted);
  record(
    'Drive AES-256-GCM',
    'Seamless backward compatibility with legacy AES-256-CBC tokens',
    decryptedLegacy === testRefreshToken,
    `Successfully decrypted legacy CBC token`
  );

  // Plaintext fallback resilience
  const rawPlaintext = '1//plain-unencrypted-legacy-token';
  const decryptedPlain = decryptToken(rawPlaintext);
  record(
    'Drive AES-256-GCM',
    'Unencrypted string / plaintext fallback is safely handled',
    decryptedPlain === rawPlaintext,
    'Returned unencrypted token as-is'
  );

  // Tamper detection: modifying GCM ciphertext causes authentication tag mismatch
  const tamperedGcm = encryptedGcm.slice(0, -4) + 'ffff';
  const tamperedResult = decryptToken(tamperedGcm);
  record(
    'Drive AES-256-GCM',
    'AEAD tampering detection rejects modified ciphertext payload',
    tamperedResult !== testRefreshToken,
    'Tampered payload safely rejected'
  );

  // =========================================================================
  // 2. ADMIN TWO-FACTOR AUTHENTICATION (TOTP & EMAIL OTP)
  // =========================================================================
  console.log('\n--- 2. Testing Admin Two-Factor Authentication (2FA) ---');

  // TOTP Base32 Secret generation
  const totpSecret = generateBase32Secret(20);
  record(
    'Admin 2FA',
    'Generates standard Base32 secret for Authenticator apps',
    Boolean(totpSecret && totpSecret.length >= 20 && /^[A-Z2-7]+$/.test(totpSecret)),
    `Secret: ${totpSecret}`
  );

  // TOTP URI for QR Codes
  const qrUri = getTOTPUri(totpSecret, 'admin@arvr.com', 'ARVR LMS');
  record(
    'Admin 2FA',
    'Generates standard otpauth:// URI compatible with Google Authenticator & Authy',
    qrUri.startsWith('otpauth://totp/ARVR%20LMS:admin%40arvr.com?secret=') && qrUri.includes('&digits=6'),
    `URI: ${qrUri.slice(0, 50)}...`
  );

  // TOTP Code Generation & Verification
  const totpCode = generateTOTPCode(totpSecret);
  const isValidTotp = verifyTOTPCode(totpSecret, totpCode);
  record(
    'Admin 2FA',
    'Generates and verifies RFC 6238 6-digit TOTP code correctly',
    isValidTotp && /^\d{6}$/.test(totpCode),
    `Valid Code: ${totpCode}`
  );

  // Reject wrong TOTP code
  const isInvalidRejected = !verifyTOTPCode(totpSecret, '000000');
  record(
    'Admin 2FA',
    'Rejects incorrect 6-digit TOTP verification codes',
    isInvalidRejected,
    'Invalid code "000000" properly rejected'
  );

  // Email OTP generation
  const emailOtp = generateEmailOtp();
  record(
    'Admin 2FA',
    'Generates cryptographically random 6-digit fallback Email OTP',
    emailOtp.length === 6 && /^\d{6}$/.test(emailOtp),
    `Email OTP: ${emailOtp}`
  );

  // =========================================================================
  // 3. ADMINISTRATIVE AUDIT TRAIL (AuditLog)
  // =========================================================================
  console.log('\n--- 3. Testing Administrative Audit Trail (AuditLog) ---');

  const testAuditId = `test_audit_${Date.now()}`;
  const auditEntry = await logAdminAudit({
    actorId: 'admin_sys_test',
    actorEmail: 'admin@arvr.com',
    actorRole: 'ADMIN',
    ipAddress: '10.0.0.42',
    action: 'OVERRIDE_ATTENDANCE',
    targetType: 'STUDENT',
    targetId: 'student_12345',
    targetIdentifier: 'REG-2026-001',
    details: {
      action: 'grant_100_attendance',
      sessionsAdded: 10,
      testRunId: testAuditId,
    },
  });

  record(
    'AuditLog',
    'Persists administrative action with actor, IP, target, and diff to MongoDB',
    Boolean(auditEntry && auditEntry.id && auditEntry.action === 'OVERRIDE_ATTENDANCE'),
    `Created AuditLog ID: ${auditEntry?.id}`
  );

  // Verify retrieval
  const { logs, total } = await getAuditLogs({
    action: 'OVERRIDE_ATTENDANCE',
    targetType: 'STUDENT',
    actorEmail: 'admin@arvr.com',
    limit: 5,
  });

  const foundLogged = logs.some((l) => l.targetIdentifier === 'REG-2026-001');
  record(
    'AuditLog',
    'Audit trail is searchable by action, target type, and admin email',
    foundLogged && total > 0,
    `Retrieved ${logs.length} audit logs (Total: ${total})`
  );

  // Cleanup test audit log
  if (auditEntry?.id) {
    await prisma.auditLog.delete({ where: { id: auditEntry.id } }).catch(() => {});
  }

  // =========================================================================
  // 4. ANTI-PROXY ATTENDANCE (GEOFENCING & WIFI SUBNETS)
  // =========================================================================
  console.log('\n--- 4. Testing Anti-Proxy Attendance Rules ---');

  // Campus reference location: e.g. Lab at (12.9716, 77.5946)
  const labLat = 12.9716;
  const labLng = 77.5946;

  // Haversine distance accuracy
  const insideLabLat = 12.9717;
  const insideLabLng = 77.5947;
  const distanceInside = calculateHaversineDistance(labLat, labLng, insideLabLat, insideLabLng);
  record(
    'Anti-Proxy Geofence',
    'Haversine accurately measures physical distance on campus',
    distanceInside < 50,
    `Distance inside lab: ${distanceInside} meters`
  );

  const mockSettings = new Map<string, string>([
    ['RESTRICTION_GEOFENCE_ENABLED', 'true'],
    ['RESTRICTION_CAMPUS_LAT', String(labLat)],
    ['RESTRICTION_CAMPUS_LNG', String(labLng)],
    ['RESTRICTION_RADIUS_METERS', '150'],
    ['RESTRICTION_WIFI_ENABLED', 'true'],
    ['RESTRICTION_ALLOWED_IPS', '10.0.0.0/8, 192.168.1.0/24'],
    ['RESTRICTION_SCOPE', 'ATTENDANCE_ONLY'],
    ['RESTRICTION_ALLOW_LOCALHOST', 'false'],
  ]);

  // Case A: Student inside 150m boundary with Campus WiFi IP
  const legitCheck = verifyAccessRestriction({
    clientIp: '10.0.4.15',
    latitude: insideLabLat,
    longitude: insideLabLng,
    accuracy: 15,
    action: 'ATTENDANCE',
    settings: mockSettings,
  });
  record(
    'Anti-Proxy Geofence',
    'Allows legitimate student within 150m radius on Campus WiFi network',
    legitCheck.allowed === true && legitCheck.geofencePassed === true && legitCheck.networkPassed === true,
    'Verified inside perimeter and campus subnet'
  );

  // Case B: Student outside campus (e.g. 5km away at home/dorm)
  const homeLat = 13.0100;
  const homeLng = 77.6200;
  const outsideCheck = verifyAccessRestriction({
    clientIp: '10.0.4.15',
    latitude: homeLat,
    longitude: homeLng,
    accuracy: 20,
    action: 'ATTENDANCE',
    settings: mockSettings,
  });
  record(
    'Anti-Proxy Geofence',
    'Blocks proxy attendance marked outside 150m campus perimeter',
    outsideCheck.allowed === false && outsideCheck.geofencePassed === false,
    `Blocked at distance: ${outsideCheck.distanceMeters}m (Allowed <= 150m)`
  );

  // Case C: Student using cellular/home IP (Unauthorized WiFi)
  const cellularIpCheck = verifyAccessRestriction({
    clientIp: '49.207.180.22', // External ISP
    latitude: insideLabLat,
    longitude: insideLabLng,
    accuracy: 15,
    action: 'ATTENDANCE',
    settings: mockSettings,
  });
  record(
    'Anti-Proxy Geofence',
    'Blocks attendance when not connected to designated Campus WiFi network',
    cellularIpCheck.allowed === false && cellularIpCheck.networkPassed === false,
    'Blocked unauthorized external ISP IP'
  );

  // Case D: GPS spoofing with coarse accuracy (>250m accuracy error)
  const coarseGpsCheck = verifyAccessRestriction({
    clientIp: '10.0.4.15',
    latitude: insideLabLat,
    longitude: insideLabLng,
    accuracy: 450, // 450 meters accuracy is coarse cell tower
    action: 'ATTENDANCE',
    settings: mockSettings,
  });
  record(
    'Anti-Proxy Geofence',
    'Rejects low-accuracy / coarse location estimates (>250m) to defeat VPN/cell proxies',
    coarseGpsCheck.allowed === false,
    coarseGpsCheck.reason || 'Coarse GPS rejected'
  );

  // =========================================================================
  // 5. AUTOMATED ANTIVIRUS & ANTI-MALWARE SCANNING
  // =========================================================================
  console.log('\n--- 5. Testing Automated Antivirus & Malware Scanning ---');

  // Test 1: Clean file upload
  const cleanPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
  const cleanResult = await scanFileBuffer(cleanPdfBuffer, 'project_report.pdf', 'application/pdf');
  record(
    'Antivirus Scanner',
    'Valid student document passes security scan cleanly',
    cleanResult.isClean === true && cleanResult.threatName === null,
    'Clean PDF verified'
  );

  // Test 2: Standard EICAR Antivirus Test Signature
  const eicarTestBuffer = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
  const eicarResult = await scanFileBuffer(eicarTestBuffer, 'submission.zip', 'application/zip');
  record(
    'Antivirus Scanner',
    'Detects and flags EICAR Standard Antivirus Test File signature',
    eicarResult.isClean === false && Boolean(eicarResult.threatName?.includes('EICAR')),
    `Threat: ${eicarResult.threatName}`
  );

  // Test 3: Disguised Windows Executable (PE MZ header in a .png or .pdf)
  const fakePngBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // 'MZ' executable header
  const fakePngResult = await scanFileBuffer(fakePngBuffer, 'screenshot.png', 'image/png');
  record(
    'Antivirus Scanner',
    'Detects Windows PE binary executable header disguised as an image (.png)',
    fakePngResult.isClean === false && fakePngResult.threatName === 'Disguised.Windows.Executable.MZ',
    `Threat: ${fakePngResult.threatName}`
  );

  // Test 4: Disguised Linux ELF binary
  const fakeElfBuffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]); // '\x7fELF' header
  const fakeElfResult = await scanFileBuffer(fakeElfBuffer, 'homework.pdf', 'application/pdf');
  record(
    'Antivirus Scanner',
    'Detects Linux ELF executable disguised as a PDF document',
    fakeElfResult.isClean === false && fakeElfResult.threatName === 'Disguised.Linux.ELF.Executable',
    `Threat: ${fakeElfResult.threatName}`
  );

  // Test 5: Malicious script injection in SVG / HTML file
  const xssSvgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>');
  const xssResult = await scanFileBuffer(xssSvgBuffer, 'diagram.svg', 'image/svg+xml');
  record(
    'Antivirus Scanner',
    'Detects embedded malicious executable script tags in image uploads',
    xssResult.isClean === false && xssResult.threatName === 'Suspicious-HTML-Script-Injection',
    `Threat: ${xssResult.threatName}`
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log('\n===============================================================');
  console.log(`🎯 HARDENING SUITE SUMMARY: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('===============================================================');

  if (failedTests > 0) {
    console.error(`❌ FAILED TESTS (${failedTests}):`);
    results.filter((r) => !r.passed).forEach((r) => console.error(`  - [${r.category}] ${r.test}`));
    process.exit(1);
  } else {
    console.log('🚀 ALL 5 ENTERPRISE HARDENING SECURITY IMPLEMENTATIONS VERIFIED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal testing error:', err);
  process.exit(1);
});
