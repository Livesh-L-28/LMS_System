export interface LevelConfigItem {
  days: number;
  code: string;
  name: string;
}

export const LEVEL_CONFIG: Record<string, LevelConfigItem> = {
  'Level 1': { days: 10, code: 'L1', name: 'Level 1' },
  'Level 2': { days: 10, code: 'L2', name: 'Level 2' },
  'Level 3': { days: 10, code: 'L3', name: 'Level 3' },
};

export interface TaskItem {
  id?: string;
  title: string;
  description: string;
}

export interface ResourceItem {
  id?: string;
  title: string;
  type: 'pdf' | 'link' | 'video' | 'doc' | 'other';
  url: string;
  filename?: string;
  fileSize?: number;
}

export interface DefaultCurriculumItem {
  dayNumber: number;
  taskTitle: string;
  taskDescription: string;
  tasks?: TaskItem[];
  resources?: ResourceItem[];
}

export function normalizeDayTasks(day: { taskTitle?: string; taskDescription?: string; tasks?: any }): TaskItem[] {
  if (Array.isArray(day.tasks) && day.tasks.length > 0) {
    return day.tasks.map((t, idx) => ({
      id: t.id || `task-${idx + 1}`,
      title: t.title || t.taskTitle || '',
      description: t.description || t.taskDescription || '',
    }));
  }
  return [
    {
      id: 'task-1',
      title: day.taskTitle || '',
      description: day.taskDescription || '',
    },
  ];
}

export function normalizeDayResources(day: { resources?: any }): ResourceItem[] {
  if (Array.isArray(day.resources)) {
    return day.resources.map((r, idx) => ({
      id: r.id || `res-${idx + 1}`,
      title: r.title || `Resource ${idx + 1}`,
      type: r.type || 'link',
      url: r.url || '',
      filename: r.filename,
      fileSize: r.fileSize,
    }));
  }
  return [];
}

const createEmptyCurriculum = (days: number): DefaultCurriculumItem[] =>
  Array.from({ length: days }, (_, i) => ({
    dayNumber: i + 1,
    taskTitle: '',
    taskDescription: '',
    tasks: [{ id: `task-${i + 1}-1`, title: '', description: '' }],
    resources: [],
  }));

export const DEFAULT_CURRICULUM_BY_LEVEL: Record<string, DefaultCurriculumItem[]> = {
  'Level 1': createEmptyCurriculum(10),
  'Level 2': createEmptyCurriculum(10),
  'Level 3': createEmptyCurriculum(10),
};

/**
 * Generates Batch Name according to system formula:
 * ARVR-[LevelCode]-[BatchNo]-[DDMMMYY]
 * Example output: ARVR-L1-001-18AUG26
 */
export function generateBatchName(
  levelOrObj: string | { level: string; batchNo: string | number; startDate: string | Date },
  batchNoParam?: string | number,
  startDateParam?: string | Date
): string {
  let level: string;
  let batchNo: string | number;
  let startDate: string | Date;

  if (typeof levelOrObj === 'object' && levelOrObj !== null) {
    level = levelOrObj.level;
    batchNo = levelOrObj.batchNo;
    startDate = levelOrObj.startDate;
  } else {
    level = levelOrObj;
    batchNo = batchNoParam || '001';
    startDate = startDateParam || new Date();
  }

  const defaultCode = LEVEL_CONFIG[level]?.code;
  const levelCode = defaultCode || level.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'L1';
  const cleanBatchNo = String(batchNo || '001').padStart(3, '0');

  const d = new Date(startDate);
  if (isNaN(d.getTime())) {
    return `ARVR-${levelCode}-${cleanBatchNo}`;
  }

  const dayStr = String(d.getDate()).padStart(2, '0');
  const monthStr = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const yearStr = String(d.getFullYear()).slice(-2);

  return `ARVR-${levelCode}-${cleanBatchNo}-${dayStr}${monthStr}${yearStr}`;
}

export interface TrainingCalendarDay {
  dayNumber: number;
  date: Date;
  dateStr: string;
  dateDisplay: string;
  taskTitle: string;
  taskDescription: string;
  tasks?: TaskItem[];
  resources?: ResourceItem[];
  isExam: boolean;
  hasForenoon: boolean;
  hasAfternoon: boolean;
}

