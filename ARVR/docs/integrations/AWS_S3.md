# AWS S3 & S3-Compatible Object Store Integration

**Document ID:** `INT-S3-002`  
**Classification:** Object Storage Specification  
**Verification Category:** Verified in source (`lib/s3.ts`, `lib/storage.ts`)  

---

## 1. Storage Configuration & SDK Clients

The S3 subsystem utilizes AWS SDK v3 (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`):

- **Target Bucket:** `AWS_S3_BUCKET_NAME` (e.g., `arvr-submissions-private`).
- **Target Region:** `AWS_REGION` (e.g., `ap-south-1` or `us-east-1`).
- **Endpoint Flexibility:** `AWS_S3_ENDPOINT` supports local development mocks (LocalStack, MinIO, or in-process S3 mock).
- **Public Access Prevention:** Enforces `BlockPublicAcls = true` and `BlockPublicPolicy = true`.

---

## 2. Key Generation & Presigned Operations

### 2.1 Object Key Structure
$$\text{submissions}/[\text{CleanBatchName}]/\text{Day}-[\text{DayNumber}]/[\text{RegNo}]\_[\text{Timestamp}]\_[\text{RandomHex}].[\text{ext}]$$
- **Example:** `submissions/ARVR-L1-001/Day-1/21CS001_1729681200000_a3f8c1.png`

### 2.2 Presigned Download URLs
Generated with 15-minute validity:
```typescript
const command = new GetObjectCommand({
  Bucket: getBucketName(),
  Key: s3Key,
});
return await getSignedUrl(s3Client, command, { expiresIn: 900 });
```
Evaluators receive direct, time-limited, signed HTTPS links preventing direct public exposure of the underlying S3 bucket.
