# External Services & Notification Integrations

**Document ID:** `INT-EXT-004`  
**Classification:** Third-Party Webhooks & External Services  
**Verification Category:** Verified in source (`lib/morningWatchdog.ts`, `lib/antivirus.ts`)  

---

## 1. Alert Webhook Service (Discord / Slack)

- **Configuration:** `ADMIN_ALERT_WEBHOOK_URL` in `.env`.
- **Trigger:** Automated 6:00 AM Morning Watchdog or manual admin check when `criticalCount > 0`.
- **Payload:** Standard Discord/Slack webhook JSON with rich embeds detailing affected subsystems (Google Drive, MongoDB, S3 Storage, Geofence, Curriculum consistency).

---

## 2. Antivirus Daemon Integration (ClamAV)

- **Configuration:** `CLAMAV_HOST` (default `127.0.0.1`), `CLAMAV_PORT` (default `3310`).
- **Protocol:** ClamAV TCP daemon protocol (`nINSTREAM`).
- **Resilience:** If the ClamAV daemon is not running or unreachable, `lib/antivirus.ts` automatically falls back to the in-memory signature and magic byte heuristic scanner, ensuring upload workflows continue safely without crashing.
