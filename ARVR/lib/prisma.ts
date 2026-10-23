import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getOptimizedDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl);

    // MongoDB Atlas Replica Set Connection Pool Optimization for Load Balanced Instances
    if (rawUrl.startsWith('mongodb://') || rawUrl.startsWith('mongodb+srv://')) {
      if (!url.searchParams.has('maxPoolSize')) {
        url.searchParams.set('maxPoolSize', process.env.MONGODB_MAX_POOL_SIZE || '30');
      }
      if (!url.searchParams.has('minPoolSize')) {
        url.searchParams.set('minPoolSize', '2');
      }
      if (!url.searchParams.has('maxIdleTimeMS')) {
        url.searchParams.set('maxIdleTimeMS', '30000');
      }
      return url.toString();
    }

    // Remote PostgreSQL instances (like Render/Neon/Supabase) benefit from controlled connection pool sizes
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '5');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '30');
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '20');
    }
    if (url.hostname.includes('render.com') && !url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require');
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const optimizedUrl = getOptimizedDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: optimizedUrl ? { db: { url: optimizedUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Execute a Prisma operation with automatic retry on transient connection pool timeouts (P2024).
 */
export async function withPrismaRetry<T>(
  operation: () => Promise<T>,
  retries = 2,
  delayMs = 400
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err: any) {
      const isConnectionTimeout =
        err?.code === 'P2024' ||
        err?.code === 'P1001' ||
        err?.message?.includes('connection pool') ||
        err?.message?.includes("Can't reach database server");

      if (isConnectionTimeout && attempt < retries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
}
