import { prisma } from '@/lib/prisma';

export interface AuditLogEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string;
  ipAddress?: string | null;
  action: string; // e.g. OVERRIDE_ATTENDANCE, CHANGE_GRADE, BATCH_SCHEDULE_UPDATE, 2FA_UPDATE, SECURITY_CONFIG
  targetType: string; // e.g. STUDENT, BATCH, EVALUATION, SYSTEM, AUTH
  targetId?: string | null;
  targetIdentifier?: string | null;
  details?: Record<string, any> | string | null;
}

/**
 * Creates an immutable administrative audit log record in MongoDB.
 * Designed to never throw or break critical administrative workflows if transient DB hiccups occur.
 */
export async function logAdminAudit(entry: AuditLogEntry) {
  try {
    const detailsStr =
      entry.details == null
        ? null
        : typeof entry.details === 'string'
        ? entry.details
        : JSON.stringify(entry.details);

    return await prisma.auditLog.create({
      data: {
        actorId: entry.actorId || null,
        actorEmail: entry.actorEmail || 'admin@arvr.com',
        actorRole: entry.actorRole || 'ADMIN',
        ipAddress: entry.ipAddress || null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId || null,
        targetIdentifier: entry.targetIdentifier || null,
        details: detailsStr,
      },
    });
  } catch (error) {
    console.error('[AuditLog] Failed to persist administrative audit entry:', error);
    return null;
  }
}

/**
 * Retrieves audit logs with optional filtering and pagination.
 */
export async function getAuditLogs({
  limit = 50,
  skip = 0,
  action,
  targetType,
  actorEmail,
}: {
  limit?: number;
  skip?: number;
  action?: string;
  targetType?: string;
  actorEmail?: string;
} = {}) {
  const where: any = {};
  if (action) where.action = action;
  if (targetType) where.targetType = targetType;
  if (actorEmail) where.actorEmail = actorEmail;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      skip,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
