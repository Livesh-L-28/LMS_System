# Security Findings, Audit Observations & Hardening Ledger

**Document ID:** `SEC-FIND-006`  
**Classification:** Security Audit & Vulnerability Assessment  
**Audit Date:** 2026-10-23T17:32:00+05:30  
**Verification Category:** Verified in source code analysis  

---

## 1. Verified Security Hardening (Strengths)

1. **Zero Secret Leaks in Client Bundles:** All sensitive keys (`DATABASE_URL`, `SESSION_SECRET`, `GOOGLE_CLIENT_SECRET`, `AWS_SECRET_ACCESS_KEY`, `CRON_SECRET`) are kept strictly server-side. No `NEXT_PUBLIC_` prefixes expose credentials to client JavaScript bundles.
2. **Robust Password & PIN Cryptography:** Uses Bcrypt with 10 salt rounds. Students cannot authenticate via plaintext PINs.
3. **Session Timing Attack Defense:** Constant-time dummy comparisons (`dummyBcryptCompare`) ensure non-existent accounts take the exact same verification time as valid accounts.
4. **Physical Presence Defense:** Geofence verifies distance ($\le 100\text{m}$) using the Haversine formula and rejects GPS fixes with low accuracy ($> 150\text{m}$).
5. **In-Memory Zero-Trust Antivirus Scanning:** Detects EICAR signatures, Windows PE MZ headers, Linux ELF headers, and active PDF JavaScript injections.

---

## 2. Identified Security Observations & Recommendations

| ID | Severity | Subsystem | Description | Recommended Remediation |
| :--- | :---: | :--- | :--- | :--- |
| **OBS-001** | Low | Session Invalidation | If Redis is unavailable, revoked session IDs are tracked in local Node.js memory. In a multi-replica container deployment without Redis, logout revocation is local to the container instance. | Enforce managed Redis cluster (`REDIS_URL`) across multi-container production deployments. |
| **OBS-002** | Low | Next.js Convention | The server logs `The "middleware" file convention is deprecated. Please use "proxy" instead.` from Next.js 16 canary runtime. | Migrate `middleware.ts` to the recommended Next.js proxy convention when upgrading to Next.js 17. |
| **OBS-003** | Informational | Campus Wi-Fi Check | Network verification checks the egress IP of the client. Students using mobile carrier data inside the building may fail IP check unless Wi-Fi bypass is toggled. | Maintain clear instructions for students to connect to campus Wi-Fi or rely on the GPS geofence threshold. |
