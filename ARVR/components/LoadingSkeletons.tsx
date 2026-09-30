'use client';

import React from 'react';
import { Box, Sparkles, Layers, BookOpen, Users, CheckSquare, Award } from 'lucide-react';

/**
 * Full page production loading screen with glassmorphism, animated rings,
 * glowing brand badge, and shimmering progress bar.
 */
export function PageLoadingScreen({
  title = 'AR/VR ACADEMY',
  subtitle = 'Spatial Computing & Immersive Training Hub',
  stage = 'Initializing enterprise workspace...',
}: {
  title?: string;
  subtitle?: string;
  stage?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f4f3f8]/90 backdrop-blur-xl transition-all">
      {/* Background radial ambient glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-300/30 rounded-full blur-3xl pointer-events-none animate-pulse-subtle" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-300/25 rounded-full blur-3xl pointer-events-none animate-pulse-subtle" />

      {/* Main glass card */}
      <div className="relative z-10 w-full max-w-md mx-4 p-8 rounded-3xl bg-white/85 border border-purple-200/90 shadow-2xl backdrop-blur-md flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Animated Brand Emblem */}
        <div className="relative flex items-center justify-center">
          {/* Outer rotating pulse ring */}
          <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-purple-500/20 via-indigo-500/20 to-purple-600/20 blur-sm animate-pulse" />
          
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-700 via-indigo-700 to-purple-900 text-white flex items-center justify-center shadow-xl shadow-purple-500/25 border border-white/20">
            <Box className="w-10 h-10 animate-bounce duration-1000 text-purple-100" />
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500 border-2 border-white" />
            </span>
          </div>
        </div>

        {/* Text Header */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100/80 border border-purple-200 text-purple-900 text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3 h-3 text-purple-700" />
            <span>Enterprise Training Platform</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            {subtitle}
          </p>
        </div>

        {/* Shimmer Progress Track */}
        <div className="w-full space-y-2 pt-2">
          <div className="w-full h-2 rounded-full bg-purple-100 overflow-hidden relative shadow-inner">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 w-full animate-[shimmer_1.8s_infinite] rounded-full" />
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-purple-900/80 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
              <span>{stage}</span>
            </span>
            <span className="font-mono text-purple-700">Ready</span>
          </div>
        </div>

        {/* Subtle Security Badge */}
        <div className="pt-2 border-t border-purple-100 w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
          <span>Enterprise End-to-End Encrypted Session</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Shimmering Skeleton for Stats Cards on the dashboard
 */
export function StatsCardsSkeleton({
  count = 4,
  theme = 'light',
}: {
  count?: number;
  theme?: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={
            isDark
              ? 'rounded-3xl p-6 bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-3 animate-pulse'
              : 'pro-card rounded-2xl p-5 bg-white border border-purple-100 shadow-xs space-y-3 animate-pulse'
          }
        >
          <div className="flex items-center justify-between">
            <div className={isDark ? 'w-28 h-3 bg-slate-800 rounded-md' : 'w-24 h-3 bg-purple-100 rounded-md'} />
            <div className={isDark ? 'w-9 h-9 bg-slate-800/80 rounded-xl' : 'w-9 h-9 bg-purple-100/80 rounded-xl'} />
          </div>
          <div className={isDark ? 'w-20 h-8 bg-slate-700/60 rounded-lg' : 'w-16 h-7 bg-purple-200/70 rounded-lg'} />
          <div className={isDark ? 'w-32 h-2.5 bg-slate-800/50 rounded-md' : 'w-32 h-2.5 bg-slate-100 rounded-md'} />
        </div>
      ))}
    </div>
  );
}

/**
 * Shimmering Skeleton for Batches Grid
 */
