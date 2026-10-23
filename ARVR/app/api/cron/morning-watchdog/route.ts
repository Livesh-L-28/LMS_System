import { NextResponse } from 'next/server';
import { runMorningWatchdog, getLatestWatchdogReport } from '@/lib/morningWatchdog';
import { getSession } from '@/lib/auth';

/**
 * Validates whether the caller is authorized to trigger or view the Morning Watchdog.
 * Permits:
 * 1. Logged-in ADMIN session
 * 2. Scheduled Cron Job with x-cron-secret or ?key= matching SESSION_SECRET
 */
async function isAuthorized(request: Request): Promise<boolean> {
  // Check Admin session
  try {
    const session = await getSession();
    if (session?.user && session.user.role === 'ADMIN') {
      return true;
    }
  } catch {}

  // Check Dedicated Cron Secret Header or Query
  const url = new URL(request.url);
  const secretQuery = url.searchParams.get('key') || url.searchParams.get('secret');
  const secretHeader = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;
  const sessionSecret = process.env.SESSION_SECRET;

  if (cronSecret && (secretHeader === cronSecret || secretQuery === cronSecret)) {
    return true;
  }

  // Fallback to SESSION_SECRET only if CRON_SECRET is not explicitly configured
  if (!cronSecret && sessionSecret && (secretHeader === sessionSecret || secretQuery === sessionSecret)) {
    return true;
  }

  return false;
}

/**
 * GET /api/cron/morning-watchdog
 * Query params:
 *   ?runNow=true -> Forces a real-time health check execution
 *   default      -> Returns the latest report (runs fresh if none exists)
 */
export async function GET(request: Request) {
  try {
    const authorized = await isAuthorized(request);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const runNow = url.searchParams.get('runNow') === 'true';

    let report = await getLatestWatchdogReport();

    // If no report exists or caller explicitly requested real-time run
    if (!report || runNow) {
      report = await runMorningWatchdog();
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('[Morning Watchdog] Execution error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Watchdog execution failed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/morning-watchdog
 * Forces an immediate real-time health audit of all 6 subsystems.
 */
export async function POST(request: Request) {
  try {
    const authorized = await isAuthorized(request);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await runMorningWatchdog();

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('[Morning Watchdog] POST execution error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Watchdog execution failed' },
      { status: 500 }
    );
  }
}
