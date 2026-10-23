# Google Drive Cloud Storage Integration

**Document ID:** `INT-GDRIVE-001`  
**Classification:** Cloud Storage Integration Specification  
**Verification Category:** Verified in source (`lib/googleDrive.ts`, `app/api/google-drive/**`, `app/api/admin/settings/drive/**`)  

---

## 1. Architectural Role & Flow

Google Drive functions as the primary collaborative storage engine for student task submissions and cohort archives. It maintains an automated folder hierarchy inside the academy administrator's Google Workspace account:

```text
[AR/VR Academy LMS Root]
└── [ARVR-L1-001-18AUG26]  <-- Batch Folder
    ├── [Day-1]            <-- Training Day Folder
    │   ├── 21CS001_Day1_1729681200.png
    │   └── 21CS002_Day1_1729681205.png
    └── [Day-2]
        └── ...
```

---

## 2. OAuth2 Connection & Token Encryption

1. **OAuth2 Handshake:** Administrator initiates linking via `GET /api/google-drive/oauth/connect`, specifying scopes:
   - `https://www.googleapis.com/auth/drive.file` (Scope restricted to files created or opened by this application).
2. **Encrypted Token Persistence:**
   In [`lib/googleDrive.ts`](file:///Users/livesh/arvr/ARVR/lib/googleDrive.ts), refresh tokens are encrypted using AES-256-CBC with an initialization vector before being stored in the `GoogleDriveConnection` table:
   ```typescript
   export function encryptToken(token: string): string {
     const iv = crypto.randomBytes(16);
     const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
     let encrypted = cipher.update(token, 'utf8', 'hex');
     encrypted += cipher.final('hex');
     return `${iv.toString('hex')}:${encrypted}`;
   }
   ```
3. **Auto-Refresh Mechanism:** `getOAuth2ClientAsync()` automatically refreshes access tokens when expired and intercepts `invalid_grant` errors to flag the connection state as `DISCONNECTED` in MongoDB.
