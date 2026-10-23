# API Endpoint Coverage Matrix

**Audit Date:** 2026-10-23T17:28:00+05:30  
**Total Route Handlers:** 52  
**Total Method Endpoints:** 69 distinct (Method, Path) combinations  
**Verification Category:** Verified in source (`app/api/**/route.ts`)  

---

## 1. Complete Endpoint Matrix

| # | Method | Endpoint Path | Source File | Auth Role | Rate Limited | Database Models Accessed | Test / Audit Status |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- | :---: |
| 1 | `GET` | `/api/admin/2fa` | [`app/api/admin/2fa/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/2fa/route.ts) | **ADMIN** | No | admin | Verified in source |
| 2 | `POST` | `/api/admin/2fa` | [`app/api/admin/2fa/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/2fa/route.ts) | **ADMIN** | No | admin | Verified in source |
| 3 | `GET` | `/api/admin/activity` | [`app/api/admin/activity/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/activity/route.ts) | **ADMIN** | No | attendance, batch, evaluation, googleDriveConnection, student, taskSubmission | Verified in source |
| 4 | `GET` | `/api/admin/attendance` | [`app/api/admin/attendance/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/attendance/route.ts) | **ADMIN** | No | attendance | Verified in source |
| 5 | `GET` | `/api/admin/audit-logs` | [`app/api/admin/audit-logs/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/audit-logs/route.ts) | **ADMIN** | No | None | Verified in source |
| 6 | `GET` | `/api/admin/batches` | [`app/api/admin/batches/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/batches/route.ts) | **ADMIN** | No | batch, systemSetting | Verified in source |
| 7 | `POST` | `/api/admin/batches` | [`app/api/admin/batches/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/batches/route.ts) | **ADMIN** | No | batch, systemSetting | Verified in source |
| 8 | `GET` | `/api/admin/batches/[batchId]` | [`app/api/admin/batches/[batchId]/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/batches/[batchId]/route.ts) | **ADMIN** | No | batch | Verified in source |
| 9 | `PUT` | `/api/admin/batches/[batchId]` | [`app/api/admin/batches/[batchId]/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/batches/[batchId]/route.ts) | **ADMIN** | No | batch | Verified in source |
| 10 | `GET` | `/api/admin/batches/[batchId]/calendar` | [`app/api/admin/batches/[batchId]/calendar/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/batches/[batchId]/calendar/route.ts) | **ADMIN** | No | batch, trainingDay | Verified in source |
| 11 | `POST` | `/api/admin/batches/[batchId]/calendar` | [`app/api/admin/batches/[batchId]/calendar/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/batches/[batchId]/calendar/route.ts) | **ADMIN** | No | batch, trainingDay | Verified in source |
| 12 | `GET` | `/api/admin/batches/[batchId]/certificate-export` | [`app/api/admin/batches/[batchId]/certificate-export/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/batches/[batchId]/certificate-export/route.ts) | **ADMIN** | No | batch, certificateRecord | Verified in source |
| 13 | `POST` | `/api/admin/batches/[batchId]/check-completion` | [`app/api/admin/batches/[batchId]/check-completion/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/batches/[batchId]/check-completion/route.ts) | **ADMIN** | No | batch, systemSetting | Verified in source |
| 14 | `GET` | `/api/admin/batches/[batchId]/schedule` | [`app/api/admin/batches/[batchId]/schedule/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/batches/[batchId]/schedule/route.ts) | **ADMIN** | No | batch, trainingDay | Verified in source |
| 15 | `PUT` | `/api/admin/batches/[batchId]/schedule` | [`app/api/admin/batches/[batchId]/schedule/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/batches/[batchId]/schedule/route.ts) | **ADMIN** | No | batch, trainingDay | Verified in source |
| 16 | `DELETE` | `/api/admin/certificates` | [`app/api/admin/certificates/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/certificates/route.ts) | **ADMIN** | No | certificateRecord, student | Verified in source |
| 17 | `GET` | `/api/admin/certificates` | [`app/api/admin/certificates/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/certificates/route.ts) | **ADMIN** | No | certificateRecord, student | Verified in source |
| 18 | `POST` | `/api/admin/certificates` | [`app/api/admin/certificates/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/certificates/route.ts) | **ADMIN** | No | certificateRecord, student | Verified in source |
| 19 | `POST` | `/api/admin/login` | [`app/api/admin/login/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/login/route.ts) | **Public / None** | Yes | admin | Verified in source |
| 20 | `POST` | `/api/admin/resources/upload` | [`app/api/admin/resources/upload/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/resources/upload/route.ts) | **Public / None** | No | None | Verified in source |
| 21 | `GET` | `/api/admin/settings/access-control` | [`app/api/admin/settings/access-control/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/settings/access-control/route.ts) | **ADMIN** | No | systemSetting | Verified in source |
| 22 | `POST` | `/api/admin/settings/access-control` | [`app/api/admin/settings/access-control/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/settings/access-control/route.ts) | **ADMIN** | No | systemSetting | Verified in source |
| 23 | `GET` | `/api/admin/settings/attendance` | [`app/api/admin/settings/attendance/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/settings/attendance/route.ts) | **ADMIN** | No | systemSetting | Verified in source |
| 24 | `POST` | `/api/admin/settings/attendance` | [`app/api/admin/settings/attendance/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/settings/attendance/route.ts) | **ADMIN** | No | systemSetting | Verified in source |
| 25 | `GET` | `/api/admin/settings/drive` | [`app/api/admin/settings/drive/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/settings/drive/route.ts) | **ADMIN** | No | googleDriveConnection, systemSetting | Verified in source |
| 26 | `POST` | `/api/admin/settings/drive` | [`app/api/admin/settings/drive/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/settings/drive/route.ts) | **ADMIN** | No | googleDriveConnection, systemSetting | Verified in source |
| 27 | `POST` | `/api/admin/settings/drive/disconnect` | [`app/api/admin/settings/drive/disconnect/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/settings/drive/disconnect/route.ts) | **ADMIN** | No | googleDriveConnection | Verified in source |
| 28 | `POST` | `/api/admin/settings/drive/test` | [`app/api/admin/settings/drive/test/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/settings/drive/test/route.ts) | **ADMIN** | No | None | Verified in source |
| 29 | `GET` | `/api/admin/settings/page-details` | [`app/api/admin/settings/page-details/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/settings/page-details/route.ts) | **ADMIN** | No | systemSetting | Verified in source |
| 30 | `POST` | `/api/admin/settings/page-details` | [`app/api/admin/settings/page-details/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/settings/page-details/route.ts) | **ADMIN** | No | systemSetting | Verified in source |
| 31 | `DELETE` | `/api/admin/settings/tasks` | [`app/api/admin/settings/tasks/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/settings/tasks/route.ts) | **ADMIN** | No | systemSetting | Verified in source |
| 32 | `GET` | `/api/admin/settings/tasks` | [`app/api/admin/settings/tasks/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/settings/tasks/route.ts) | **ADMIN** | No | systemSetting | Verified in source |
| 33 | `POST` | `/api/admin/settings/tasks` | [`app/api/admin/settings/tasks/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/settings/tasks/route.ts) | **ADMIN** | No | systemSetting | Verified in source |
| 34 | `GET` | `/api/admin/stats` | [`app/api/admin/stats/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/stats/route.ts) | **ADMIN** | No | attendance, batch, certificateRecord, student, taskSubmission | Verified in source |
| 35 | `GET` | `/api/admin/students` | [`app/api/admin/students/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/students/route.ts) | **ADMIN** | No | student | Verified in source |
| 36 | `POST` | `/api/admin/students` | [`app/api/admin/students/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/students/route.ts) | **ADMIN** | No | student | Verified in source |
| 37 | `PUT` | `/api/admin/students` | [`app/api/admin/students/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/students/route.ts) | **ADMIN** | No | student | Verified in source |
| 38 | `POST` | `/api/admin/students/[studentId]/override-data` | [`app/api/admin/students/[studentId]/override-data/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/students/[studentId]/override-data/route.ts) | **ADMIN** | No | attendance, certificateRecord, evaluation, student, taskSubmission | Verified in source |
| 39 | `POST` | `/api/admin/students/import` | [`app/api/admin/students/import/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/students/import/route.ts) | **ADMIN** | No | batch, student | Verified in source |
| 40 | `GET` | `/api/admin/tasks` | [`app/api/admin/tasks/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/tasks/route.ts) | **ADMIN** | No | taskSubmission | Verified in source |
| 41 | `GET` | `/api/admin/trainers` | [`app/api/admin/trainers/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/trainers/route.ts) | **ADMIN** | No | None | Verified in source |
| 42 | `POST` | `/api/admin/trainers` | [`app/api/admin/trainers/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/admin/trainers/route.ts) | **ADMIN** | No | None | Verified in source |
| 43 | `GET` | `/api/auth/access-status` | [`app/api/auth/access-status/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/auth/access-status/route.ts) | **Public / None** | No | None | Verified in source |
| 44 | `POST` | `/api/auth/logout` | [`app/api/auth/logout/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/auth/logout/route.ts) | **Public / None** | No | None | Verified in source |
| 45 | `GET` | `/api/auth/me` | [`app/api/auth/me/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/auth/me/route.ts) | **Public / None** | No | None | Verified in source |
| 46 | `GET` | `/api/batches/active` | [`app/api/batches/active/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/batches/active/route.ts) | **Public / None** | No | batch | Verified in source |
| 47 | `GET` | `/api/cron/morning-watchdog` | [`app/api/cron/morning-watchdog/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/cron/morning-watchdog/route.ts) | **Bearer CRON_SECRET / Admin** | No | None | Verified in source |
| 48 | `POST` | `/api/cron/morning-watchdog` | [`app/api/cron/morning-watchdog/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/cron/morning-watchdog/route.ts) | **Bearer CRON_SECRET / Admin** | No | None | Verified in source |
| 49 | `GET` | `/api/google-drive/oauth/callback` | [`app/api/google-drive/oauth/callback/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/google-drive/oauth/callback/route.ts) | **Public / None** | No | googleDriveConnection | Verified in source |
| 50 | `GET` | `/api/google-drive/oauth/connect` | [`app/api/google-drive/oauth/connect/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/google-drive/oauth/connect/route.ts) | **ADMIN** | No | None | Verified in source |
| 51 | `GET` | `/api/health` | [`app/api/health/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/health/route.ts) | **Public / None** | No | systemSetting | Verified in source |
| 52 | `GET` | `/api/health/liveness` | [`app/api/health/liveness/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/health/liveness/route.ts) | **Public / None** | No | None | Verified in source |
| 53 | `GET` | `/api/health/readiness` | [`app/api/health/readiness/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/health/readiness/route.ts) | **Public / None** | No | systemSetting | Verified in source |
| 54 | `GET` | `/api/resources/[...key]` | [`app/api/resources/[...key]/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/resources/[...key]/route.ts) | **ADMIN** | No | None | Verified in source |
| 55 | `POST` | `/api/resources/upload` | [`app/api/resources/upload/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/resources/upload/route.ts) | **ADMIN** | No | None | Verified in source |
| 56 | `POST` | `/api/student/attendance/[session]` | [`app/api/student/attendance/[session]/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/student/attendance/[session]/route.ts) | **STUDENT** | No | attendance, student | Verified in source |
| 57 | `GET` | `/api/student/curriculum` | [`app/api/student/curriculum/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/student/curriculum/route.ts) | **STUDENT** | No | student | Verified in source |
| 58 | `POST` | `/api/student/feedback` | [`app/api/student/feedback/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/student/feedback/route.ts) | **STUDENT** | No | feedback | Verified in source |
| 59 | `POST` | `/api/student/login` | [`app/api/student/login/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/student/login/route.ts) | **Public / None** | Yes | student | Verified in source |
| 60 | `GET` | `/api/student/progress` | [`app/api/student/progress/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/student/progress/route.ts) | **STUDENT** | No | student | Verified in source |
| 61 | `POST` | `/api/student/register` | [`app/api/student/register/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/student/register/route.ts) | **Public / None** | No | batch, student | Verified in source |
| 62 | `POST` | `/api/student/task/presigned-url` | [`app/api/student/task/presigned-url/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/student/task/presigned-url/route.ts) | **STUDENT** | No | attendance, student, taskSubmission, trainingDay | Verified in source |
| 63 | `POST` | `/api/student/task/submit` | [`app/api/student/task/submit/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/student/task/submit/route.ts) | **STUDENT** | No | attendance, student, systemSetting, taskSubmission, trainingDay | Verified in source |
| 64 | `GET` | `/api/student/task/today` | [`app/api/student/task/today/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/student/task/today/route.ts) | **STUDENT** | No | attendance, student, taskSubmission, trainingDay | Verified in source |
| 65 | `GET` | `/api/submissions/[id]/file` | [`app/api/submissions/[id]/file/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/submissions/[id]/file/route.ts) | **ADMIN** | No | taskSubmission | Verified in source |
| 66 | `GET` | `/api/trainer/batches` | [`app/api/trainer/batches/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/trainer/batches/route.ts) | **ADMIN** | No | batch | Verified in source |
| 67 | `GET` | `/api/trainer/batches/[batchId]/tasks` | [`app/api/trainer/batches/[batchId]/tasks/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/trainer/batches/[batchId]/tasks/route.ts) | **ADMIN** | No | batch, student | Verified in source |
| 68 | `POST` | `/api/trainer/evaluations` | [`app/api/trainer/evaluations/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/trainer/evaluations/route.ts) | **ADMIN** | No | taskSubmission | Verified in source |
| 69 | `POST` | `/api/trainer/login` | [`app/api/trainer/login/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/trainer/login/route.ts) | **Public / None** | Yes | None | Verified in source |