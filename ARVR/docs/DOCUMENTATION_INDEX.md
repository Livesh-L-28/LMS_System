# Master Documentation Index & Technical Knowledge Sitemap

**Document ID:** `DOC-INDEX-001`  
**Classification:** Documentation Index & Navigation Guide  
**Created:** 2026-10-23T17:36:30+05:30  
**Repository Branch:** `staging` (`306fca7914b3ce6ca18eeedabf09628b9c3d19cb`)  

---

## 1. Executive Briefs & Overviews
- [`docs/README.md`](file:///Users/livesh/arvr/ARVR/docs/README.md) — Documentation suite entrance and navigation guide.
- [`docs/EXECUTIVE_SUMMARY.md`](file:///Users/livesh/arvr/ARVR/docs/EXECUTIVE_SUMMARY.md) — Executive summary, system vision, and core audit metrics.
- [`docs/PROJECT_OVERVIEW.md`](file:///Users/livesh/arvr/ARVR/docs/PROJECT_OVERVIEW.md) — Academy mission, user personas, and operational capabilities.
- [`docs/DOCUMENTATION_COVERAGE_MATRIX.md`](file:///Users/livesh/arvr/ARVR/docs/DOCUMENTATION_COVERAGE_MATRIX.md) — Traceability matrix covering 100% of repository components.

---

## 2. System Architecture & Topologies
- [`docs/architecture/SYSTEM_CONTEXT.md`](file:///Users/livesh/arvr/ARVR/docs/architecture/SYSTEM_CONTEXT.md) — C4 Context diagram, primary actors, and external system boundaries.
- [`docs/architecture/SYSTEM_ARCHITECTURE.md`](file:///Users/livesh/arvr/ARVR/docs/architecture/SYSTEM_ARCHITECTURE.md) — Container topology, App Router layers, and data access.
- [`docs/architecture/COMPONENT_ARCHITECTURE.md`](file:///Users/livesh/arvr/ARVR/docs/architecture/COMPONENT_ARCHITECTURE.md) — Frontend component hierarchy and state orchestrators.
- [`docs/architecture/DATA_FLOW.md`](file:///Users/livesh/arvr/ARVR/docs/architecture/DATA_FLOW.md) — Sequence diagrams for attendance, task upload, and evaluations.
- [`docs/architecture/TRUST_BOUNDARIES.md`](file:///Users/livesh/arvr/ARVR/docs/architecture/TRUST_BOUNDARIES.md) — Network zones, ingress perimeters, and trust boundaries.

---

## 3. Frontend & UI/UX Specifications
- [`docs/frontend/ROUTES_AND_PAGES.md`](file:///Users/livesh/arvr/ARVR/docs/frontend/ROUTES_AND_PAGES.md) — Single-page shell, hash routing (`#staff`, `#student`), and deep links.
- [`docs/frontend/COMPONENT_REFERENCE.md`](file:///Users/livesh/arvr/ARVR/docs/frontend/COMPONENT_REFERENCE.md) — Props, state, and callbacks for all 8 components.
- [`docs/frontend/DESIGN_SYSTEM.md`](file:///Users/livesh/arvr/ARVR/docs/frontend/DESIGN_SYSTEM.md) — Royal Cobalt (`#2563EB`) & Electric Indigo (`#4F46E5`), glassmorphism, and spatial grids.
- [`docs/frontend/STATE_MANAGEMENT.md`](file:///Users/livesh/arvr/ARVR/docs/frontend/STATE_MANAGEMENT.md) — Real-time attendance countdown ticker and object URL cleanups.
- [`docs/frontend/UI_WORKFLOWS.md`](file:///Users/livesh/arvr/ARVR/docs/frontend/UI_WORKFLOWS.md) — Student, Trainer, and Admin interaction workflows.

---

## 4. Backend & Core Business Logic
- [`docs/backend/MODULE_REFERENCE.md`](file:///Users/livesh/arvr/ARVR/docs/backend/MODULE_REFERENCE.md) — Detailed catalog of all 19 library modules in `lib/`.
- [`docs/backend/BUSINESS_LOGIC.md`](file:///Users/livesh/arvr/ARVR/docs/backend/BUSINESS_LOGIC.md) — Batch name formulas, attendance math, exam dates, and letter grades.
- [`docs/backend/ERROR_HANDLING.md`](file:///Users/livesh/arvr/ARVR/docs/backend/ERROR_HANDLING.md) — Status code mapping, Prisma retry loops, and error masking.
- [`docs/backend/BACKGROUND_JOBS.md`](file:///Users/livesh/arvr/ARVR/docs/backend/BACKGROUND_JOBS.md) — 6:00 AM Morning Watchdog scheduler, diagnostic probes, and alerts.

---

## 5. REST API Catalogue
- [`docs/api/API_REFERENCE.md`](file:///Users/livesh/arvr/ARVR/docs/api/API_REFERENCE.md) — Comprehensive reference with request/response schemas.
- [`docs/api/ENDPOINT_COVERAGE_MATRIX.md`](file:///Users/livesh/arvr/ARVR/docs/api/ENDPOINT_COVERAGE_MATRIX.md) — Complete 69-endpoint matrix across 52 route handlers.

---

## 6. Database & Persistence
- [`docs/database/DATABASE_ARCHITECTURE.md`](file:///Users/livesh/arvr/ARVR/docs/database/DATABASE_ARCHITECTURE.md) — MongoDB Atlas 3-node replica set and connection pooling.
- [`docs/database/DATA_DICTIONARY.md`](file:///Users/livesh/arvr/ARVR/docs/database/DATA_DICTIONARY.md) — Field-by-field reference for all 12 Prisma models.
- [`docs/database/ENTITY_RELATIONSHIPS.md`](file:///Users/livesh/arvr/ARVR/docs/database/ENTITY_RELATIONSHIPS.md) — Entity-relationship diagram and cascade deletion rules.
- [`docs/database/INDEXES_AND_CONSTRAINTS.md`](file:///Users/livesh/arvr/ARVR/docs/database/INDEXES_AND_CONSTRAINTS.md) — Index specification and compound unique constraints.
- [`docs/database/BACKUP_AND_RECOVERY.md`](file:///Users/livesh/arvr/ARVR/docs/database/BACKUP_AND_RECOVERY.md) — Point-in-time recovery (PITR) and high-availability failover.

---

## 7. Security & Cryptography
- [`docs/security/SECURITY_ARCHITECTURE.md`](file:///Users/livesh/arvr/ARVR/docs/security/SECURITY_ARCHITECTURE.md) — Defense-in-depth layers and controls summary.
- [`docs/security/AUTHENTICATION_AND_SESSIONS.md`](file:///Users/livesh/arvr/ARVR/docs/security/AUTHENTICATION_AND_SESSIONS.md) — iron-session AES-256-GCM, Bcrypt, and 2FA TOTP.
- [`docs/security/AUTHORIZATION_MATRIX.md`](file:///Users/livesh/arvr/ARVR/docs/security/AUTHORIZATION_MATRIX.md) — RBAC permissions table for Anonymous, Student, Trainer, and Admin.
- [`docs/security/THREAT_MODEL.md`](file:///Users/livesh/arvr/ARVR/docs/security/THREAT_MODEL.md) — STRIDE threat model and risk mitigations.
- [`docs/security/FILE_SECURITY.md`](file:///Users/livesh/arvr/ARVR/docs/security/FILE_SECURITY.md) — In-memory zero-trust antivirus scanning and magic byte verification.
- [`docs/security/SECURITY_FINDINGS.md`](file:///Users/livesh/arvr/ARVR/docs/security/SECURITY_FINDINGS.md) — Security audit observations and hardening recommendations.

---

## 8. Integrations & External Services
- [`docs/integrations/GOOGLE_DRIVE.md`](file:///Users/livesh/arvr/ARVR/docs/integrations/GOOGLE_DRIVE.md) — Google Drive OAuth2 and cohort folder hierarchy.
- [`docs/integrations/AWS_S3.md`](file:///Users/livesh/arvr/ARVR/docs/integrations/AWS_S3.md) — AWS S3 client, presigned download URLs, and key structures.
- [`docs/integrations/REDIS.md`](file:///Users/livesh/arvr/ARVR/docs/integrations/REDIS.md) — Sliding-window rate limit store and session revocation list.
- [`docs/integrations/EXTERNAL_SERVICES.md`](file:///Users/livesh/arvr/ARVR/docs/integrations/EXTERNAL_SERVICES.md) — Discord/Slack webhooks and ClamAV daemon.

---

## 9. Operations & Deployment
- [`docs/operations/ENVIRONMENT_VARIABLES.md`](file:///Users/livesh/arvr/ARVR/docs/operations/ENVIRONMENT_VARIABLES.md) — Configuration manifest (zero secrets).
- [`docs/operations/DEPLOYMENT.md`](file:///Users/livesh/arvr/ARVR/docs/operations/DEPLOYMENT.md) — Multi-stage Alpine Dockerfile and entrypoint script.
- [`docs/operations/RELEASE_RUNBOOK.md`](file:///Users/livesh/arvr/ARVR/docs/operations/RELEASE_RUNBOOK.md) — CI/CD topology, health probes, and rollback procedures.

---

## 10. Testing & Verification
- [`docs/testing/TEST_STRATEGY.md`](file:///Users/livesh/arvr/ARVR/docs/testing/TEST_STRATEGY.md) — Testing pyramid and automation scripts catalog.
- [`docs/testing/TEST_COVERAGE_MATRIX.md`](file:///Users/livesh/arvr/ARVR/docs/testing/TEST_COVERAGE_MATRIX.md) — Verification results across all subsystems.

---

## 11. Audit & Traceability Registers
- [`docs/audit/REPOSITORY_INVENTORY.md`](file:///Users/livesh/arvr/ARVR/docs/audit/REPOSITORY_INVENTORY.md) — 172-file complete repository inventory.
- [`docs/audit/EVIDENCE_REGISTER.md`](file:///Users/livesh/arvr/ARVR/docs/audit/EVIDENCE_REGISTER.md) — Evidence items mapped to source files and test runs.
- [`docs/audit/KNOWN_LIMITATIONS_AND_TECHNICAL_DEBT.md`](file:///Users/livesh/arvr/ARVR/docs/audit/KNOWN_LIMITATIONS_AND_TECHNICAL_DEBT.md) — Technical debt and architectural observations.
- [`docs/audit/FINAL_AUDIT_REPORT.md`](file:///Users/livesh/arvr/ARVR/docs/audit/FINAL_AUDIT_REPORT.md) — Final software audit conclusion.
