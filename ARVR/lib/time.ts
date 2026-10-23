import { toZonedTime, format as formatZoned } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = process.env.PROGRAM_TIMEZONE || 'Asia/Kolkata';
export const DEFAULT_FN_START = process.env.FN_START || '08:30';
export const DEFAULT_FN_CUTOFF = process.env.FN_CUTOFF || '09:00';
export const DEFAULT_AN_START = process.env.AN_START || '12:40';
export const DEFAULT_AN_CUTOFF = process.env.AN_CUTOFF || '13:10';

export function getZonedNow(timezone: string = DEFAULT_TIMEZONE): Date {
  return toZonedTime(new Date(), timezone);
}

export function getZonedTimeString(now: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string {
  const zonedDate = toZonedTime(now, timezone);
  return formatZoned(zonedDate, 'HH:mm:ss', { timeZone: timezone });
}

export function getTodayDateString(now: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string {
  const zonedDate = toZonedTime(now, timezone);
  return formatZoned(zonedDate, 'yyyy-MM-dd', { timeZone: timezone });
}

export function getMidnightDate(dateInput?: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  const baseDate = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput) : dateInput) : new Date();
  const dateFormatted = formatZoned(toZonedTime(baseDate, timezone), 'yyyy-MM-dd', { timeZone: timezone });
  return new Date(`${dateFormatted}T00:00:00.000Z`);
}

export function hasSessionStarted(
  session: 'FN' | 'AN',
  startTimeHHMM: string,
  now: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  const zonedDate = toZonedTime(now, timezone);
  const currentHHMM = formatZoned(zonedDate, 'HH:mm', { timeZone: timezone });
  return currentHHMM >= startTimeHHMM;
}

export function isSessionCutoffPassed(
  session: 'FN' | 'AN',
  cutoffTimeHHMM: string,
  now: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  const zonedDate = toZonedTime(now, timezone);
  const currentHHMM = formatZoned(zonedDate, 'HH:mm', { timeZone: timezone });
  return currentHHMM >= cutoffTimeHHMM;
}

export function isSessionWindowOpen(
  session: 'FN' | 'AN',
  startTimeHHMM: string,
  cutoffTimeHHMM: string,
  now: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE
): { isOpen: boolean; reason?: 'NOT_STARTED' | 'CUTOFF_PASSED'; currentHHMM: string } {
  const zonedDate = toZonedTime(now, timezone);
  const currentHHMM = formatZoned(zonedDate, 'HH:mm', { timeZone: timezone });
  if (currentHHMM < startTimeHHMM) {
    return { isOpen: false, reason: 'NOT_STARTED', currentHHMM };
  }
  if (currentHHMM >= cutoffTimeHHMM) {
    return { isOpen: false, reason: 'CUTOFF_PASSED', currentHHMM };
  }
  return { isOpen: true, currentHHMM };
}

export interface SessionCriteriaStatus {
  session: 'FN' | 'AN';
  sessionLabel: string;
  isMarked: boolean;
  markedAtFormatted?: string;
  status: 'MARKED' | 'OPEN' | 'BEFORE_WINDOW' | 'AFTER_CUTOFF';
  isOpen: boolean;
  canMark: boolean;
  startTime: string;
  cutoffTime: string;
  startFormatted: string;
  cutoffFormatted: string;
  currentHHMM: string;
  currentZonedFormatted: string;
  note: string;
  buttonLabel: string;
}

