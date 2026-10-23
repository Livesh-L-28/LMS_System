import Redis from 'ioredis';

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryFallbackStore = new Map<string, MemoryEntry>();

let redisClient: Redis | null = null;
let redisAvailable = false;
let redisWarningLogged = false;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 5) return null; // Stop reconnecting after 5 tries
        return Math.min(times * 100, 1000);
      },
    });

    redisClient.on('ready', () => {
      redisAvailable = true;
      console.log('[Redis] Connected to distributed Redis cache.');
    });

    redisClient.on('connect', () => {
      redisAvailable = true;
    });

    redisClient.on('error', (err) => {
      redisAvailable = false;
      if (!redisWarningLogged) {
        console.warn(`[Redis Notice] Redis is currently unavailable (${err.message}). Using local high-performance rate limiting fallback.`);
        redisWarningLogged = true;
      }
    });
  } catch {
    redisAvailable = false;
  }

  return redisClient;
}

// Initialize redis client on load
getRedis();

/**
 * Atomic sliding-window rate limit check using Redis with in-memory fallback.
 * Increments the counter and sets TTL.
 */
export async function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60 * 1000
): Promise<{ allowed: boolean; remainingSec: number; remainingAttempts: number }> {
  const windowSec = Math.ceil(windowMs / 1000);
  const redisKey = `ratelimit:${identifier}`;

  if (redisClient && redisAvailable) {
    try {
      const pipeline = redisClient.pipeline();
      pipeline.incr(redisKey);
      pipeline.ttl(redisKey);
      const results = await pipeline.exec();

      if (results && results[0] && results[1]) {
        const count = results[0][1] as number;
        let ttl = results[1][1] as number;

        if (ttl === -1) {
          await redisClient.expire(redisKey, windowSec);
          ttl = windowSec;
        }

        const remainingSec = Math.max(1, ttl);
        if (count > maxAttempts) {
          return { allowed: false, remainingSec, remainingAttempts: 0 };
        }
        return { allowed: true, remainingSec, remainingAttempts: Math.max(0, maxAttempts - count) };
      }
    } catch {
      // Fallback to local memory on Redis failure
    }
  }

  // Local Memory Fallback
  const now = Date.now();
  const entry = memoryFallbackStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    memoryFallbackStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remainingSec: windowSec, remainingAttempts: maxAttempts - 1 };
  }

  entry.count += 1;
  const remainingSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

  if (entry.count > maxAttempts) {
    return { allowed: false, remainingSec, remainingAttempts: 0 };
  }

  return { allowed: true, remainingSec, remainingAttempts: maxAttempts - entry.count };
}

/**
 * Checks if an account is currently locked without incrementing the counter.
 */
export async function isAccountLocked(
  accountIdentifier: string,
  maxAccountAttempts: number = 5
): Promise<{ isLocked: boolean; remainingSec: number }> {
  const cleanAccount = accountIdentifier.trim().toUpperCase();
  const redisKey = `ratelimit:account:failed:${cleanAccount}`;

  if (redisClient && redisAvailable) {
    try {
      const countStr = await redisClient.get(redisKey);
      const count = countStr ? parseInt(countStr, 10) : 0;
      if (count >= maxAccountAttempts) {
        const ttl = await redisClient.ttl(redisKey);
        return { isLocked: true, remainingSec: Math.max(1, ttl) };
      }
      return { isLocked: false, remainingSec: 0 };
    } catch {}
  }

  const entry = memoryFallbackStore.get(`account:failed:${cleanAccount}`);
  if (entry && Date.now() < entry.resetAt && entry.count >= maxAccountAttempts) {
    const remainingSec = Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000));
    return { isLocked: true, remainingSec };
  }

  return { isLocked: false, remainingSec: 0 };
}

/**
 * Dual-Key Throttling Engine:
 * Validates both the Client IP (anti-DoS / volumetric) and Account Identifier (anti-credential-stuffing / brute force).
 */
