# End-to-End User & Business Workflows

**Document ID:** `WORK-USER-001`  
**Classification:** Business Process Specifications  
**Verification Category:** Verified in source (`StudentPortal.tsx`, `StaffPortal.tsx`, `TrainerPortal.tsx`)  

---

## 1. Student Onboarding, Attendance & Submission Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Unregistered: Arrives on platform
    Unregistered --> Registered: POST /api/student/register (RegNo + PIN)
    Registered --> Authenticated: POST /api/student/login
    
    Authenticated --> AttendanceMarked: Mark Forenoon/Afternoon Attendance\n(GPS < 100m + Wi-Fi Match)
    AttendanceMarked --> TaskUnlocked: Both FN & AN Marked for Today
    
    TaskUnlocked --> TaskSubmitted: Upload Screenshot + Notes\n(In-Memory AV Scan Clean)
    TaskSubmitted --> Evaluated: Trainer evaluates in Split-Pane Drawer
    
    Evaluated --> Certified: Batch completed, attendance >= 100% & Final Exam passed
    Certified --> [*]
```

---

## 2. Trainer Split-Pane Grading Lifecycle

```mermaid
stateDiagram-v2
    [*] --> LoggedIn: Trainer logs in (/api/admin/login)
    LoggedIn --> QueueFiltered: Navigate to #evaluations -> Filter PENDING
    QueueFiltered --> DrawerOpen: Click Student Submission Row
    
    DrawerOpen --> GradeAssigned: Inspect screenshot -> Click Preset Chip (e.g. "A+")
    GradeAssigned --> FeedbackAdded: Click Suggestion Chip (e.g. "Code structure is well organized")
    FeedbackAdded --> EvaluationSaved: POST /api/trainer/evaluations
    
    EvaluationSaved --> SubmissionClosed: Task marked "GRADED" -> Drawer closes
    SubmissionClosed --> [*]
```

---

## 3. Administrator Batch, Curriculum & Certification Lifecycle

1. **Step 1: Batch Inception:** Admin navigates to `/#batches` and creates a new batch. System auto-calculates the end date, marks the final day as the Final Exam, and initializes the curriculum.
2. **Step 2: Roster Ingestion:** Admin uploads CSV roster to `/#students`. System validates emails and register numbers, filters duplicates, hashes default PINs, and enrolls students.
3. **Step 3: Access Control Tuning:** Admin configures geofence coordinates and radius in `/#settings`.
4. **Step 4: Completion Audit:** Admin runs the Completion Audit in `/#certificates`. The engine verifies attendance thresholds and exam attendance, calculates final grades, and issues official serial numbers.
5. **Step 5: Gradebook Export:** Admin downloads the batch report as a styled `.xlsx` workbook.
