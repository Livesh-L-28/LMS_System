# 🚀 AR/VR Spatial Computing Academy - Immersive Training Platform

An enterprise-grade, full-stack spatial computing training management platform built with **Next.js 16 (Turbopack)**, **TypeScript**, **Prisma ORM**, and **Tailwind CSS**, featuring a clean **Soft Lavender Light Design System**.

---

## ✨ Key Features & Capabilities

### 🎓 Student Portal & Learning Workspace
- **Gated Practical Task Submission**: Task submission is unlocked **only after** both Morning (**FN**) and Afternoon (**AN**) attendance sessions are server-verified for the current day.
- **Interactive Screenshot Upload**: Drag-and-drop practical execution screenshot dropzone supporting PNG, JPG, and WebP (up to 5MB) with real-time image preview and storage.
- **Curriculum & AR/VR Developer SDK Hub**: Interactive multi-day training schedule preview (Day 1 to Day 10) with curated SDK documentation for **Unity XR Interaction Toolkit (XRI 3.0)**, **Meta Quest Passthrough**, **Unity AR Foundation (ARKit/ARCore)**, and **Spatial Computing Performance Targets (90 FPS)**.
- **Automated Performance Tracking**: Real-time attendance rate (%), task completion index (%), evaluation score average (/100), and certificate eligibility tracking.

### 🛡️ Unified Staff & Instructor Portal
- **Interactive Task Evaluation & Grading**: Review student screenshot submissions, inspect student implementation notes, assign numerical scores ($0–100$), letter grades (`O`, `A+`, `A`, `B+`, `B`, `C`), training levels, and feedback.
- **Bulk CSV Student Roster Import**: Enrol entire student classes in 1-click by pasting CSV roster data or uploading a `.csv` file with automatic duplicate detection.
- **Batch Management & Calendar Builder**: Create training batches with start/end dates, assign trainers, and dynamically build daily practical task curricula.
- **Automated Certificate Engine & Excel Export**: Verify attendance ($\ge 75\%$) and task completion rules to generate official certificate numbers and export complete batch records as downloadable `.xlsx` spreadsheets.

