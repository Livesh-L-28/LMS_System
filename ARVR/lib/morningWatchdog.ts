import { prisma } from '@/lib/prisma';
import { getDriveClientForAdmin } from '@/lib/googleDrive';
import { getS3Client, getBucketName } from '@/lib/s3';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import Redis from 'ioredis';

export type SubsystemStatus = 'OK' | 'WARNING' | 'CRITICAL' | 'INFO';

export interface WatchdogSubsystemReport {
  status: SubsystemStatus;
  message: string;
  details?: Record<string, any>;
}

export interface WatchdogReport {
  timestamp: string;
  allHealthy: boolean;
  criticalCount: number;
  warningCount: number;
  subsystems: {
    googleDrive: WatchdogSubsystemReport;
    s3Storage: WatchdogSubsystemReport;
    database: WatchdogSubsystemReport;
    redis: WatchdogSubsystemReport;
    curriculum: WatchdogSubsystemReport;
    geofenceWifi: WatchdogSubsystemReport;
  };
}

/**
 * Runs the unified Morning Watchdog health audit across all 6 core subsystems.
 * Persists the result to SystemSetting (key: MORNING_WATCHDOG_REPORT).
 */
export async function runMorningWatchdog(): Promise<WatchdogReport> {
  const timestamp = new Date().toISOString();

  // 1. Google Drive OAuth & Quota Verification
  const checkGoogleDrive = async (): Promise<WatchdogSubsystemReport> => {
    try {
      const { drive, connection, error } = await getDriveClientForAdmin();

      if (!connection || connection.status !== 'CONNECTED') {
        return {
          status: 'CRITICAL',
          message: 'Primary storage Google Drive is not connected. Reconnect Drive in Staff Portal before classes start.',
          details: { connected: false },
        };
      }

      if (!drive || error) {
        return {
          status: 'CRITICAL',
          message: `Primary storage Google Drive connection error: ${error || 'OAuth token expired'}. Please reconnect.`,
          details: { account: connection.googleAccountEmail, connected: false },
        };
      }

      // Test active read access
      await drive.files.list({ pageSize: 1, fields: 'files(id)' });

      // Fetch storage quota
      let quotaMessage = '';
      let quotaDetails: any = null;
      try {
        const about = await drive.about.get({ fields: 'storageQuota' });
        const quota = about.data.storageQuota;
        if (quota && quota.usage && quota.limit) {
          const usedGb = (Number(quota.usage) / (1024 * 1024 * 1024)).toFixed(1);
          const totalGb = (Number(quota.limit) / (1024 * 1024 * 1024)).toFixed(1);
          const usagePercent = Math.round((Number(quota.usage) / Number(quota.limit)) * 100);
          quotaDetails = { usedGb, totalGb, usagePercent };
          quotaMessage = ` (${usedGb} GB / ${totalGb} GB used - ${usagePercent}%)`;

          if (usagePercent > 90) {
            return {
              status: 'WARNING',
              message: `Primary storage Google Drive low on space: ${usagePercent}% used${quotaMessage}.`,
              details: { account: connection.googleAccountEmail, ...quotaDetails },
            };
          }
        }
      } catch {}

      return {
        status: 'OK',
        message: `Google Drive (Primary Storage) connected & active for ${connection.googleAccountEmail}${quotaMessage}.`,
        details: { account: connection.googleAccountEmail, connected: true, ...quotaDetails },
      };
    } catch (err: any) {
      const isTokenExpired =
        err?.message?.includes('invalid_grant') ||
        err?.code === 401 ||
        err?.message?.includes('token has been expired or revoked');

      if (isTokenExpired) {
        // Automatically flag in database so UI updates immediately
        try {
          await prisma.googleDriveConnection.updateMany({
            data: { status: 'DISCONNECTED' },
          });
        } catch {}

        return {
          status: 'CRITICAL',
          message: 'Google Drive OAuth token has expired or was revoked. Please reconnect in Staff Portal.',
          details: { error: err.message, tokenExpired: true },
        };
      }

      return {
        status: 'CRITICAL',
        message: `Google Drive API error: ${err.message || 'Verification failed'}`,
        details: { error: err.message },
      };
    }
  };

  // 2. AWS S3 Storage Verification (Secondary Backup)
  const checkS3Storage = async (): Promise<WatchdogSubsystemReport> => {
    try {
      const s3 = getS3Client();
      const bucket = getBucketName();

      await s3.send(new HeadBucketCommand({ Bucket: bucket }));

      return {
        status: 'OK',
        message: `AWS S3 bucket "${bucket}" active as secondary cloud mirror.`,
        details: { bucket },
      };
    } catch (err: any) {
      // If local mock S3 is used and not started, provide actionable info
      const isConnectionRefused = err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED');
      return {
        status: 'CRITICAL',
        message: isConnectionRefused
          ? 'Storage endpoint unreachable (Port 9000). Ensure MinIO/S3 emulator or AWS S3 is accessible.'
          : `AWS S3 bucket access error: ${err.message}`,
        details: { error: err.message },
      };
    }
  };

  // 3. MongoDB Atlas Database Ping & Latency Telemetry
  const checkDatabase = async (): Promise<WatchdogSubsystemReport> => {
    const dbStart = Date.now();
    try {
      if (typeof (prisma as any).$runCommandRaw === 'function') {
        await (prisma as any).$runCommandRaw({ ping: 1 });
      } else {
        await prisma.systemSetting.findFirst({ select: { id: true } });
      }
      const latencyMs = Date.now() - dbStart;

      if (latencyMs > 300) {
        return {
          status: 'WARNING',
          message: `MongoDB Atlas connected but high latency detected (${latencyMs}ms).`,
          details: { latencyMs },
        };
      }

      return {
        status: 'OK',
        message: `MongoDB Atlas connected (${latencyMs}ms latency).`,
        details: { latencyMs },
      };
    } catch (err: any) {
      return {
        status: 'CRITICAL',
        message: `MongoDB Atlas connection error: ${err.message}`,
        details: { error: err.message },
      };
    }
  };

  // 4. Redis Cache & Distributed Rate Limiting
  const checkRedis = async (): Promise<WatchdogSubsystemReport> => {
    const redisStart = Date.now();
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
      const testRedis = new Redis(redisUrl, {
        connectTimeout: 800,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      await testRedis.connect();
      const pong = await testRedis.ping();
      const latencyMs = Date.now() - redisStart;
      await testRedis.disconnect();

      if (pong === 'PONG') {
        return {
          status: 'OK',
          message: `Distributed Redis cache connected (${latencyMs}ms latency).`,
          details: { latencyMs },
        };
      }

      return {
        status: 'WARNING',
        message: 'Redis returned unexpected response. Falling back to local in-memory rate limiting.',
      };
    } catch {
      return {
        status: 'WARNING',
        message: 'Redis offline; running local high-performance rate limiting fallback.',
        details: { fallback: 'IN_MEMORY' },
      };
    }
  };

  // 5. Curriculum & Today's Attendance Windows
  const checkCurriculum = async (): Promise<WatchdogSubsystemReport> => {
    try {
      const activeBatches = await prisma.batch.findMany({
        where: { status: 'ACTIVE' },
        include: {
          trainingCalendar: true,
          _count: { select: { students: true } },
        },
      });

      if (activeBatches.length === 0) {
        return {
          status: 'WARNING',
          message: 'No active batches currently found in the system.',
          details: { activeBatches: 0 },
        };
      }

      const issues: string[] = [];
      const now = new Date();
      const todayDateStr = now.toISOString().split('T')[0];
      let todayScheduledDays = 0;

      for (const b of activeBatches) {
        if (b.trainingCalendar.length === 0) {
          issues.push(`Cohort "${b.name}" has 0 curriculum days configured`);
        }

        // Timing validation sanity check
        if (b.fnStartTime && b.fnCutoffTime && b.fnStartTime >= b.fnCutoffTime) {
          issues.push(`Cohort "${b.name}" has invalid Morning window (${b.fnStartTime} >= ${b.fnCutoffTime})`);
        }
        if (b.anStartTime && b.anCutoffTime && b.anStartTime >= b.anCutoffTime) {
          issues.push(`Cohort "${b.name}" has invalid Afternoon window (${b.anStartTime} >= ${b.anCutoffTime})`);
        }

        // Check if today matches a training day
        const hasToday = b.trainingCalendar.some((d) => {
          const dStr = new Date(d.date).toISOString().split('T')[0];
          return dStr === todayDateStr;
        });
        if (hasToday) todayScheduledDays++;
      }

      if (issues.length > 0) {
        return {
          status: 'WARNING',
          message: `Curriculum timing issues detected: ${issues.join('; ')}`,
          details: { issues, activeBatches: activeBatches.length },
        };
      }

      return {
        status: 'OK',
        message: `${activeBatches.length} active cohort(s) operational (${todayScheduledDays} session(s) scheduled for today).`,
        details: { activeBatches: activeBatches.length, todayScheduledDays },
      };
    } catch (err: any) {
      return {
        status: 'CRITICAL',
        message: `Failed to verify curriculum: ${err.message}`,
        details: { error: err.message },
      };
    }
  };

  // 6. Campus Geofence & Network Policy
  const checkGeofenceWifi = async (): Promise<WatchdogSubsystemReport> => {
    try {
      const settings = await prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              'GEOFENCE_ENABLED',
              'GEOFENCE_LAT',
              'GEOFENCE_LNG',
              'GEOFENCE_RADIUS_METERS',
              'WIFI_RESTRICTION_ENABLED',
              'WIFI_ALLOWED_IPS',
            ],
          },
        },
      });

      const map = new Map(settings.map((s) => [s.key, s.value]));
      const geoEnabled = map.get('GEOFENCE_ENABLED') === 'true';
      const wifiEnabled = map.get('WIFI_RESTRICTION_ENABLED') === 'true';

      if (geoEnabled) {
        const lat = parseFloat(map.get('GEOFENCE_LAT') || '0');
        const lng = parseFloat(map.get('GEOFENCE_LNG') || '0');
        if (!lat || !lng) {
          return {
            status: 'WARNING',
            message: 'Campus Geofencing is enabled, but GPS latitude/longitude coordinates are not set.',
            details: { geoEnabled, wifiEnabled },
          };
        }
      }

      if (wifiEnabled) {
        const ips = map.get('WIFI_ALLOWED_IPS') || '';
        if (!ips.trim()) {
          return {
            status: 'WARNING',
            message: 'Campus WiFi restriction is enabled, but no allowed IP addresses or subnets are listed.',
            details: { geoEnabled, wifiEnabled },
          };
        }
      }

      const activeRules = [];
      if (geoEnabled) activeRules.push('Campus Geofencing (150m boundary)');
      if (wifiEnabled) activeRules.push('Designated WiFi verification');

      return {
        status: 'OK',
        message:
          activeRules.length > 0
            ? `Campus perimeter security active: ${activeRules.join(' & ')}.`
            : 'Perimeter open (No Geofence or WiFi restriction enforced).',
        details: { geoEnabled, wifiEnabled },
      };
    } catch (err: any) {
      return {
        status: 'WARNING',
        message: `Perimeter settings check warning: ${err.message}`,
        details: { error: err.message },
      };
    }
  };

  // Run all 6 subsystem checks concurrently
  const [
    googleDriveRes,
    s3StorageRes,
    databaseRes,
    redisRes,
    curriculumRes,
    geofenceWifiRes,
  ] = await Promise.all([
    checkGoogleDrive(),
    checkS3Storage(),
    checkDatabase(),
    checkRedis(),
    checkCurriculum(),
    checkGeofenceWifi(),
  ]);

  const allSubsystems = [
    googleDriveRes,
    s3StorageRes,
    databaseRes,
    redisRes,
    curriculumRes,
    geofenceWifiRes,
  ];

  const criticalCount = allSubsystems.filter((s) => s.status === 'CRITICAL').length;
  const warningCount = allSubsystems.filter((s) => s.status === 'WARNING').length;
  const allHealthy = criticalCount === 0;

  const report: WatchdogReport = {
    timestamp,
    allHealthy,
    criticalCount,
    warningCount,
    subsystems: {
      googleDrive: googleDriveRes,
      s3Storage: s3StorageRes,
      database: databaseRes,
      redis: redisRes,
      curriculum: curriculumRes,
      geofenceWifi: geofenceWifiRes,
    },
  };

  // Persist report in SystemSetting so Admin UI reads it in 1 fast query
  try {
    await prisma.systemSetting.upsert({
      where: { key: 'MORNING_WATCHDOG_REPORT' },
      update: { value: JSON.stringify(report) },
      create: { key: 'MORNING_WATCHDOG_REPORT', value: JSON.stringify(report) },
    });
  } catch (err) {
    console.error('[Watchdog] Failed to persist report in SystemSetting:', err);
  }

  // Dispatch alert notification to admin@arvr.com if any check failed
  if (!allHealthy) {
    await dispatchAdminAlert(report);
  }

  return report;
}

