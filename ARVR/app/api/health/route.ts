import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';

const startTime = Date.now();

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptimeSeconds = Math.round((Date.now() - startTime) / 1000);

  let dbStatus = 'disconnected';
  let dbLatencyMs = -1;
  let isHealthy = true;

  // 1. Check Database Connectivity (MongoDB Atlas)
  const dbStart = Date.now();
  try {
    if (typeof (prisma as any).$runCommandRaw === 'function') {
      await (prisma as any).$runCommandRaw({ ping: 1 });
    } else {
      await prisma.systemSetting.findFirst({ select: { id: true } });
    }
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = 'error';
    isHealthy = false;
  }

  // 2. Check Redis Connectivity
  let redisStatus = 'disconnected';
  let redisLatencyMs = -1;
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const testRedis = new Redis(redisUrl, {
      connectTimeout: 800,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    const redisStart = Date.now();
    await testRedis.connect();
    const pingRes = await testRedis.ping();
    redisLatencyMs = Date.now() - redisStart;
    redisStatus = pingRes === 'PONG' ? 'connected' : 'degraded';
    await testRedis.disconnect();
  } catch {
    redisStatus = 'fallback_memory';
  }

  // 3. Storage check
  const storageConfigured = !!process.env.AWS_S3_BUCKET_NAME;

  // 4. Node.js Process Memory Statistics (MB)
  const mem = process.memoryUsage();
  const memoryTelemetry = {
    rssMb: Math.round(mem.rss / 1024 / 1024),
    heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    externalMb: Math.round(mem.external / 1024 / 1024),
  };

  const payload = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp,
    uptime: uptimeSeconds,
    environment: process.env.NODE_ENV || 'development',
    system: {
      pid: process.pid,
      nodeVersion: process.version,
      memory: memoryTelemetry,
    },
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      redis: {
        status: redisStatus,
        latencyMs: redisLatencyMs,
      },
      storage: {
        provider: 'AWS_S3',
        configured: storageConfigured,
        bucket: process.env.AWS_S3_BUCKET_NAME || 'not_configured',
      },
    },
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
