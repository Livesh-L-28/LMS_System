# Database Data Dictionary & Field Catalog

**Document ID:** `DB-DICT-002`  
**Classification:** Complete Field-by-Field Reference  
**Total Models:** 12  
**Verification Category:** Verified in source (`prisma/schema.prisma`)  

---

## 1. Model Catalog

### 1.1 `Student`
Represents an enrolled student in an AR/VR training cohort.

| Field Name | Type | Modifiers / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (ObjectId)` | `@id @default(auto())` | Primary key |
| `name` | `String` | Required | Student full name |
| `registerNo` | `String` | `@unique` | Institutional register number (e.g. `21CS001`) |
| `contactNumber` | `String` | Required | Phone number |
| `email` | `String` | `@unique` | Student email address |
| `department` | `String` | Required | Academic department (e.g. `Computer Science`) |
| `year` | `String` | Required | Year of study (e.g. `3rd Year`) |
| `section` | `String` | Required | Class section (e.g. `A`) |
| `batchId` | `String (ObjectId)` | Required | Foreign key referencing `Batch.id` |
| `pinHash` | `String` | Required | Bcrypt salt hash (10 rounds) of student 6-digit PIN |
| `createdAt` | `DateTime` | `@default(now())` | Registration timestamp |

*Relations:* `batch` (`Batch`), `attendances` (`Attendance[]`), `tasks` (`TaskSubmission[]`), `evaluations` (`Evaluation[]`), `certificate` (`CertificateRecord?`), `feedback` (`Feedback[]`).  
*Indexes:* `@@index([batchId])`, `@@index([department])`, `@@index([section])`.

---

### 1.2 `Admin`
System administrators, trainers, and faculty staff.

| Field Name | Type | Modifiers / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (ObjectId)` | `@id @default(auto())` | Primary key |
| `name` | `String` | Required | Staff member full name |
| `email` | `String` | `@unique` | Staff login email |
| `passwordHash` | `String` | Required | Bcrypt salt hash (10 rounds) |
| `twoFactorEnabled` | `Boolean` | `@default(false)` | Whether 2FA TOTP is enforced |
| `twoFactorSecret` | `String?` | Optional | Base32 TOTP secret |
| `tempTwoFactorCode` | `String?` | Optional | Temporary email OTP code |
| `tempTwoFactorExpires`| `DateTime?`| Optional | Expiration timestamp for email OTP |

---

### 1.3 `Batch`
Training batches and cohort schedules.

| Field Name | Type | Modifiers / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (ObjectId)` | `@id @default(auto())` | Primary key |
| `name` | `String` | `@unique` | Canonical batch code (e.g. `ARVR-L1-001-18AUG26`) |
| `batchNo` | `String?` | Optional | Sequence number |
| `level` | `String?` | `@default("Level 1")` | Training level (`Level 1`, `Level 2`, `Level 3`) |
| `startDate` | `DateTime` | Required | Start date of batch |
| `endDate` | `DateTime` | Required | End date of batch (Exam Day) |
| `trainingDays` | `Int` | Required | Number of training days (e.g. 10) |
| `status` | `String` | `@default("ACTIVE")` | Batch state (`ACTIVE`, `COMPLETED`, `ARCHIVED`) |
| `curriculumStatus` | `String?` | `@default("Not Set")` | Curriculum state |
| `googleDriveFolderId`| `String?`| Optional | Root Google Drive folder for batch evidence |
| `fnStartTime` | `String?` | `@default("08:30")` | Forenoon session start time |
| `fnCutoffTime` | `String?` | `@default("09:00")` | Forenoon session cutoff time |
| `anStartTime` | `String?` | `@default("12:40")` | Afternoon session start time |
| `anCutoffTime` | `String?` | `@default("13:10")` | Afternoon session cutoff time |

*Relations:* `students` (`Student[]`), `trainingCalendar` (`TrainingDay[]`).  
*Indexes:* `@@index([batchNo])`.

---

### 1.4 `TrainingDay`
Daily syllabus entries and practical training tasks.

| Field Name | Type | Modifiers / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (ObjectId)` | `@id @default(auto())` | Primary key |
| `batchId` | `String (ObjectId)` | Required | Foreign key to `Batch.id` |
| `dayNumber` | `Int` | Required | Day sequence (1 to 10) |
| `date` | `DateTime` | Required | Calendar date for training day |
| `taskTitle` | `String` | Required | Module title |
| `taskDescription` | `String` | Required | Implementation instructions |
| `tasks` | `Json?` | Optional | Array of sub-tasks |
| `resources` | `Json?` | Optional | Array of documentation links / PDFs |
| `hasForenoon` | `Boolean` | `@default(true)` | Whether Forenoon attendance is held |
| `hasAfternoon` | `Boolean` | `@default(true)` | Whether Afternoon attendance is held |

