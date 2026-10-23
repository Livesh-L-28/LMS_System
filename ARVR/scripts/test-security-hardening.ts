import http from 'http';
import { PrismaClient } from '@prisma/client';
import { resetRateLimit } from '../lib/rateLimit';

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function record(name: string, ok: boolean, details?: string) {
  if (ok) {
    passed++;
    console.log(`  ✅ [PASS] ${name}${details ? ` (${details})` : ''}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${name}${details ? ` - ${details}` : ''}`);
  }
}

interface RequestOptions {
  path: string;
  method?: string;
  body?: any;
  cookie?: string;
  ip?: string;
}

interface ResponseResult {
  status: number;
  cookie?: string;
  data: any;
  headers: http.IncomingHttpHeaders;
}

function makeRequest(options: RequestOptions): Promise<ResponseResult> {
  return new Promise((resolve, reject) => {
    const postData = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null;
    const headers: Record<string, string> = {
      'x-forwarded-for': options.ip || '192.168.10.1',
    };

    if (options.cookie) {
      headers['Cookie'] = options.cookie;
    }

    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path: options.path,
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        const rawCookies: string[] = [];
        const setCookieHeader = res.headers['set-cookie'];
        if (Array.isArray(setCookieHeader)) {
          rawCookies.push(...setCookieHeader);
        } else if (setCookieHeader) {
          rawCookies.push(setCookieHeader);
        }

        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }

          resolve({
            status: res.statusCode || 500,
            cookie: rawCookies.map((c) => c.split(';')[0]).join('; '),
            data: parsed,
            headers: res.headers,
          });
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runSecurityAudit() {
  console.log('================================================================');
  console.log('🔒 PRODUCTION APPLICATION SECURITY & DEVSECOPS AUDIT');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: HTTP Security Headers Validation
  // -------------------------------------------------------------
  console.log('--- 1. HTTP Defense-in-Depth Security Headers ---');
  const headersRes = await makeRequest({ path: '/' });
  const h = headersRes.headers;

  record('X-Frame-Options: DENY (Anti-Clickjacking)', h['x-frame-options'] === 'DENY', `Value: ${h['x-frame-options']}`);
  record('X-Content-Type-Options: nosniff (Anti-MIME-Sniffing)', h['x-content-type-options'] === 'nosniff', `Value: ${h['x-content-type-options']}`);
  record('Strict-Transport-Security (HSTS)', typeof h['strict-transport-security'] === 'string' && (h['strict-transport-security'] as string).includes('max-age'), `Value: ${h['strict-transport-security']}`);
  record('Referrer-Policy: strict-origin-when-cross-origin', h['referrer-policy'] === 'strict-origin-when-cross-origin', `Value: ${h['referrer-policy']}`);
  record('Permissions-Policy configured', typeof h['permissions-policy'] === 'string', `Value: ${h['permissions-policy']}`);
  record('Content-Security-Policy with frame-ancestors none', typeof h['content-security-policy'] === 'string' && (h['content-security-policy'] as string).includes("frame-ancestors 'none'"), `CSP present`);

  // -------------------------------------------------------------
  // TEST 2: Distributed Account-Based Lockout (PIN Brute-Force Defense)
  // -------------------------------------------------------------
  console.log('\n--- 2. Account-Based Brute-Force Protection & Lockout ---');
  const targetRegNo = '21CS001';
  await resetRateLimit(targetRegNo);

  // Send 5 incorrect PIN guesses from 5 DIFFERENT client IPs
  for (let i = 1; i <= 5; i++) {
    const res = await makeRequest({
      path: '/api/student/login',
      method: 'POST',
      ip: `10.200.1.${i}`,
      body: { registerNo: targetRegNo, pin: '000000' }, // Wrong PIN
    });
    record(`Attempt #${i} from IP 10.200.1.${i} rejected with 401`, res.status === 401);
  }

  // 6th attempt from a brand new IP (10.200.1.99) MUST be blocked with HTTP 429 Account Lockout!
  const lockedRes = await makeRequest({
    path: '/api/student/login',
    method: 'POST',
    ip: '10.200.1.99',
    body: { registerNo: targetRegNo, pin: '123456' }, // Even with correct PIN, account is locked!
  });

  record(
    'Account Locked: 6th attempt from new IP blocked with HTTP 429',
    lockedRes.status === 429 && lockedRes.data?.error?.includes('Account temporarily locked'),
    `Response: ${lockedRes.data?.error}`
  );

  // Unlock account for remaining tests
  await resetRateLimit(targetRegNo);

  // -------------------------------------------------------------
  // TEST 3: Volumetric IP-Based Rate Limiting
  // -------------------------------------------------------------
  console.log('\n--- 3. Volumetric IP-Based Rate Limiting ---');
  const floodedIp = '10.254.1.50';
  await resetRateLimit(`ip:${floodedIp}`);

  let ipFloodedBlocked = false;
  for (let i = 1; i <= 21; i++) {
    const res = await makeRequest({
      path: '/api/student/login',
      method: 'POST',
      ip: floodedIp,
      body: { registerNo: `NONEXISTENT_${i}`, pin: '123456' },
    });
    if (res.status === 429) {
      ipFloodedBlocked = true;
      break;
    }
  }

  record('Volumetric flood blocked with HTTP 429 (IP Rate Limiting)', ipFloodedBlocked);
  await resetRateLimit(`ip:${floodedIp}`);

  // -------------------------------------------------------------
  // TEST 4: Timing-Attack Mitigation (Side-Channel Enumeration)
  // -------------------------------------------------------------
  console.log('\n--- 4. Timing Attack Mitigation ---');
  // Measure response time for existing user with wrong PIN vs non-existing user
  const measureTimes = async (regNo: string, pin: string, count = 3) => {
    const times: number[] = [];
    for (let i = 0; i < count; i++) {
      const start = Date.now();
      await makeRequest({
        path: '/api/student/login',
        method: 'POST',
        ip: `10.100.${Math.floor(Math.random() * 200)}.${i + 1}`,
        body: { registerNo: regNo, pin },
      });
      times.push(Date.now() - start);
    }
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  };

  const existingAvg = await measureTimes('21CS001', '000000');
  const nonExistingAvg = await measureTimes('NONEXISTENT_99999', '000000');

  // Both execute a real Bcrypt hash compare, so timing difference should be small (< 150ms delta)
  const deltaMs = Math.abs(existingAvg - nonExistingAvg);
  record(
    'Constant-time dummy Bcrypt comparison eliminates username enumeration side-channels',
    deltaMs < 150,
    `Existing: ${existingAvg}ms, Non-Existing: ${nonExistingAvg}ms (Delta: ${deltaMs}ms)`
  );

  // -------------------------------------------------------------
  // TEST 5: Session Invalidation & Logout API
  // -------------------------------------------------------------
  console.log('\n--- 5. Session Invalidation & Logout ---');
  await resetRateLimit('21CS001');
  await resetRateLimit('192.168.10.1');
  await resetRateLimit('10.50.1.1');

  // Login as student
  const loginRes = await makeRequest({
    path: '/api/student/login',
    method: 'POST',
    ip: '10.50.1.1',
    body: { registerNo: '21CS001', pin: '123456' },
  });

  const sessionCookie = loginRes.cookie;
  record('Student authentication succeeds and sets session', loginRes.status === 200 && !!sessionCookie);

  // Verify session is active
  const meRes1 = await makeRequest({ path: '/api/auth/me', cookie: sessionCookie });
  record('Session verified as active via /api/auth/me', meRes1.status === 200 && meRes1.data?.user?.role === 'STUDENT');

  // Call /api/auth/logout
  const logoutRes = await makeRequest({ path: '/api/auth/logout', method: 'POST', cookie: sessionCookie });
  record('Session destroyed via POST /api/auth/logout', logoutRes.status === 200 && logoutRes.data?.success === true);

  // Verify that the invalidated session cookie is now rejected
  const meRes2 = await makeRequest({ path: '/api/auth/me', cookie: sessionCookie });
  record('Subsequent access with destroyed session rejected with HTTP 401', meRes2.status === 401);

  // -------------------------------------------------------------
  // TEST 6: IDOR / BOLA Authorization Enforcement
  // -------------------------------------------------------------
  // Ensure Student B exists for IDOR test
  const batch = await prisma.batch.findFirst();
  const bcrypt = await import('bcryptjs');
  let createdStudentB = false;
  let studentB = await prisma.student.findUnique({ where: { registerNo: '21CS002' } });
  if (!studentB && batch) {
    studentB = await prisma.student.create({
      data: {
        name: 'Student B',
        registerNo: '21CS002',
        email: 'studentb@test.edu',
        contactNumber: '9999999999',
        department: 'CS',
        year: '3',
        section: 'A',
        batchId: batch.id,
        pinHash: await bcrypt.hash('123456', 10),
      },
    });
    createdStudentB = true;
  }

  // Login as Student B (21CS002)
  const studentBLogin = await makeRequest({
    path: '/api/student/login',
    method: 'POST',
    body: { registerNo: '21CS002', pin: '123456' },
  });
  const studentBCookie = studentBLogin.cookie;

  // Find Student A's submission
  const subA = await prisma.taskSubmission.findFirst({
    where: { student: { registerNo: '21CS001' } },
  });

  if (subA) {
    const idorRes = await makeRequest({
      path: `/api/submissions/${subA.id}/file`,
      cookie: studentBCookie,
    });
    record(
      'IDOR Protection: Student B cannot access Student A submission file (HTTP 403)',
      idorRes.status === 403,
      `Status: ${idorRes.status}`
    );
  }

  if (createdStudentB) {
    await prisma.student.deleteMany({ where: { registerNo: '21CS002' } });
  }

  // Student B attempting to access Admin Stats
  const adminAccessRes = await makeRequest({
    path: '/api/admin/stats',
    cookie: studentBCookie,
  });
  record(
    'RBAC Privilege Escalation blocked: Student cannot access Admin Stats (HTTP 401/403)',
    adminAccessRes.status === 401 || adminAccessRes.status === 403,
    `Status: ${adminAccessRes.status}`
  );

  // -------------------------------------------------------------
  // TEST 7: Information Disclosure Prevention in Errors
  // -------------------------------------------------------------
  console.log('\n--- 7. Information Disclosure Prevention in Error Handling ---');
  // Send malformed registration payload with invalid JSON
  const malformedRes = await makeRequest({
    path: '/api/student/register',
    method: 'POST',
    body: 'MALFORMED_NON_JSON_DATA',
  });

  record(
    'Malformed request returns sanitized 400 without internal leaks',
    malformedRes.status === 400 && !JSON.stringify(malformedRes.data).includes('PrismaClientKnownRequestError')
  );

  console.log('\n================================================================');
  console.log(`📊 SECURITY AUDIT RESULT: ${passed}/${passed + failed} PASS`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityAudit()
  .catch((err) => {
    console.error('Fatal security audit error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
