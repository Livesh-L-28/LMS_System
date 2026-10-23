# Phase 0: Safe Audit Baseline & Environment Ledger

**Audit Date:** 2026-10-23T17:18:00+05:30  
**Repository Root:** `/Users/livesh/arvr/ARVR`  
**Git Remote URL:** `https://github.com/Livesh28/LMS_System.git`  
**Current Branch:** `staging`  
**Commit SHA:** `306fca7914b3ce6ca18eeedabf09628b9c3d19cb`  
**Target Staging Deployment:** `https://arvr-academy-staging.onrender.com`  
**Target Production Deployment:** Branch `main` -> Render Production  

---

## 1. System Runtime & Package Manifest

| Attribute | Inspected Value | Source of Evidence |
| :--- | :--- | :--- |
| **Node.js Runtime** | `v20.15.1` | `node -v` |
| **NPM Package Manager** | `10.7.0` | `npm -v` |
| **Next.js Version** | `16.3.2` (Turbopack) | `package.json:41` |
| **React Version** | `19.2.8` | `package.json:43-44` |
| **Prisma ORM** | `^6.4.0` | `package.json:30,42` |
| **Tailwind CSS** | `^4` (`@tailwindcss/postcss`) | `package.json:49,57` |
| **TypeScript** | `^5` | `package.json:59` |
| **Operating System** | macOS (Darwin 24.1.0 arm64) | `uname -a` |

---

## 2. Git Working Tree State

```text
On branch staging
Your branch is up to date with 'origin/staging'.
nothing to commit, working tree clean
Tag: pre-ui-ux-phase1-4 (commit f9a6b78)
Local Rollback Store: .backup-ui/ (preserved and gitignored)
```

---

## 3. Environment Variable Manifest (Presence Audit)

*Security Rule: Only variable names, purpose, and presence status are recorded. Secret values are strictly excluded.*

| Environment Variable | Required in Staging | Detected in Local `.env` | Detected in `.env.example` | Subsystem / Consumer |
| :--- | :---: | :---: | :---: | :--- |
| `DATABASE_URL` | YES | Present | Present | Prisma ORM (`mongodb+srv://...`) |
| `SESSION_SECRET` | YES | Present | Present | `lib/auth.ts` (iron-session 32-byte key) |
| `CRON_SECRET` | YES | Present | Not in example | `app/api/cron/morning-watchdog/route.ts` |
| `ADMIN_ALERT_WEBHOOK_URL` | OPTIONAL | Present | Not in example | `lib/morningWatchdog.ts` (Slack/Discord Webhook) |
| `GOOGLE_CLIENT_ID` | OPTIONAL | Present | Present | `lib/googleDrive.ts` (OAuth2 Client ID) |
| `GOOGLE_CLIENT_SECRET` | OPTIONAL | Present | Present | `lib/googleDrive.ts` (OAuth2 Client Secret) |
| `GOOGLE_REDIRECT_URI` | OPTIONAL | Present | Present | `lib/googleDrive.ts` (OAuth2 Redirect URI) |
| `AWS_ACCESS_KEY_ID` | OPTIONAL | Present | Present | `lib/s3.ts` (AWS S3 Client) |
| `AWS_SECRET_ACCESS_KEY` | OPTIONAL | Present | Present | `lib/s3.ts` (AWS S3 Secret Key) |
| `AWS_REGION` | OPTIONAL | Present | Present | `lib/s3.ts` (AWS S3 Region) |
| `AWS_S3_BUCKET_NAME` | OPTIONAL | Present | Present | `lib/s3.ts` (Target S3 Bucket) |
| `AWS_S3_ENDPOINT` | OPTIONAL | Present | Present | `lib/s3.ts` (Custom S3 endpoint / LocalStack) |
| `REDIS_URL` | OPTIONAL | Present | Present | `lib/rateLimit.ts` (Distributed sliding rate limiter) |
| `PORT` | OPTIONAL | Not Set (3003) | Present | Next.js server port binding |
| `NODE_ENV` | YES | Inferred `production` / `development` | Present | Next.js build runtime |
| `DB_WAIT_RETRIES` | OPTIONAL | Not in `.env` | Present | `docker-entrypoint.sh` |
| `SKIP_MIGRATIONS` | OPTIONAL | Not in `.env` | Present | `docker-entrypoint.sh` |

---

## 4. Connectivity & Integration Baseline Status

| Integration Point | Target Host / Namespace | Verified Status | Evidence |
| :--- | :--- | :--- | :--- |
| **MongoDB Atlas Database** | `lmssystem_staging` / `lmssystem` cluster | **Verified Live** | `prisma.student.findMany()` and `prisma.admin.findMany()` executed cleanly |
| **Render Staging Service** | `https://arvr-academy-staging.onrender.com` | **Verified Live** | HTTP 200 via curl audit, SSL active |
| **Local Next.js Dev Server** | `http://localhost:3003` | **Verified Live** | Background daemon PID running, HTTP 200 |
| **Redis Store** | `lib/rateLimit.ts` | **Config-Dependent** | Redis connection fallback to in-memory sliding window when unconfigured |
| **Google Drive API** | Google Workspace API | **Config-Dependent** | Connection model in DB, tokens stored encrypted |
| **AWS S3 Storage** | AWS S3 / Mock S3 | **Config-Dependent** | S3 presigned URL generator in `lib/s3.ts` |
