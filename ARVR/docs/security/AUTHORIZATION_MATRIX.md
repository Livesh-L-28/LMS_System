# Role-Based Access Control (RBAC) & Authorization Matrix

**Document ID:** `SEC-RBAC-003`  
**Classification:** Authorization & Permission Specifications  
**Verification Category:** Verified in source (`lib/auth.ts`, `app/api/**/route.ts`)  

---

## 1. System Roles

1. **`ANONYMOUS / PUBLIC`**: Unauthenticated guest users visiting landing pages, login dialogs, and public health probes.
2. **`STUDENT`**: Enrolled students authenticated via institutional register number and PIN.
3. **`TRAINER`**: Instructors assigned to batch practical reviews and evaluation workflows.
4. **`ADMIN`**: System administrators possessing complete control over batches, curricula, access policies, certificates, and system configuration.

---

## 2. API Authorization Matrix

| Endpoint Group | Route Patterns | Anonymous | Student | Trainer | Admin |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Authentication** | `/api/student/login`, `/api/admin/login` | Allowed | Allowed | Allowed | Allowed |
| **Session State** | `/api/auth/me`, `/api/auth/logout` | Allowed | Allowed | Allowed | Allowed |
| **Student Attendance**| `/api/student/attendance/[session]` | Denied | **Allowed** | Denied | Denied |
| **Task Submission** | `/api/student/task/submit`, `/today` | Denied | **Allowed** | Denied | Denied |
| **Curriculum View** | `/api/student/curriculum` | Denied | **Allowed** | Allowed | Allowed |
| **Trainer Queue** | `/api/trainer/batches`, `/evaluations` | Denied | Denied | **Allowed** | **Allowed** |
| **Submission Media**| `/api/submissions/[id]/file` | Denied | Own Task | **Allowed** | **Allowed** |
| **Batch Management**| `/api/admin/batches/*` | Denied | Denied | Read-Only | **Allowed** |
| **Roster Imports** | `/api/admin/students/import` | Denied | Denied | Denied | **Allowed** |
| **Certificates** | `/api/admin/certificates`, `certificate-export` | Denied | Denied | Denied | **Allowed** |
| **Access Settings** | `/api/admin/settings/*` | Denied | Denied | Denied | **Allowed** |
| **Google Drive OAuth**| `/api/google-drive/*`, `admin/settings/drive/*` | Denied | Denied | Denied | **Allowed** |
| **Morning Watchdog**| `/api/cron/morning-watchdog` | Denied | Denied | Denied | **Bearer / Admin** |
| **System Probes** | `/api/health`, `/health/liveness`, `/readiness` | **Allowed** | Allowed | Allowed | Allowed |

---

## 3. Privilege Escalation Defenses

- **Strict Session Type Checking:** `requireAuth(role)` inspects `session.user.role`. A student cannot call administrative endpoints simply by guessing or crafting an API request; unauthorized attempts immediately return `401 Unauthorized` or `403 Forbidden`.
- **Database Boundary Validation:** Student requests automatically use `session.user.id` and `session.user.batchId` derived from the server-side decrypted session token, preventing Insecure Direct Object References (IDOR) where a student attempts to mark attendance for another student's ID.