/**
 * Calculates the total scheduled attendance sessions for a batch training calendar.
 * Correctly accounts for days where Forenoon or Afternoon sessions are off/unscheduled.
 */
export function calculateBatchMaxSessions(
  calendar: Array<{ hasForenoon?: boolean; hasAfternoon?: boolean }> | undefined | null,
  fallbackDays: number = 0
): number {
  if (calendar && calendar.length > 0) {
    return calendar.reduce((sum, day) => {
      const fn = day.hasForenoon !== false ? 1 : 0;
      const an = day.hasAfternoon !== false ? 1 : 0;
      return sum + fn + an;
    }, 0);
  }
  return (fallbackDays > 0 ? fallbackDays : 0) * 2;
}

/**
 * Calculates student attendance percentage based on active scheduled sessions.
 * Never exceeds 100%. Returns 100% if no sessions were scheduled.
 */
export function calculateAttendancePercentage(
  attendedCount: number,
  maxScheduledSessions: number
): number {
  if (maxScheduledSessions <= 0) return 100;
  const pct = Math.round((attendedCount / maxScheduledSessions) * 100);
  return Math.min(100, Math.max(0, pct));
}

/**
 * Generates training days calendar array based on Start Date and Level/Days.
 * The LAST DAY of every batch is designated as the Final Examination.
 */
export function generateTrainingDaysCalendar(
  startDate: string | Date,
  level: string,
  daysCount?: number
): TrainingCalendarDay[] {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return [];

  const defaultList = DEFAULT_CURRICULUM_BY_LEVEL[level] || DEFAULT_CURRICULUM_BY_LEVEL['Level 1'];
  const totalDays = daysCount || LEVEL_CONFIG[level]?.days || defaultList.length;

  const result: TrainingCalendarDay[] = [];
  const current = new Date(start);

  for (let i = 1; i <= totalDays; i++) {
    const dayDate = new Date(current);
    const dateStr = dayDate.toISOString().split('T')[0];
    const dateDisplay = formatDateDisplay(dayDate);
    const isLastDay = i === totalDays;

    const defaultItem = defaultList.find((item) => item.dayNumber === i);
    let taskTitle = defaultItem?.taskTitle || `Day ${i} Spatial Computing Module`;
    let taskDescription = defaultItem?.taskDescription || `Complete Day ${i} practical AR/VR training assignment.`;

    // Institutional Rule: In every batch, the last day is the Final Examination
    if (isLastDay) {
      taskTitle = `Final Examination: ${level} Comprehensive Practical Assessment`;
      taskDescription = `Final practical examination and capstone assessment for ${level}. Complete the required exam module, build and test your solution, and submit your final execution output for grading. Your instructor will evaluate this exam and assign your final certificate grade.`;
    }

    const tasksList = defaultItem?.tasks || [
      { id: `task-${i}-1`, title: taskTitle, description: taskDescription },
    ];
    const resourcesList = defaultItem?.resources || [];

    result.push({
      dayNumber: i,
      date: dayDate,
      dateStr,
      dateDisplay,
      taskTitle,
      taskDescription,
      tasks: tasksList,
      resources: resourcesList,
      isExam: isLastDay,
      hasForenoon: true,
      hasAfternoon: true,
    });

    // Advance 1 calendar day
    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Calculates End Date (Exam Date) given Start Date and Number of Training Days.
 * Day 1 is the Start Date (offset 0). The final training day (Day N) is the Final Examination day and the Batch End Date.
 * Example: For 3 training days starting 17-Sep-2026:
 * Day 1 = 17-Sep, Day 2 = 18-Sep, Day 3 = 19-Sep (Exam Day & End Date).
 */
export function calculateEndDate(startDate: string | Date, trainingDays: number): string {
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return '';
  const days = typeof trainingDays === 'number' && trainingDays > 0 ? trainingDays : 1;
  d.setDate(d.getDate() + (days - 1));
  return d.toISOString().split('T')[0];
}

/**
 * Calculates Exam Date (Equal to Batch End Date, as the final day of the batch is the Exam Day)
 */
export function calculateExamDate(endDate: string | Date): string {
  const d = new Date(endDate);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Format date for display: e.g. 18-Aug-2026
 */
export function formatDateDisplay(dateStr: string | Date): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}
