# Frontend Component Reference & Interface Catalog

**Document ID:** `FRONT-CAT-003`  
**Classification:** React Component Specification  
**Verification Category:** Verified in source (`components/**`)  

---

## 1. Component Interface Matrix

### 1.1 `Navbar.tsx`
- **File:** [`components/Navbar.tsx`](file:///Users/livesh/arvr/ARVR/components/Navbar.tsx)
- **Props:**
  - `activeTab: 'student' | 'staff'`
  - `onSelectTab: (tab: 'student' | 'staff') => void`
  - `user: any` (Current authenticated user object or null)
  - `onLogout: () => void`
  - `branding: any` (Optional dynamic branding settings from DB)
- **Features:**
  - Responsive Royal Cobalt logo with spatial computing badge.
  - Active tab indicators with sliding bottom indicator bar.
  - Session profile avatar dropdown with role pills (`STUDENT`, `TRAINER`, `ADMIN`).
  - Mobile hamburger toggle menu for small viewports.

### 1.2 `StudentPortal.tsx`
- **File:** [`components/StudentPortal.tsx`](file:///Users/livesh/arvr/ARVR/components/StudentPortal.tsx)
- **Key Internal State:**
  - `currentSubTab: 'attendance' | 'curriculum' | 'submission' | 'progress'`
  - `clockNow: Date` (1-second ticking interval for real-time countdown badges)
  - `selectedFile: File | null`
  - `previewUrl: string | null` (ObjectURL for client thumbnail dropzone preview)
  - `isScanningFile: boolean` (Controls zero-trust client antivirus badge)
  - `attendanceWindows: { fn: SessionWindow, an: SessionWindow }`
- **Key Sub-Views:**
  - **Attendance Windows:** Renders Forenoon and Afternoon check-in cards with dynamic badges (`Open • 14m 23s left` or `< 5m` pulsing red urgency alert).
  - **Mobile Floating Check-In Bar (`fixed bottom-4 md:hidden`):** Sticky 1-tap campus GPS/Wi-Fi attendance button for mobile phones.
  - **Course Journey Timeline:** Horizontal scrollable milestone track with day nodes, exam graduation caps, and active halo rings.
  - **Submission Dropzone:** Drag-and-drop zone with instant thumbnail preview, file metadata, and antivirus scan badge.

### 1.3 `TrainerPortal.tsx`
- **File:** [`components/TrainerPortal.tsx`](file:///Users/livesh/arvr/ARVR/components/TrainerPortal.tsx)
- **Key Internal State:**
  - `searchTerm: string` (Real-time student search filter)
  - `statusFilter: 'ALL' | 'PENDING' | 'GRADED'`
  - `selectedSubmission: any | null` (Active task in evaluation drawer)
  - `score: number` (Linked with interactive 0–100 numerical slider)
  - `grade: string` (Linked with 6 Quick Grade preset chips: `O`, `A+`, `A`, `B+`, `B`, `C`)
  - `comments: string` (Feedback comments text area)
- **Split-Pane Evaluation Drawer (`max-w-4xl`):**
  - Left Column: Submission evidence preview with high-res zoom link, description, and submission timestamp.
  - Right Column: 6 quick-grade buttons, score slider, and 5 quick feedback suggestion chips.

### 1.4 `StaffPortal.tsx`
- **File:** [`components/StaffPortal.tsx`](file:///Users/livesh/arvr/ARVR/components/StaffPortal.tsx)
- **Key Sub-Panels:**
  - `batches`: Batch creation, training calendar generator, Level selection.
  - `tasks`: Curriculum management, task instructions, resources.
  - `students`: Bulk CSV roster import with automatic register number deduplication.
  - `certificates`: Completion auditor, 100% attendance enforcement, Excel spreadsheet export.
  - `settings`: Geofence latitude/longitude, allowed Wi-Fi CIDRs, Google Drive OAuth linking.
  - `watchdog`: Morning watchdog card with 13 automated diagnostic probes.

### 1.5 `LoadingSkeletons.tsx`
- **File:** [`components/LoadingSkeletons.tsx`](file:///Users/livesh/arvr/ARVR/components/LoadingSkeletons.tsx)
- **Exported Skeletons:**
  - `PageLoadingScreen`: Fullscreen loading view with pulsing spatial logo and stage status.
  - `StatsCardsSkeleton`: Grid of 4 animated metric placeholder cards.
  - `BatchCardsSkeleton`: Batch calendar placeholder cards.
  - `TableSkeleton`: Tabular row skeletons with staggered pulse shimmers.
  - `CurriculumSkeleton`: Horizontal timeline milestone node placeholders.
