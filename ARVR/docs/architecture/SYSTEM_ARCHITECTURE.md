# System Architecture & Technical Topology

**Document ID:** `ARCH-SYS-002`  
**Classification:** Core System Architecture  
**Verification Category:** Verified in source (`Dockerfile`, `next.config.ts`, `middleware.ts`, `instrumentation.ts`)  

---

## 1. Container & Deployment Architecture

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Browsers & Devices)"]
        DeskBrowser["Desktop Web Browser (Chrome / Safari / Edge)"]
        MobBrowser["Mobile Web Browser (iOS / Android)"]
    end

    subgraph IngressLayer ["Ingress & Edge Security"]
        CloudProxy["Cloud Proxy / Reverse Proxy (Render / Cloudflare)"]
        SSLTerm["TLS 1.3 Termination & HSTS Enforcement"]
    end

    subgraph AppContainer ["Docker Container: arvrweb (Node.js 20 Standalone)"]
        Middleware["Edge Middleware (middleware.ts)\n- HTTPS Enforcer\n- Correlation ID Injection (x-request-id)\n- Access Logging"]
        Instrumentation["Instrumentation Hook (instrumentation.ts)\n- validateProductionSecurityEnvironment()\n- initMorningWatchdogScheduler()"]
        
        subgraph NextAppRouter ["Next.js 16 App Router (Turbopack)"]
            PageRouter["Single-Page Shell (app/page.tsx)\n- StudentPortal.tsx\n- StaffPortal.tsx\n- TrainerPortal.tsx"]
            APIRouter["52 REST API Handlers (app/api/**)\n- 69 Distinct HTTP Endpoints"]
        end

        subgraph CoreLibraries ["Internal Shared Subsystems (lib/)"]
            AuthLib["lib/auth.ts (iron-session + bcryptjs)"]
            RateLimiter["lib/rateLimit.ts (Sliding Window + Lockout)"]
            Geofence["lib/geofence.ts (Haversine + CIDR Normalization)"]
            StorageMgr["lib/storage.ts & lib/antivirus.ts"]
            PrismaClient["lib/prisma.ts (withPrismaRetry Engine)"]
            Watchdog["lib/morningWatchdog.ts (13 Diagnostic Probes)"]
        end
    end

    subgraph PersistenceLayer ["Persistence & External Cloud Services"]
        MongoCluster[("MongoDB Atlas Cloud Replica Set\n- 12 Collections / Primary + 2 Secondaries")]
        GoogleCloud["Google Drive API (OAuth2 Enterprise Folder Tree)"]
        AWSCloud["AWS S3 / Presigned URL Object Bucket"]
        RedisNode["Redis Node / Cluster (Optional Cache & Rate Store)"]
    end

    DeskBrowser -->|HTTPS / Port 443| CloudProxy
    MobBrowser -->|HTTPS / Port 443| CloudProxy
    CloudProxy --> SSLTerm
    SSLTerm -->|HTTP Internal / Standalone Port 3000| Middleware
    Middleware --> PageRouter
    Middleware --> APIRouter
    APIRouter --> AuthLib
    APIRouter --> RateLimiter
    APIRouter --> Geofence
    APIRouter --> StorageMgr
    APIRouter --> PrismaClient
    PrismaClient -->|Prisma Wire Protocol / TLS| MongoCluster
    StorageMgr --> GoogleCloud
    StorageMgr --> AWSCloud
    RateLimiter -.-> RedisNode
    Instrumentation --> Watchdog
    Watchdog --> MongoCluster
```

---

## 2. Layer Responsibilities & Implementation Files

### 2.1 Ingress & Middleware Layer
- **Files:** [`middleware.ts`](file:///Users/livesh/arvr/ARVR/middleware.ts), [`next.config.ts`](file:///Users/livesh/arvr/ARVR/next.config.ts)
- **Functions:**
  - Enforces HTTPS for public traffic with permanent redirects.
  - Generates or extracts `x-request-id` (UUIDv4) and injects it into request headers and response headers.
  - Extracts and normalizes client IP from `x-forwarded-for`.
  - Dispatches structured console access logs `[HTTP_REQUEST]` for all non-static requests.
  - Applies Strict-Transport-Security, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), Referrer-Policy, and Permissions-Policy.

### 2.2 Application Shell & Presentation Layer
- **Files:** [`app/layout.tsx`](file:///Users/livesh/arvr/ARVR/app/layout.tsx), [`app/page.tsx`](file:///Users/livesh/arvr/ARVR/app/page.tsx), [`app/globals.css`](file:///Users/livesh/arvr/ARVR/app/globals.css)
- **Architecture:** Client-side hydrated SPA on top of Next.js server-rendered shell.
- **Portals Managed:**
  - `StudentPortal`: Learning hub, daily tasks, geofenced attendance, horizontal syllabus roadmap, mobile floating bar.
  - `StaffPortal`: Admin command center, batch configuration, roster imports, settings, watchdog diagnostics, certificate generation.
  - `TrainerPortal`: Evaluator portal, split-pane submission review drawer, score slider, grade chips, feedback insertion.

### 2.3 API Routing & Controller Layer
- **Path:** [`app/api/**`](file:///Users/livesh/arvr/ARVR/app/api)
- **Structure:** 52 distinct route files exposing 69 HTTP methods.
- **Payload Handling:** Standard JSON for transactional payloads and multipart/form-data for task submission uploads.
- **Security Check:** All mutations and private reads invoke `requireAuth(role)` from `lib/auth.ts`.

### 2.4 Data Access & Retry Layer
- **File:** [`lib/prisma.ts`](file:///Users/livesh/arvr/ARVR/lib/prisma.ts)
- **Engine:** Prisma ORM connected to MongoDB Atlas.
- **Resilience (`withPrismaRetry`):**
  - Executes queries inside an exponential backoff loop (up to 3 retries, base delay 200ms).
  - Automatically intercepts transient MongoDB connection dropouts (`P2024`, `P2010`, `PoolTimeout`, `ServerSelectionTimeout`) to maintain zero-downtime student check-in spikes.
