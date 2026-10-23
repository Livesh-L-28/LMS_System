# System Context: AR/VR Academy Platform

**Document ID:** `ARCH-CTX-001`  
**Classification:** Technical Architecture  
**Verification Category:** Verified in source & live environment  
**Target System:** AR/VR Academy Spatial Computing LMS (`LMS_System`)  

---

## 1. High-Level System Context Diagram

```mermaid
C4Context
    title System Context Diagram - AR/VR Spatial Computing Academy

    Person(student, "AR/VR Student", "Attends training sessions, validates campus location, submits Unity/WebXR tasks.")
    Person(trainer, "Trainer / Evaluator", "Reviews submissions, grades screenshots, provides feedback via Split-Pane Drawer.")
    Person(admin, "System Administrator", "Manages batches, roster imports, settings, access controls, certificates, and watchdogs.")

    Enterprise_Boundary(arvr_boundary, "AR/VR Academy Boundary") {
        System(arvr_platform, "AR/VR Academy Platform", "Next.js 16 App Router application hosting Student, Trainer, and Admin portals with REST APIs.")
    }

    SystemDb_Ext(mongodb, "MongoDB Atlas Replica Set", "Cloud document database storing students, admins, attendance, batches, tasks, and audit logs.")
    System_Ext(google_drive, "Google Drive API", "Cloud storage provider for student practical task submissions & batch archives.")
    System_Ext(aws_s3, "AWS S3 / S3-Compatible", "Secondary/Alternative object store for task screenshots and binary assets.")
    System_Ext(redis, "Redis Cluster / In-Memory", "Distributed sliding-window rate limiter and session token revocation store.")
    System_Ext(webhook, "Admin Alert Webhook", "Discord / Slack webhook receiving morning diagnostic reports and security alerts.")

    Rel(student, arvr_platform, "Submits attendance, accesses curriculum, uploads task evidence", "HTTPS / JSON / Multipart")
    Rel(trainer, arvr_platform, "Evaluates tasks, assigns scores, enters feedback", "HTTPS / JSON")
    Rel(admin, arvr_platform, "Configures batches, imports rosters, manages security", "HTTPS / JSON")

    Rel(arvr_platform, mongodb, "CRUD operations, indexes, transactions", "Prisma Wire Protocol / TLS")
    Rel(arvr_platform, google_drive, "OAuth2 token exchange, multipart folder/file uploads", "REST / HTTPS")
    Rel(arvr_platform, aws_s3, "Presigned upload URLs & S3 object streaming", "AWS SDK v3 / HTTPS")
    Rel(arvr_platform, redis, "Sliding-window counters, lockout keys", "RESP / TLS")
    Rel(arvr_platform, webhook, "Posts health check failure alerts", "Webhook / HTTPS")
```

---

## 2. External Actors & Interactions

### 2.1 Primary Actors

| Actor | Access Mechanism | Authentication Method | Core Capabilities |
| :--- | :--- | :--- | :--- |
| **Student** | Web Browser / Mobile Browser | Register Number + 6-digit PIN (`iron-session` cookie) | View curriculum roadmap, mark Forenoon/Afternoon attendance with GPS/Wi-Fi verification, submit practical task screenshots, view evaluation scores and feedback. |
| **Trainer** | Web Browser / Tablet | Email + Password (Bcrypt hash) | View assigned batch students, filter pending task submissions, inspect student screenshot evidence in split-pane drawer, assign grades and preset feedback. |
| **Administrator** | Web Browser Desktop | Email + Password + Optional 2FA TOTP | Configure training batches, generate daily calendars, bulk import student rosters via CSV, toggle campus geofencing/Wi-Fi bypass rules, export Excel gradebooks, trigger morning watchdogs. |

---

## 3. External Systems & Trust Relationships

### 3.1 MongoDB Atlas Cluster
- **Role:** Primary System of Record.
- **Protocol:** `mongodb+srv://` over TLS 1.3 with SCRAM-SHA-256 authentication.
- **Topology:** 3-node replica set (1 Primary + 2 Secondary replicas) with automated sub-5-second failover.
- **Data Encrypted:** In-transit via TLS and at-rest via MongoDB Atlas volume encryption.

### 3.2 Google Drive API Integration
- **Role:** Primary cloud storage provider for student submission screenshots and batch folders.
- **Protocol:** Google APIs REST v3 over HTTPS.
- **Authentication:** OAuth2 with offline access, client credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), and AES-256 encrypted refresh tokens stored in `GoogleDriveConnection` table.

### 3.3 AWS S3 / Object Store Integration
- **Role:** High-throughput secondary or air-gapped storage for task submissions and resources.
- **Protocol:** AWS SDK v3 with SigV4 signatures over HTTPS.
- **Capabilities:** Direct server upload and secure Presigned URL generation for client-direct uploads.

### 3.4 In-Memory / Distributed Redis Store
- **Role:** Sliding-window rate limiting (`lib/rateLimit.ts`) and revoked session token cache.
- **Resilience:** Graceful in-memory fallback if Redis is unavailable or unconfigured, preventing service outages while maintaining local sliding-window protection.

### 3.5 Alerting Webhook
- **Role:** Dispatch operational health diagnostics from `runMorningWatchdog()` when critical subsystems (DB, S3, OAuth, Curriculum consistency) degrade.
