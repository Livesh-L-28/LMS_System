# Backend Module Reference & Subsystem Architecture

**Document ID:** `BACK-MOD-001`  
**Classification:** Core Backend Implementation Reference  
**Verification Category:** Verified in source (`lib/*.ts`)  

---

## 1. Subsystem Index

| Module Path | Core Purpose | Exported Symbols | Database Access | External Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| [`lib/auth.ts`](file:///Users/livesh/arvr/ARVR/lib/auth.ts) | Session lifecycle, cookie encryption, timeout validation, bcrypt hashing | `SessionUser`, `SessionData`, `IDLE_TIMEOUT_MS`, `STUDENT_ABSOLUTE_TIMEOUT_MS`, `ADMIN_ABSOLUTE_TIMEOUT_MS`, `sessionOptions`, `getSession`, `createSession`, `destroySession`, `hashPinOrPassword`, `comparePinOrPassword`, `requireAuth` | Indirect (via session tokens) | `iron-session`, `bcryptjs`, `crypto` |
| [`lib/prisma.ts`](file:///Users/livesh/arvr/ARVR/lib/prisma.ts) | MongoDB Atlas connection pooling, singleton client, exponential backoff retry | `prisma`, `withPrismaRetry` | Direct (MongoDB Atlas client) | `@prisma/client` |
| [`lib/geofence.ts`](file:///Users/livesh/arvr/ARVR/lib/geofence.ts) | Physical campus geofence enforcement, Haversine formula, IP/CIDR validation | `AccessVerificationParams`, `AccessVerificationResult`, `calculateHaversineDistance`, `normalizeIp`, `isIpInAllowedList`, `verifyAccessRestriction` | Indirect (reads system settings) | Mathematical standard |
| [`lib/antivirus.ts`](file:///Users/livesh/arvr/ARVR/lib/antivirus.ts) | In-memory zero-trust malware signature scanning, disguised MZ/ELF header detection, EICAR checks | `VirusScanResult`, `scanBufferHeuristics`, `scanFileBuffer` | None | Node `net`, `crypto` |
| [`lib/rateLimit.ts`](file:///Users/livesh/arvr/ARVR/lib/rateLimit.ts) | Dual-layer sliding-window IP & account rate limiter, temporary account lockout, session revocation | `checkRateLimit`, `isAccountLocked`, `checkDualRateLimit`, `recordFailedAttempt`, `resetRateLimit`, `revokeSession`, `isSessionRevoked` | None | `ioredis` |
| [`lib/storage.ts`](file:///Users/livesh/arvr/ARVR/lib/storage.ts) | Unified file persistence coordinator, key sanitization, S3 direct upload | `saveTaskScreenshot` | None | `lib/s3.ts`, Node `crypto`, `path` |
| [`lib/s3.ts`](file:///Users/livesh/arvr/ARVR/lib/s3.ts) | AWS S3 client wrapper, presigned upload/download URLs, magic byte validation | `MAX_FILE_SIZE`, `ALLOWED_EXTENSIONS`, `AllowedExtension`, `EXTENSION_TO_MIME`, `getS3Client`, `getBucketName`, `sanitizeFilename`, `validateFileMetadata`, `validateMagicBytes`, `generatePresignedUploadUrl`, `generatePresignedDownloadUrl`, `directUploadToS3`, `verifyS3Object`, `deleteS3Object` | None | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| [`lib/googleDrive.ts`](file:///Users/livesh/arvr/ARVR/lib/googleDrive.ts) | Google Drive OAuth2 token refresh, folder tree builder, multipart file upload | `encryptToken`, `decryptToken`, `getOAuth2ClientAsync`, `getOAuth2Client`, `getAdminDriveConnection`, `getDriveClientForAdmin`, `ensureRootFolder`, `ensureBatchFolder`, `ensureDayFolder`, `uploadTaskSubmissionToDrive`, `testAdminDriveConnection`, `getDriveFileStream` | `prisma.googleDriveConnection` | `googleapis`, Node `crypto` |
| [`lib/morningWatchdog.ts`](file:///Users/livesh/arvr/ARVR/lib/morningWatchdog.ts) | Automated 6-point subsystem diagnostics, storage quota monitor, alert webhook dispatcher | `SubsystemStatus`, `WatchdogSubsystemReport`, `WatchdogReport`, `runMorningWatchdog`, `getLatestWatchdogReport` | `prisma.systemSetting`, `prisma.googleDriveConnection`, `prisma.batch` | `@aws-sdk/client-s3`, `ioredis` |
| [`lib/cronScheduler.ts`](file:///Users/livesh/arvr/ARVR/lib/cronScheduler.ts) | Background 6:00 AM morning watchdog timer initialization and recurring scheduling | `initMorningWatchdogScheduler` | None (invokes watchdog runner) | Global `setTimeout` / `setInterval` |
| [`lib/excelExport.ts`](file:///Users/livesh/arvr/ARVR/lib/excelExport.ts) | Batch certificate spreadsheet generator, custom styling, buffer export | `CertificateExportRow`, `generateCertificateExcel` | None | `exceljs` |
| [`lib/batchUtils.ts`](file:///Users/livesh/arvr/ARVR/lib/batchUtils.ts) | Daily curriculum generator, batch calendar math, attendance session calculations | `LevelConfigItem`, `LEVEL_CONFIG`, `TaskItem`, `ResourceItem`, `DefaultCurriculumItem`, `normalizeDayTasks`, `normalizeDayResources`, `DEFAULT_CURRICULUM_BY_LEVEL`, `generateBatchName`, `calculateBatchMaxSessions`, `calculateAttendancePercentage`, `generateTrainingDaysCalendar`, `calculateEndDate`, `calculateExamDate`, `formatDateDisplay` | None | `date-fns` |
| [`lib/time.ts`](file:///Users/livesh/arvr/ARVR/lib/time.ts) | Asia/Kolkata zoned time conversion, FN/AN attendance session window resolution | `DEFAULT_TIMEZONE`, `DEFAULT_FN_START`, `DEFAULT_FN_CUTOFF`, `DEFAULT_AN_START`, `DEFAULT_AN_CUTOFF`, `getZonedNow`, `getZonedTimeString`, `getTodayDateString`, `getMidnightDate`, `hasSessionStarted`, `isSessionCutoffPassed`, `isSessionWindowOpen`, `SessionCriteriaStatus`, `formatTime12Hour`, `getDetailedSessionStatus`, `isAttendanceMatchingDate`, `resolveBatchAttendanceWindows` | None | `date-fns-tz` |
| [`lib/totp.ts`](file:///Users/livesh/arvr/ARVR/lib/totp.ts) | Two-factor authentication (TOTP) RFC 6238 implementation, Base32 secrets, OTP generator | `generateBase32Secret`, `generateTOTPCode`, `verifyTOTPCode`, `getTOTPUri`, `generateEmailOtp` | None | Node `crypto` |
| [`lib/validation.ts`](file:///Users/livesh/arvr/ARVR/lib/validation.ts) | Zod runtime schema validators for registration, login, evaluations, and batches | `registerSchema`, `studentLoginSchema`, `userLoginSchema`, `evaluationSchema`, `batchSchema`, `feedbackSchema`, `isValidObjectId` | None | `zod` |
| [`lib/security.ts`](file:///Users/livesh/arvr/ARVR/lib/security.ts) | Production security environment validator, constant-time dummy comparisons, client IP extraction | `SecurityEventType`, `SecurityEvent`, `getClientIp`, `logSecurityEvent`, `formatSafeError`, `dummyBcryptCompare`, `validateProductionSecurityEnvironment` | None | Node `crypto`, `bcryptjs` |
| [`lib/settings.ts`](file:///Users/livesh/arvr/ARVR/lib/settings.ts) | In-memory cached system settings with automatic 60-second TTL and explicit invalidation | `getCachedSystemSettings`, `invalidateSettingsCache` | `prisma.systemSetting` | Local cache |
| [`lib/auditLog.ts`](file:///Users/livesh/arvr/ARVR/lib/auditLog.ts) | Administrative action logger, audit trail persistence | `AuditLogEntry`, `logAdminAudit`, `getAuditLogs` | `prisma.auditLog` | None |
| [`lib/telemetry.ts`](file:///Users/livesh/arvr/ARVR/lib/telemetry.ts) | Structured JSON event logging, PII sanitization | `WorkflowType`, `WorkflowStatus`, `WorkflowEvent`, `sanitizeLogData`, `logger`, `recordWorkflowEvent` | None | Console JSON |

---

## 2. In-Depth Module Specifications

### 2.1 `lib/auth.ts` — Authentication & Session Authority
- **Session Cookie:** `arvr_session`, signed using `SESSION_SECRET` (minimum 32-character requirement).
- **Timeouts Enforced:**
  - `IDLE_TIMEOUT_MS`: 2 hours ($7,200,000\text{ ms}$). Exceeding this duration between requests invalidates the session.
  - `STUDENT_ABSOLUTE_TIMEOUT_MS`: 24 hours ($86,400,000\text{ ms}$).
  - `ADMIN_ABSOLUTE_TIMEOUT_MS`: 12 hours ($43,200,000\text{ ms}$).
- **Revocation Check:** `getSession()` queries `isSessionRevoked(sessionId)` to ensure logged-out tokens cannot be replayed even if the client retains the cookie.
- **Password Protection:** `hashPinOrPassword` executes `bcrypt.hash(val, 10)` (10 salt rounds).

### 2.2 `lib/prisma.ts` — Connection Engine & Exponential Backoff
- **Connection Singleton:** Attaches `prisma` client to `globalThis` in non-production environments to prevent connection exhaustion during hot-module reloading.
- **Retry Mechanism (`withPrismaRetry<T>`):**
  - Traps transient errors: `P2024` (Timed out fetching connection from pool), `P2010` (Raw query failed), `ServerSelectionTimeout`, and `MongoNetworkTimeout`.
  - Executes up to 3 retries with jittered exponential backoff: $\text{delay} = 200 \times 2^{\text{attempt}} + \text{random}(0, 50)\text{ms}$.

### 2.3 `lib/geofence.ts` — Geolocation & Network Gate
- **Formula:** Haversine great-circle calculation using $R = 6,371,000\text{ meters}$.
- **Accuracy Filter:** Rejects GPS fixes with `accuracy > 150` meters to block coarse network cell tower triangulation.
- **CIDR Subnet Matcher:** Converts IPv4 addresses to 32-bit unsigned integers and computes `(ipNum & mask) === (rangeNum & mask)` for network verification.
- **IPv6 Normalization:** Automatically strips `::ffff:` mapped prefixes before subnet validation.
