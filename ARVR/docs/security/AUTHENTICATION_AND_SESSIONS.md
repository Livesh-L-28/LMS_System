# Authentication, Session Lifecycle & Cryptographic Controls

**Document ID:** `SEC-AUTH-002`  
**Classification:** Cryptography & Identity Verification  
**Verification Category:** Verified in source (`lib/auth.ts`, `lib/rateLimit.ts`, `lib/totp.ts`)  

---

## 1. Authentication Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Student / Admin / Trainer)
    participant Rate as lib/rateLimit.ts
    participant LoginAPI as /api/[role]/login
    participant DB as MongoDB Atlas
    participant Auth as lib/auth.ts (iron-session)

    User->>LoginAPI: POST Credentials (RegisterNo + PIN or Email + Password)
    LoginAPI->>Rate: checkDualRateLimit(clientIp, identifier)
    alt Rate Limit Exceeded (>= 5 attempts)
        Rate-->>LoginAPI: { allowed: false, remainingSec: 840 }
        LoginAPI-->>User: HTTP 429 Too Many Requests (Account Locked)
    else Attempt Allowed
        Rate-->>LoginAPI: { allowed: true }
        LoginAPI->>DB: Query User Record by RegisterNo or Email
        alt User Not Found
            LoginAPI->>LoginAPI: dummyBcryptCompare() (Anti-timing attack)
            LoginAPI->>Rate: recordFailedAttempt(identifier)
            LoginAPI-->>User: HTTP 401 Unauthorized ("Invalid credentials")
        else User Found
            LoginAPI->>LoginAPI: bcrypt.compare(plainText, passwordHash)
            alt Password Mismatch
                LoginAPI->>Rate: recordFailedAttempt(identifier)
                LoginAPI-->>User: HTTP 401 Unauthorized ("Invalid credentials")
            else Password Verified
                LoginAPI->>Rate: resetRateLimit(identifier)
                alt Admin with 2FA Enabled
                    LoginAPI-->>User: HTTP 200 { twoFactorRequired: true }
                else Direct Session Issue
                    LoginAPI->>Auth: createSession(user)
                    Note over Auth: 1. Generate UUID sessionId<br/>2. Set createdAt & lastActiveAt<br/>3. Encrypt cookie (AES-256-GCM)<br/>4. Set-Cookie: arvr_session
                    Auth-->>User: HTTP 200 OK + Encrypted Session Cookie
                end
            end
        end
    end
```

---

## 2. Session Security Rules & Expirations

1. **Cryptographic Storage:** Uses `iron-session` signed with `SESSION_SECRET` (minimum 32-character requirement). Cookies are sealed via AES-256-GCM authenticated encryption.
2. **Idle Expiration:** Inactivity $> 2\text{ hours}$ (`IDLE_TIMEOUT_MS = 7,200,000ms`) automatically destroys the session upon the next request.
3. **Absolute Expiration:**
   - **Student Accounts:** Hard limit of 24 hours (`STUDENT_ABSOLUTE_TIMEOUT_MS = 86,400,000ms`).
   - **Admin Accounts:** Hard limit of 12 hours (`ADMIN_ABSOLUTE_TIMEOUT_MS = 43,200,000ms`).
4. **Session Revocation List:** When `/api/auth/logout` is called, `revokeSession(sessionId)` registers the unique UUID in an in-memory or Redis eviction set for 24 hours. Any replayed copy of the cookie is immediately recognized as revoked and rejected.
5. **Anti-Enumeration & Constant Time Comparison:** When a non-existent student or admin attempts authentication, `lib/security.ts` executes `dummyBcryptCompare()` using a precomputed hash. This ensures response times are identical whether an email exists or not, defeating account enumeration attacks.
