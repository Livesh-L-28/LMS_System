# Redis Distributed Cache & Rate Limiting Integration

**Document ID:** `INT-REDIS-003`  
**Classification:** Caching & Rate Limiting Infrastructure  
**Verification Category:** Verified in source (`lib/rateLimit.ts`)  

---

## 1. Connection & Failover Architecture

The platform uses `ioredis` for distributed rate limiting and token revocation:

- **Connection URL:** `REDIS_URL` (defaults to `redis://127.0.0.1:6379`).
- **Resilience Strategy:**
  - `connectTimeout: 2000ms`.
  - `maxRetriesPerRequest: 2`.
  - Exponential retry strategy stops after 5 failed reconnect attempts (`Math.min(times * 100, 1000)`).
- **Graceful In-Memory Fallback:** If Redis is down, unconfigured, or unreachable, `lib/rateLimit.ts` logs a warning once and falls back to a high-performance in-memory `Map` cache. Service remains online with zero client disruption.

---

## 2. Key Namespaces & Data Structures

| Key Pattern | Data Structure | TTL | Purpose |
| :--- | :--- | :---: | :--- |
| `ratelimit:{ip}` | String (Counter via `INCR`) | 60 seconds | Enforces 5 attempts per minute per IP |
| `ratelimit:{identifier}`| String (Counter via `INCR`) | 60 seconds | Enforces 5 attempts per account |
| `lockout:{identifier}` | String (`LOCKED`) | 900 seconds (15m) | Locks account after 5 consecutive failed logins |
| `revoked:{sessionId}` | String (`1`) | 86,400 seconds (24h)| Prevents replay of logged-out session cookies |
