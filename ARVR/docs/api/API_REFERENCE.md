# Comprehensive API Reference & Endpoint Catalogue

**Document ID:** `API-REF-001`  
**Classification:** REST API Reference Manual  
**Total Route Handlers:** 52  
**Total Method Endpoints:** 69 Distinct (Method, Path) Combinations  
**Verification Category:** Verified in source (`app/api/**/route.ts`)  

---

## 1. Authentication & Identity Management

### 1.1 `POST /api/student/login`
- **File:** [`app/api/student/login/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/student/login/route.ts)
- **Authentication:** Public
- **Rate Limiting:** Dual-layer IP & Account sliding window (5 attempts / 60s; 15m lockout on failure)
- **Request Body Schema (`application/json`):**
  ```json
  {
    "registerNo": "21CS001",
    "pin": "123456"
  }
  ```
- **Validation Rules:** `registerNo` non-empty string, `pin` 6 digits.
- **Response `200 OK`:** Sets encrypted cookie `arvr_session` (`httpOnly: true`, `sameSite: 'lax'`).
  ```json
  {
    "success": true,
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "registerNo": "21CS001",
      "name": "John Doe",
      "role": "STUDENT",
      "batchId": "64f1a2b3c4d5e6f7a8b9c0d2"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Input validation failure.
  - `401 Unauthorized`: Invalid PIN or register number.
  - `429 Too Many Requests`: Account or IP temporarily locked.

### 1.2 `POST /api/admin/login`
- **File:** [`app/api/admin/login/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/login/route.ts)
- **Authentication:** Public
- **Rate Limiting:** Active (Dual-layer lockout)
- **Request Body Schema:**
  ```json
  {
    "email": "admin@arvr.com",
    "password": "admin123"
  }
  ```
- **2FA Handshake:** If `twoFactorEnabled === true`, returns `{ twoFactorRequired: true }` and sends email OTP / expects TOTP verification via `/api/admin/2fa`.
- **Response `200 OK`:** Sets admin session cookie.

### 1.3 `POST /api/admin/2fa` & `GET /api/admin/2fa`
- **File:** [`app/api/admin/2fa/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/2fa/route.ts)
- **Methods:**
  - `GET`: Returns 2FA enrollment status, Base32 TOTP secret, and QR auth URI (`otpauth://totp/...`).
  - `POST`: Verifies submitted 6-digit TOTP code or temporary email OTP and enables 2FA.

### 1.4 `GET /api/auth/me`
- **File:** [`app/api/auth/me/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/auth/me/route.ts)
- **Authentication:** Session cookie (`arvr_session`)
- **Response `200 OK`:** `{ "authenticated": true, "user": { ... } }` or `{ "authenticated": false }`.

### 1.5 `POST /api/auth/logout`
- **File:** [`app/api/auth/logout/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/auth/logout/route.ts)
- **Action:** Destroys iron-session cookie and flags `sessionId` in revocation store.

---

## 2. Student Workspace & Daily Task Execution

### 2.1 `POST /api/student/attendance/[session]`
- **File:** [`app/api/student/attendance/[session]/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/student/attendance/%5Bsession%5D/route.ts)
- **Path Parameters:** `session` must be `'FN'` (Forenoon) or `'AN'` (Afternoon).
- **Authentication:** `requireAuth('STUDENT')`
- **Request Body Schema:**
  ```json
  {
    "latitude": 11.274198,
    "longitude": 77.607038,
    "accuracy": 25.4
  }
  ```
- **Execution Flow:**
  1. Validates session time window against `FN_CUTOFF` / `AN_CUTOFF`.
  2. Runs Haversine verification against campus lat/lng. If $> 100\text{m}$, rejects with `403 Forbidden`.
  3. Validates client egress IP against allowed campus CIDRs unless Wi-Fi bypass is enabled.
  4. Upserts `Attendance` record in database.

### 2.2 `POST /api/student/task/submit`
- **File:** [`app/api/student/task/submit/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/student/task/submit/route.ts)
- **Authentication:** `requireAuth('STUDENT')`
- **Gating Prerequisite:** Verifies both FN and AN attendance sessions are marked for current day.
- **Request Content-Type:** `multipart/form-data`
  - `file`: PNG, JPG, or WebP screenshot ($\le 5\text{MB}$).
  - `dayNumber`: Integer (1 to 10).
  - `description`: Implementation notes and GitHub/Unity commit references.
- **Security Scans:** In-memory magic byte validation and EICAR/MZ antivirus scanning (`lib/antivirus.ts`).
- **Storage:** Persisted to AWS S3 (`lib/storage.ts`) or Google Drive.

### 2.3 `GET /api/student/curriculum`
- **File:** [`app/api/student/curriculum/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/student/curriculum/route.ts)
- **Authentication:** `requireAuth('STUDENT')`
- **Response `200 OK`:** Full 10-day training calendar, task titles, descriptions, and XR SDK reference links for the student's enrolled batch.

---

## 3. Trainer Evaluation & Grading Engine

### 3.1 `GET /api/trainer/batches`
- **File:** [`app/api/trainer/batches/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/trainer/batches/route.ts)
- **Authentication:** `requireAuth(['TRAINER', 'ADMIN'])`
- **Response:** List of batches with active student counts and pending evaluation counters.

### 3.2 `GET /api/trainer/batches/[batchId]/tasks`
- **File:** [`app/api/trainer/batches/[batchId]/tasks/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/trainer/batches/%5BbatchId%5D/tasks/route.ts)
- **Query Parameters:** `dayNumber` (optional), `status` (`ALL`, `PENDING`, `GRADED`).
- **Response:** Array of student submissions, screenshot URLs, student descriptions, and evaluation scores.

### 3.3 `POST /api/trainer/evaluations`
- **File:** [`app/api/trainer/evaluations/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/trainer/evaluations/route.ts)
- **Authentication:** `requireAuth(['TRAINER', 'ADMIN'])`
- **Request Body Schema:**
  ```json
  {
    "taskId": "64f1a2b3c4d5e6f7a8b9c0d3",
    "score": 88,
    "grade": "A+",
    "trainingLevel": "Level 1",
    "comments": "Code structure is well organized"
  }
  ```
- **Action:** Upserts `Evaluation` record, updates `TaskSubmission.status` to `'GRADED'`, and recalculates student average score.

---

## 4. Administrative Control, Batches & Certificates

### 4.1 `POST /api/admin/batches/[batchId]/check-completion`
- **File:** [`app/api/admin/batches/[batchId]/check-completion/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/batches/%5BbatchId%5D/check-completion/route.ts)
- **Authentication:** `requireAuth(['ADMIN'])`
- **Action:**
  - Evaluates attendance percentage against `ATTENDANCE_THRESHOLD` (100%).
  - Verifies Final Exam day attendance.
  - Generates atomic sequential certificate numbers (`ARVR-[BATCH]-XXXX`).
  - Returns student eligibility breakdown table.

### 4.2 `GET /api/admin/batches/[batchId]/certificate-export`
- **File:** [`app/api/admin/batches/[batchId]/certificate-export/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/batches/%5BbatchId%5D/certificate-export/route.ts)
- **Authentication:** `requireAuth(['ADMIN'])`
- **Response:** Downloadable Excel workbook (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).

### 4.3 `POST /api/admin/students/import`
- **File:** [`app/api/admin/students/import/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/students/import/route.ts)
- **Authentication:** `requireAuth(['ADMIN'])`
- **Request Body:** CSV string or array of `{ name, registerNo, email, contactNumber, department, year, section, batchId }`.
- **Validation:** Filters duplicate register numbers; creates default PIN hash (`123456`).

---

## 5. Health Probes & Automated Watchdog

### 5.1 `GET /api/health`, `/liveness`, `/readiness`
- **Files:** [`app/api/health/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/health/route.ts), [`liveness/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/health/liveness/route.ts), [`readiness/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/health/readiness/route.ts)
- **Probes:**
  - `/api/health`: Comprehensive status of DB, storage, and memory.
  - `/api/health/liveness`: Instant `200 OK` for container orchestrator liveness.
  - `/api/health/readiness`: Verifies MongoDB connection pool readiness before accepting traffic.

### 5.2 `GET & POST /api/cron/morning-watchdog`
- **File:** [`app/api/cron/morning-watchdog/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/cron/morning-watchdog/route.ts)
- **Authentication:** Bearer `CRON_SECRET` or Admin Session Cookie.
- **Action:** Executes all 6 subsystem diagnostics (Google Drive, S3, MongoDB, Redis, Curriculum, Geofence) and returns complete diagnostic report.
