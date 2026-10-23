# File Security, Upload Pipelines & Malware Prevention

**Document ID:** `SEC-FILE-005`  
**Classification:** File Handling & Zero-Trust Ingestion  
**Verification Category:** Verified in source (`lib/antivirus.ts`, `lib/storage.ts`, `lib/s3.ts`)  

---

## 1. Zero-Trust File Ingestion Pipeline

```mermaid
graph TD
    UploadReq["Client Upload Request (multipart/form-data)"] --> SizeCheck{"Buffer Size <= 5MB?"}
    SizeCheck -->|No| RejectSize["Reject: 400 Payload Too Large (> 5MB)"]
    SizeCheck -->|Yes| ExtCheck{"Extension in Whitelist?\n(.png, .jpg, .jpeg, .webp, .pdf, .mp4, .zip, .docx)"}
    
    ExtCheck -->|No| RejectExt["Reject: 400 Invalid File Type"]
    ExtCheck -->|Yes| AVScan["lib/antivirus.ts (scanFileBuffer)"]
    
    subgraph AntivirusEngine ["Antivirus Scanning Engine"]
        M1["1. Magic Byte Inspection (PNG: 89 50 4E 47, JPG: FF D8 FF)"]
        M2["2. Disguised Windows PE Header Check (MZ: 4D 5A)"]
        M3["3. Disguised Linux ELF Header Check (7F 45 4C 46)"]
        M4["4. Disguised Mach-O Header Check (FE ED FA CE)"]
        M5["5. PDF Embedded Launch / JS Action Search"]
        M6["6. EICAR Standard Antivirus Signature Match"]
        M7["7. SHA-256 Digest Calculation"]
    end
    
    AVScan --> AntivirusEngine
    AntivirusEngine --> CleanCheck{"Is Clean?"}
    CleanCheck -->|No| RejectAV["Reject: 400 Malware Detected (Log Threat & SHA-256)"]
    CleanCheck -->|Yes| PathSanitize["Sanitize Batch & RegNo (/[^a-zA-Z0-9_-]/g)"]
    
    PathSanitize --> S3Store["Persist to AWS S3 Private Bucket / Google Drive\n- s3://arvr-submissions/submissions/Batch/Day/Reg_Time_Random.png"]
    S3Store --> StoreDB["Save S3 Key & SHA-256 in MongoDB TaskSubmission"]
```

---

## 2. Path Traversal & File Name Sanitization

In [`lib/storage.ts`](file:///Users/livesh/arvr/ARVR/lib/storage.ts):
```typescript
const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_');
```
All path components (Batch Name, Register Number, and Day Number) are stripped of non-alphanumeric characters, completely neutralizing dot-dot-slash (`../`) directory traversal and null-byte injection attacks.

---

## 3. Storage Permissions & Presigned Downloads

- **Private by Default:** Files uploaded to S3 are stored with private access control. Public bucket read access is disabled (`BlockPublicAcls = true`).
- **Temporary Presigned URLs:** Downloads are generated on-demand via `generatePresignedDownloadUrl(s3Key)` in [`lib/s3.ts`](file:///Users/livesh/arvr/ARVR/lib/s3.ts) with an expiration time of 15 minutes ($900\text{ seconds}$).
- **Streaming Reverse Proxy:** Evaluator access to student screenshots passes through [`app/api/submissions/[id]/file/route.ts`](file:///Users/livesh/arvr/ARVR/app/api/submissions/%5Bid%5D/file/route.ts), requiring an authenticated `ADMIN` or `TRAINER` session before streaming media.
