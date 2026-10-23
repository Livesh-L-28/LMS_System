'use client';

import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Cloud,
  HardDrive,
  Database,
  Zap,
  Calendar,
  Shield,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface SubsystemInfo {
  status: 'OK' | 'WARNING' | 'CRITICAL' | 'INFO';
  message: string;
  details?: Record<string, any>;
}

interface WatchdogReport {
  timestamp: string;
  allHealthy: boolean;
  criticalCount: number;
  warningCount: number;
  subsystems: {
    googleDrive: SubsystemInfo;
    s3Storage: SubsystemInfo;
    database: SubsystemInfo;
    redis: SubsystemInfo;
    curriculum: SubsystemInfo;
    geofenceWifi: SubsystemInfo;
  };
}

interface MorningWatchdogCardProps {
  report: WatchdogReport | null;
  loading: boolean;
  onRunAudit: () => void;
  onNavigateToDrive?: () => void;
}

export default function MorningWatchdogCard({
  report,
  loading,
  onRunAudit,
  onNavigateToDrive,
}: MorningWatchdogCardProps) {
  if (!report && loading) {
    return (
      <div className="bg-white border border-blue-200 rounded-3xl p-6 shadow-sm animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-blue-100 rounded-lg" />
          <div className="h-6 w-32 bg-slate-100 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-slate-50 border border-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!report) return null;

  const isHealthy = report.allHealthy && report.criticalCount === 0;
  const hasWarnings = report.warningCount > 0;

  const formattedTime = new Date(report.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const getStatusBadge = (status: SubsystemInfo['status']) => {
    switch (status) {
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> OK
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" /> Attention
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> Critical
          </span>
        );
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Info
          </span>
        );
    }
  };

  const subsystemsList = [
    {
      key: 'googleDrive',
      title: 'Google Drive (Primary Storage)',
      icon: <Cloud className="w-4 h-4 text-blue-600" />,
      info: report.subsystems.googleDrive,
      action:
        report.subsystems.googleDrive.status === 'CRITICAL' && onNavigateToDrive ? (
          <button
            onClick={onNavigateToDrive}
            className="mt-2 text-xs font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 underline underline-offset-2"
          >
            Reconnect Drive <ArrowRight className="w-3 h-3" />
          </button>
        ) : null,
    },
    {
      key: 's3Storage',
      title: 'AWS S3 (Secondary Backup)',
      icon: <HardDrive className="w-4 h-4 text-indigo-600" />,
      info: report.subsystems.s3Storage,
    },
    {
      key: 'database',
      title: 'MongoDB Atlas',
      icon: <Database className="w-4 h-4 text-emerald-600" />,
      info: report.subsystems.database,
    },
    {
      key: 'redis',
      title: 'Distributed Redis Cache',
      icon: <Zap className="w-4 h-4 text-amber-500" />,
      info: report.subsystems.redis,
    },
    {
      key: 'curriculum',
      title: "Today's Curriculum Schedule",
      icon: <Calendar className="w-4 h-4 text-blue-600" />,
      info: report.subsystems.curriculum,
    },
    {
      key: 'geofenceWifi',
      title: 'Campus Perimeter Security',
      icon: <Shield className="w-4 h-4 text-rose-500" />,
      info: report.subsystems.geofenceWifi,
    },
  ];

  return (
    <div className="bg-white border border-blue-200/90 rounded-3xl p-6 shadow-sm space-y-5 transition-all">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-blue-100 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-2xl ${
              isHealthy ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900">Morning Watchdog Audit</h3>
              {isHealthy ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  All Systems Operational
                </span>
              ) : report.criticalCount > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  {report.criticalCount} Critical Issue{report.criticalCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  {report.warningCount} Notice{report.warningCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Daily pre-class infrastructure verification • Last checked at {formattedTime}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onRunAudit}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Running Audit...' : 'Run Audit Now'}
          </button>
        </div>
      </div>

      {/* Critical Alert Warning Bar (if any critical issue exists) */}
      {report.criticalCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 flex-1">
            <span className="font-bold">Attention Required:</span> One or more storage or database subsystems require admin action before student classes start.
          </div>
        </div>
      )}

      {/* 6-Subsystem Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {subsystemsList.map(({ key, title, icon, info, action }) => (
          <div
            key={key}
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              info.status === 'CRITICAL'
                ? 'bg-rose-50/40 border-rose-200'
                : info.status === 'WARNING'
                ? 'bg-amber-50/40 border-amber-200'
                : 'bg-slate-50/50 border-slate-200/70 hover:border-blue-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200/80 shadow-xs">
                    {icon}
                  </div>
                  <span className="text-xs font-bold text-slate-800">{title}</span>
                </div>
                {getStatusBadge(info.status)}
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{info.message}</p>
            </div>
            {action}
          </div>
        ))}
      </div>
    </div>
  );
}
