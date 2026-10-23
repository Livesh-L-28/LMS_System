import { runMorningWatchdog } from './morningWatchdog';

let schedulerInitialized = false;

function getMsUntilNext6AM(): number {
  const now = new Date();
  const next6AM = new Date(now);
  next6AM.setHours(6, 0, 0, 0);

  if (now.getTime() >= next6AM.getTime()) {
    next6AM.setDate(next6AM.getDate() + 1);
  }

  return next6AM.getTime() - now.getTime();
}

/**
 * Initializes the automated 6:00 AM Morning Watchdog scheduler.
 * Runs in the background of the Node.js server process with zero external dependencies.
 */
export function initMorningWatchdogScheduler() {
  if (schedulerInitialized) return;
  schedulerInitialized = true;

  const msUntil6AM = getMsUntilNext6AM();
  const hoursUntil6AM = (msUntil6AM / (1000 * 60 * 60)).toFixed(1);

  console.log(`[Watchdog Scheduler] Scheduled automated 6:00 AM morning health check (in ${hoursUntil6AM}h).`);

  function scheduleNext() {
    const delay = getMsUntilNext6AM();
    setTimeout(async () => {
      console.log('⏰ [Watchdog] Executing scheduled 6:00 AM Morning Health Audit...');
      try {
        const report = await runMorningWatchdog();
        console.log(
          `✅ [Watchdog] 6:00 AM Audit Complete. Healthy: ${report.allHealthy}, Critical: ${report.criticalCount}, Warnings: ${report.warningCount}`
        );
      } catch (err) {
        console.error('❌ [Watchdog] Failed to execute 6:00 AM scheduled check:', err);
      }
      scheduleNext();
    }, delay);
  }

  scheduleNext();
}
