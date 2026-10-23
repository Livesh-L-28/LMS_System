# External Configuration & Environment Variables Reference

**Document ID:** `OPS-ENV-001`  
**Classification:** Configuration & Secrets Manifest  
**Security Constraint:** Variable names, purpose, and types only. Secret values are strictly excluded.  
**Verification Category:** Verified in source (`lib/*`, `next.config.ts`, `docker-entrypoint.sh`, `.env.example`)  

---

## 1. Environment Variable Reference Matrix

| Variable Name | Required | Type / Expected Format | Default Value | Consumer Module | Sensitive? | Purpose & Failure Behavior |
| :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| `DATABASE_URL` | **YES** | `mongodb+srv://...` URI | None | `prisma/schema.prisma`, `lib/prisma.ts` | **YES** | MongoDB Atlas connection string. Application fails to start if missing. |
| `SESSION_SECRET` | **YES** | String (>= 32 characters) | Insecure dev fallback | `lib/auth.ts` (iron-session) | **YES** | AES-256 session cookie signing key. Security validation warns if $< 32$ chars. |
| `CRON_SECRET` | OPTIONAL | Random alphanumeric string | None | `app/api/cron/morning-watchdog/route.ts` | **YES** | Bearer authentication secret for external cron triggers. |
| `ADMIN_ALERT_WEBHOOK_URL`| OPTIONAL | Valid HTTPS Webhook URL | None | `lib/morningWatchdog.ts` | **YES** | Target Discord/Slack channel for automated health alerts. Silent skip if omitted. |
| `GOOGLE_CLIENT_ID` | OPTIONAL | Google OAuth2 Client ID | None | `lib/googleDrive.ts` | No | Client ID for Google Workspace Drive integration. |
| `GOOGLE_CLIENT_SECRET` | OPTIONAL | Google OAuth2 Secret | None | `lib/googleDrive.ts` | **YES** | Secret key for Google Workspace Drive integration. |
| `GOOGLE_REDIRECT_URI` | OPTIONAL | Valid HTTPS Redirect URI | None | `lib/googleDrive.ts` | No | Callback URL (`/api/google-drive/oauth/callback`). |
| `AWS_ACCESS_KEY_ID` | OPTIONAL | AWS IAM Access Key | None | `lib/s3.ts` | **YES** | Credentials for AWS S3 object bucket. |
| `AWS_SECRET_ACCESS_KEY`| OPTIONAL | AWS IAM Secret Key | None | `lib/s3.ts` | **YES** | Secret key for AWS S3 object bucket. |
| `AWS_REGION` | OPTIONAL | AWS Region code (e.g. `ap-south-1`) | `ap-south-1` | `lib/s3.ts` | No | Target AWS region. |
| `AWS_S3_BUCKET_NAME` | OPTIONAL | S3 Bucket name string | `arvr-submissions-private` | `lib/s3.ts` | No | Target S3 bucket for task submissions. |
| `AWS_S3_ENDPOINT` | OPTIONAL | Valid HTTP/HTTPS Endpoint | None | `lib/s3.ts` | No | Custom S3 endpoint for LocalStack / MinIO. |
| `REDIS_URL` | OPTIONAL | `redis://...` URI | `redis://127.0.0.1:6379` | `lib/rateLimit.ts` | **YES** | Distributed rate limiting and session revocation store. Falls back to memory. |
| `PORT` | OPTIONAL | Integer (e.g. `3000`, `3003`) | `3000` | Next.js server runtime | No | Port on which the Next.js standalone server binds. |
| `NODE_ENV` | **YES** | `production` / `development` | `development` | Framework core | No | Enforces production security headers, HSTS, and error masking. |
| `CLAMAV_HOST` | OPTIONAL | Hostname / IP address | `127.0.0.1` | `lib/antivirus.ts` | No | Host address for ClamAV TCP daemon. |
| `CLAMAV_PORT` | OPTIONAL | Port number | `3310` | `lib/antivirus.ts` | No | Port for ClamAV TCP daemon. |

---

## 2. Secret Rotation Procedures

1. **`SESSION_SECRET`:** Rotate every 180 days. Changing this key invalidates all active student and admin sessions, requiring re-login.
2. **`DATABASE_URL`:** Rotate credentials in MongoDB Atlas Database Access tab. Update Render environment variables with zero downtime.
3. **Google OAuth Tokens:** If revoked or expired, navigate to Staff Portal -> Settings -> Google Drive and click **"Reconnect Google Drive"**.
