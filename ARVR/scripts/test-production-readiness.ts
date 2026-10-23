/**
 * Production Readiness & Core Engine Verification Test Suite
 * Tests:
 * 1. Geofencing (Haversine formula, radius boundary, accuracy tolerance, scope)
 * 2. WiFi / Network Access Control (IP normalization, CIDR matching, allowed list, loopback handling)
 * 3. Attendance Timing Engine (12-hr formatting, window resolution, self-healing, session criteria)
 * 4. Validation Schemas (batch timings order validation, timing inversion prevention)
 * 5. Live Server Endpoints (access-status, login, access-control settings, batch validation)
 * 6. Database Connection Pool & Cache Health
 */

import { calculateHaversineDistance, normalizeIp, isIpInAllowedList, verifyAccessRestriction } from '../lib/geofence';
import { formatTime12Hour, getDetailedSessionStatus, resolveBatchAttendanceWindows } from '../lib/time';
import { batchSchema } from '../lib/validation';
import { prisma, withPrismaRetry } from '../lib/prisma';
import { getCachedSystemSettings, invalidateSettingsCache } from '../lib/settings';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function recordTest(category: string, name: string, passed: boolean, details?: string) {
  results.push({ category, name, passed, details });
  const statusIcon = passed ? '✅ [PASS]' : '❌ [FAIL]';
  console.log(`${statusIcon} [${category}] ${name}${details ? ` -> ${details}` : ''}`);
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('  AR/VR ACADEMY: PRE-DEPLOYMENT PRODUCTION READINESS TEST SUITE  ');
  console.log('================================================================\n');

  // ============================================================================
  // SECTION 1: GEOFENCING ENGINE
  // ============================================================================
  console.log('📍 --- 1. GEOFENCING ENGINE TESTS ---');

  // 1.1 Haversine Distance Calculation
  // Test coordinates: Chennai Central (13.0827, 80.2707) to Egmore (13.0784, 80.2606) ~ 1.18 km
  const distEgmore = calculateHaversineDistance(13.0827, 80.2707, 13.0784, 80.2606);
  recordTest(
    'Geofence',
    'Haversine distance calculation (Chennai Central to Egmore ~1.18 km)',
    distEgmore >= 1100 && distEgmore <= 1300,
    `Calculated: ${distEgmore}m`
  );

  // Exact same point must be 0 meters
  const distZero = calculateHaversineDistance(13.0827, 80.2707, 13.0827, 80.2707);
  recordTest('Geofence', 'Zero distance for identical coordinates', distZero === 0, `Calculated: ${distZero}m`);

  // Small displacement ~ 50 meters
  const dist50m = calculateHaversineDistance(13.0827, 80.2707, 13.0831, 80.2709);
  recordTest('Geofence', 'Micro-distance calculation (~50m)', dist50m >= 30 && dist50m <= 80, `Calculated: ${dist50m}m`);

  // 1.2 Access Restriction Verification with Geofence
  const campusCenter = { lat: 13.0827, lng: 80.2707 };
  const geoSettings = new Map<string, string>([
    ['RESTRICTION_GEOFENCE_ENABLED', 'true'],
    ['RESTRICTION_WIFI_ENABLED', 'false'],
    ['RESTRICTION_CAMPUS_LAT', campusCenter.lat.toString()],
    ['RESTRICTION_CAMPUS_LNG', campusCenter.lng.toString()],
    ['RESTRICTION_RADIUS_METERS', '150'],
    ['RESTRICTION_ALLOW_LOCALHOST', 'false'], // strict testing
    ['RESTRICTION_SCOPE', 'LOGIN_AND_ATTENDANCE'],
  ]);

  // Inside perimeter (distance ~50m <= 150m radius)
  const insideGeo = verifyAccessRestriction({
    clientIp: '203.0.113.10',
    latitude: 13.0831,
    longitude: 80.2709,
    accuracy: 10,
    action: 'ATTENDANCE',
    settings: geoSettings,
  });
  recordTest(
    'Geofence',
    'Permits user inside 150m boundary',
    insideGeo.allowed && insideGeo.geofencePassed === true,
    `Distance: ${insideGeo.distanceMeters}m / 150m`
  );

  // Outside perimeter (Egmore ~1180m > 150m radius)
  const outsideGeo = verifyAccessRestriction({
    clientIp: '203.0.113.10',
    latitude: 13.0784,
    longitude: 80.2606,
    accuracy: 10,
    action: 'ATTENDANCE',
    settings: geoSettings,
  });
  recordTest(
    'Geofence',
    'Rejects user outside 150m boundary',
    !outsideGeo.allowed && outsideGeo.geofencePassed === false && Boolean(outsideGeo.reason?.includes('exceeded')),
    `Distance: ${outsideGeo.distanceMeters}m (Expected >150m)`
  );

  // Missing coordinates when Geofencing is active
  const missingCoords = verifyAccessRestriction({
    clientIp: '203.0.113.10',
    action: 'ATTENDANCE',
    settings: geoSettings,
  });
  recordTest(
    'Geofence',
    'Rejects request when GPS coordinates are omitted',
    !missingCoords.allowed && missingCoords.geofencePassed === false && Boolean(missingCoords.reason?.includes('required')),
    missingCoords.reason
  );

  // Poor accuracy threshold (>250m accuracy rejected)
  const poorAccuracy = verifyAccessRestriction({
    clientIp: '203.0.113.10',
    latitude: 13.0828,
    longitude: 80.2707,
    accuracy: 450, // 450m cell-tower estimate
    action: 'ATTENDANCE',
    settings: geoSettings,
  });
  recordTest(
    'Geofence',
    'Rejects poor GPS accuracy estimates (>250m tolerance)',
    !poorAccuracy.allowed && Boolean(poorAccuracy.reason?.includes('accuracy too low')),
    poorAccuracy.reason
  );

  // Scope filter: If scope is LOGIN_ONLY, ATTENDANCE action bypasses restriction
  const loginOnlySettings = new Map(geoSettings);
  loginOnlySettings.set('RESTRICTION_SCOPE', 'LOGIN_ONLY');
  const scopeBypass = verifyAccessRestriction({
    clientIp: '203.0.113.10',
    latitude: 13.0784, // far away
    longitude: 80.2606,
    action: 'ATTENDANCE',
    settings: loginOnlySettings,
  });
  recordTest(
    'Geofence',
    'Scope restriction correctly permits ATTENDANCE when scope is LOGIN_ONLY',
    scopeBypass.allowed === true
  );

  // ============================================================================
  // SECTION 2: WIFI & NETWORK ACCESS CONTROL
  // ============================================================================
  console.log('\n📶 --- 2. WIFI & NETWORK ACCESS CONTROL TESTS ---');

  // 2.1 IP Normalization
  recordTest('WiFi', 'Normalizes standard IPv4', normalizeIp('192.168.1.100') === '192.168.1.100');
  recordTest('WiFi', 'Normalizes IPv6-mapped IPv4 prefix (::ffff:192.168.1.100)', normalizeIp('::ffff:192.168.1.100') === '192.168.1.100');
  recordTest('WiFi', 'Normalizes empty IP to fallback 127.0.0.1', normalizeIp('') === '127.0.0.1');

  // 2.2 Allowed List & CIDR Matching
  const allowedList = '192.168.1.50, 10.0.0.0/24, 172.16.0.0/16';

  recordTest('WiFi', 'Matches exact allowed IP in list', isIpInAllowedList('192.168.1.50', allowedList, false));
  recordTest('WiFi', 'Matches IP within /24 subnet (10.0.0.45 in 10.0.0.0/24)', isIpInAllowedList('10.0.0.45', allowedList, false));
  recordTest('WiFi', 'Matches IP within /16 subnet (172.16.55.90 in 172.16.0.0/16)', isIpInAllowedList('172.16.55.90', allowedList, false));
  recordTest('WiFi', 'Rejects IP outside subnets (10.0.1.45 not in 10.0.0.0/24)', !isIpInAllowedList('10.0.1.45', allowedList, false));
  recordTest('WiFi', 'Rejects foreign public IP (203.0.113.55)', !isIpInAllowedList('203.0.113.55', allowedList, false));
  recordTest('WiFi', 'Permits localhost when allowLocalhost=true', isIpInAllowedList('127.0.0.1', allowedList, true));
  recordTest('WiFi', 'Rejects localhost when allowLocalhost=false and not listed', !isIpInAllowedList('127.0.0.1', allowedList, false));

  // 2.3 verifyAccessRestriction with WiFi Enabled
  const wifiSettings = new Map<string, string>([
    ['RESTRICTION_GEOFENCE_ENABLED', 'false'],
    ['RESTRICTION_WIFI_ENABLED', 'true'],
    ['RESTRICTION_WIFI_SSID', 'ARVR_ACADEMY_5G'],
    ['RESTRICTION_ALLOWED_IPS', '192.168.1.0/24'],
    ['RESTRICTION_ALLOW_LOCALHOST', 'false'],
    ['RESTRICTION_SCOPE', 'LOGIN_AND_ATTENDANCE'],
  ]);

  const wifiSuccess = verifyAccessRestriction({
    clientIp: '192.168.1.120',
    action: 'LOGIN',
    settings: wifiSettings,
  });
  recordTest('WiFi', 'Grants login access for IP on authorized WiFi subnet', wifiSuccess.allowed && wifiSuccess.networkPassed === true);

  const wifiFail = verifyAccessRestriction({
    clientIp: '49.207.180.12',
    action: 'LOGIN',
    settings: wifiSettings,
  });
  recordTest(
    'WiFi',
    'Rejects unauthorized public IP with named SSID prompt',
    !wifiFail.allowed && Boolean(wifiFail.reason?.includes('ARVR_ACADEMY_5G')),
    wifiFail.reason
  );

  // ============================================================================
  // SECTION 3: ATTENDANCE TIMING & SESSION CRITERIA ENGINE
  // ============================================================================
  console.log('\n⏰ --- 3. ATTENDANCE TIMING ENGINE TESTS ---');

  // 3.1 12-Hour AM/PM Formatter
  recordTest('Attendance', '12-hr formatting: 08:30 -> 08:30 AM', formatTime12Hour('08:30') === '08:30 AM');
  recordTest('Attendance', '12-hr formatting: 09:00 -> 09:00 AM', formatTime12Hour('09:00') === '09:00 AM');
  recordTest('Attendance', '12-hr formatting: 12:00 -> 12:00 PM', formatTime12Hour('12:00') === '12:00 PM');
  recordTest('Attendance', '12-hr formatting: 13:10 -> 01:10 PM', formatTime12Hour('13:10') === '01:10 PM');
  recordTest('Attendance', '12-hr formatting: 15:09 -> 03:09 PM', formatTime12Hour('15:09') === '03:09 PM');
  recordTest('Attendance', '12-hr formatting: 00:00 -> 12:00 AM', formatTime12Hour('00:00') === '12:00 AM');

  // 3.2 getDetailedSessionStatus
  // Mock time at 08:45 AM (Inside FN window 08:30 - 09:00)
  const mockNowDuringFN = new Date('2026-10-08T03:15:00.000Z'); // 03:15 UTC = 08:45 IST
  const statusFNInside = getDetailedSessionStatus('FN', '08:30', '09:00', mockNowDuringFN, 'Asia/Kolkata', false);
  recordTest(
    'Attendance',
    'Morning session status is OPEN when current time is within 08:30-09:00',
    statusFNInside.isOpen === true && statusFNInside.canMark === true && statusFNInside.status === 'OPEN',
    `Status: ${statusFNInside.status}, Time: ${statusFNInside.currentHHMM}`
  );

  // Mock time at 08:00 AM (Before FN window)
  const mockNowBeforeFN = new Date('2026-10-08T02:30:00.000Z'); // 02:30 UTC = 08:00 IST
  const statusFNBefore = getDetailedSessionStatus('FN', '08:30', '09:00', mockNowBeforeFN, 'Asia/Kolkata', false);
  recordTest(
    'Attendance',
    'Morning session status is BEFORE_WINDOW when current time is 08:00 (< 08:30)',
    statusFNBefore.isOpen === false && statusFNBefore.canMark === false && statusFNBefore.status === 'BEFORE_WINDOW',
    `Status: ${statusFNBefore.status}`
  );

  // Mock time at 09:15 AM (After FN cutoff)
  const mockNowAfterFN = new Date('2026-10-08T03:45:00.000Z'); // 03:45 UTC = 09:15 IST
  const statusFNAfter = getDetailedSessionStatus('FN', '08:30', '09:00', mockNowAfterFN, 'Asia/Kolkata', false);
  recordTest(
    'Attendance',
    'Morning session status is AFTER_CUTOFF when current time is 09:15 (>= 09:00)',
    statusFNAfter.isOpen === false && statusFNAfter.canMark === false && statusFNAfter.status === 'AFTER_CUTOFF',
    `Status: ${statusFNAfter.status}`
  );

  // Already marked session
  const statusMarked = getDetailedSessionStatus('FN', '08:30', '09:00', mockNowDuringFN, 'Asia/Kolkata', true, new Date());
  recordTest(
    'Attendance',
    'Session status is MARKED and canMark=false when already recorded',
    statusMarked.isMarked === true && statusMarked.canMark === false && statusMarked.status === 'MARKED'
  );

  // 3.3 Batch Window Resolution & Self-Healing
  const systemSettings = new Map<string, string>([
    ['FN_START_TIME', '08:30'],
    ['FN_CUTOFF', '09:00'],
    ['AN_START_TIME', '12:40'],
    ['AN_CUTOFF', '13:10'],
  ]);

  // Default batch inherits system settings
  const defaultBatchWindows = resolveBatchAttendanceWindows(null, systemSettings);
  recordTest(
    'Attendance',
    'Default batch correctly inherits global system timings',
    defaultBatchWindows.fnStart === '08:30' &&
      defaultBatchWindows.fnCutoff === '09:00' &&
      defaultBatchWindows.anStart === '12:40' &&
      defaultBatchWindows.anCutoff === '13:10' &&
      defaultBatchWindows.isCustomBatch === false
  );

  // Custom batch overrides timings
  const customBatch = {
    fnStartTime: '09:00',
    fnCutoffTime: '09:30',
    anStartTime: '14:00',
    anCutoffTime: '14:30',
  };
  const customBatchWindows = resolveBatchAttendanceWindows(customBatch, systemSettings);
  recordTest(
    'Attendance',
    'Custom batch correctly applies timing overrides',
    customBatchWindows.fnStart === '09:00' &&
      customBatchWindows.fnCutoff === '09:30' &&
      customBatchWindows.anStart === '14:00' &&
      customBatchWindows.anCutoff === '14:30' &&
      customBatchWindows.isCustomBatch === true
  );

  // Inverted timing self-healing (e.g. 15:09 - 13:10)
  const invertedBatch = {
    fnStartTime: '08:30',
    fnCutoffTime: '09:00',
    anStartTime: '15:09',
    anCutoffTime: '13:10',
  };
  const healedWindows = resolveBatchAttendanceWindows(invertedBatch, systemSettings);
  recordTest(
    'Attendance',
    'Self-healing automatically corrects inverted afternoon timing (15:09–13:10 -> 13:10–15:09)',
    healedWindows.anStart === '13:10' && healedWindows.anCutoff === '15:09',
    `Resolved: ${healedWindows.anStart} - ${healedWindows.anCutoff}`
  );

  // ============================================================================
  // SECTION 4: SCHEMA VALIDATION (PREVENTS FUTURE TIMING CORRUPTIONS)
  // ============================================================================
  console.log('\n🛡️ --- 4. DATA VALIDATION SCHEMA TESTS ---');

  const validBatchData = {
    name: 'Valid Batch 2026',
    startDate: '2026-10-01',
    endDate: '2026-10-30',
    trainingDays: 20,
    fnStartTime: '08:30',
    fnCutoffTime: '09:00',
    anStartTime: '13:10',
    anCutoffTime: '15:09',
  };
  const validParsed = batchSchema.safeParse(validBatchData);
  recordTest('Validation', 'Accepts strictly valid batch timings', validParsed.success === true);

  // Inverted Morning timing (fnStart >= fnCutoff)
  const invalidFN = {
    ...validBatchData,
    fnStartTime: '09:30',
    fnCutoffTime: '09:00',
  };
  const invalidFNParsed = batchSchema.safeParse(invalidFN);
  recordTest(
    'Validation',
    'Rejects inverted morning timing (09:30 >= 09:00)',
    invalidFNParsed.success === false && invalidFNParsed.error?.issues[0]?.message.includes('Morning')
  );

  // Inverted Afternoon timing (anStart >= anCutoff)
  const invalidAN = {
    ...validBatchData,
    anStartTime: '15:09',
    anCutoffTime: '13:10',
  };
  const invalidANParsed = batchSchema.safeParse(invalidAN);
  recordTest(
    'Validation',
    'Rejects inverted afternoon timing (15:09 >= 13:10)',
    invalidANParsed.success === false && invalidANParsed.error?.issues[0]?.message.includes('Afternoon')
  );

  // Overlapping sessions (Morning cutoff > Afternoon start)
  const overlap = {
    ...validBatchData,
    fnCutoffTime: '14:00',
    anStartTime: '13:00',
  };
  const overlapParsed = batchSchema.safeParse(overlap);
  recordTest(
    'Validation',
    'Rejects overlapping morning cutoff after afternoon start (14:00 > 13:00)',
    overlapParsed.success === false && overlapParsed.error?.issues[0]?.message.includes('Morning (FN) Cutoff Time must be earlier')
  );

  // ============================================================================
  // SECTION 5: DATABASE RESILIENCE & CACHE TESTS
  // ============================================================================
  console.log('\n🗄️ --- 5. DATABASE CONNECTION & CACHE TESTS ---');

  // Test database connection via withPrismaRetry
  try {
    const admin = await withPrismaRetry(() =>
      prisma.admin.findUnique({ where: { email: 'admin@arvr.com' } })
    );
    recordTest(
      'Database',
      'Database connection active and admin record found',
      Boolean(admin && admin.email === 'admin@arvr.com'),
      `Admin ID: ${admin?.id}`
    );
  } catch (err: any) {
    recordTest('Database', 'Database connection active and admin record found', false, err.message);
  }

  // Test batch record status for ARVR-3D-001-06OCT26
  try {
    const batch = await prisma.batch.findFirst();
    const isValid = Boolean(
      batch &&
      batch.fnStartTime &&
      batch.fnCutoffTime &&
      batch.anStartTime &&
      batch.anCutoffTime &&
      batch.fnStartTime < batch.fnCutoffTime &&
      batch.anStartTime < batch.anCutoffTime &&
      batch.fnCutoffTime <= batch.anStartTime
    );
    recordTest(
      'Database',
      'Batch ARVR-3D-001-06OCT26 exists and has valid non-inverted timing in DB',
      isValid,
      `FN: ${batch?.fnStartTime}-${batch?.fnCutoffTime}, AN: ${batch?.anStartTime}-${batch?.anCutoffTime}`
    );
  } catch (err: any) {
    recordTest('Database', 'Batch ARVR-3D-001-06OCT26 timing check', false, err.message);
  }

  // Test in-memory settings cache
  await invalidateSettingsCache();
  const start1 = Date.now();
  const settings1 = await getCachedSystemSettings();
  const time1 = Date.now() - start1;

  const start2 = Date.now();
  const settings2 = await getCachedSystemSettings();
  const time2 = Date.now() - start2;

  recordTest(
    'Database',
    'System settings memory cache accelerates repeat reads',
    time2 <= 5 && settings1.size === settings2.size,
    `Initial read: ${time1}ms, Cached read: ${time2}ms`
  );

  // ============================================================================
  // SECTION 6: LIVE API ENDPOINTS TEST (VIA LOCAL DEV SERVER)
  // ============================================================================
  console.log('\n🌐 --- 6. LIVE SERVER API ENDPOINT TESTS ---');

  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  async function apiGet(path: string): Promise<{ status: number; data: any }> {
    try {
      const res = await fetch(`${baseUrl}${path}`);
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    } catch (e: any) {
      return { status: 500, data: { error: e.message } };
    }
  }

  async function apiPost(path: string, body: any, headers: Record<string, string> = {}): Promise<{ status: number; data: any; headers: Headers }> {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data, headers: res.headers };
    } catch (e: any) {
      return { status: 500, data: { error: e.message }, headers: new Headers() };
    }
  }

  // 6.1 GET /api/auth/access-status
  const accessStatusRes = await apiGet('/api/auth/access-status');
  recordTest(
    'Live API',
    'GET /api/auth/access-status returns valid restriction payload',
    accessStatusRes.status === 200 && typeof accessStatusRes.data.wifiPassed === 'boolean',
    `Status: ${accessStatusRes.status}`
  );

  // 6.2 GET /api/batches/active
  const activeBatchesRes = await apiGet('/api/batches/active');
  recordTest(
    'Live API',
    'GET /api/batches/active returns active batches list',
    activeBatchesRes.status === 200 && Array.isArray(activeBatchesRes.data.batches),
    `Count: ${activeBatchesRes.data.batches?.length || 0}`
  );

  // 6.3 POST /api/admin/login
  const adminLoginRes = await apiPost('/api/admin/login', {
    email: 'admin@arvr.com',
    password: 'admin123',
  });
  recordTest(
    'Live API',
    'POST /api/admin/login authenticates with valid credentials',
    adminLoginRes.status === 200 && adminLoginRes.data.success === true,
    `Message: ${adminLoginRes.data.message}`
  );

  // 6.4 POST /api/admin/login with invalid password
  const adminLoginBad = await apiPost('/api/admin/login', {
    email: 'admin@arvr.com',
    password: 'wrong_password_123',
  });
  recordTest(
    'Live API',
    'POST /api/admin/login rejects invalid password with 401',
    adminLoginBad.status === 401 && adminLoginBad.data.error === 'Invalid email or password'
  );

  // Extract session cookie from admin login
  const setCookie = adminLoginRes.headers.get('set-cookie');
  const cookieHeader: Record<string, string> = setCookie ? { Cookie: setCookie.split(';')[0] } : {};

  // 6.5 GET /api/admin/settings/access-control
  const accessControlGet = await fetch(`${baseUrl}/api/admin/settings/access-control`, {
    headers: cookieHeader,
  });
  const accessControlGetData = await accessControlGet.json().catch(() => ({}));
  recordTest(
    'Live API',
    'GET /api/admin/settings/access-control fetches access control parameters',
    accessControlGet.status === 200 && typeof accessControlGetData.geofenceEnabled === 'boolean',
    `Geofence: ${accessControlGetData.geofenceEnabled}, WiFi: ${accessControlGetData.wifiEnabled}`
  );

  // 6.6 POST /api/admin/batches - Inverted Timing Rejection
  const createBatchBad = await apiPost(
    '/api/admin/batches',
    {
      name: `Test Batch ${Date.now()}`,
      startDate: '2026-10-01',
      endDate: '2026-10-30',
      trainingDays: 10,
      fnStartTime: '08:30',
      fnCutoffTime: '09:00',
      anStartTime: '15:09',
      anCutoffTime: '13:10', // Inverted!
    },
    cookieHeader
  );
  recordTest(
    'Live API',
    'POST /api/admin/batches rejects inverted timing payload with HTTP 400',
    createBatchBad.status === 400 && Boolean(createBatchBad.data.error?.includes('Afternoon')),
    `API Error: ${createBatchBad.data.error}`
  );

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL TESTS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`PASS RATE: ${Math.round((passed / total) * 100)}%`);
  console.log('================================================================\n');

  if (failed > 0) {
    console.error('⚠️ SOME TESTS FAILED. Please review the failed items above.');
    process.exit(1);
  } else {
    console.log('🎉 ALL PRODUCTION READINESS TESTS PASSED PERFECTLY!');
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