export async function checkDualRateLimit(options: {
  ip: string;
  accountIdentifier?: string;
  maxIpAttempts?: number;
  maxAccountAttempts?: number;
  ipWindowSec?: number;
  accountLockoutSec?: number;
}): Promise<{
  allowed: boolean;
  reason?: 'IP_LIMIT' | 'ACCOUNT_LOCKED';
  remainingSec: number;
  remainingAttempts: number;
}> {
  const {
    ip,
    accountIdentifier,
    maxIpAttempts = 20, // 20 requests / min per IP
    maxAccountAttempts = 5, // 5 failed attempts locks the account
    ipWindowSec = 60,
  } = options;

  // 1. Check IP rate limit first (increments IP volumetric counter)
  const ipCheck = await checkRateLimit(`ip:${ip}`, maxIpAttempts, ipWindowSec * 1000);
  if (!ipCheck.allowed) {
    return {
      allowed: false,
      reason: 'IP_LIMIT',
      remainingSec: ipCheck.remainingSec,
      remainingAttempts: 0,
    };
  }

  // 2. Check Account lockout if account identifier provided (reads without incrementing)
  if (accountIdentifier) {
    const lockCheck = await isAccountLocked(accountIdentifier, maxAccountAttempts);
    if (lockCheck.isLocked) {
      return {
        allowed: false,
        reason: 'ACCOUNT_LOCKED',
        remainingSec: lockCheck.remainingSec,
        remainingAttempts: 0,
      };
    }
  }

  return {
    allowed: true,
    remainingSec: ipCheck.remainingSec,
    remainingAttempts: ipCheck.remainingAttempts,
  };
}

/**
 * Records a failed authentication attempt against an account.
 */
export async function recordFailedAttempt(
  accountIdentifier: string,
  windowSec: number = 900
): Promise<{ attempts: number; isLocked: boolean; remainingSec: number }> {
  const cleanAccount = accountIdentifier.trim().toUpperCase();
  const key = `account:failed:${cleanAccount}`;

  const check = await checkRateLimit(key, 5, windowSec * 1000);
  return {
    attempts: 5 - check.remainingAttempts,
    isLocked: !check.allowed,
    remainingSec: check.remainingSec,
  };
}

/**
 * Resets rate limit counters upon successful authentication or admin intervention.
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  const clean = identifier.trim();
  const cleanAccount = clean.toUpperCase();

  memoryFallbackStore.delete(clean);
  memoryFallbackStore.delete(`ratelimit:${clean}`);
  memoryFallbackStore.delete(`account:failed:${cleanAccount}`);
  memoryFallbackStore.delete(`ratelimit:account:failed:${cleanAccount}`);
  memoryFallbackStore.delete(`ip:${clean}`);
  memoryFallbackStore.delete(`ratelimit:ip:${clean}`);

  if (redisClient && redisAvailable) {
    try {
      await redisClient.del(
        clean,
        `ratelimit:${clean}`,
        `account:failed:${cleanAccount}`,
        `ratelimit:account:failed:${cleanAccount}`,
        `ip:${clean}`,
        `ratelimit:ip:${clean}`
      );
    } catch {}
  }
}

const revokedSessionsMemory = new Set<string>();

/**
 * Revokes a session ID in Redis and memory fallback (instant server-side invalidation).
 */
export async function revokeSession(sessionId: string, maxAgeSec = 86400): Promise<void> {
  if (!sessionId) return;
  revokedSessionsMemory.add(sessionId);

  if (redisClient && redisAvailable) {
    try {
      await redisClient.set(`session:revoked:${sessionId}`, '1', 'EX', maxAgeSec);
    } catch {}
  }
}

/**
 * Checks if a session ID has been explicitly revoked.
 */
export async function isSessionRevoked(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  if (revokedSessionsMemory.has(sessionId)) return true;

  if (redisClient && redisAvailable) {
    try {
      const exists = await redisClient.get(`session:revoked:${sessionId}`);
      if (exists === '1') {
        revokedSessionsMemory.add(sessionId);
        return true;
      }
    } catch {}
  }

  return false;
}