### 🔐 Security & Production Hardening
- **Password & PIN Hashing**: All student PINs, trainer passwords, and admin passwords are salt-hashed using **Bcrypt (10 rounds)**.
- **Sliding IP Rate Limiting**: Endpoint protection on `/api/student/login`, `/api/trainer/login`, and `/api/admin/login` (5 attempts / 60-second window) to block brute-force attacks.
- **Encrypted Session Cookies**: Managed via `iron-session` signed with 32-byte secret (`httpOnly: true`, `sameSite: 'lax'`).
- **Path Traversal & Injection Defense**: Filename sanitization (`/[^a-zA-Z0-9_-]/g`), file extension white-listing, and Prisma parameterized query execution.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16 (App Router & Turbopack)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database & ORM**: [Prisma ORM](https://www.prisma.io/) with [SQLite](https://www.sqlite.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Soft Lavender Light Theme Palette)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Authentication**: `iron-session` + `bcryptjs`
- **File Processing & Excel**: `exceljs`, `formidable`

---

## 🔑 Demo Access Credentials

| Role | Username / Email | Password / PIN | Portal Tab |
| :--- | :--- | :--- | :--- |
| **🎓 Student** | `21CS001` | `123456` | Student Portal |
| **👨‍🏫 Trainer** | `trainer@arvr.com` | `trainer123` | Staff / Instructor Portal |
| **🛡️ Admin** | `admin@arvr.com` | `admin123` | Staff / Instructor Portal |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.x or higher
- npm or yarn

### 2. Installation & Setup

```bash
# 1. Clone repository
git clone https://github.com/Livesh28/ARVR.git
cd ARVR

# 2. Install dependencies
npm install

# 3. Environment configuration
cp .env.example .env

# 4. Database Setup & Seeding
npx prisma migrate deploy
npx prisma db seed

# 5. Start Development Server
npm run dev
```

Open `http://localhost:3000` in your browser to access the live application.

---

## 📂 Project Architecture

```text
arvrweb/
├── app/
│   ├── api/
│   │   ├── admin/            # Admin endpoints (batches, stats, student import, certificate export)
│   │   ├── auth/             # Session verification & logout
│   │   ├── student/          # Student endpoints (attendance, task submit, progress, curriculum)
│   │   └── trainer/          # Staff evaluation & batch review
│   ├── globals.css           # Soft Lavender theme tokens & styling utilities
│   ├── layout.tsx            # Root application layout
│   └── page.tsx              # Main entry point & portal tab selector
├── components/
│   ├── Navbar.tsx            # Top enterprise navigation bar
│   ├── StudentPortal.tsx     # Student workspace & curriculum hub
│   └── StaffPortal.tsx       # Unified trainer/admin evaluation & control center
├── lib/
│   ├── auth.ts               # Session management & Bcrypt hashing
│   ├── prisma.ts             # Global Prisma Client instance
│   ├── rateLimit.ts          # IP sliding window rate limiter
│   └── storage.ts            # Screenshot file storage & sanitization
├── prisma/
│   ├── schema.prisma         # Database schema & relations
│   └── seed.ts               # Demo data seeder
└── public/
    └── uploads/              # Task submission screenshots repository
```

---

## ☁️ Google Drive Storage Integration Setup

The platform supports automated student task screenshot uploads directly to the Admin's Google Drive inside an organized directory hierarchy (`ARVR_Student_Submissions/{Batch_Name}/`).

You can configure Google Drive API credentials **directly from the web application** without having to edit environment variables or redeploy backend containers.

### Step-by-Step Google Cloud Console Configuration

#### Step 1: Create a Google Cloud Project
1. Navigate to the **[Google Cloud Console](https://console.cloud.google.com/)** and log in with your desired Google account.
2. In the top toolbar, click the **Project Dropdown** and select **New Project**.
3. Enter a project name (e.g. `ARVR-LMS-Drive`) and click **Create**.
4. Ensure your new project is selected in the top bar project selector.

#### Step 2: Enable the Google Drive API
1. In the search box at the top, search for **`Google Drive API`**.
2. Click on **Google Drive API** under Marketplace results.
3. Click the blue **Enable** button.

#### Step 3: Configure the OAuth Consent Screen
1. In the left navigation menu, click **APIs & Services** > **OAuth consent screen** (or search for it).
2. Choose **External** for User Type and click **Create**.
3. **App Information**:
   - **App name**: `ARVR LMS` (or any custom name)
   - **User support email**: Choose your email address
   - **Developer contact information**: Enter your email address
4. Click **Save and Continue**.
5. **Scopes** step: Click **Save and Continue** (the required scopes `drive` and `drive.file` are requested by the platform during the connect step).
6. **Test Users** step:
   - Click **+ ADD USERS**.
   - **Critical**: Enter your Google email address (the account whose Google Drive will hold the uploads).
   - Click **Save and Continue**.
7. Click **Back to Dashboard**.

#### Step 4: Generate OAuth 2.0 Client ID & Secret
1. In the left menu, select **APIs & Services** > **Credentials**.
2. At the top, click **+ CREATE CREDENTIALS** and choose **OAuth client ID**.
3. Under **Application type**, choose **Web application**.
4. **Name**: `ARVR LMS Web Client` (or any label).
5. Scroll down to **Authorized redirect URIs**:
   - Click **+ ADD URI**.
   - Paste the exact callback URI:
     ```text
     https://lms-system-zfzc.onrender.com/api/google-drive/oauth/callback
     ```
     *(Note: If running locally or on a custom domain, use `http://localhost:3000/api/google-drive/oauth/callback` or your custom domain).*
6. Click **Create**.
7. A dialog will appear displaying your **Client ID** (ends with `.apps.googleusercontent.com`) and **Client Secret**. Keep this window open or copy both values.

#### Step 5: Save & Connect in the LMS Web UI
1. Log into the LMS Admin/Staff portal as an Administrator (`admin@arvr.com`).
2. Go to the **Settings** / **Google Drive Storage Integration** tab.
3. Paste your **Google Client ID** and **Google Client Secret** into the form.
4. Click **Save API Credentials** (this securely stores them in the PostgreSQL `SystemSetting` table).
5. Click **Connect Google Drive** — Google's consent screen will open. Select your Google account and grant permissions.
6. The status badge will switch to **Connected ✓**, and all subsequent student submissions will automatically sync to your Drive.

---

## 📄 License
This project is licensed under the MIT License.