export function BatchCardsSkeleton({
  count = 6,
  theme = 'light',
}: {
  count?: number;
  theme?: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={
            isDark
              ? 'rounded-3xl p-6 bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-5 animate-pulse'
              : 'pro-card rounded-3xl p-6 bg-white border border-purple-100 shadow-xs space-y-5 animate-pulse'
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className={isDark ? 'w-24 h-4 bg-cyan-900/30 rounded-full' : 'w-24 h-4 bg-purple-100 rounded-full'} />
              <div className={isDark ? 'w-44 h-5 bg-slate-700/70 rounded-lg' : 'w-44 h-5 bg-purple-200/80 rounded-lg'} />
            </div>
            <div className={isDark ? 'w-12 h-6 bg-slate-800 rounded-xl' : 'w-12 h-6 bg-purple-100 rounded-xl'} />
          </div>

          <div className={`space-y-2.5 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-purple-50'}`}>
            <div className="flex items-center justify-between">
              <div className={isDark ? 'w-28 h-3 bg-slate-800 rounded' : 'w-28 h-3 bg-slate-100 rounded'} />
              <div className={isDark ? 'w-16 h-3 bg-slate-800 rounded' : 'w-16 h-3 bg-slate-100 rounded'} />
            </div>
            <div className={`w-full h-2 rounded-full ${isDark ? 'bg-slate-800' : 'bg-purple-100'}`} />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <div className={isDark ? 'w-20 h-8 bg-slate-800 rounded-xl' : 'w-20 h-8 bg-purple-100 rounded-xl'} />
            <div className="flex items-center gap-1.5">
              <div className={isDark ? 'w-16 h-8 bg-slate-800/60 rounded-xl' : 'w-16 h-8 bg-slate-100 rounded-xl'} />
              <div className={isDark ? 'w-16 h-8 bg-cyan-900/40 rounded-xl' : 'w-16 h-8 bg-purple-200/60 rounded-xl'} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Shimmering Skeleton for Tables (Students, Submissions, Logs, Certificates)
 */
export function TableSkeleton({
  rows = 5,
  columns = 5,
  headerTitle = 'Loading records...',
  theme = 'light',
}: {
  rows?: number;
  columns?: number;
  headerTitle?: string;
  theme?: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';
  return (
    <div
      className={
        isDark
          ? 'rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl overflow-hidden'
          : 'pro-card rounded-3xl bg-white border border-purple-200/80 shadow-xs overflow-hidden'
      }
    >
      {/* Top bar placeholder */}
      <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-4 ${isDark ? 'border-slate-800' : 'border-purple-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl animate-pulse ${isDark ? 'bg-slate-800' : 'bg-purple-100'}`} />
          <div className="space-y-1">
            <div className={`w-32 h-4 rounded animate-pulse ${isDark ? 'bg-slate-700' : 'bg-purple-200/80'}`} />
            <div className={`w-48 h-2.5 rounded animate-pulse ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
          </div>
        </div>
        <div className={`w-36 h-9 rounded-xl animate-pulse border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-purple-50 border-purple-100'}`} />
      </div>

      {/* Table rows skeleton */}
      <div className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-purple-50'}`}>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-full shrink-0 ${isDark ? 'bg-slate-800' : 'bg-purple-100/90'}`} />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className={`w-36 sm:w-48 h-3.5 rounded ${isDark ? 'bg-slate-700/80' : 'bg-purple-200/70'}`} />
                <div className={`w-24 sm:w-32 h-2.5 rounded ${isDark ? 'bg-slate-800/80' : 'bg-slate-100'}`} />
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-6">
              <div className={`w-24 h-3 rounded ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
              <div className={`w-20 h-6 rounded-full ${isDark ? 'bg-slate-800/80' : 'bg-purple-100/80'}`} />
            </div>

            <div className={`w-16 h-8 rounded-xl shrink-0 ${isDark ? 'bg-slate-800' : 'bg-purple-100/70'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Shimmering Skeleton for Curriculum Days and Task Editor
 */
export function CurriculumSkeleton({
  count = 3,
  theme = 'light',
}: {
  count?: number;
  theme?: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={
            isDark
              ? 'rounded-2xl p-5 bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4 animate-pulse'
              : 'pro-card rounded-2xl p-5 bg-white border border-purple-100 shadow-xs space-y-4 animate-pulse'
          }
        >
          <div className={`flex items-center justify-between gap-4 border-b pb-3 ${isDark ? 'border-slate-800' : 'border-purple-50'}`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-24 h-6 rounded-full ${isDark ? 'bg-slate-800' : 'bg-purple-100'}`} />
              <div className={`w-48 h-5 rounded-lg ${isDark ? 'bg-slate-700/80' : 'bg-purple-200/70'}`} />
            </div>
            <div className={`w-20 h-7 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
          </div>

          <div className="space-y-3">
            <div className={`w-full h-10 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-purple-50/70 border-purple-100/60'}`} />
            <div className={`w-full h-20 rounded-xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-100'}`} />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className={`w-32 h-3 rounded ${isDark ? 'bg-slate-800' : 'bg-purple-100'}`} />
            <div className={`w-28 h-8 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-purple-100/80'}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

