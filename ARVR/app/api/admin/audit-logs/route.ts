import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAuditLogs } from '@/lib/auditLog';

export async function GET(request: Request) {
  try {
    await requireAuth(['ADMIN']);
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const skip = Math.max(parseInt(searchParams.get('skip') || '0', 10), 0);
    const action = searchParams.get('action') || undefined;
    const targetType = searchParams.get('targetType') || undefined;
    const actorEmail = searchParams.get('actorEmail') || undefined;

    const { logs, total } = await getAuditLogs({
      limit,
      skip,
      action,
      targetType,
      actorEmail,
    });

    return NextResponse.json({
      success: true,
      logs,
      total,
      limit,
      skip,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Audit logs API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve audit logs' }, { status: 500 });
  }
}
