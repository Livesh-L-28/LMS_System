# Entity Relationship Diagram & Relational Semantics

**Document ID:** `DB-ERD-003`  
**Classification:** Relational Structure & Foreign Keys  
**Verification Category:** Verified in source (`prisma/schema.prisma`)  

---

## 1. Entity-Relationship Diagram (Mermaid)

```mermaid
erDiagram
    BATCH ||--o{ STUDENT : "enrolls (onDelete: Cascade)"
    BATCH ||--o{ TRAINING_DAY : "contains (onDelete: Cascade)"
    STUDENT ||--o{ ATTENDANCE : "marks (onDelete: Cascade)"
    STUDENT ||--o{ TASK_SUBMISSION : "submits (onDelete: Cascade)"
    STUDENT ||--o{ EVALUATION : "receives (onDelete: Cascade)"
    STUDENT ||--o{ FEEDBACK : "submits (onDelete: Cascade)"
    STUDENT ||--o| CERTIFICATE_RECORD : "earns (onDelete: Cascade)"
    TRAINING_DAY ||--o{ TASK_SUBMISSION : "receives (onDelete: Cascade)"
    TASK_SUBMISSION ||--o| EVALUATION : "evaluated_by (onDelete: Cascade)"

    BATCH {
        ObjectId id PK
        string name UK "Canonical Batch Name"
        string level "Training Level"
        date startDate
        date endDate "Exam Day"
        int trainingDays "Typically 10"
        string status "ACTIVE / COMPLETED"
        string googleDriveFolderId
    }

    STUDENT {
        ObjectId id PK
        string registerNo UK "Unique Student ID"
        string email UK
        string name
        string department
        string year
        string section
        ObjectId batchId FK
        string pinHash "Bcrypt 10 rounds"
    }

    TRAINING_DAY {
        ObjectId id PK
        ObjectId batchId FK
        int dayNumber "1 to 10"
        date date
        string taskTitle
        string taskDescription
        json tasks
        json resources
        boolean hasForenoon
        boolean hasAfternoon
    }

    ATTENDANCE {
        ObjectId id PK
        ObjectId studentId FK
        date date "Midnight-aligned"
        string session "FN or AN"
        datetime markedAt
    }

    TASK_SUBMISSION {
        ObjectId id PK
        ObjectId studentId FK
        ObjectId trainingDayId FK
        string screenshotUrl
        string description
        string s3Key
        string storageProvider "GOOGLE_DRIVE / S3"
        string status "SUBMITTED / GRADED"
        datetime submittedAt
    }

    EVALUATION {
        ObjectId id PK
        ObjectId studentId FK
        ObjectId taskId FK "1-to-1 unique"
        int score "0 to 100"
        string grade "O, A+, A, B+, B, C"
        string trainingLevel
        string comments
        datetime evaluatedAt
    }

    CERTIFICATE_RECORD {
        ObjectId id PK
        ObjectId studentId FK "1-to-1 unique"
        string certificateNo UK
        string finalGrade
        string finalLevel
        boolean isValid
        boolean isManualOverride
        string overrideReason
        int attendancePctAtIssue
    }

    ADMIN {
        ObjectId id PK
        string email UK
        string name
        string passwordHash
        boolean twoFactorEnabled
        string twoFactorSecret
    }

    SYSTEM_SETTING {
        ObjectId id PK
        string key UK
        string value
        datetime updatedAt
    }

    GOOGLE_DRIVE_CONNECTION {
        ObjectId id PK
        string adminId UK
        string googleAccountEmail
        string refreshTokenEncrypted
        string status
    }

    AUDIT_LOG {
        ObjectId id PK
        string actorEmail
        string action
        string targetType
        string targetId
        string details
        datetime createdAt
    }
```

---

## 2. Integrity & Cascade Semantics

- **Cascade Deletions (`onDelete: Cascade`):**
  - When a `Batch` is deleted, all enrolled `Student` records and associated `TrainingDay` calendar entries are automatically purged.
  - When a `Student` is deleted, all associated `Attendance`, `TaskSubmission`, `Evaluation`, `CertificateRecord`, and `Feedback` documents are removed, preventing orphaned records in MongoDB.
  - When a `TaskSubmission` is removed, its dependent `Evaluation` is deleted.
- **Unique Compound Constraints:**
  - `TrainingDay`: `[batchId, dayNumber]` prevents duplicate day numbers within the same batch.
  - `Attendance`: `[studentId, date, session]` strictly prevents duplicate check-ins for the same student in the same Forenoon or Afternoon window.
  - `TaskSubmission`: `[studentId, trainingDayId]` enforces one submission per practical day per student.
