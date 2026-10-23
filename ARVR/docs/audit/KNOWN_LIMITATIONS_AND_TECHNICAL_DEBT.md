# Known Limitations & Technical Debt Register

**Document ID:** `AUDIT-DEBT-001`  
**Classification:** Technical Debt & Architectural Observations  
**Audit Date:** 2026-10-23T17:35:00+05:30  
**Verification Category:** Verified in source code inspection  

---

## 1. Technical Debt Ledger

| Item ID | Component | Severity | Description | Evidence / File Reference | Recommended Action |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **DEBT-001** | Trainer Login Endpoint | Low | `/api/trainer/login` returns HTTP 400 indicating it is deprecated in favor of unified `/api/admin/login`. | [`app/api/trainer/login/route.ts:8`](file:///Users/livesh/arvr/ARVR/app/api/trainer/login/route.ts) | Formally remove the route or return a 308 permanent redirect to the admin login endpoint. |
| **DEBT-002** | Middleware Deprecation Notice | Low | Next.js 16 logs a runtime notice: `The "middleware" file convention is deprecated. Please use "proxy" instead.` | [`middleware.ts`](file:///Users/livesh/arvr/ARVR/middleware.ts) | Migrate `middleware.ts` to the Next.js `proxy` pattern during the Next.js 17 upgrade cycle. |
| **DEBT-003** | Distributed Rate Limit Sync | Medium | In the absence of a configured `REDIS_URL`, sliding-window counters and session revocations default to local process memory (`Map`). | [`lib/rateLimit.ts:8`](file:///Users/livesh/arvr/ARVR/lib/rateLimit.ts) | Ensure `REDIS_URL` is set in multi-replica horizontal autoscaling environments. |
| **DEBT-004** | Legacy Migration Files | Low | Historical SQLite (`dev.db`) and SQL migrations (`prisma/migrations/20260911065444_init/migration.sql`) remain in the tree after MongoDB Atlas migration. | `prisma/migrations/`, `dev.db` | Archive historical SQL migrations to a separate repository branch to keep the root directory pristine. |
| **DEBT-005** | GPS Accuracy Dependency | Low | Physical geofencing relies on browser W3C Geolocation API. If a student denies location permissions, they cannot mark attendance. | [`lib/geofence.ts:180`](file:///Users/livesh/arvr/ARVR/lib/geofence.ts) | Continue providing clear in-app guidance on enabling location permissions and connecting to campus Wi-Fi. |
