# End-to-End System Data Flows

**Document ID:** `ARCH-FLOW-004`  
**Classification:** Information & Transactional Data Flow  
**Verification Category:** Verified in source (`StudentPortal.tsx`, `api/student/attendance`, `api/student/task/submit`, `lib/antivirus.ts`, `lib/storage.ts`)  

---

## 1. Student Attendance Check-In Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student (Browser / Mobile)
    participant UI as StudentPortal (UI Component)
    participant MW as Edge Middleware
    participant API as /api/student/attendance/[session]
    participant Auth as lib/auth.ts (Session Decrypt)
    participant Geo as lib/geofence.ts (Haversine & CIDR)
    participant DB as MongoDB Atlas (Prisma)

    Student->>UI: Click "Check In Forenoon/Afternoon"
    UI->>UI: Request W3C Geolocation (lat, lng, accuracy)
    UI->>MW: POST /api/student/attendance/FN {lat, lng, accuracy}
    MW->>MW: Inject correlation ID (x-request-id)
    MW->>API: Forward with x-forwarded-for client IP
    API->>Auth: requireAuth('STUDENT')
    Auth-->>API: Validated Student Session {studentId, registerNo, batchId}
    API->>DB: Fetch SystemSettings (Lat, Lng, Radius, Bypass Toggles)
    API->>Geo: verifyAccessRestriction(params)
    Note over Geo: 1. Verify GPS Accuracy (<= 150m)<br/>2. Haversine Distance (<= 100m)<br/>3. Campus Wi-Fi CIDR Check
    alt Boundary or Network Violation
        Geo-->>API: {allowed: false, reason: "Outside campus radius (340m > 100m)"}
        API-->>UI: HTTP 403 Forbidden {error: "Outside campus geofence"}
        UI-->>Student: Display Red Urgency Alert & Distance Map
    else Validation Successful
        Geo-->>API: {allowed: true, distanceMeters: 42}
        API->>DB: withPrismaRetry(prisma.attendance.upsert(...))
        DB-->>API: Attendance Record Created
        API-->>UI: HTTP 200 OK {success: true, session: "FN"}
        UI->>Student: Trigger Haptic Feedback [40, 60, 40]ms & Update Card to "Marked"
    end
```

---

## 2. Practical Task Screenshot Upload & Zero-Trust Inspection

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    participant Dropzone as StudentPortal Dropzone
    participant SubmitAPI as /api/student/task/submit
    participant AV as lib/antivirus.ts (Heuristic Scanner)
    participant Storage as lib/storage.ts (Direct S3 / Drive)
    participant S3Store as AWS S3 Private Object Bucket
    participant DB as MongoDB Atlas

    Student->>Dropzone: Drag & drop screenshot (PNG / JPG / WebP)
    Dropzone->>Dropzone: Generate instant in-memory object preview (URL.createObjectURL)
    Dropzone->>SubmitAPI: POST FormData {file, dayNumber, description}
    SubmitAPI->>SubmitAPI: Verify Attendance Gate: Both FN & AN Marked for Today
    alt Attendance Incomplete
        SubmitAPI-->>Student: HTTP 403 Forbidden ("Must complete FN & AN attendance first")
    else Gating Verified
        SubmitAPI->>AV: scanFileBuffer(fileBuffer, originalFilename)
        Note over AV: 1. Magic-byte inspection (PNG/JPG header)<br/>2. Disguised MZ/ELF executable check<br/>3. PDF Launch/JavaScript payload test<br/>4. EICAR virus signature check<br/>5. Calculate SHA-256 digest
        alt Malicious Payload Detected
            AV-->>SubmitAPI: {isClean: false, threatName: "Disguised.Windows.Executable.MZ"}
            SubmitAPI-->>Student: HTTP 400 Bad Request ("Malware detected in upload")
        else Clean Payload Verified
            AV-->>SubmitAPI: {isClean: true, sha256: "e3b0c442..."}
            SubmitAPI->>Storage: saveTaskScreenshot(fileBuffer, fileName, batchName, day, regNo)
            Storage->>S3Store: PutObjectCommand (private-read, server-side encrypted)
            S3Store-->>Storage: s3://arvr-submissions/submissions/Batch-1/Day-1/21CS001_...png
            Storage-->>SubmitAPI: Formatted Storage URI
            SubmitAPI->>DB: prisma.taskSubmission.upsert(...)
            DB-->>SubmitAPI: Stored Submission Record
            SubmitAPI-->>Student: HTTP 200 OK {success: true, submissionId}
        end
    end
```

---

## 3. Trainer Evaluation & Grading Flow

```mermaid
sequenceDiagram
    autonumber
    actor Trainer as Trainer / Instructor
    participant Drawer as TrainerPortal Evaluation Drawer
    participant EvalAPI as /api/trainer/evaluations
    participant FileAPI as /api/submissions/[id]/file
    participant S3 as AWS S3 (Presigned Download)
    participant DB as MongoDB Atlas

    Trainer->>Drawer: Click student submission in pending queue
    Drawer->>FileAPI: GET /api/submissions/[id]/file
    FileAPI->>S3: Generate Presigned Download URL (Expires 15m)
    S3-->>FileAPI: Signed Temporary HTTPS URL
    FileAPI-->>Drawer: HTTP 302 / Streamed image
    Drawer->>Drawer: Render split-pane: Left = Screenshot, Right = Grading Panel
    Trainer->>Drawer: Select preset Grade "A+" (88) + click suggestion chip
    Trainer->>Drawer: Click "Submit Evaluation"
    Drawer->>EvalAPI: POST /api/trainer/evaluations {taskId, score: 88, grade: "A+", level: "Level 1", comments: "..."}
    EvalAPI->>DB: prisma.evaluation.upsert(...)
    EvalAPI->>DB: prisma.taskSubmission.update({status: "GRADED"})
    DB-->>EvalAPI: Updated Records
    EvalAPI-->>Drawer: HTTP 200 OK {success: true}
    Drawer-->>Trainer: Close drawer, move student to "GRADED" tab
```