*Constraints:* `@@unique([batchId, dayNumber])`.  
*Indexes:* `@@index([batchId])`, `@@index([date])`.

---

### 1.5 `Attendance`
Daily Forenoon and Afternoon physical presence check-ins.

| Field Name | Type | Modifiers / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (ObjectId)` | `@id @default(auto())` | Primary key |
| `studentId` | `String (ObjectId)` | Required | Foreign key to `Student.id` |
| `date` | `DateTime` | Required | Check-in date (midnight-aligned) |
| `session` | `String` | Required | `'FN'` or `'AN'` |
| `markedAt` | `DateTime` | `@default(now())` | Exact server recording timestamp |

*Constraints:* `@@unique([studentId, date, session])`.  
*Indexes:* `@@index([studentId])`, `@@index([date])`.

---

### 1.6 `TaskSubmission`
Student practical screenshot evidence and implementation notes.

| Field Name | Type | Modifiers / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (ObjectId)` | `@id @default(auto())` | Primary key |
| `studentId` | `String (ObjectId)` | Required | Foreign key to `Student.id` |
| `trainingDayId` | `String (ObjectId)` | Required | Foreign key to `TrainingDay.id` |
| `screenshotUrl` | `String` | Required | Storage URL (S3 URI or Drive link) |
| `description` | `String?` | Optional | Implementation notes & GitHub commit links |
| `s3Key` | `String?` | Optional | S3 object key |
| `s3Bucket` | `String?` | Optional | Target S3 bucket name |
| `s3Region` | `String?` | Optional | Target S3 region |
| `storageProvider` | `String?` | `@default("GOOGLE_DRIVE")` | Storage engine (`GOOGLE_DRIVE`, `S3`, `LOCAL`) |
| `googleDriveFileId`| `String?` | Optional | Google Drive file identifier |
| `googleDriveFolderId`|`String?`| Optional | Google Drive parent folder identifier |
| `originalFilename` | `String?` | Optional | Original client file name |
| `storedFilename` | `String?` | Optional | Normalized stored file name |
| `fileSize` | `Int?` | Optional | File size in bytes |
| `fileType` | `String?` | Optional | MIME type (`image/png`, etc.) |
| `status` | `String` | `@default("SUBMITTED")` | State (`SUBMITTED`, `ACCEPTED`, `REJECTED`, `GRADED`) |
| `submittedAt` | `DateTime` | `@default(now())` | Submission timestamp |

*Constraints:* `@@unique([studentId, trainingDayId])`.  
*Indexes:* `@@index([studentId])`, `@@index([trainingDayId])`, `@@index([status])`, `@@index([submittedAt])`.

---

### 1.7 `Evaluation`
Trainer evaluation, numerical scores, letter grades, and comments.

