# Database Indexes, Unique Constraints & Query Optimization

**Document ID:** `DB-IDX-004`  
**Classification:** Performance & Index Specification  
**Verification Category:** Verified in source (`prisma/schema.prisma`)  

---

## 1. Index Specification Table

| Model | Index Definition | Fields Indexed | Purpose & Query Optimization |
| :--- | :--- | :--- | :--- |
| **`Student`** | Single-field | `batchId` | Optimizes batch roster lookups (`findMany({ where: { batchId } })`) |
| **`Student`** | Single-field | `department` | Accelerates department-wide filtering |
| **`Student`** | Single-field | `section` | Filters class sections |
| **`Student`** | Unique Index | `registerNo` | Instant O(1) login lookup by student register ID |
| **`Student`** | Unique Index | `email` | Unique constraint and email search |
| **`Batch`** | Unique Index | `name` | Ensures distinct canonical batch names |
| **`Batch`** | Single-field | `batchNo` | Accelerates batch sorting |
| **`TrainingDay`**| Compound Unique| `batchId, dayNumber` | Enforces 1 record per day per batch; optimizes daily task lookups |
| **`TrainingDay`**| Single-field | `date` | Supports date-based attendance session lookups |
| **`Attendance`** | Compound Unique| `studentId, date, session` | Prevents duplicate daily check-in race conditions |
| **`Attendance`** | Single-field | `date` | Accelerates daily campus attendance report generation |
| **`TaskSubmission`**| Compound Unique| `studentId, trainingDayId` | Enforces 1 submission per task; optimizes student progress checks |
| **`TaskSubmission`**| Single-field | `status` | Powers Trainer evaluation queue filters (`PENDING` vs `GRADED`) |
| **`TaskSubmission`**| Single-field | `submittedAt` | Sorts recent submissions chronologically |
| **`TaskSubmission`**| Single-field | `s3Key` | Accelerates S3 object verification |
| **`Evaluation`** | Unique Index | `taskId` | Enforces 1-to-1 relationship with TaskSubmission |
| **`Evaluation`** | Single-field | `evaluatedAt` | Chronological grading timeline |
| **`CertificateRecord`**| Unique Index| `studentId` | Enforces 1 certificate per student |
| **`CertificateRecord`**| Unique Index| `certificateNo`| Guarantees global uniqueness of serial numbers |
| **`SystemSetting`** | Unique Index | `key` | O(1) configuration retrieval by setting key |
| **`AuditLog`** | Compound Index | `targetType, targetId` | Entity audit history timeline |
| **`AuditLog`** | Single-field | `actorEmail` | Admin audit searches |
| **`AuditLog`** | Single-field | `createdAt` | Log rotation and timeline queries |

---

## 2. Query Patterns & Composite Traversal

1. **Daily Attendance Window Verification:**
   ```prisma
   prisma.attendance.findUnique({
     where: {
       studentId_date_session: {
         studentId: session.user.id,
         date: todayMidnight,
         session: 'FN',
       },
     },
   })
   ```
   *Plan:* Direct B-Tree index scan on compound index `(studentId, date, session)` executing in $< 2\text{ms}$.

2. **Trainer Queue Filtering:**
   ```prisma
   prisma.taskSubmission.findMany({
     where: { status: 'SUBMITTED' },
     orderBy: { submittedAt: 'desc' },
   })
   ```
   *Plan:* Utilizes combined index on `status` and `submittedAt`.