/**
 * Dispatches an alert email/notification to admin@arvr.com when any subsystem fails.
 */
async function dispatchAdminAlert(report: WatchdogReport) {
  const issues = Object.entries(report.subsystems)
    .filter(([, sub]) => sub.status === 'CRITICAL' || sub.status === 'WARNING')
    .map(([key, sub]) => `• [${sub.status}] ${key}: ${sub.message}`)
    .join('\n');

  console.warn(
    `[Morning Watchdog] ⚠️ ALERT DISPATCHED TO admin@arvr.com:\n` +
    `Subject: [ARVR LMS Alert] Morning Watchdog detected issues before classes start\n` +
    `Timestamp: ${report.timestamp}\n` +
    `Critical Issues: ${report.criticalCount}\n` +
    `Warnings: ${report.warningCount}\n` +
    `Details:\n${issues}`
  );

  const alertWebhook = process.env.ADMIN_ALERT_WEBHOOK_URL;
  if (alertWebhook) {
    try {
      await fetch(alertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: 'admin@arvr.com',
          subject: '[ARVR LMS Alert] Morning Watchdog detected issues before classes start',
          report,
          issues,
        }),
      });
    } catch (e: any) {
      console.error('[Morning Watchdog] Failed to dispatch webhook alert:', e.message);
    }
  }
}

/**
 * Reads the latest persisted Morning Watchdog report from SystemSetting.
 */
export async function getLatestWatchdogReport(): Promise<WatchdogReport | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'MORNING_WATCHDOG_REPORT' },
    });

    if (setting?.value) {
      return JSON.parse(setting.value);
    }
    return null;
  } catch {
    return null;
  }
}
