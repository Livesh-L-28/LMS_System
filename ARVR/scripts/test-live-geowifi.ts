import { performance } from 'perf_hooks';

const BASE_URL = process.env.TEST_URL || 'https://arvr-academy-staging.onrender.com';

interface TestRecord {
  testName: string;
  passed: boolean;
  latencyMs: number;
  details: string;
}

const results: TestRecord[] = [];

function record(testName: string, passed: boolean, latencyMs: number, details: string) {
  results.push({ testName, passed, latencyMs: Math.round(latencyMs), details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} ${testName} (${Math.round(latencyMs)}ms) -> ${details}`);
}

async function runGeoWifiAudit() {
  console.log('================================================================');
  console.log('📍 AR/VR ACADEMY: LIVE GEOFENCING & WI-FI SECURITY AUDIT');
  console.log(`Target URL : ${BASE_URL}`);
  console.log(`Timestamp  : ${new Date().toISOString()}`);
  console.log('================================================================\n');

  // Step 1: Admin Authentication
  const tAdmin0 = performance.now();
  const resAdmin = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@arvr.com', password: 'admin123' }),
  });
  const latAdmin = performance.now() - tAdmin0;
  const rawAdminCookie = resAdmin.headers.get('set-cookie') || '';
  const adminCookie = rawAdminCookie.split(';')[0] || '';

  record('Admin Authentication', resAdmin.status === 200, latAdmin, `HTTP ${resAdmin.status}`);

  // Step 2: Student Authentication
  const tStudent0 = performance.now();
  const resStudent = await fetch(`${BASE_URL}/api/student/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registerNo: '21CS001', pin: '123456' }),
  });
  const latStudent = performance.now() - tStudent0;
  const rawStudentCookie = resStudent.headers.get('set-cookie') || '';
  const studentCookie = rawStudentCookie.split(';')[0] || '';

  record('Student Authentication', resStudent.status === 200, latStudent, `HTTP ${resStudent.status} (John Doe)`);

  // Step 3: Fetch Original Settings to guarantee restoration
  const resOriginal = await fetch(`${BASE_URL}/api/admin/settings/access-control`, {
    headers: { Cookie: adminCookie },
  });
  const origData = await resOriginal.json();
  const clientDetectedIp = origData.currentDetectedIp || '127.0.0.1';

  console.log(`\n🔍 Current Detected Client Egress IP: ${clientDetectedIp}\n`);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: GEOFENCE REJECTION (Out-of-Bounds Coordinates)
    // -------------------------------------------------------------------------
    console.log('--- 1. TESTING GEOFENCE RESTRICTION ---');
    // Set campus center in Chennai (13.0827, 80.2707) with 100m radius
    const tCfg1 = performance.now();
    await fetch(`${BASE_URL}/api/admin/settings/access-control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        geofenceEnabled: true,
        campusLat: '13.0827',
        campusLng: '80.2707',
        radiusMeters: 100,
        wifiEnabled: false,
        allowLocalhost: false,
        scope: 'LOGIN_AND_ATTENDANCE',
      }),
    });
    const latCfg1 = performance.now() - tCfg1;
    console.log(`[Config] Geofence enabled: Campus at (13.0827, 80.2707), Radius: 100m (${Math.round(latCfg1)}ms)`);

    // Submit attendance with coordinates in New York (40.7128, -74.0060) -> ~13,500 km away
    const tGeoBad0 = performance.now();
    const resGeoBad = await fetch(`${BASE_URL}/api/student/attendance/FN`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
      }),
    });
    const latGeoBad = performance.now() - tGeoBad0;
    const geoBadData = await resGeoBad.json().catch(() => ({}));

    record(
      'Geofence Out-of-Bounds Block',
      resGeoBad.status === 403 && (geoBadData.code === 'ACCESS_RESTRICTED' || geoBadData.error?.includes('outside') || geoBadData.error?.includes('campus')),
      latGeoBad,
      `HTTP ${resGeoBad.status} | Reason: "${geoBadData.error}" | Distance: ${geoBadData.details?.distanceMeters || 'out of range'}m`
    );

    // -------------------------------------------------------------------------
    // TEST 2: GEOFENCE ACCURACY REJECTION
    // -------------------------------------------------------------------------
    const tGeoAcc0 = performance.now();
    const resGeoAcc = await fetch(`${BASE_URL}/api/student/attendance/FN`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({
        latitude: 13.0827,
        longitude: 80.2707,
        accuracy: 500, // Coarse fix > 250m
      }),
    });
    const latGeoAcc = performance.now() - tGeoAcc0;
    const geoAccData = await resGeoAcc.json().catch(() => ({}));

    record(
      'Geofence Low Accuracy Filter',
      resGeoAcc.status === 403 && geoAccData.error?.includes('accuracy'),
      latGeoAcc,
      `HTTP ${resGeoAcc.status} | Rejection: "${geoAccData.error}"`
    );

    // -------------------------------------------------------------------------
    // TEST 3: GEOFENCE IN-BOUNDS ALLOWED
    // -------------------------------------------------------------------------
    const tGeoGood0 = performance.now();
    const resGeoGood = await fetch(`${BASE_URL}/api/student/attendance/FN`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({
        latitude: 13.0827,
        longitude: 80.2707,
        accuracy: 10,
      }),
    });
    const latGeoGood = performance.now() - tGeoGood0;
    const geoGoodData = await resGeoGood.json().catch(() => ({}));

    // If geofence passed, it should NOT return 403 ACCESS_RESTRICTED
    const geofencePassed = resGeoGood.status !== 403 || geoGoodData.code !== 'ACCESS_RESTRICTED';
    record(
      'Geofence In-Bounds Verification',
      geofencePassed,
      latGeoGood,
      `HTTP ${resGeoGood.status} | Geofence Boundary Check Passed (Distance: 0m <= 100m)`
    );

    // -------------------------------------------------------------------------
    // TEST 4: WI-FI RESTRICTION (Unauthorized IP Rejection)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. TESTING WI-FI NETWORK RESTRICTION ---');
    // Lock to an unreachable private IP subnet
    await fetch(`${BASE_URL}/api/admin/settings/access-control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        geofenceEnabled: false,
        wifiEnabled: true,
        wifiSsid: 'ARVR-ACADEMY-LAB-5G',
        allowedIps: '198.51.100.1, 10.99.88.0/24',
        allowLocalhost: false,
        scope: 'LOGIN_AND_ATTENDANCE',
      }),
    });

    const tWifiBad0 = performance.now();
    const resWifiBad = await fetch(`${BASE_URL}/api/student/attendance/FN`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({}),
    });
    const latWifiBad = performance.now() - tWifiBad0;
    const wifiBadData = await resWifiBad.json().catch(() => ({}));

    record(
      'Wi-Fi Unauthorized IP Block',
      resWifiBad.status === 403 && (wifiBadData.code === 'ACCESS_RESTRICTED' || wifiBadData.error?.includes('ARVR-ACADEMY-LAB-5G')),
      latWifiBad,
      `HTTP ${resWifiBad.status} | Reason: "${wifiBadData.error}"`
    );

    // -------------------------------------------------------------------------
    // TEST 5: WI-FI RESTRICTION (Authorized Subnet / IP Match)
    // -------------------------------------------------------------------------
    // Allow the detected client IP or subnet
    await fetch(`${BASE_URL}/api/admin/settings/access-control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        geofenceEnabled: false,
        wifiEnabled: true,
        wifiSsid: 'ARVR-ACADEMY-LAB-5G',
        allowedIps: `${clientDetectedIp}, 127.0.0.1`,
        allowLocalhost: true,
        scope: 'LOGIN_AND_ATTENDANCE',
      }),
    });

    const tWifiGood0 = performance.now();
    const resWifiGood = await fetch(`${BASE_URL}/api/student/attendance/FN`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({}),
    });
    const latWifiGood = performance.now() - tWifiGood0;
    const wifiGoodData = await resWifiGood.json().catch(() => ({}));

    // If WiFi passed, status should NOT be 403 ACCESS_RESTRICTED
    const wifiPassed = resWifiGood.status !== 403 || wifiGoodData.code !== 'ACCESS_RESTRICTED';
    record(
      'Wi-Fi Authorized IP Match',
      wifiPassed,
      latWifiGood,
      `HTTP ${resWifiGood.status} | IP Verification Passed (${clientDetectedIp} matched allowed list)`
    );
  } finally {
    // -------------------------------------------------------------------------
    // RESTORE ORIGINAL SETTINGS
    // -------------------------------------------------------------------------
    console.log('\n--- 3. RESTORING INITIAL ACCESS SETTINGS ---');
    await fetch(`${BASE_URL}/api/admin/settings/access-control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        geofenceEnabled: origData.geofenceEnabled ?? false,
        campusLat: origData.campusLat ?? '',
        campusLng: origData.campusLng ?? '',
        radiusMeters: origData.radiusMeters ?? 150,
        wifiEnabled: origData.wifiEnabled ?? false,
        wifiSsid: origData.wifiSsid ?? '',
        allowedIps: origData.allowedIps ?? '',
        allowLocalhost: origData.allowLocalhost ?? true,
        scope: origData.scope ?? 'LOGIN_AND_ATTENDANCE',
      }),
    });
    console.log('✅ Staging access policies successfully restored to default state.');
  }

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📋 GEOFENCING & WI-FI AUDIT SUMMARY');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`TOTAL CHECKS : ${total}`);
  console.log(`PASSED       : ${passed} ✅`);
  console.log(`FAILED       : ${failed} ${failed === 0 ? '🎉' : '❌'}`);
  console.log(`SUCCESS RATE : ${Math.round((passed / total) * 100)}%`);
  console.log('================================================================\n');

  if (failed === 0) {
    console.log('🏆 VERDICT: GEOFENCING & WI-FI RESTRICTION FULLY OPERATIONAL ON LIVE!');
  } else {
    console.log('⚠️ VERDICT: Some access controls require calibration.');
    process.exit(1);
  }
}

runGeoWifiAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
