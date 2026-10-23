import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';

let redisClient: Redis | null = null;
const CACHE_KEY = 'system:settings:all';
const CACHE_TTL_SEC = 60; // 60-second read cache for high concurrency windows

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  try {
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      lazyConnect: false,
    });
    redisClient.on('error', () => {
      // Graceful fallback to database
    });
  } catch {
    redisClient = null;
  }
  return redisClient;
}

/**
 * Retrieves system settings from Redis cache or PostgreSQL database.
 * Prevents connection pool starvation during morning attendance and task rush windows.
 */
let memoryCache: { data: Map<string, string>; expiresAt: number } | null = null;
const MEMORY_CACHE_TTL_MS = 15000; // 15 seconds

/**
 * Retrieves system settings from Redis cache, in-memory cache, or PostgreSQL database.
 * Prevents connection pool starvation during morning attendance and task rush windows.
 */
export async function getCachedSystemSettings(): Promise<Map<string, string>> {
  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.data;
  }

  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const map = new Map<string, string>(Object.entries(parsed));
        memoryCache = { data: map, expiresAt: now + MEMORY_CACHE_TTL_MS };
        return map;
      }
    } catch {
      // Fallback directly to Prisma
    }
  }

  const settings = await prisma.systemSetting.findMany();
  const obj: Record<string, string> = {};
  for (const s of settings) {
    obj[s.key] = s.value;
  }

  const map = new Map<string, string>(Object.entries(obj));
  memoryCache = { data: map, expiresAt: now + MEMORY_CACHE_TTL_MS };

  if (redis) {
    try {
      await redis.set(CACHE_KEY, JSON.stringify(obj), 'EX', CACHE_TTL_SEC);
    } catch {
      // Non-critical cache write failure
    }
  }

  return map;
}

/**
 * Invalidates the cached system settings upon admin update.
 */
export async function invalidateSettingsCache(): Promise<void> {
  memoryCache = null;
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(CACHE_KEY);
    } catch {}
  }
}
