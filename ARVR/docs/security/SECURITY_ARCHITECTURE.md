# Security Architecture & Defense-in-Depth Specification

**Document ID:** `SEC-ARCH-001`  
**Classification:** Information Security Architecture  
**Verification Category:** Verified in source (`middleware.ts`, `lib/auth.ts`, `lib/security.ts`, `lib/antivirus.ts`, `next.config.ts`)  

---

## 1. Multi-Layer Defense Architecture

```mermaid
graph TD
    Client["Client Browser / Mobile Agent"] --> Layer1["Layer 1: Edge & Ingress Security\n- HSTS (63072000s) & TLS 1.3\n- CSP & Anti-Clickjacking (X-Frame-Options: DENY)\n- Request ID Correlation"]
    
    Layer1 --> Layer2["Layer 2: Network & Geofence Perimeter\n- Haversine GPS Distance Check (<= 100m)\n- Campus Wi-Fi CIDR Subnet Match\n- Dual-layer Rate Limiter (IP & Account)"]
    
    Layer2 --> Layer3["Layer 3: Authentication & Sessions\n- iron-session AES-256-GCM Encrypted Cookies\n- Idle Timeout (2h) & Absolute Timeout (12h/24h)\n- Session Revocation List\n- Bcrypt Password & PIN Hashing (10 rounds)"]
    
    Layer3 --> Layer4["Layer 4: Access Control & Authorization\n- Role-Based Access Control (requireAuth)\n- Zod Strict Runtime Validation\n- ObjectID Integrity Guards"]
    
    Layer4 --> Layer5["Layer 5: Zero-Trust File Security\n- In-Memory Magic Byte Validation\n- Heuristic Antivirus & Disguised MZ/ELF Header Scan\n- EICAR Signature Trap\n- Path Traversal Sanitization"]
    
    Layer5 --> Layer6["Layer 6: Persistence & Data Privacy\n- MongoDB TLS with SCRAM-SHA-256\n- AES-256-GCM Encrypted OAuth Tokens\n- Masked PII Telemetry & Audit Trails"]
```

---

## 2. Core Security Controls Summary

| Layer | Primary Defense Mechanism | Source File | Attack Vector Mitigated |
| :--- | :--- | :--- | :--- |
| **Ingress** | Enterprise CSP & Security Headers | [`next.config.ts`](file:///Users/livesh/arvr/ARVR/next.config.ts) | Clickjacking, XSS, MIME confusion, Protocol downgrade |
| **Edge** | HTTPS 301 Enforcement & Correlation | [`middleware.ts`](file:///Users/livesh/arvr/ARVR/middleware.ts) | Plaintext eavesdropping, Man-in-the-Middle |
| **Perimeter**| Geofence GPS & Wi-Fi Verification | [`lib/geofence.ts`](file:///Users/livesh/arvr/ARVR/lib/geofence.ts) | Remote attendance fraud, GPS spoofing |
| **Identity** | Sliding-Window IP/Account Limiter | [`lib/rateLimit.ts`](file:///Users/livesh/arvr/ARVR/lib/rateLimit.ts) | Credential stuffing, brute-force attacks |
| **Session** | Encrypted Cookies & Timeout Enforcer | [`lib/auth.ts`](file:///Users/livesh/arvr/ARVR/lib/auth.ts) | Session hijacking, cookie tampering, zombie sessions |
| **Upload** | Zero-Trust Malware Scanner | [`lib/antivirus.ts`](file:///Users/livesh/arvr/ARVR/lib/antivirus.ts) | Malicious uploads, disguised executables, EICAR tests |
| **Audit** | Immutable Administrative Logging | [`lib/auditLog.ts`](file:///Users/livesh/arvr/ARVR/lib/auditLog.ts) | Unauthorized configuration modifications, repudiation |