export function formatTime12Hour(timeHHMM: string): string {
  if (!timeHHMM || !timeHHMM.includes(':')) return timeHHMM || '';
  const [hStr, mStr] = timeHHMM.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeHHMM;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function getDetailedSessionStatus(
  session: 'FN' | 'AN',
  startTimeHHMM: string,
  cutoffTimeHHMM: string,
  now: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE,
  isMarked: boolean = false,
  markedAt?: Date
): SessionCriteriaStatus {
  const zonedDate = toZonedTime(now, timezone);
  const currentHHMM = formatZoned(zonedDate, 'HH:mm', { timeZone: timezone });
  const currentZonedFormatted = formatZoned(zonedDate, 'hh:mm a', { timeZone: timezone });
  const startFormatted = formatTime12Hour(startTimeHHMM);
  const cutoffFormatted = formatTime12Hour(cutoffTimeHHMM);
  const sessionLabel = session === 'FN' ? 'Morning (FN)' : 'Afternoon (AN)';

  let markedAtFormatted: string | undefined = undefined;
  if (markedAt) {
    markedAtFormatted = formatZoned(toZonedTime(markedAt, timezone), 'hh:mm a', { timeZone: timezone });
  }

  if (isMarked) {
    return {
      session,
      sessionLabel,
      isMarked: true,
      markedAtFormatted,
      status: 'MARKED',
      isOpen: false,
      canMark: false,
      startTime: startTimeHHMM,
      cutoffTime: cutoffTimeHHMM,
      startFormatted,
      cutoffFormatted,
      currentHHMM,
      currentZonedFormatted,
      note: `✓ ${sessionLabel} attendance marked successfully at ${markedAtFormatted || currentZonedFormatted}. Session verified.`,
      buttonLabel: 'Marked',
    };
  }

  if (currentHHMM < startTimeHHMM) {
    return {
      session,
      sessionLabel,
      isMarked: false,
      status: 'BEFORE_WINDOW',
      isOpen: false,
      canMark: false,
      startTime: startTimeHHMM,
      cutoffTime: cutoffTimeHHMM,
      startFormatted,
      cutoffFormatted,
      currentHHMM,
      currentZonedFormatted,
      note: `⏰ Attendance Window Not Started: The ${sessionLabel} window opens at ${startFormatted} and closes at ${cutoffFormatted}. Current time is ${currentZonedFormatted}. Please mark attendance during the active window.`,
      buttonLabel: `Opens at ${startFormatted}`,
    };
  }

  if (currentHHMM >= cutoffTimeHHMM) {
    return {
      session,
      sessionLabel,
      isMarked: false,
      status: 'AFTER_CUTOFF',
      isOpen: false,
      canMark: false,
      startTime: startTimeHHMM,
      cutoffTime: cutoffTimeHHMM,
      startFormatted,
      cutoffFormatted,
      currentHHMM,
      currentZonedFormatted,
      note: `❌ Attendance Cutoff Passed: The ${sessionLabel} attendance window closed at ${cutoffFormatted} (Window: ${startFormatted} - ${cutoffFormatted}). Current time is ${currentZonedFormatted}. Attendance cannot be marked after cutoff. Contact your instructor for manual override if needed.`,
      buttonLabel: 'Cutoff Passed',
    };
  }

  return {
    session,
    sessionLabel,
    isMarked: false,
    status: 'OPEN',
    isOpen: true,
    canMark: true,
    startTime: startTimeHHMM,
    cutoffTime: cutoffTimeHHMM,
    startFormatted,
    cutoffFormatted,
    currentHHMM,
    currentZonedFormatted,
    note: `🟢 Window OPEN: Mark your ${sessionLabel} attendance now before the ${cutoffFormatted} cutoff! (${startFormatted} - ${cutoffFormatted})`,
    buttonLabel: `Mark ${session}`,
  };
}

/**
 * Checks if a given Attendance record matches a target date string (yyyy-MM-dd)
 * checking timezone-adjusted date, UTC date string, and markedAt timestamp.
 */
export function isAttendanceMatchingDate(
  attendance: { date: Date | string; markedAt?: Date | string },
  targetDateStr: string,
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  if (!attendance) return false;
  try {
    const attDate = typeof attendance.date === 'string' ? new Date(attendance.date) : attendance.date;
    const attDateZonedStr = formatZoned(toZonedTime(attDate, timezone), 'yyyy-MM-dd', { timeZone: timezone });
    if (attDateZonedStr === targetDateStr) return true;

    const utcDateStr = attDate.toISOString().split('T')[0];
    if (utcDateStr === targetDateStr) return true;

    if (attendance.markedAt) {
      const markedDate = typeof attendance.markedAt === 'string' ? new Date(attendance.markedAt) : attendance.markedAt;
      const markedZonedStr = formatZoned(toZonedTime(markedDate, timezone), 'yyyy-MM-dd', { timeZone: timezone });
      if (markedZonedStr === targetDateStr) return true;
      const markedUtcStr = markedDate.toISOString().split('T')[0];
      if (markedUtcStr === targetDateStr) return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Resolves effective attendance timings for a batch, falling back to global SystemSettings
 * or program defaults if not configured on the batch.
 */
export function resolveBatchAttendanceWindows(
  batch?: {
    fnStartTime?: string | null;
    fnCutoffTime?: string | null;
    anStartTime?: string | null;
    anCutoffTime?: string | null;
  } | null,
  globalSettings?: Map<string, string>
): {
  fnStart: string;
  fnCutoff: string;
  anStart: string;
  anCutoff: string;
  isCustomBatch: boolean;
} {
  const defaultFnStart = globalSettings?.get('FN_START_TIME') || DEFAULT_FN_START;
  const defaultFnCutoff = globalSettings?.get('FN_CUTOFF') || DEFAULT_FN_CUTOFF;
  const defaultAnStart = globalSettings?.get('AN_START_TIME') || DEFAULT_AN_START;
  const defaultAnCutoff = globalSettings?.get('AN_CUTOFF') || DEFAULT_AN_CUTOFF;

  let fnStart = batch?.fnStartTime || defaultFnStart;
  let fnCutoff = batch?.fnCutoffTime || defaultFnCutoff;
  let anStart = batch?.anStartTime || defaultAnStart;
  let anCutoff = batch?.anCutoffTime || defaultAnCutoff;

  // Sanity check: If morning window is inverted (start >= cutoff), self-heal
  if (fnStart >= fnCutoff) {
    if (fnCutoff < fnStart && fnCutoff >= '06:00') {
      const temp = fnStart;
      fnStart = fnCutoff;
      fnCutoff = temp;
    } else {
      fnStart = defaultFnStart;
      fnCutoff = defaultFnCutoff;
    }
  }

  // Sanity check: If afternoon window is inverted (e.g. 15:09 - 13:10), self-heal
  if (anStart >= anCutoff) {
    if (anCutoff < anStart && anCutoff >= '11:00') {
      const temp = anStart;
      anStart = anCutoff;
      anCutoff = temp;
    } else {
      anStart = defaultAnStart;
      anCutoff = defaultAnCutoff;
    }
  }

  const isCustomBatch = Boolean(
    (batch?.fnStartTime && batch.fnStartTime !== defaultFnStart) ||
    (batch?.fnCutoffTime && batch.fnCutoffTime !== defaultFnCutoff) ||
    (batch?.anStartTime && batch.anStartTime !== defaultAnStart) ||
    (batch?.anCutoffTime && batch.anCutoffTime !== defaultAnCutoff)
  );

  return {
    fnStart,
    fnCutoff,
    anStart,
    anCutoff,
    isCustomBatch,
  };
}

