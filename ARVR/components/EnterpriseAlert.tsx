'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Pause, Play } from 'lucide-react';

export interface EnterpriseAlertProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onDismiss: () => void;
  durationMs?: number;
  theme?: 'light' | 'dark';
  showProgressBar?: boolean;
}

export default function EnterpriseAlert({
  type,
  message,
  onDismiss,
  durationMs,
  theme = 'light',
  showProgressBar = true,
}: EnterpriseAlertProps) {
  const defaultDuration = type === 'error' ? 7000 : 4500;
  const totalDuration = durationMs || defaultDuration;

  const [prevKey, setPrevKey] = useState(`${type}:${message}:${totalDuration}`);
  const [remainingTime, setRemainingTime] = useState(totalDuration);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const startTimeRef = useRef<number>(0);
  const elapsedBeforePauseRef = useRef<number>(0);

  // Reset when message or type changes
  const currentKey = `${type}:${message}:${totalDuration}`;
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    setRemainingTime(totalDuration);
    setIsPaused(false);
    setIsExiting(false);
  }

  useEffect(() => {
    startTimeRef.current = Date.now();
    elapsedBeforePauseRef.current = 0;
  }, [currentKey]);

  // High precision countdown timer with pause-on-hover
  useEffect(() => {
    if (isExiting) return;

    const intervalMs = 25;
    const interval = setInterval(() => {
      if (!isPaused) {
        setRemainingTime((prev) => {
          if (prev <= intervalMs) {
            clearInterval(interval);
            handleTriggerExit();
            return 0;
          }
          return prev - intervalMs;
        });
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPaused, isExiting]);

  const handleTriggerExit = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 200);
  };

  const progressPercent = Math.max(0, Math.min(100, (remainingTime / totalDuration) * 100));

  // Visual Theme Styling
  const isDark = theme === 'dark';

  let containerStyles = '';
  let iconComponent = null;
  let textStyles = '';
  let closeButtonStyles = '';
  let progressBg = '';
  let progressFill = '';

  if (type === 'success') {
    iconComponent = <CheckCircle2 className={`w-5 h-5 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />;
    containerStyles = isDark
      ? 'bg-slate-900/95 border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-950/40 backdrop-blur-md'
      : 'bg-gradient-to-r from-emerald-50/95 via-teal-50/70 to-emerald-50/95 border-emerald-200 text-emerald-900 shadow-sm shadow-emerald-500/5';
    textStyles = isDark ? 'text-emerald-200' : 'text-emerald-900';
    closeButtonStyles = isDark
      ? 'text-emerald-400/80 hover:text-emerald-200 hover:bg-emerald-500/20'
      : 'text-emerald-600 hover:text-emerald-950 hover:bg-emerald-100/80';
    progressBg = isDark ? 'bg-emerald-950/60' : 'bg-emerald-200/50';
    progressFill = isDark
      ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400'
      : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600';
  } else if (type === 'error') {
    iconComponent = <AlertCircle className={`w-5 h-5 shrink-0 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />;
    containerStyles = isDark
      ? 'bg-slate-900/95 border-rose-500/30 text-rose-300 shadow-lg shadow-rose-950/40 backdrop-blur-md'
      : 'bg-gradient-to-r from-rose-50/95 via-red-50/70 to-rose-50/95 border-rose-200 text-rose-900 shadow-sm shadow-rose-500/5';
    textStyles = isDark ? 'text-rose-200' : 'text-rose-900';
    closeButtonStyles = isDark
      ? 'text-rose-400/80 hover:text-rose-200 hover:bg-rose-500/20'
      : 'text-rose-600 hover:text-rose-950 hover:bg-rose-100/80';
    progressBg = isDark ? 'bg-rose-950/60' : 'bg-rose-200/50';
    progressFill = isDark
      ? 'bg-gradient-to-r from-rose-500 via-red-400 to-rose-400'
      : 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-600';
  } else {
    iconComponent = <Info className={`w-5 h-5 shrink-0 ${isDark ? 'text-cyan-400' : 'text-indigo-600'}`} />;
    containerStyles = isDark
      ? 'bg-slate-900/95 border-cyan-500/30 text-cyan-300 shadow-lg shadow-cyan-950/40 backdrop-blur-md'
      : 'bg-gradient-to-r from-indigo-50/95 via-sky-50/70 to-indigo-50/95 border-indigo-200 text-indigo-900 shadow-sm shadow-indigo-500/5';
    textStyles = isDark ? 'text-cyan-200' : 'text-indigo-900';
    closeButtonStyles = isDark
      ? 'text-cyan-400/80 hover:text-cyan-200 hover:bg-cyan-500/20'
      : 'text-indigo-600 hover:text-indigo-950 hover:bg-indigo-100/80';
    progressBg = isDark ? 'bg-cyan-950/60' : 'bg-indigo-200/50';
    progressFill = isDark
      ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-400'
      : 'bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-600';
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative overflow-hidden rounded-2xl border p-4 text-sm transition-all duration-200 ease-out ${containerStyles} ${
        isExiting
          ? 'opacity-0 -translate-y-2 scale-[0.99] max-h-0 py-0 my-0 border-transparent overflow-hidden'
          : 'opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-top-2 duration-200'
      }`}
    >
      <div className="flex items-center justify-between gap-3 min-w-0 pb-1">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {iconComponent}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
            <span className={`font-semibold leading-relaxed break-words ${textStyles}`}>{message}</span>
            {isPaused && (
              <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 ${
                isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-white/80 text-slate-600 border border-slate-200'
              }`}>
                <Pause className="w-2.5 h-2.5" />
                <span>Paused</span>
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleTriggerExit}
          className={`p-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${closeButtonStyles}`}
          title="Dismiss notification"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Enterprise Auto-Dismiss Countdown Progress Bar */}
      {showProgressBar && (
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${progressBg}`}>
          <div
            className={`h-full transition-all duration-[30ms] ease-linear ${progressFill}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
