# 🥽 AR/VR Spatial Computing Academy (`LMS_System`)

<div align="center">

[![Live Deployment](https://img.shields.io/badge/🌐%20Live%20Staging-arvr--academy--staging.onrender.com-2563EB?style=for-the-badge&logo=render&logoColor=white)](https://arvr-academy-staging.onrender.com)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.2%20(Turbopack)-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.8-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB%20Atlas-Cloud%20Replica%20Set-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind%20CSS-v4%20(Royal%20Cobalt)-4F46E5?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

An enterprise-grade, full-stack spatial computing training management platform designed for hardware-bound AR/VR labs. Features physical geofenced attendance verification, zero-trust in-memory antivirus task submission, real-time curriculum timelines, split-pane evaluator grading, and automated certificate issuance.

</div>

---

> ## 🚀 **HIGHLIGHTED LIVE DEMO**
>
> ### 🔗 **[https://arvr-academy-staging.onrender.com](https://arvr-academy-staging.onrender.com)**
>
> - **Deployment Host:** Render Web Service (Cloudflare CDN Edge)
> - **SSL Security:** TLS 1.3 Valid 🔒
> - **Current Health:** `HTTP 200 OK — Systems Fully Operational` 🟢
> - **Direct Staff / Admin Deep Link:** [https://arvr-academy-staging.onrender.com#staff](https://arvr-academy-staging.onrender.com#staff)

---

## 🔑 Quick Demo Credentials

Test the platform instantly with pre-seeded accounts:

| Portal | Direct Access | Credentials | Recommended Testing Flow |
| :--- | :--- | :--- | :--- |
| **🎓 Student Learning Portal** | [Open Portal](https://arvr-academy-staging.onrender.com) | **Register No:** `21CS001`<br>**PIN:** `123456` | 1. View live ticking attendance countdown (FN / AN).<br>2. Check 10-day spatial computing roadmap.<br>3. Submit task screenshot in gated dropzone with antivirus badge. |
| **🛡️ Staff & Evaluator Console** | [Open Staff Console](https://arvr-academy-staging.onrender.com#staff) | **Email:** `admin@arvr.com`<br>**Password:** `admin123` | 1. Open **Split-Pane Evaluation Drawer** on student submissions.<br>2. Grade with 1-click preset chips (`O`, `A+`, `A`, `B+`, etc.) & score slider.<br>3. Inspect **Morning Watchdog** diagnostics & batch settings. |

> [!NOTE]
> *Self-Healing Auto-Seed:* If deployed on a fresh database, accessing the admin portal with `admin@arvr.com` and `admin123` will automatically initialize the administrative role on first login. Students can also be enrolled via self-registration or bulk CSV import.

---

## 📑 Table of Contents

- [Vision & Value Proposition](#-vision--value-proposition)
- [Key Features & Capabilities](#-key-features--capabilities)
  - [1. Student Portal & Learning Workspace](#1--student-portal--learning-workspace)
  - [2. Staff & Evaluator Workspace](#2--staff--evaluator-workspace)
  - [3. Enterprise Security & Zero-Trust Antivirus](#3--enterprise-security--zero-trust-antivirus)
  - [4. Dual Multi-Cloud Storage (AWS S3 + Google Drive)](#4--dual-multi-cloud-storage-aws-s3--google-drive)
  - [5. Automated Certificate Engine & Excel Export](#5--automated-certificate-engine--excel-export)
  - [6. Automated 6:00 AM Morning Watchdog](#6--automated-600-am-morning-watchdog)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Spatial Computing Curriculum Roadmap](#-spatial-computing-curriculum-roadmap)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Docker & Containerized Setup](#-docker--containerized-setup)
- [Environment Configuration](#-environment-configuration)
- [Automated Verification & Torture Test Suites](#-automated-verification--torture-test-suites)
- [Repository Structure](#-repository-structure)
- [Complete Documentation Suite](#-complete-documentation-suite)
- [License](#-license)

---

## 🎯 Vision & Value Proposition

In spatial computing education (**Unity XR Interaction Toolkit**, **Meta Quest Passthrough**, **Apple visionOS**, and **WebXR**), physical presence in the hardware lab is non-negotiable. Real development involves head-mounted displays (HMDs), tracking cameras, hand interactors, and physical room boundaries.

The **AR/VR Academy Platform** solves the integrity gap for institutions through three core operational pillars:

```mermaid
graph LR
    subgraph Pillar1 ["1. Physical Campus Integrity"]
        P1A["W3C Geolocation (<= 100m)"]
        P1B["Campus Wi-Fi CIDR Validation"]
        P1C["Live Ticking Session Badges"]
    end

    subgraph Pillar2 ["2. Gated Task Verification"]
        P2A["Dual-Session Attendance Gate"]
        P2B["Zero-Trust In-Memory Antivirus"]
        P2C["Multi-Cloud Sync (S3 / Drive)"]
    end

    subgraph Pillar3 ["3. Evaluator Intelligence"]
        P3A["Split-Pane Review Drawer"]
        P3B["1-Click Preset Grade Chips"]
        P3C["Automated Excel Gradebooks"]
    end

    Pillar1 --> Pillar2 --> Pillar3
```

1. **Physical Campus Integrity:** Eliminates remote spoofing using high-precision Haversine distance calculations ($\le 100\text{ m}$) coupled with campus subnet IP / CIDR verification.
2. **Gated Task Verification:** Practical execution submissions remain strictly locked until the student has verified physical attendance for both Forenoon (**FN**) and Afternoon (**AN**) sessions.
3. **Evaluator Intelligence:** Facilitates rapid instructor grading with side-by-side artifact inspection, score sliders, feedback chips, and automated batch certificate issuance.

---

## ✨ Key Features & Capabilities

### 1. 🎓 Student Portal & Learning Workspace
- **Forenoon & Afternoon Attendance Windows:** Live countdown timers with session state badges (`SCHEDULED`, `OPEN`, `LOCKED`, `RECORDED`).
- **Mobile 1-Tap Floating Attendance Bar:** Sticky action bar designed for student smartphones with instant location acquisition.
- **Gated Practical Task Dropzone:** Drag-and-drop submission for PNG, JPG, and WebP (up to 5MB) screenshots and build artifacts. Automatically locked if daily attendance is missing.
- **10-Day Spatial Computing Journey Roadmap:** Interactive multi-day syllabus timeline guiding students through setup, spatial audio, raycast interactors, image tracking, plane detection, and capstones.
- **Live Progress Dashboard:** Real-time visual metrics for attendance percentage ($\ge 75\%$ certificate cutoff), completed tasks, average grade, and feedback status.

### 2. 🛡️ Staff & Evaluator Workspace
- **Split-Pane Evaluation Drawer:** Evaluators review high-resolution student screenshots side-by-side with evaluation controls.
- **1-Click Grade Presets & Sliders:** Instant grading with preset chips (`O: 95`, `A+: 85`, `A: 75`, `B+: 65`, `B: 55`, `C: 45`) or fine-grained $0–100$ slider adjustments.
- **Quick Feedback Chips:** Pre-built instructor commentary chips (e.g., *"Excellent VR Rig Setup"*, *"Inspect Collider Geometry"*, *"Optimize Frame Timing"*) for rapid turnaround.
- **Batch Management & Calendar Engine:** Dynamic creation of cohorts with automatic weekend-exclusion date calculations and custom daily curriculum tasks.
- **Bulk CSV Student Roster Import:** Enroll hundreds of students in seconds with CSV text pasting or file upload, complete with duplicate handling.

### 3. 🔐 Enterprise Security & Zero-Trust Antivirus
- **Zero-Trust In-Memory File Scanner:** Every uploaded screenshot is buffered in memory and scanned against:
  - Standard EICAR antivirus test signatures.
  - Windows executable headers (`MZ` / `PE`).
  - Linux binary ELF headers (`\x7fELF`).
- **Dual-Key Sliding-Window Rate Limiting:** Enforces both IP volumetric limits (20 req/min) and targeted account brute-force lockouts (5 failed attempts $\rightarrow$ 15-minute freeze).
- **Salt-Hashed Credentials:** Student PINs and administrator passwords hashed using **Bcrypt (10 salt rounds)** with constant-time comparison.
- **Encrypted Session Management:** Managed via `iron-session` utilizing 32-byte cryptographically signed cookies (`httpOnly: true`, `sameSite: 'lax'`).

### 4. ☁️ Dual Multi-Cloud Storage (AWS S3 + Google Drive)
- **Primary AWS S3 Storage:** Secure pre-signed URL generation and private bucket storage for enterprise compliance.
- **Google Drive Integration (Direct OAuth 2.0):** Connect institution Google Drive accounts directly from the web UI without editing environment variables. Automatically creates and organizes files into `ARVR_Student_Submissions/{Batch_Name}/`.

### 5. 📜 Automated Certificate Engine & Excel Export
- **Eligibility Validation:** Enforces strict institutional rules (minimum $75\%$ attendance + all practical tasks completed) before enabling certification.
- **Unique Serial Generation:** Generates tamper-proof certificate serial numbers (e.g. `ARVR-2026-B1-0042`).
- **One-Click Batch Excel Export:** Generates complete batch performance spreadsheets (`.xlsx`) via `exceljs` with student details, attendance summaries, task scores, and final grades.

### 6. ⏰ Automated 6:00 AM Morning Watchdog
- **Self-Scheduling Background Daemon:** Node.js runtime worker initialized on startup (`ARVR/instrumentation.ts`) executing daily at 6:00 AM.
- **6 Critical Diagnostic Probes:**
  1. Google Drive OAuth token validity & storage quota.
  2. AWS S3 bucket write/read accessibility.
  3. MongoDB Atlas replica set latency and connectivity.
  4. Redis caching & rate-limit cluster status.
  5. Active batch curriculum completeness.
  6. Campus geofence coordinate and Wi-Fi CIDR configuration.
- **Staff Diagnostics Console:** On-demand health audits and real-time status reporting directly within the Admin UI.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (Web & Mobile)"]
        Browser["Desktop & Mobile Browser"]
        Geo["HTML5 W3C Geolocation"]
    end

    subgraph CDN ["CDN & Ingress"]
        Cloudflare["Cloudflare Edge (SSL / TLS 1.3)"]
        RenderEdge["Render Reverse Proxy"]
    end

    subgraph AppServer ["Next.js 16 Application Engine (Turbopack)"]
        MW["Middleware (Security Headers & Route Protection)"]
        Auth["iron-session (Encrypted 32-byte Cookies)"]
        RateLimit["Dual-Key Sliding Window Rate Limiter"]
        Scanner["Zero-Trust Antivirus & Executable Scanner"]
        Routes["API Route Handlers (52 Routes / 69 Handlers)"]
        Watchdog["Morning Watchdog 6:00 AM Daemon"]
    end

    subgraph DataStorage ["Data & Cloud Storage"]
        Prisma["Prisma ORM 6.4"]
        Mongo["MongoDB Atlas (Cloud Replica Set)"]
        RedisCache["Redis (Throttling & Cache)"]
        S3["AWS S3 Private Bucket"]
        GDrive["Google Drive API v3 (OAuth 2.0)"]
    end

    Browser -->|HTTPS| Cloudflare --> RenderEdge --> MW
    Geo -.->|Coordinates| Browser
    MW --> RateLimit --> Auth --> Routes
    Routes --> Scanner
    Scanner -->|Safe Stream| S3
    Scanner -->|Backup Stream| GDrive
    Routes --> Prisma --> Mongo
    RateLimit --> RedisCache
    Watchdog --> Mongo
    Watchdog --> S3
    Watchdog --> GDrive
```

---

## 🛠️ Technology Stack

| Domain | Technology | Version | Description |
| :--- | :--- | :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) | `16.3.2` | App Router, Server Actions & Turbopack build engine |
| **UI Library** | [React](https://react.dev/) | `19.2.8` | Component architecture & client rendering |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `5.x` | Strict end-to-end static typing |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/) | `4.4+ / 7.0` | Cloud-hosted 3-node replica set |
| **ORM** | [Prisma](https://www.prisma.io/) | `6.4.0` | Declarative schema, type-safe queries, connection pool retry |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | `v4` | Royal Cobalt (`#2563EB`) & Electric Indigo (`#4F46E5`) theme |
| **Icons** | [Lucide React](https://lucide.dev/) | `1.33.0` | Clean enterprise icon system |
| **Session** | [iron-session](https://github.com/vvo/iron-session) | `8.0.4` | Stateless encrypted session cookies |
| **Password Hashing** | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | `3.0.3` | Salted credential cryptography (10 rounds) |
| **Cloud Object Storage** | [@aws-sdk/client-s3](https://aws.amazon.com/sdk-for-javascript/) | `3.1129.0` | AWS S3 client & pre-signed URL generator |
| **Google Cloud** | [googleapis](https://github.com/googleapis/google-api-nodejs-client) | `176.0.0` | Google Drive v3 REST OAuth 2.0 client |
| **Caching & Limiting** | [ioredis](https://github.com/redis/ioredis) | `6.0.0` | High-performance distributed Redis client |
| **Spreadsheets** | [exceljs](https://github.com/exceljs/exceljs) | `4.4.0` | Enterprise XLSX report generation |
| **Validation** | [Zod](https://zod.dev/) | `4.4.3` | Schema validation on all inbound API payloads |

---

## 🕶️ Spatial Computing Curriculum Roadmap

The platform integrates a structured 10-day hands-on curriculum:

```
Day 01: Unity VR Setup, OpenXR & XR Interaction Toolkit (XRI 3.0)
Day 02: 3D Asset Pipeline, Physics Colliders & Spatial Audio Sources
Day 03: Raycast Interactors, Direct Grab & Socket Snap Points
Day 04: Augmented Reality Image Tracking (AR Foundation / ARKit / ARCore)
Day 05: Surface Plane Detection, Meshing & Touch Hit Testing
Day 06: Hand Tracking Gestures & Pinch Locomotion
Day 07: Meta Quest Passthrough API & Mixed Reality Scene Understanding
Day 08: Multi-User Spatial Networking & Synchronized Avatars
Day 09: Spatial UI Design, World-Space Canvas & Ergonomics
Day 10: Performance Optimization (Fixed Foveated Rendering, 90 FPS Capstone)
```

---

## 💻 Getting Started & Local Setup

### 1. Prerequisites
- **Node.js**: `20.x` or higher
- **npm**: `10.x` or higher
- **MongoDB**: MongoDB Atlas connection string or local MongoDB replica set
- **Git**

### 2. Step-by-Step Installation

```bash
# 1. Clone the repository
git clone https://github.com/Livesh-L-28/LMS_System.git
cd LMS_System/ARVR

# 2. Install all dependencies (Turbopack + Next.js 16)
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and SESSION_SECRET

# 4. Generate Prisma Client & Sync Database
npx prisma generate
npx prisma db push

# 5. Seed initial demo data (Batches, Demo Student, Admin)
npx prisma db seed

# 6. Start Turbopack development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🐳 Docker & Containerized Setup

The project includes an optimized multi-stage `Dockerfile` and `docker-compose.yml` for production-parity local execution:

```bash
# Run the entire stack (App + Redis + MinIO S3)
docker compose up -d --build

# View container logs
docker compose logs -f app

# Stop the stack
docker compose down
```

The multi-stage container builds in three isolated phases:
1. `deps`: Caches `package.json` and installs production dependencies.
2. `builder`: Generates Prisma clients and compiles Next.js with Turbopack.
3. `runner`: Minimal Alpine Linux execution environment with non-root user execution (`nextjs:nodejs`).

---

## ⚙️ Environment Configuration

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | Runtime environment | `production` or `development` |
| `DATABASE_URL` | Yes | MongoDB Atlas Replica Set connection string | `mongodb+srv://user:pass@cluster.mongodb.net/lmssystem?retryWrites=true&w=majority` |
| `SESSION_SECRET` | Yes | 32+ character random string for iron-session | `openssl rand -base64 32` |
| `REDIS_URL` | Optional | Redis instance for rate limiting and session tracking | `redis://localhost:6379` |
| `AWS_REGION` | Optional | AWS S3 region for screenshot storage | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | Optional | AWS IAM access key ID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Optional | AWS IAM secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_S3_BUCKET_NAME` | Optional | Name of the private S3 bucket | `arvr-submissions-private` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Web Client ID | `*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth 2.0 Web Client Secret | `GOCSPX-*` |

> *Note: Google Drive credentials can also be configured dynamically at runtime through the Staff Portal UI!*

---

## 🧪 Automated Verification & Torture Test Suites

The codebase includes 14 specialized automated verification scripts located in `ARVR/scripts/`:

```bash
# Run comprehensive feature verification
npm test

# Run production live simulation (end-to-end student & admin lifecycles)
npm run test:production

# Run enterprise security hardening audit
npm run test:security

# Run S3 object storage upload test
npm run test:s3

# Run live staging audit against the deployed host
npx tsx scripts/test-live-staging-audit.ts
```

---

## 📂 Repository Structure

```text
LMS_System/
├── ARVR/                               # Main Next.js 16 Application
│   ├── app/                            # Next.js App Router
│   │   ├── api/                        # 52 API route files (69 endpoints)
│   │   │   ├── admin/                  # Admin batch, settings, export, students
│   │   │   ├── auth/                   # Session verification & logout
│   │   │   ├── student/                # Attendance, registration, progress, tasks
│   │   │   └── google-drive/           # OAuth 2.0 callback & folder management
│   │   ├── globals.css                 # Royal Cobalt & Electric Indigo design tokens
│   │   ├── layout.tsx                  # Root layout & font injection
│   │   └── page.tsx                    # Portal tab switcher & entrypoint
│   ├── components/                     # Enterprise React 19 UI components
│   │   ├── Navbar.tsx                  # Top brand navigation & quick actions
│   │   ├── StudentPortal.tsx           # Student learning & submission workspace
│   │   ├── StaffPortal.tsx             # Unified evaluation & administration center
│   │   ├── MorningWatchdogCard.tsx     # 6:00 AM subsystem diagnostics console
│   │   └── LoadingSkeletons.tsx        # High-fidelity loading states
│   ├── lib/                            # Enterprise shared libraries
│   │   ├── auth.ts                     # iron-session & Bcrypt helpers
│   │   ├── geofence.ts                 # Haversine distance & CIDR matching
│   │   ├── prisma.ts                   # Prisma client with connection retry
│   │   ├── rateLimit.ts                # Dual-key sliding window rate limiting
│   │   ├── security.ts                 # Zero-trust antivirus & ELF/MZ scanners
│   │   └── storage.ts                  # S3 & Google Drive multi-cloud uploaders
│   ├── prisma/                         # Database schema & migrations
│   │   ├── schema.prisma               # 12 MongoDB collections & indices
│   │   └── seed.ts                     # Demo batch, curriculum, student & admin seed
│   ├── scripts/                        # 14 Torture & verification test suites
│   ├── docs/                           # 32+ Reverse-Engineered Technical Guides
│   ├── Dockerfile                      # Production multi-stage Docker build
│   ├── docker-compose.yml              # Local production-parity multi-container stack
│   └── package.json                    # Project dependencies & build scripts
├── Dockerfile                          # Root Dockerfile for deployment platforms
├── docker-entrypoint.sh                # Container startup & Prisma schema push
└── render.yaml                         # Render Cloud Infrastructure as Code
```

---

## 📚 Complete Documentation Suite

Comprehensive technical guides are available inside `ARVR/docs/`:

| Guide | Location | Highlights |
| :--- | :--- | :--- |
| **Executive Summary** | [`docs/EXECUTIVE_SUMMARY.md`](ARVR/docs/EXECUTIVE_SUMMARY.md) | Platform assessment, metrics, core pillars |
| **Documentation Index** | [`docs/DOCUMENTATION_INDEX.md`](ARVR/docs/DOCUMENTATION_INDEX.md) | Complete index of all 32 technical specifications |
| **System Architecture** | [`docs/architecture/SYSTEM_ARCHITECTURE.md`](ARVR/docs/architecture/SYSTEM_ARCHITECTURE.md) | C4 diagrams, container models, network boundaries |
| **REST API Reference** | [`docs/api/API_REFERENCE.md`](ARVR/docs/api/API_REFERENCE.md) | Full endpoint contracts, request/response payloads |
| **Database Dictionary** | [`docs/database/DATA_DICTIONARY.md`](ARVR/docs/database/DATA_DICTIONARY.md) | MongoDB collections, fields, indexes, and relations |
| **Security Architecture** | [`docs/security/SECURITY_ARCHITECTURE.md`](ARVR/docs/security/SECURITY_ARCHITECTURE.md) | STRIDE threat model, zero-trust scanner, rate limits |
| **Deployment Runbook** | [`docs/operations/RELEASE_RUNBOOK.md`](ARVR/docs/operations/RELEASE_RUNBOOK.md) | Staging auto-deployments, Render setup, zero-downtime |
| **Frontend Design** | [`docs/frontend/DESIGN_SYSTEM.md`](ARVR/docs/frontend/DESIGN_SYSTEM.md) | Royal Cobalt & Electric Indigo palette & components |

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**[Explore Live Demo 🌐](https://arvr-academy-staging.onrender.com)** &bull; **[Staff Portal 🛡️](https://arvr-academy-staging.onrender.com#staff)** &bull; **[GitHub Repository 🐙](https://github.com/Livesh-L-28/LMS_System)**

Crafted for next-generation spatial computing and immersive technology education.

</div>

