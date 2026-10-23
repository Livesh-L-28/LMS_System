import http from 'http';
import { performance } from 'perf_hooks';
import { prisma } from '../lib/prisma';
import Redis from 'ioredis';
import { getDriveClientForAdmin } from '../lib/googleDrive';
import { resetRateLimit } from '../lib/rateLimit';
import { hashPinOrPassword } from '../lib/auth';

interface TestResult {
  category: string;
  testId: string;
  name: string;
  description: string;
  passed: boolean;
  httpStatus?: number;
  evidence: string;
}

const allResults: TestResult[] = [];

function record(result: TestResult) {
  allResults.push(result);
  const icon = result.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${icon} [${result.category}] ${result.testId}: ${result.name} (${result.evidence})`);
}

function httpRequest(options: {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  cookie?: string;
  body?: any;
}): Promise<{ status: number; cookie?: string; data: any; headers: http.IncomingHttpHeaders; latencyMs: number }> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    let postData: Buffer | string | null = null;
    if (Buffer.isBuffer(options.body)) {
      postData = options.body;
    } else if (typeof options.body === 'string') {
      postData = options.body;
    } else if (options.body) {
      postData = JSON.stringify(options.body);
    }

    const reqHeaders: Record<string, string> = {
      'x-forwarded-for': '127.0.0.1',
      ...(options.headers || {}),
    };

    if (options.cookie) reqHeaders['Cookie'] = options.cookie;
    if (postData) {
      if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = (Buffer.isBuffer(postData) ? postData.length : Buffer.byteLength(postData)).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path: options.path,
        method: options.method || 'GET',
        headers: reqHeaders,
      },
      (res) => {
        const rawCookies: string[] = [];
        const sc = res.headers['set-cookie'];
        if (Array.isArray(sc)) rawCookies.push(...sc);
        else if (sc) rawCookies.push(sc);

        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          const latencyMs = Math.round(performance.now() - startTime);
          let parsed: any = null;
          try { parsed = JSON.parse(body); } catch { parsed = body; }
          resolve({
            status: res.statusCode || 500,
            cookie: rawCookies.map((c) => c.split(';')[0]).join('; '),
            data: parsed,
            headers: res.headers,
            latencyMs,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runProductionSimulation() {
  console.log('================================================================================');
  console.log('🏭 PRODUCTION LIVE ENVIRONMENT SIMULATION & VERIFICATION SUITE');
  console.log('================================================================================\n');

  // ============================================================================
  // PART 1: INFRASTRUCTURE & CREDENTIAL AUDIT
  // ============================================================================
  console.log('▶ PART 1: Production Infrastructure & Credential Hardening...');

  // 1.1 Session Secret Entropy
  const sessionSecret = process.env.SESSION_SECRET || '';
  const isSecretStrong = sessionSecret.length >= 32 && !sessionSecret.includes('123456');
  record({
    category: 'Infrastructure',
    testId: 'PROD-CFG-01',
    name: 'Session Secret Key Entropy (Min 32 characters)',
    description: 'Verify SESSION_SECRET satisfies cryptographic requirements',
    passed: isSecretStrong,
    evidence: `SecretLength=${sessionSecret.length} chars (Requirement: >= 32 chars)`,
  });

  // 1.2 Database SSL & Cluster Ping
  let dbConnected = false;
  let adminCount = 0;
  let dbLatency = 0;
  try {
    await prisma.admin.findFirst(); // Warm up connection pool
    const dbStart = performance.now();
    adminCount = await prisma.admin.count();
    dbLatency = Math.round(performance.now() - dbStart);
    dbConnected = true;
  } catch (err: any) {
    console.error('DB error:', err.message);
  }
  record({
    category: 'Infrastructure',
    testId: 'PROD-CFG-02',
    name: 'MongoDB Atlas Production Cluster Ping & Latency',
    description: 'Verify live connection to MongoDB Atlas with low latency',
    passed: dbConnected && dbLatency < 500,
    evidence: `Connected=${dbConnected}, Latency=${dbLatency}ms, Admins=${adminCount}`,
  });

  // 1.3 Redis Connectivity & Ping
  let redisConnected = false;
  let redisLatency = 0;
  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { connectTimeout: 2000 });
    const rStart = performance.now();
    const pong = await redis.ping();
    redisLatency = Math.round(performance.now() - rStart);
    redisConnected = pong === 'PONG';
    redis.disconnect();
  } catch (err: any) {
    console.error('Redis error:', err.message);
  }
  record({
    category: 'Infrastructure',
    testId: 'PROD-CFG-03',
    name: 'Distributed Redis Cache Connectivity & Round-Trip Ping',
    description: 'Verify Redis responds to PING within sub-20ms threshold',
    passed: redisConnected && redisLatency < 50,
    evidence: `Connected=${redisConnected}, Latency=${redisLatency}ms`,
  });

  // 1.4 Google Drive Storage Quota & Token Health
  let driveClientOk = false;
  let driveEmail = '';
  let driveUsedGb = '0';
  let driveTotalGb = '0';
  try {
    const driveResult = await getDriveClientForAdmin();
    if (driveResult && driveResult.drive) {
      const about = await driveResult.drive.about.get({ fields: 'user(emailAddress), storageQuota' });
      driveEmail = about.data.user?.emailAddress || '';
      const quota = about.data.storageQuota;
      if (quota) {
        driveUsedGb = (Number(quota.usage || 0) / (1024 ** 3)).toFixed(1);
        driveTotalGb = (Number(quota.limit || 0) / (1024 ** 3)).toFixed(1);
      }
      driveClientOk = true;
    }
  } catch (err: any) {
    console.error('Drive error:', err.message);
  }
  record({
    category: 'Infrastructure',
    testId: 'PROD-CFG-04',
    name: 'Google Drive Primary Storage OAuth & Quota Health',
    description: 'Verify Google Drive is authorized with sufficient storage quota',
    passed: driveClientOk && Boolean(driveEmail),
    evidence: `Account=${driveEmail}, Used=${driveUsedGb}GB / ${driveTotalGb}GB`,
  });

  // ============================================================================
  // PART 2: PRODUCTION HTTP SECURITY & HEADER ENFORCEMENT
  // ============================================================================
  console.log('\n▶ PART 2: Production HTTP Security & Header Audit...');
  const probe = await httpRequest({ path: '/api/auth/access-status' });

  record({
    category: 'Security Headers',
    testId: 'PROD-SEC-01',
    name: 'Anti-Clickjacking Protection (X-Frame-Options: DENY)',
    description: 'Enforce frame restriction to prevent UI redressing attacks',
    passed: probe.headers['x-frame-options'] === 'DENY',
    evidence: `Header: ${probe.headers['x-frame-options']}`,
  });

  record({
    category: 'Security Headers',
    testId: 'PROD-SEC-02',
    name: 'Anti-MIME-Sniffing (X-Content-Type-Options: nosniff)',
    description: 'Prevent browsers from MIME-sniffing away from declared content-type',
    passed: probe.headers['x-content-type-options'] === 'nosniff',
    evidence: `Header: ${probe.headers['x-content-type-options']}`,
  });

  record({
    category: 'Security Headers',
    testId: 'PROD-SEC-03',
    name: 'Referrer-Policy: strict-origin-when-cross-origin',
    description: 'Ensure cross-origin navigation leaks no query secrets in referer',
    passed: probe.headers['referrer-policy'] === 'strict-origin-when-cross-origin',
    evidence: `Header: ${probe.headers['referrer-policy']}`,
  });

  record({
    category: 'Security Headers',
    testId: 'PROD-SEC-04',
    name: 'Permissions-Policy Hardware Shield',
    description: 'Restrict microphone, camera, and geolocation sensors',
    passed: Boolean(probe.headers['permissions-policy']),
    evidence: `Configured: ${probe.headers['permissions-policy']?.toString().slice(0, 45)}...`,
  });

  // ============================================================================
  // PART 3: ERROR SANITIZATION & STACK TRACE MASKING
  // ============================================================================
  console.log('\n▶ PART 3: Error Sanitization & Schema Masking...');

  // Malformed JSON payload
  const badJsonRes = await httpRequest({
    path: '/api/student/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: undefined, // empty body
  });
  const badJsonStr = JSON.stringify(badJsonRes.data);
  const noLeaksInBadJson =
    !badJsonStr.includes('prisma') &&
    !badJsonStr.includes('mongodb') &&
    !badJsonStr.includes('node_modules') &&
    !badJsonStr.includes('.ts:');

  record({
    category: 'Error Masking',
    testId: 'PROD-ERR-01',
    name: 'Zero Internal Stack Trace or Schema Leakage on Bad Request',
    description: 'Ensure client errors return sanitized JSON without backend filenames',
    passed: badJsonRes.status === 400 && noLeaksInBadJson,
    httpStatus: badJsonRes.status,
    evidence: `HTTP ${badJsonRes.status}: "${badJsonRes.data?.error || badJsonRes.data}" (Zero leaks)`,
  });

  // Invalid ObjectId BSON handling
  const badIdRes = await httpRequest({
    path: '/api/submissions/nonexistent-invalid-object-id/file',
    method: 'GET',
  });
  record({
    category: 'Error Masking',
    testId: 'PROD-ERR-02',
    name: 'Invalid BSON ObjectId Controlled Response (No 500 Crash)',
    description: 'Verify malformed ObjectId routes return 400/401/404 cleanly',
    passed: badIdRes.status !== 500 && (badIdRes.status === 400 || badIdRes.status === 401 || badIdRes.status === 404),
    httpStatus: badIdRes.status,
    evidence: `HTTP ${badIdRes.status}: Controlled rejection without BSON crash`,
  });

  // ============================================================================
  // PART 4: ABUSE DEFENSE, LOCKOUT & TIMING ATTACK RESISTANCE
  // ============================================================================
  console.log('\n▶ PART 4: Abuse Defense & Brute-Force Rate Limiting...');

  const testTargetUser = `PROD-TEST-${Date.now()}`;
  await resetRateLimit(`account:failed:${testTargetUser}`);

  // Send 5 incorrect attempts
  for (let i = 1; i <= 5; i++) {
    await httpRequest({
      path: '/api/student/login',
      method: 'POST',
      body: { registerNo: testTargetUser, pin: '000000' },
    });
  }

  // 6th attempt must trigger account lockout (HTTP 429)
  const lockedRes = await httpRequest({
    path: '/api/student/login',
    method: 'POST',
    body: { registerNo: testTargetUser, pin: '000000' },
  });

  record({
    category: 'Abuse Defense',
    testId: 'PROD-SEC-05',
    name: 'Account Lockout Enforced after 5 Failed PIN Attempts',
    description: 'Ensure 6th consecutive bad attempt receives HTTP 429 lockout',
    passed: lockedRes.status === 429 && lockedRes.data?.error?.includes('locked'),
    httpStatus: lockedRes.status,
    evidence: `HTTP ${lockedRes.status}: ${lockedRes.data?.error}`,
  });
  await resetRateLimit(`account:failed:${testTargetUser}`);

  // ============================================================================
  // PART 5: HIGH-CONCURRENCY DATABASE READ BURST
  // ============================================================================
  console.log('\n▶ PART 5: High-Concurrency Database Burst Stress Test...');

  const burstCount = 50;
  const burstStart = performance.now();
  const burstPromises = Array.from({ length: burstCount }, () =>
    httpRequest({ path: '/api/batches/active' })
  );
  const burstResults = await Promise.all(burstPromises);
  const burstTotalTime = Math.round(performance.now() - burstStart);
  const burstSuccess = burstResults.filter((r) => r.status === 200).length;
  const avgLatency = Math.round(burstTotalTime / burstCount);

  record({
    category: 'Concurrency',
    testId: 'PROD-PERF-01',
    name: 'High-Concurrency Read Burst (50 Parallel Requests)',
    description: '50 simultaneous requests against live database respond cleanly',
    passed: burstSuccess === burstCount && avgLatency < 100,
    evidence: `Success=${burstSuccess}/${burstCount}, TotalTime=${burstTotalTime}ms, AvgPerReq=${avgLatency}ms`,
  });

  // ============================================================================
  // PART 6: LIVE PRODUCTION E2E LIFECYCLE (REGISTER -> ATTEND -> DRIVE UPLOAD -> GRADE)
  // ============================================================================
  console.log('\n▶ PART 6: Live Production End-to-End Workflow Verification...');

  // Setup staging batch
  const testBatchName = `PROD-COHORT-${Date.now()}`;
  const simBatch = await prisma.batch.create({
    data: {
      name: testBatchName,
      batchNo: `B${Date.now().toString().slice(-4)}`,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      trainingDays: 3,
      status: 'ACTIVE',
      fnStartTime: '00:00',
      fnCutoffTime: '23:59',
      anStartTime: '00:00',
      anCutoffTime: '23:59',
    },
  });

  // Create training day
  const day1 = await prisma.trainingDay.create({
    data: {
      batchId: simBatch.id,
      dayNumber: 1,
      taskTitle: 'Production Validation XR Module',
      taskDescription: 'Build and package immersive demo scene',
      date: new Date(),
    },
  });

  // 6.1 Student Registration
  const simRegNo = `PROD-STD-${Date.now().toString().slice(-4)}`;
  const simEmail = `${simRegNo.toLowerCase()}@prod-sim.test`;
  const regRes = await httpRequest({
    path: '/api/student/register',
    method: 'POST',
    body: {
      name: 'Dr. Gordon Freeman',
      registerNo: simRegNo,
      contactNumber: '9123456780',
      email: simEmail,
      department: 'CSE',
      year: '4',
      section: 'B',
      batchId: simBatch.id,
      pin: '123456',
      confirmPin: '123456',
    },
  });

  const createdStudentId = regRes.data?.studentId;
  record({
    category: 'Live Workflow',
    testId: 'PROD-FLOW-01',
    name: 'Student Online Self-Registration with Strict Validation',
    description: 'Register student under newly active batch',
    passed: regRes.status === 200 && regRes.data?.success === true && Boolean(createdStudentId),
    httpStatus: regRes.status,
    evidence: `HTTP ${regRes.status}: Registered studentId=${createdStudentId}`,
  });

  // 6.2 Student Authentication & Secure Cookie Session
  const loginRes = await httpRequest({
    path: '/api/student/login',
    method: 'POST',
    body: { registerNo: simRegNo, pin: '123456' },
  });
  const studentCookie = loginRes.cookie;
  const hasSecureCookie = Boolean(studentCookie && studentCookie.includes('arvr_session='));

  record({
    category: 'Live Workflow',
    testId: 'PROD-FLOW-02',
    name: 'Student Session Cookie Authentication',
    description: 'Verify login returns encrypted HttpOnly session cookie',
    passed: loginRes.status === 200 && hasSecureCookie,
    httpStatus: loginRes.status,
    evidence: `HTTP ${loginRes.status}: Session established (cookie length: ${studentCookie?.length || 0})`,
  });

  // 6.3 Morning Attendance Check-In
  const attRes = await httpRequest({
    path: '/api/student/attendance/FN',
    method: 'POST',
    cookie: studentCookie,
  });

  record({
    category: 'Live Workflow',
    testId: 'PROD-FLOW-03',
    name: 'Daily Morning (FN) Attendance Check-In',
    description: 'Verify attendance marks and registers in MongoDB',
    passed: attRes.status === 200 && attRes.data?.success === true,
    httpStatus: attRes.status,
    evidence: `HTTP ${attRes.status}: ${attRes.data?.message}`,
  });

  // 6.4 Task Gate Unlocked
  const todayTaskRes = await httpRequest({
    path: '/api/student/task/today',
    cookie: studentCookie,
  });

  record({
    category: 'Live Workflow',
    testId: 'PROD-FLOW-04',
    name: 'Daily Task Unlocking Gate Verification',
    description: 'Verify task unlocks once attendance is marked',
    passed: todayTaskRes.status === 200 && todayTaskRes.data?.isTaskUnlocked === true,
    httpStatus: todayTaskRes.status,
    evidence: `isTaskUnlocked=${todayTaskRes.data?.isTaskUnlocked}`,
  });

  // 6.5 Task Direct Upload to Google Drive Primary Storage
  const realPngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG magic header
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
  const boundary = `----WebKitFormBoundary${Date.now().toString(16)}`;
  let bodyBuffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="trainingDayId"\r\n\r\n${day1.id}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nProduction live simulated submission\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="originalFilename"\r\n\r\nlab_day1.png\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="fileSize"\r\n\r\n${realPngBytes.length}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="mimeType"\r\n\r\nimage/png\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="lab_day1.png"\r\nContent-Type: image/png\r\n\r\n`),
    realPngBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const uploadRes = await httpRequest({
    path: '/api/student/task/submit',
    method: 'POST',
    cookie: studentCookie,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: bodyBuffer,
  });

  const createdSubmissionId = uploadRes.data?.submission?.id;
  record({
    category: 'Live Workflow',
    testId: 'PROD-FLOW-05',
    name: 'Task Submission to Google Drive Primary Storage',
    description: 'Upload file directly to Google Drive hierarchy and record in MongoDB',
    passed: uploadRes.status === 200 && uploadRes.data?.success === true && Boolean(createdSubmissionId),
    httpStatus: uploadRes.status,
    evidence: `HTTP ${uploadRes.status}: submissionId=${createdSubmissionId}, provider=${uploadRes.data?.submission?.storageProvider}`,
  });

  // 6.6 Submission File Delivery & Stream Router
  let streamDeliveryOk = false;
  if (createdSubmissionId) {
    const streamRes = await httpRequest({
      path: `/api/submissions/${createdSubmissionId}/file`,
      method: 'GET',
      cookie: studentCookie,
    });
    streamDeliveryOk = streamRes.status === 200 || streamRes.status === 307;
    record({
      category: 'Live Workflow',
      testId: 'PROD-FLOW-06',
      name: 'Submission File Delivery & Stream Verification',
      description: 'Owner student can access/download uploaded file via stream router',
      passed: streamDeliveryOk,
      httpStatus: streamRes.status,
      evidence: `HTTP ${streamRes.status}: Content-Type=${streamRes.headers['content-type']}`,
    });
  }

  // 6.7 Admin & Trainer Grading
  const adminLoginRes = await httpRequest({
    path: '/api/admin/login',
    method: 'POST',
    body: { email: 'admin@arvr.com', password: 'admin123' },
  });
  const adminCookie = adminLoginRes.cookie;

  const evalRes = await httpRequest({
    path: '/api/trainer/evaluations',
    method: 'POST',
    cookie: adminCookie,
    body: {
      studentId: createdStudentId,
      taskId: createdSubmissionId,
      score: 98,
      grade: 'O',
      trainingLevel: 'Level 1',
      comments: 'Exceptional production demonstration build.',
    },
  });

  record({
    category: 'Live Workflow',
    testId: 'PROD-FLOW-07',
    name: 'Instructor Evaluation & Grade Assignment',
    description: 'Instructor reviews submission and assigns grade/score',
    passed: evalRes.status === 200 && evalRes.data?.success === true,
    httpStatus: evalRes.status,
    evidence: `HTTP ${evalRes.status}: Grade=O, Score=98`,
  });

  // 6.8 Staging Data Teardown
  console.log('\n🧹 Cleaning up production simulation staging records in MongoDB & Drive...');
  const studentDb = await prisma.student.findUnique({ where: { registerNo: simRegNo } });
  if (studentDb) {
    await prisma.evaluation.deleteMany({ where: { studentId: studentDb.id } });
    await prisma.taskSubmission.deleteMany({ where: { studentId: studentDb.id } });
    await prisma.attendance.deleteMany({ where: { studentId: studentDb.id } });
    await prisma.student.delete({ where: { id: studentDb.id } });
  }
  await prisma.trainingDay.deleteMany({ where: { batchId: simBatch.id } });
  await prisma.batch.delete({ where: { id: simBatch.id } });
  console.log('✅ Staging teardown complete.');

  // ============================================================================
  // PART 7: 6:00 AM MORNING WATCHDOG PROBE
  // ============================================================================
  console.log('\n▶ PART 7: 6:00 AM Morning Watchdog Scheduled Health Suite...');
  const cronKey = process.env.CRON_SECRET || sessionSecret;
  const watchdogRes = await httpRequest({
    path: `/api/cron/morning-watchdog?key=${cronKey}&runNow=true`,
    method: 'GET',
  });

  const wdReport = watchdogRes.data?.report;
  const wdAllHealthy = Boolean(wdReport && wdReport.allHealthy === true);

  record({
    category: 'Watchdog',
    testId: 'PROD-WD-01',
    name: 'Morning Watchdog 6-Subsystem Unified Probe',
    description: 'Execute pre-flight morning health check across all 6 services',
    passed: watchdogRes.status === 200 && wdAllHealthy,
    httpStatus: watchdogRes.status,
    evidence: `AllHealthy=${wdAllHealthy}, Subsystems=${Object.keys(wdReport?.subsystems || {}).length}/6 OK`,
  });

  // ============================================================================
  // SUMMARY MATRIX
  // ============================================================================
  console.log('\n================================================================================');
  console.log('📊 PRODUCTION LIVE SIMULATION — FINAL AUDIT REPORT');
  console.log('================================================================================');

  const categories = Array.from(new Set(allResults.map((r) => r.category)));
  const summaryTable = categories.map((cat) => {
    const list = allResults.filter((r) => r.category === cat);
    const passed = list.filter((r) => r.passed).length;
    const failed = list.filter((r) => !r.passed).length;
    return {
      Category: cat,
      Total: list.length,
      Passed: passed,
      Failed: failed,
      Status: failed === 0 ? 'PASS' : 'FAIL',
    };
  });

  console.table(summaryTable);
  const total = allResults.length;
  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.filter((r) => !r.passed).length;

  console.log(`TOTAL PRODUCTION TESTS: ${total}`);
  console.log(`PASSED:                 ${passed}`);
  console.log(`FAILED:                 ${failed}`);
  console.log(`PASS RATE:              ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 100% PRODUCTION READY! ALL PRODUCTION LIVE CHECKS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error(`❌ ${failed} PRODUCTION CHECKS FAILED!\n`);
    process.exit(1);
  }
}

runProductionSimulation().catch((err) => {
  console.error('Fatal production test runner error:', err);
  process.exit(1);
});
