# Component Architecture & Frontend-Backend Traceability

**Document ID:** `ARCH-COMP-003`  
**Classification:** Software Component Architecture  
**Verification Category:** Verified in source (`components/**`, `app/**`, `lib/**`)  

---

## 1. Frontend Component Hierarchy

```mermaid
graph TD
    AppShell["app/page.tsx (State Orchestrator)"]
    NavbarComp["components/Navbar.tsx\n(Brand, Tabs, Role Selector, User Profile, Session Modal)"]
    
    subgraph StudentPortalGraph ["Student Portal (components/StudentPortal.tsx)"]
        AttendanceSubtab["Daily Attendance Cards (FN/AN)\n- Live 1-sec countdown badge\n- Urgency state (< 5 min pulse)\n- Geolocation validation\n- Haptic feedback trigger"]
        MobileBar["Mobile Floating Check-In Bar\n- fixed bottom-4 (md:hidden)\n- 1-tap quick check-in"]
        JourneySubtab["Interactive Syllabus Roadmap\n- Horizontal connecting timeline tracks\n- Active day halo pulses\n- Day milestones & exam cap icons"]
        TaskSubtab["Task Submission Zone\n- Drag-and-drop dropzone\n- Live thumbnail preview (ObjectURL)\n- Client antivirus verification badge\n- Implementation description input"]
        ProgressSubtab["Performance Statistics\n- Attendance Percentage (%)\n- Task Completion Index (%)\n- Average Evaluation Score (/100)\n- Certificate eligibility tracker"]
    end

    subgraph StaffPortalGraph ["Staff / Admin Portal (components/StaffPortal.tsx)"]
        BatchMgmt["Batch Management\n- Batch calendar generator\n- Daily task scheduler\n- Google Drive folder linker"]
        RosterImport["Bulk Roster Onboarding\n- CSV paste / file dropzone\n- Register No deduplication engine"]
        CertEngine["Certificate Engine\n- Attendance threshold check (>= 75%)\n- Serial generator\n- Excel export (exceljs)"]
        SettingsConsole["Access Control & Security Console\n- Campus Geofence Latitude/Longitude\n- Allowed Wi-Fi CIDR lists\n- Dynamic policy toggles"]
        WatchdogWidget["Morning Watchdog Dashboard (components/MorningWatchdogCard.tsx)\n- 13 real-time subsystem diagnostic checks\n- Manual re-run trigger"]
    end

    subgraph TrainerPortalGraph ["Trainer Portal (components/TrainerPortal.tsx)"]
        SubmissionTable["Submissions Table & Search\n- Filter pills (ALL / PENDING / GRADED)\n- Student search filter"]
        EvaluationDrawer["Split-Pane Evaluation Drawer (max-w-4xl)\n- Left: Screenshot evidence & zoom\n- Right: Score slider (0-100)\n- 6 Quick Grade chips (O, A+, A, B+, B, C)\n- 5 Quick Feedback suggestion chips"]
    end

    AppShell --> NavbarComp
    AppShell -->|activeTab === 'student'| StudentPortalGraph
    AppShell -->|activeTab === 'staff' && user.role === 'ADMIN'| StaffPortalGraph
    AppShell -->|activeTab === 'staff' && user.role === 'TRAINER'| TrainerPortalGraph
```

---

## 2. Component Specification Matrix

| Component | Path | State Variables | Primary Downstream APIs | Error Boundaries / Skeletons |
| :--- | :--- | :--- | :--- | :--- |
| **`Navbar`** | [`components/Navbar.tsx`](file:///Users/livesh/arvr/ARVR/components/Navbar.tsx) | `activeTab`, `showProfileModal` | `/api/auth/me`, `/api/auth/logout` | Inline fallback badge |
| **`StudentPortal`** | [`components/StudentPortal.tsx`](file:///Users/livesh/arvr/ARVR/components/StudentPortal.tsx) | `currentSubTab`, `clockNow`, `attendanceStatus`, `selectedFile`, `previewUrl`, `tasks` | `/api/student/attendance/[session]`, `/api/student/task/today`, `/api/student/task/submit`, `/api/student/curriculum`, `/api/student/progress` | `CurriculumSkeleton`, `StatsCardsSkeleton` |
| **`StaffPortal`** | [`components/StaffPortal.tsx`](file:///Users/livesh/arvr/ARVR/components/StaffPortal.tsx) | `batches`, `activeBatchId`, `students`, `csvInput`, `systemSettings`, `diagnosticReport` | `/api/admin/batches`, `/api/admin/students`, `/api/admin/students/import`, `/api/admin/settings/*`, `/api/admin/stats` | `BatchCardsSkeleton`, `TableSkeleton` |
| **`TrainerPortal`** | [`components/TrainerPortal.tsx`](file:///Users/livesh/arvr/ARVR/components/TrainerPortal.tsx) | `searchTerm`, `statusFilter`, `selectedSubmission`, `score`, `grade`, `feedbackComments` | `/api/trainer/batches`, `/api/trainer/batches/[batchId]/tasks`, `/api/trainer/evaluations` | `TableSkeleton` |
| **`MorningWatchdogCard`** | [`components/MorningWatchdogCard.tsx`](file:///Users/livesh/arvr/ARVR/components/MorningWatchdogCard.tsx) | `report`, `runningCheck` | `/api/cron/morning-watchdog` | Shimmer pulse card |
| **`EnterpriseAlert`** | [`components/EnterpriseAlert.tsx`](file:///Users/livesh/arvr/ARVR/components/EnterpriseAlert.tsx) | `dismissed` | N/A (Stateless UI Alert Banner) | Inline auto-dismiss |
| **`LoadingSkeletons`** | [`components/LoadingSkeletons.tsx`](file:///Users/livesh/arvr/ARVR/components/LoadingSkeletons.tsx) | N/A | N/A | Pure CSS shimmer wrappers |
