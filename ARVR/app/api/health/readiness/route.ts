import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';

/**
 * Readiness Probe: GET /api/health/readiness
 * Verifies core dependencies (PostgreSQL & Redis).
 * If primary DB is down, returns HTTP 503 so load balancers stop routing traffic.
 */
export async function GET() {
  const checks: Record<string, any> = {};
  let isReady = true;

  // 1. Database Connectivity Check (MongoDB Atlas)
  const dbStart = Date.now();
  try {
    if (typeof (prisma as any).$runCommandRaw === 'function') {
      await (prisma as any).$runCommandRaw({ ping: 1 });
    } else {
      await prisma.systemSetting.findFirst({ select: { id: true } });
    }
    checks.database = {
      status: 'ready',
      latencyMs: Date.now() - dbStart,
    };
  } catch (err: any) {
    isReady = false;
    checks.database = {
      status: 'unready',
      error: 'Database connection check failed',
    };
  }

  // 2. Redis Connectivity Check (graceful fallback)
  const redisStart = Date.now();
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const testRedis = new Redis(redisUrl, {
      connectTimeout: 800,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    await testRedis.connect();
    await testRedis.ping();
    checks.redis = {
      status: 'ready',
      latencyMs: Date.now() - redisStart,
    };
    await testRedis.disconnect();
  } catch {
    checks.redis = {
      status: 'fallback_memory',
      note: 'Using local in-memory rate limiting fallback',
    };
  }

  return NextResponse.json(
    {
      status: isReady ? 'ready' : 'unready',
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: isReady ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