| Field Name | Type | Modifiers / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (ObjectId)` | `@id @default(auto())` | Primary key |
| `studentId` | `String (ObjectId)` | Required | Foreign key to `Student.id` |
| `taskId` | `String (ObjectId)` | `@unique` | Foreign key to `TaskSubmission.id` (1-to-1) |
| `score` | `Int` | Required | Numerical score (0 to 100) |
| `grade` | `String` | Required | Letter grade (`O`, `A+`, `A`, `B+`, `B`, `C`) |
| `trainingLevel` | `String` | Required | Training level (`Level 1`, `Level 2`, `Level 3`) |
| `comments` | `String?` | Optional | Evaluator feedback |
| `evaluatedAt` | `DateTime` | `@default(now())` | Evaluation timestamp |

---

### 1.8 `CertificateRecord`
Official course completion certificates and audit records.

| Field Name | Type | Modifiers / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (ObjectId)` | `@id @default(auto())` | Primary key |
| `studentId` | `String (ObjectId)` | `@unique` | Foreign key to `Student.id` (1-to-1) |
| `certificateNo` | `String` | `@unique` | Formatted serial number (e.g. `ARVR-L1001-0001`) |
| `finalGrade` | `String` | Required | Final awarded letter grade |
| `finalLevel` | `String` | Required | Final awarded training level |
| `completedAt` | `DateTime?` | Optional | Completion audit timestamp |
| `exportedAt` | `DateTime?` | Optional | Excel export timestamp |
| `isValid` | `Boolean` | `@default(true)` | Certificate validity status |
| `isManualOverride` | `Boolean` | `@default(false)` | Whether issued via administrative override |
| `overrideReason` | `String?` | Optional | Mandatory explanation for manual override |
| `attendancePctAtIssue`| `Int?` | Optional | Recorded attendance percentage at issuance |

---

### 1.9 `SystemSetting`
Dynamic runtime configuration key-value store.

| Field Name | Type | Modifiers / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (ObjectId)` | `@id @default(auto())` | Primary key |
| `key` | `String` | `@unique` | Setting identifier (e.g. `CAMPUS_GEOFENCE_LAT`) |
| `value` | `String` | Required | Setting value string |
| `updatedAt` | `DateTime` | `@updatedAt` | Last modification timestamp |

---

### 1.10 `GoogleDriveConnection`
OAuth2 tokens and root folder pointers for Google Workspace storage.

| Field Name | Type | Modifiers / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (ObjectId)` | `@id @default(auto())` | Primary key |
| `adminId` | `String?` | `@unique` | Associated administrator identifier |
| `googleAccountEmail`| `String` | Required | Connected Google account email |
| `refreshTokenEncrypted`| `String`| Required | AES-256 encrypted OAuth refresh token |
| `rootFolderId` | `String?` | Optional | Root Drive folder identifier for AR/VR LMS |
| `connectedAt` | `DateTime` | `@default(now())` | Connection timestamp |
| `status` | `String` | `@default("CONNECTED")` | State (`CONNECTED`, `DISCONNECTED`) |
| `updatedAt` | `DateTime` | `@updatedAt` | Token update timestamp |

---

### 1.11 `AuditLog`
Immutable administrative audit trail.

| Field Name | Type | Modifiers / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (ObjectId)` | `@id @default(auto())` | Primary key |
| `actorId` | `String?` | Optional | Administrator identifier |
| `actorEmail` | `String` | Required | Administrator email address |
| `actorRole` | `String` | `@default("ADMIN")` | Actor role |
| `ipAddress` | `String?` | Optional | Client IP address |
| `action` | `String` | Required | Action name (e.g. `BATCH_CREATE`, `STUDENT_IMPORT`) |
| `targetType` | `String` | Required | Entity type (`BATCH`, `STUDENT`, `SETTING`) |
| `targetId` | `String?` | Optional | Target entity identifier |
| `targetIdentifier` | `String?`| Optional | Human-readable identifier |
| `details` | `String?` | Optional | JSON string of action parameters |
| `createdAt` | `DateTime` | `@default(now())` | Action timestamp |

---

### 1.12 `Feedback`
Student qualitative course feedback.

| Field Name | Type | Modifiers / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String (ObjectId)` | `@id @default(auto())` | Primary key |
| `studentId` | `String (ObjectId)` | Required | Foreign key to `Student.id` |
| `message` | `String` | Required | Feedback message |
| `createdAt` | `DateTime` | `@default(now())` | Timestamp |
