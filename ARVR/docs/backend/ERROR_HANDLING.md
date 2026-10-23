# Error Handling, Resilience & Fault Tolerance

**Document ID:** `BACK-ERR-003`  
**Classification:** Operational Resilience & Error Specifications  
**Verification Category:** Verified in source (`lib/security.ts`, `lib/prisma.ts`, `lib/rateLimit.ts`)  

---

## 1. Structured Error Hierarchy

All API error responses adhere to standard HTTP status codes and unified JSON shapes:

```json
{
  "error": "Human-readable description of the error",
  "code": "MACHINE_READABLE_ENUM_OPTIONAL",
  "requestId": "uuid-v4-correlation-id"
}
```

### 1.1 HTTP Status Code Mapping

| Status Code | Scenario | Triggering Condition |
| :---: | :--- | :--- |
| **`400 Bad Request`** | Input validation failure | Zod schema mismatch, invalid ObjectID, or malware detected by scanner |
| **`401 Unauthorized`** | Missing or invalid session | User has not logged in, cookie missing, or session has expired |
| **`403 Forbidden`** | Role or geofence violation | Student accessing admin route, or GPS location outside 100m radius |
| **`404 Not Found`** | Resource missing | Student, batch, task submission, or certificate record not found |
| **`429 Too Many Requests`**| Throttling trigger | Exceeded 5 login attempts within 60s, or account locked for 15 minutes |
| **`500 Internal Error`** | Unhandled system exception | MongoDB timeout after retries, or S3 upload failure |

---

## 2. Database Transient Error Retry (`withPrismaRetry`)

To prevent database failover spikes from impacting live students, `lib/prisma.ts` wraps critical read and write queries inside an exponential backoff loop:

```mermaid
graph TD
    StartOp["Execute Database Operation"] --> TryOp["Execute prisma operation"]
    TryOp -->|Success| ReturnRes["Return Result to Controller"]
    TryOp -->|Error Thrown| CheckErr{"Is Transient Error?\n(P2024, P2010, MongoNetworkTimeout, ServerSelectionTimeout)"}
    CheckErr -->|No (Permanent Error)| ThrowErr["Throw Formatted Safe Error (formatSafeError)"]
    CheckErr -->|Yes| CheckRetry{"Attempts < 3?"}
    CheckRetry -->|No| ThrowErr
    CheckRetry -->|Yes| Backoff["Exponential Backoff Sleep:\ndelay = 200 * 2^attempt + jitter"]
    Backoff --> TryOp
```

---

## 3. Information Disclosure & PII Protection (`formatSafeError`)

Located in [`lib/security.ts`](file:///Users/livesh/arvr/ARVR/lib/security.ts), `formatSafeError` ensures internal database traces, connection URIs, file system paths, and credentials are never leaked to client browsers:
- If `process.env.NODE_ENV === 'production'`, database error codes and raw MongoDB stack traces are logged internally to stdout/stderr and replaced with:
  `"An unexpected system error occurred. Please contact the administrator with Request ID: [ID]"`
- PII and session secrets are automatically masked before logging via `lib/telemetry.ts` (`sanitizeLogData`).
