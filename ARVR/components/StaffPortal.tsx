'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, KeyRound, CheckCircle2, AlertCircle, Sparkles, RefreshCw, 
  Users, Layers, Award, FileSpreadsheet, Plus, Calendar, Search, Star, BarChart3, FileText, Send, ExternalLink, UploadCloud,
  LayoutDashboard, CheckSquare, ChevronRight, ChevronLeft, UserPlus, Info, Edit, Eye, Filter, Check, X, FileCheck, BookOpen, Clock, Save, Settings, Trash2, GraduationCap,
  Paperclip, FileUp, Link as LinkIcon, Download, ListChecks, XCircle, Globe
} from 'lucide-react';
import { LEVEL_CONFIG, generateBatchName, calculateEndDate, calculateExamDate, generateTrainingDaysCalendar, DEFAULT_CURRICULUM_BY_LEVEL, formatDateDisplay } from '@/lib/batchUtils';

interface StaffPortalProps {
  user: any;
  onLoginSuccess: (user: any) => void;
  branding?: any;
  onUpdateBranding?: (branding: any) => void;
  onSwitchToStudent?: () => void;
}

export default function StaffPortal({ user, onLoginSuccess, branding, onUpdateBranding, onSwitchToStudent }: StaffPortalProps) {
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const formatFriendlyError = (err: any, fallback: string = 'Operation failed') => {
    if (!err) return fallback;
    const msg = typeof err === 'string' ? err : err.message || fallback;
    if (msg.includes('Unexpected token') || msg.includes('is not valid JSON') || msg.includes('Server action')) {
      return 'The server encountered an unexpected response. Please try again or refresh.';
    }
    return msg;
  };

  const showSuccess = (msg: string) => {
    setErrorMsg('');
    setSuccessMsg(msg);
  };

  const showError = (errOrMsg: any, fallback?: string) => {
    setSuccessMsg('');
    setErrorMsg(formatFriendlyError(errOrMsg, fallback));
  };

  const parseResponseJson = async (res: Response, fallbackError: string = 'Operation failed') => {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        return await res.json();
      } catch {
        return { error: fallbackError };
      }
    }
    try {
      const text = await res.text();
      if (text.includes('Server action') || text.includes('<!DOCTYPE') || text.includes('<html>')) {
        return { error: fallbackError };
      }
      return { error: text.slice(0, 150) || fallbackError };
    } catch {
      return { error: fallbackError };
    }
  };

  // Active Sub-Tab
  const [staffTab, setStaffTab] = useState<'overview' | 'evaluations' | 'batches' | 'curriculum' | 'calendar' | 'certificates' | 'students' | 'settings'>('overview');

  // Shared Data State
  const [stats, setStats] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Batch selection for sub-views
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batchCalendar, setBatchCalendar] = useState<any[]>([]);

  // Task Submissions Review state
  const [studentsSubmissions, setStudentsSubmissions] = useState<any[]>([]);
  const [selectedDayNumber, setSelectedDayNumber] = useState<string>('');

  // Evaluation Modal state
  const [evaluatingTask, setEvaluatingTask] = useState<any | null>(null);
  const [evalScore, setEvalScore] = useState<number>(85);
  const [evalGrade, setEvalGrade] = useState<string>('A_PLUS');
  const [evalLevel, setEvalLevel] = useState<string>('Level 1 Foundation');
  const [evalComments, setEvalComments] = useState<string>('Excellent VR project implementation.');
  const [submittingEval, setSubmittingEval] = useState(false);

  // Task Portal State & Filters
  const [taskPortalSearch, setTaskPortalSearch] = useState<string>('');
  const [filterSubStatus, setFilterSubStatus] = useState<string>('All');
  const [filterEvalStatus, setFilterEvalStatus] = useState<string>('All');
  const [filterSection, setFilterSection] = useState<string>('All');

  // Edit Task Modal State
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // Certificates & Reports Redesign State
  const [certReportTab, setCertReportTab] = useState<'roster' | 'training' | 'attendance' | 'tasks' | 'performance' | 'completion' | 'certReport'>('roster');
  const [certSearch, setCertSearch] = useState('');
  const [certFilterCompletion, setCertFilterCompletion] = useState('All');
  const [certFilterGrade, setCertFilterGrade] = useState('All');
  const [certFilterLevel, setCertFilterLevel] = useState('All');
  const [certFilterStatus, setCertFilterStatus] = useState('All');

  // Bulk Selection State
  const [selectedCertStudentIds, setSelectedCertStudentIds] = useState<string[]>([]);
  const [exportingCert, setExportingCert] = useState(false);
  const [exportValidationErr, setExportValidationErr] = useState<string | null>(null);

  // View/Edit Certificate Record Modal State
  const [showCertRecordModal, setShowCertRecordModal] = useState(false);
  const [selectedCertRecordStudent, setSelectedCertRecordStudent] = useState<any | null>(null);
  const [editCertNo, setEditCertNo] = useState('');
  const [selectedSubmissionStudent, setSelectedSubmissionStudent] = useState<any | null>(null);
  const [evalPerformance, setEvalPerformance] = useState<string>('Excellent');
  const [showNewRegisterModal, setShowNewRegisterModal] = useState(false);
  const [showRegSuccessModal, setShowRegSuccessModal] = useState(false);
  const [registeredSuccessStudent, setRegisteredSuccessStudent] = useState<any | null>(null);
  const [showAdminProfileModal, setShowAdminProfileModal] = useState(false);

  // Manual Data Change & Certificate Override Modal State
  const [showManualOverrideModal, setShowManualOverrideModal] = useState(false);
  const [overrideStudent, setOverrideStudent] = useState<any | null>(null);
  const [overrideCertNo, setOverrideCertNo] = useState('');
  const [overrideFinalGrade, setOverrideFinalGrade] = useState('A_PLUS');
  const [overrideFinalLevel, setOverrideFinalLevel] = useState('Level 1 Foundation');
  const [overrideIsValid, setOverrideIsValid] = useState(true);
  const [overrideIsManual, setOverrideIsManual] = useState(true);
  const [overrideReason, setOverrideReason] = useState('Admin manual override');
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideActionMsg, setOverrideActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Task Completion Hover Tooltip State & Handlers
  const [hoveredTaskTip, setHoveredTaskTip] = useState<{
    studentName: string;
    registerNo: string;
    totalDays: number;
    completedTasks: any[];
    missingTasks: any[];
    focus: 'submitted' | 'missing' | 'all';
    rect: { top: number; bottom: number; left: number; right: number; width: number; height: number };
  } | null>(null);
  const [tipActiveFilter, setTipActiveFilter] = useState<'all' | 'completed' | 'missing'>('all');
  const taskTipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTaskNumberMouseEnter = (
    item: any,
    focus: 'submitted' | 'missing' | 'all',
    e: React.MouseEvent<HTMLElement>
  ) => {
    if (taskTipTimeoutRef.current) {
      clearTimeout(taskTipTimeoutRef.current);
      taskTipTimeoutRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setTipActiveFilter('all');
    setHoveredTaskTip({
      studentName: item.name,
      registerNo: item.registerNo,
      totalDays: item.tasksBreakdown?.length || ((item.completedTasks?.length || 0) + (item.missingTasks?.length || 0)) || 15,
      completedTasks: item.completedTasks || [],
      missingTasks: item.missingTasks || [],
      focus,
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  const handleTaskNumberMouseLeave = () => {
    taskTipTimeoutRef.current = setTimeout(() => {
      setHoveredTaskTip(null);
    }, 200);
  };

  const handleTooltipMouseEnter = () => {
    if (taskTipTimeoutRef.current) {
      clearTimeout(taskTipTimeoutRef.current);
      taskTipTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    setHoveredTaskTip(null);
  };

  // URL Hash Sync for Deep-linking & Browser Refresh
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'overview') setStaffTab('overview');
      else if (hash === 'curriculum') setStaffTab('curriculum');
      else if (hash === 'batches') setStaffTab('batches');
      else if (hash === 'students') setStaffTab('students');
      else if (hash === 'tasks' || hash === 'evaluations') setStaffTab('evaluations');
      else if (hash === 'certificates' || hash === 'reports') setStaffTab('certificates');
      else if (hash === 'settings') setStaffTab('settings');
    };

    handleHashChange();

    // Check for drive OAuth callback query params
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('drive_connected') === 'true') {
        setStaffTab('settings');
        showSuccess('Google Drive connected successfully!');
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      } else if (searchParams.get('drive_error')) {
        setStaffTab('settings');
        const errParam = searchParams.get('drive_error') || '';
        showError(
          errParam === 'callback_failed' || errParam.includes('invalid_client')
            ? 'Google Drive connection failed: Invalid Google Client ID or Secret. In Google Cloud Console, ensure you copied the OAuth Client Secret (starts with GOCSPX-), not your LMS password.'
            : `Google Drive connection error: ${decodeURIComponent(errParam)}`
        );
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      }
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabSwitch = (tab: 'overview' | 'evaluations' | 'batches' | 'curriculum' | 'calendar' | 'certificates' | 'students' | 'settings') => {
    setErrorMsg('');
    setSuccessMsg('');
    setStaffTab(tab);
    if (tab === 'overview') window.location.hash = 'overview';
    else if (tab === 'batches') window.location.hash = 'batches';
    else if (tab === 'curriculum') window.location.hash = 'curriculum';
    else if (tab === 'students') window.location.hash = 'students';
    else if (tab === 'evaluations') window.location.hash = 'tasks';
    else if (tab === 'certificates') window.location.hash = 'certificates';
    else if (tab === 'settings') window.location.hash = 'settings';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      onLoginSuccess(null);
    } catch (err) {
      window.location.reload();
    }
  };

  const [regForm, setRegForm] = useState({
    name: '',
    registerNo: '',
    contactNumber: '',
    email: '',
    department: 'Computer Science',
    year: '3rd Year',
    section: 'A',
    batchId: '',
    pin: '123456',
  });
  const [registering, setRegistering] = useState(false);

  // Student Search & Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilterBatch, setStudentFilterBatch] = useState('All');
  const [studentFilterDept, setStudentFilterDept] = useState('All');
  const [studentFilterYear, setStudentFilterYear] = useState('All');
  const [studentFilterSec, setStudentFilterSec] = useState('All');
  const [studentFilterStatus, setStudentFilterStatus] = useState('All');

  // Student Profile & Edit Modals
  const [showStudentProfileModal, setShowStudentProfileModal] = useState(false);
  const [profileStudent, setProfileStudent] = useState<any | null>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'attendance' | 'tasks' | 'performance' | 'feedback'>('overview');

  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editStudentData, setEditStudentData] = useState<any | null>(null);
  const [updatingStudent, setUpdatingStudent] = useState(false);

  const handleOpenNewRegistration = () => {
    const defaultBatch = (selectedBatchId && selectedBatchId !== 'All' ? selectedBatchId : batches[0]?.id) || '';
    setRegForm({
      name: '',
      registerNo: '',
      contactNumber: '',
      email: '',
      department: 'Computer Science',
      year: '3rd Year',
      section: 'A',
      batchId: defaultBatch,
      pin: '123456',
    });
    setShowNewRegisterModal(true);
  };

  const handleNewRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!/^\d{6}$/.test(regForm.pin)) {
      setErrorMsg('PIN must be exactly 6 numeric digits (e.g. 123456)');
      return;
    }

    const finalBatchId = regForm.batchId || (selectedBatchId && selectedBatchId !== 'All' ? selectedBatchId : batches[0]?.id) || '';
    if (!finalBatchId) {
      setErrorMsg('Please select a valid training batch for student registration');
      return;
    }

    setRegistering(true);
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...regForm, batchId: finalBatchId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register student');

      setShowNewRegisterModal(false);
      setRegisteredSuccessStudent(data.student);
      setShowRegSuccessModal(true);

      // Refresh student list
      const fetchRes = await fetch('/api/admin/students');
      const fetchJson = await fetchRes.json();
      if (fetchJson.students) setStudents(fetchJson.students);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error registering student');
    } finally {
      setRegistering(false);
    }
  };

  const handleOpenStudentProfile = (student: any) => {
    setProfileStudent(student);
    setProfileTab('overview');
    setShowStudentProfileModal(true);
  };

  const handleOpenEditStudent = (student: any) => {
    setEditStudentData({
      id: student.id,
      name: student.name,
      registerNo: student.registerNo,
      contactNumber: student.contactNumber || '',
      email: student.email || '',
      department: student.department || 'Computer Science',
      year: student.year || '3rd Year',
      section: student.section ? student.section.replace(/^Sec\s*/, '') : 'A',
      batchId: student.batchId,
      status: student.status || 'Active',
    });
    setShowEditStudentModal(true);
  };

  const handleUpdateStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudentData) return;
    setUpdatingStudent(true);
    try {
      const res = await fetch('/api/admin/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editStudentData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update student');

      setSuccessMsg(`Student '${data.student.name}' updated successfully!`);
      setShowEditStudentModal(false);

      // Refresh student list
      const fetchRes = await fetch('/api/admin/students');
      const fetchJson = await fetchRes.json();
      if (fetchJson.students) setStudents(fetchJson.students);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating student profile');
    } finally {
      setUpdatingStudent(false);
    }
  };
  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || !selectedDayNumber) return;
    setSavingTask(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/batches/${selectedBatchId}/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayNumber: Number(selectedDayNumber),
          taskTitle: editTaskTitle,
          taskDescription: editTaskDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update task details');

      setSuccessMsg(`Task details for Day ${selectedDayNumber} updated successfully!`);
      setShowEditTaskModal(false);
      fetchCalendar(selectedBatchId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to edit task');
    } finally {
      setSavingTask(false);
    }
  };

  const [newBatchName, setNewBatchName] = useState('');
  const [newStartDate, setNewStartDate] = useState('2026-09-01');
  const [newEndDate, setNewEndDate] = useState('2026-09-30');
  const [newTrainingDays, setNewTrainingDays] = useState(10);

  // Batches / Curriculum Redesign State
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [createLevel, setCreateLevel] = useState<string>('Level 1');
  const [createNoMode, setCreateNoMode] = useState<'automatic' | 'manual'>('automatic');
  const [createBatchNo, setCreateBatchNo] = useState<string>('001');
  const [createStartDate, setCreateStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [createEndDate, setCreateEndDate] = useState<string>('');
  const [createExamDate, setCreateExamDate] = useState<string>('');
  const [createBatchName, setCreateBatchName] = useState<string>('');
  const [createDaysCount, setCreateDaysCount] = useState<number>(15);
  const [createLevelTasks, setCreateLevelTasks] = useState<{ dayNumber: number; taskTitle: string; taskDescription: string }[]>([]);

  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCurriculumStatus, setFilterCurriculumStatus] = useState('All');

  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [curriculumBatch, setCurriculumBatch] = useState<any | null>(null);
  const [curriculumDays, setCurriculumDays] = useState<{ dayNumber: number; taskTitle: string; taskDescription: string }[]>([]);
  const [savingCurriculum, setSavingCurriculum] = useState(false);

  const [showBatchDetailsModal, setShowBatchDetailsModal] = useState(false);
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<any | null>(null);

  // Settings & Task Configuration Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsSectionTab, setSettingsSectionTab] = useState<'pageDetails' | 'attendance' | 'drive'>('pageDetails');

  // Page & Branding Settings State
  const [pageTitle, setPageTitle] = useState(branding?.pageTitle || 'AR/VR ACADEMY');
  const [pageSubtitle, setPageSubtitle] = useState(branding?.pageSubtitle || 'Spatial Computing & Immersive Training Hub');
  const [pageBadge, setPageBadge] = useState(branding?.pageBadge || 'ENTERPRISE');
  const [browserTitle, setBrowserTitle] = useState(branding?.browserTitle || 'AR/VR Spatial Computing Academy | Immersive Training Platform');
  const [pageDescription, setPageDescription] = useState(
    branding?.pageDescription || 'Enterprise spatial computing academy and immersive training management system with real-time attendance, daily practical tasks, and automated certification.'
  );
  const [orgName, setOrgName] = useState(branding?.orgName || 'AR/VR COE');
  const [footerText, setFooterText] = useState(branding?.footerText || 'AR/VR Spatial Computing Academy © 2026');
  const [supportEmail, setSupportEmail] = useState(branding?.supportEmail || 'support@arvr.com');
  const [loadingPageSettings, setLoadingPageSettings] = useState(false);
  const [savingPageSettings, setSavingPageSettings] = useState(false);
  const [configuredLevels, setConfiguredLevels] = useState<string[]>([]);
  const [levelDisplayNames, setLevelDisplayNames] = useState<Record<string, string>>({});
  const [showAddLevelModal, setShowAddLevelModal] = useState<boolean>(false);
  const [newLevelForm, setNewLevelForm] = useState<{ name: string; days: number }>({ name: '', days: 10 });
  const [newLevelError, setNewLevelError] = useState<string>('');
  const [creatingLevel, setCreatingLevel] = useState<boolean>(false);
  const [settingsActiveLevel, setSettingsActiveLevel] = useState<string>('');
  const [settingsLevelName, setSettingsLevelName] = useState<string>('');
  const [settingsLevelTasks, setSettingsLevelTasks] = useState<{
    dayNumber: number;
    taskTitle: string;
    taskDescription: string;
    tasks?: { id: string; title: string; description: string }[];
    resources?: { id: string; title: string; type: 'pdf' | 'link' | 'video' | 'doc' | 'other'; url: string; filename?: string; fileSize?: number }[];
  }[]>([]);
  const [loadingSettingsTasks, setLoadingSettingsTasks] = useState(false);
  const [savingSettingsTasks, setSavingSettingsTasks] = useState(false);
  const [uploadingResourceKey, setUploadingResourceKey] = useState<string | null>(null);

  // Attendance Settings State
  const [settingsFnStart, setSettingsFnStart] = useState<string>('08:30');
  const [settingsFnCutoff, setSettingsFnCutoff] = useState<string>('09:00');
  const [settingsAnStart, setSettingsAnStart] = useState<string>('12:40');
  const [settingsAnCutoff, setSettingsAnCutoff] = useState<string>('13:10');
  const [loadingAttendanceSettings, setLoadingAttendanceSettings] = useState<boolean>(false);
  const [savingAttendanceSettings, setSavingAttendanceSettings] = useState<boolean>(false);

  // Google Drive OAuth Connection State
  const [driveStorageInfo, setDriveStorageInfo] = useState<{
    isConnected: boolean;
    hasConnectionRecord?: boolean;
    isHealthy?: boolean;
    connectedAccount?: string | null;
    status: string;
    message?: string;
    clientId?: string;
    hasSecret?: boolean;
    redirectUri?: string;
  } | null>(null);
  const [loadingDriveSettings, setLoadingDriveSettings] = useState<boolean>(false);
  const [testingDriveConn, setTestingDriveConn] = useState<boolean>(false);
  const [disconnectingDrive, setDisconnectingDrive] = useState<boolean>(false);
  const [connectingDrive, setConnectingDrive] = useState<boolean>(false);
  const [savingDriveCreds, setSavingDriveCreds] = useState<boolean>(false);
  const [googleClientIdInput, setGoogleClientIdInput] = useState<string>('');
  const [googleClientSecretInput, setGoogleClientSecretInput] = useState<string>('');
  const [driveCredsSuccessMsg, setDriveCredsSuccessMsg] = useState<string | null>(null);
  const [driveCredsErrorMsg, setDriveCredsErrorMsg] = useState<string | null>(null);
  const [testResultMsg, setTestResultMsg] = useState<string | null>(null);
  const [testResultSuccess, setTestResultSuccess] = useState<boolean>(true);

  // Manual Date Edit State in Curriculum Modal
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [curriculumCalendarDays, setCurriculumCalendarDays] = useState<{
    dayNumber: number;
    dateStr: string;
    taskTitle: string;
    taskDescription: string;
    tasks?: { id: string; title: string; description: string }[];
    resources?: { id: string; title: string; type: 'pdf' | 'link' | 'video' | 'doc' | 'other'; url: string; filename?: string; fileSize?: number }[];
    isManualOverride?: boolean;
  }[]>([]);
  const [showRegenerateConfirmModal, setShowRegenerateConfirmModal] = useState(false);

  const getNextBatchNo = (existingBatches: any[]) => {
    let maxNo = 0;
    for (const b of existingBatches) {
      if (b.batchNo) {
        const num = parseInt(b.batchNo.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxNo) maxNo = num;
      }
    }
    return String(maxNo + 1).padStart(3, '0');
  };

  const fetchLevelConfigForCreate = async (level: string, startDateVal?: string, batchNoVal?: string) => {
    const sDate = startDateVal || createStartDate;
    const bNo = batchNoVal || createBatchNo;
    try {
      const res = await fetch(`/api/admin/settings/tasks?level=${encodeURIComponent(level)}`);
      const data = await res.json();
      let fetchedDays = 15;
      let fetchedTasks: any[] = [];

      if (data.tasks && Array.isArray(data.tasks)) {
        fetchedTasks = data.tasks;
        fetchedDays = data.days || data.tasks.length;
      } else {
        fetchedDays = LEVEL_CONFIG[level]?.days || 15;
        fetchedTasks = DEFAULT_CURRICULUM_BY_LEVEL[level] || DEFAULT_CURRICULUM_BY_LEVEL['Level 1'];
      }

      setCreateDaysCount(fetchedDays);
      setCreateLevelTasks(fetchedTasks);

      const endStr = calculateEndDate(sDate, fetchedDays);
      setCreateEndDate(endStr);
      setCreateExamDate(calculateExamDate(endStr));
      setCreateBatchName(generateBatchName({ level, batchNo: bNo, startDate: sDate }));
    } catch (err) {
      const fallbackDays = LEVEL_CONFIG[level]?.days || 15;
      setCreateDaysCount(fallbackDays);
      const endStr = calculateEndDate(sDate, fallbackDays);
      setCreateEndDate(endStr);
      setCreateExamDate(calculateExamDate(endStr));
      setCreateBatchName(generateBatchName({ level, batchNo: bNo, startDate: sDate }));
    }
  };

  const handleOpenCreateBatchModal = () => {
    const autoNo = getNextBatchNo(batches);
    const initialLvl = configuredLevels.length > 0 ? configuredLevels[0] : 'Level 1';
    setCreateLevel(initialLvl);
    setCreateNoMode('automatic');
    setCreateBatchNo(autoNo);
    const todayStr = new Date().toISOString().split('T')[0];
    setCreateStartDate(todayStr);
    fetchLevelConfigForCreate(initialLvl, todayStr, autoNo);
    setShowCreateBatchModal(true);
  };

  const handleLevelChange = (newLevel: string) => {
    setCreateLevel(newLevel);
    fetchLevelConfigForCreate(newLevel, createStartDate, createBatchNo);
  };

  const handleNoModeChange = (mode: 'automatic' | 'manual') => {
    setCreateNoMode(mode);
    let no = createBatchNo;
    if (mode === 'automatic') {
      no = getNextBatchNo(batches);
      setCreateBatchNo(no);
    }
    setCreateBatchName(generateBatchName({ level: createLevel, batchNo: no, startDate: createStartDate }));
  };

  const handleBatchNoChange = (val: string) => {
    setCreateBatchNo(val);
    setCreateBatchName(generateBatchName({ level: createLevel, batchNo: val, startDate: createStartDate }));
  };

  const handleStartDateChange = (val: string) => {
    setCreateStartDate(val);
    const endStr = calculateEndDate(val, createDaysCount);
    setCreateEndDate(endStr);
    setCreateExamDate(calculateExamDate(endStr));
    setCreateBatchName(generateBatchName({ level: createLevel, batchNo: createBatchNo, startDate: val }));
  };

  const handleCreateBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createBatchName,
          batchNo: createBatchNo,
          level: createLevel,
          startDate: createStartDate,
          endDate: createEndDate,
          trainingDays: createDaysCount,
          status: 'ACTIVE',
          curriculumStatus: 'Not Set',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create batch');
      }

      setSuccessMsg(`Batch '${data.batch.name}' created successfully!`);
      setShowCreateBatchModal(false);

      // Refresh batches list
      const fetchRes = await fetch('/api/admin/batches');
      const fetchJson = await fetchRes.json();
      if (fetchJson.batches) setBatches(fetchJson.batches);

      // Immediately open Set Curriculum for newly created batch
      handleOpenCurriculumModal(data.batch);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating batch');
    }
  };

  const DEFAULT_ARVR_TOPICS: { title: string; desc: string }[] = [
    { title: 'Unity VR Setup & XR Interaction Toolkit', desc: 'Initialize Unity XR project, set up Rig, Controllers and basic locomotion.' },
    { title: '3D Asset Import & Spatial Audio', desc: 'Import 3D models into Unity, configure colliders, materials, and 3D spatial sound sources.' },
    { title: 'Raycast & Socket Interactors', desc: 'Implement object grab interactors, raycast pointers, and socket snap points for VR tools.' },
    { title: 'Augmented Reality Image Tracking', desc: 'Set up AR Foundation, AR Tracked Image Manager, and overlay 3D AR content on target images.' },
    { title: 'AR Plane Detection & Hit Testing', desc: 'Detect surface planes in real world and instantiate AR models via touch raycasting.' },
    { title: 'VR UI Canvas & World Space Menus', desc: 'Create interactive 3D VR user interfaces and laser pointer UI interactions.' },
    { title: 'XR Physics & Haptic Feedback', desc: 'Configure rigidbody VR physics, velocity tracking grab, and controller haptic pulses.' },
    { title: 'Pass-through & Mixed Reality Setup', desc: 'Configure Quest Passthrough, MR environment blend, and real-world occlusion.' },
    { title: 'Spatial Anchors & Environment Persistence', desc: 'Implement spatial anchor saving and loading for persistent AR/VR experiences.' },
    { title: 'Hand Tracking & Gesture Recognition', desc: 'Set up XR Hand Tracking, pinch gestures, and controllerless interaction.' },
    { title: 'VR Teleportation & Comfort Options', desc: 'Configure teleportation locomotion, vignette motion comfort, and snap turn.' },
    { title: 'Lighting, Shaders & VR Optimization', desc: 'Optimize draw calls, baked lighting, occlusion culling, and mobile VR shaders.' },
    { title: 'Multiplayer VR & Networked Transforms', desc: 'Set up multiplayer VR avatars and synchronized object interactions using Netcode.' },
    { title: 'VR Animation & Inverse Kinematics (IK)', desc: 'Configure VR avatar IK body tracking, arm reach, and interactive animations.' },
    { title: 'Final Project Build, Testing & Deployment', desc: 'Build standalone APK for VR headset, perform performance profiling, and submit capstone project.' },
    { title: 'Advanced Shader Graph & Visual Effects', desc: 'Create custom hologram shaders, particle effects, and spatial VFX for VR.' },
    { title: 'AR Face Tracking & Filter Effects', desc: 'Implement face mesh detection, facial blend shapes, and interactive AR filters.' },
    { title: 'Spatial Audio Occlusion & Reverb Zones', desc: 'Configure acoustic occlusion, room reverb reflection, and HRTF 3D audio.' },
    { title: 'Eye Tracking & Foveated Rendering', desc: 'Implement gaze interaction, eye tracking data, and dynamic foveated rendering.' },
    { title: 'VR Physics Mechanics & Vehicle Sim', desc: 'Build interactive steering wheel, physics levers, and vehicle physics in VR.' },
    { title: 'CAD to VR Optimization Workflow', desc: 'Decimate high-poly CAD models, generate LODs, and optimize materials for XR.' },
    { title: 'WebXR & Cross-Platform XR Deployment', desc: 'Deploy immersive AR/VR experiences for Web Browser using WebXR standard.' },
    { title: 'Enterprise VR Training Scenario Design', desc: 'Design branched decision trees and safety training simulations in VR.' },
    { title: 'Performance Profiling & Memory Management', desc: 'Use Unity Profiler, Frame Debugger, and memory analyzer for 90 FPS VR target.' },
    { title: 'Capstone Assessment & Exhibition', desc: 'Present completed AR/VR spatial computing application to evaluation panel.' },
  ];

  const handleResourceFileUpload = async (
    file: File,
    onSuccess: (url: string, filename: string, type: 'pdf' | 'link' | 'video' | 'doc' | 'other') => void,
    key: string
  ) => {
    setUploadingResourceKey(key);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/resources/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await parseResponseJson(res, 'Failed to upload resource file');
      if (!res.ok) throw new Error(data.error || 'Failed to upload resource file');
      onSuccess(data.url, data.filename, data.type);
      showSuccess(`✓ File '${data.filename}' uploaded successfully!`);
    } catch (err: any) {
      showError(err, 'File upload failed');
    } finally {
      setUploadingResourceKey(null);
    }
  };

  const fetchConfiguredLevels = async () => {
    try {
      const res = await fetch('/api/admin/settings/tasks?action=levels');
      const data = await res.json();
      if (data.configuredLevels && Array.isArray(data.configuredLevels)) {
        setConfiguredLevels(data.configuredLevels);
      }
      if (data.levelDisplayNames && typeof data.levelDisplayNames === 'object') {
        setLevelDisplayNames((prev) => ({ ...prev, ...data.levelDisplayNames }));
      }
    } catch (e) {}
  };

  const fetchSettingsTasks = async (level?: string) => {
    setLoadingSettingsTasks(true);
    try {
      const url = level ? `/api/admin/settings/tasks?level=${encodeURIComponent(level)}` : '/api/admin/settings/tasks';
      const res = await fetch(url);
      const data = await parseResponseJson(res, 'Failed to load level task configuration');
      if (!res.ok) return;
      if (data.configuredLevels && Array.isArray(data.configuredLevels)) {
        setConfiguredLevels(data.configuredLevels);
        if (data.configuredLevels.length === 0) {
          setSettingsActiveLevel('');
          setSettingsLevelName('');
          setSettingsLevelTasks([]);
          return;
        }
      }
      if (data.levelDisplayNames && typeof data.levelDisplayNames === 'object') {
        setLevelDisplayNames((prev) => ({ ...prev, ...data.levelDisplayNames }));
      }
      const activeLvl = data.level || level || (data.configuredLevels?.[0] || '');
      setSettingsActiveLevel(activeLvl);
      if (data.tasks) {
        const normalized = data.tasks.map((t: any) => ({
          ...t,
          tasks: (t.tasks && Array.isArray(t.tasks) && t.tasks.length > 0)
            ? t.tasks
            : [{ id: `task-${t.dayNumber}-1`, title: t.taskTitle || `Day ${t.dayNumber} Task`, description: t.taskDescription || '' }],
          resources: Array.isArray(t.resources) ? t.resources : [],
        }));
        setSettingsLevelTasks(normalized);
        const resolvedName = data.levelName || levelDisplayNames[activeLvl] || LEVEL_CONFIG[activeLvl]?.name || activeLvl;
        setSettingsLevelName(resolvedName);
        if (data.levelName && activeLvl) {
          setLevelDisplayNames((prev) => ({ ...prev, [activeLvl]: data.levelName }));
        }
      }
    } catch (err) {
      console.warn('Failed to load level task configuration:', err);
    } finally {
      setLoadingSettingsTasks(false);
    }
  };

  const fetchAttendanceSettings = async () => {
    setLoadingAttendanceSettings(true);
    try {
      const res = await fetch('/api/admin/settings/attendance');
      const data = await parseResponseJson(res, 'Failed to load attendance settings');
      if (!res.ok) return;
      if (data.fnStart) setSettingsFnStart(data.fnStart);
      if (data.fnCutoff) setSettingsFnCutoff(data.fnCutoff);
      if (data.anStart) setSettingsAnStart(data.anStart);
      if (data.anCutoff) setSettingsAnCutoff(data.anCutoff);
    } catch (err) {
      console.warn('Failed to load attendance settings:', err);
    } finally {
      setLoadingAttendanceSettings(false);
    }
  };

  useEffect(() => {
    if (branding) {
      if (branding.pageTitle) setPageTitle(branding.pageTitle);
      if (branding.pageSubtitle) setPageSubtitle(branding.pageSubtitle);
      if (branding.pageBadge) setPageBadge(branding.pageBadge);
      if (branding.browserTitle) setBrowserTitle(branding.browserTitle);
      if (branding.pageDescription) setPageDescription(branding.pageDescription);
      if (branding.orgName) setOrgName(branding.orgName);
      if (branding.footerText) setFooterText(branding.footerText);
      if (branding.supportEmail) setSupportEmail(branding.supportEmail);
    }
  }, [branding]);

  const fetchPageSettings = async () => {
    setLoadingPageSettings(true);
    try {
      const res = await fetch('/api/admin/settings/page-details');
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.pageTitle) setPageTitle(data.pageTitle);
        if (data.pageSubtitle) setPageSubtitle(data.pageSubtitle);
        if (data.pageBadge) setPageBadge(data.pageBadge);
        if (data.browserTitle) setBrowserTitle(data.browserTitle);
        if (data.pageDescription) setPageDescription(data.pageDescription);
        if (data.orgName) setOrgName(data.orgName);
        if (data.footerText) setFooterText(data.footerText);
        if (data.supportEmail) setSupportEmail(data.supportEmail);
      }
    } catch (err) {
      console.warn('Failed to load page settings:', err);
    } finally {
      setLoadingPageSettings(false);
    }
  };

  const handleSavePageSettings = async () => {
    setSavingPageSettings(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = {
        pageTitle,
        pageSubtitle,
        pageBadge,
        browserTitle,
        pageDescription,
        orgName,
        footerText,
        supportEmail,
      };

      const res = await fetch('/api/admin/settings/page-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await parseResponseJson(res, 'Failed to save page settings');
      if (!res.ok) throw new Error(data.error || 'Failed to save page settings');

      showSuccess('✓ Page title and branding details saved successfully!');

      if (onUpdateBranding) {
        onUpdateBranding(data);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('branding-updated', { detail: data }));
        if (data.browserTitle) {
          document.title = data.browserTitle;
        }
      }
    } catch (err: any) {
      showError(err, 'Error saving page settings');
    } finally {
      setSavingPageSettings(false);
    }
  };

  const handleResetPageSettingsToDefault = () => {
    setPageTitle('AR/VR ACADEMY');
    setPageSubtitle('Spatial Computing & Immersive Training Hub');
    setPageBadge('ENTERPRISE');
    setBrowserTitle('AR/VR Spatial Computing Academy | Immersive Training Platform');
    setPageDescription('Enterprise spatial computing academy and immersive training management system with real-time attendance, daily practical tasks, and automated certification.');
    setOrgName('AR/VR COE');
    setFooterText('AR/VR Spatial Computing Academy © 2026');
    setSupportEmail('support@arvr.com');
  };

  const handleSaveAttendanceSettings = async () => {
    setSavingAttendanceSettings(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/settings/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fnStart: settingsFnStart,
          fnCutoff: settingsFnCutoff,
          anStart: settingsAnStart,
          anCutoff: settingsAnCutoff,
        }),
      });

      const data = await parseResponseJson(res, 'Failed to save attendance settings');
      if (!res.ok) throw new Error(data.error || 'Failed to save attendance settings');

      showSuccess('✓ Attendance window settings saved successfully!');
    } catch (err: any) {
      showError(err, 'Error saving attendance settings');
    } finally {
      setSavingAttendanceSettings(false);
    }
  };

  const fetchDriveSettings = async () => {
    setLoadingDriveSettings(true);
    try {
      const res = await fetch('/api/admin/settings/drive');
      const data = await parseResponseJson(res, 'Failed to load Google Drive connection status');
      if (!res.ok) return;
      setDriveStorageInfo({
        isConnected: Boolean(data.isConnected),
        hasConnectionRecord: Boolean(data.hasConnectionRecord),
        isHealthy: Boolean(data.isHealthy),
        connectedAccount: data.connectedAccount,
        status: data.status || (data.isConnected ? 'Connected ✓' : 'Not Connected'),
        message: data.message,
        clientId: data.clientId,
        hasSecret: data.hasSecret,
        redirectUri: data.redirectUri,
      });
      if (data.clientId && !googleClientIdInput) {
        setGoogleClientIdInput(data.clientId);
      }
    } catch (err) {
      console.warn('Failed to load Google Drive connection status:', err);
    } finally {
      setLoadingDriveSettings(false);
    }
  };

  const handleSaveDriveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDriveCreds(true);
    setDriveCredsSuccessMsg(null);
    setDriveCredsErrorMsg(null);

    if (googleClientSecretInput && (googleClientSecretInput.toLowerCase().includes('admin') || googleClientSecretInput.length < 15)) {
      setDriveCredsErrorMsg('Warning: Google Client Secret must be from Google Cloud Console (starts with GOCSPX-), not your LMS admin password.');
      setSavingDriveCreds(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/settings/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: googleClientIdInput,
          clientSecret: googleClientSecretInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save Google credentials');

      setDriveCredsSuccessMsg('✓ Google OAuth credentials saved successfully in database!');
      setGoogleClientSecretInput('');
      fetchDriveSettings();
    } catch (err: any) {
      setDriveCredsErrorMsg(err.message || 'Failed to save credentials');
    } finally {
      setSavingDriveCreds(false);
    }
  };

  const handleConnectDrive = async () => {
    setConnectingDrive(true);
    setTestResultMsg(null);
    try {
      const res = await fetch('/api/google-drive/oauth/connect');
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Failed to initiate Google OAuth connection.');
      window.location.href = data.url;
    } catch (err: any) {
      setTestResultMsg(err.message || 'Failed to connect Google Drive');
      setTestResultSuccess(false);
    } finally {
      setConnectingDrive(false);
    }
  };

  const handleTestDriveConnection = async () => {
    setTestingDriveConn(true);
    setTestResultMsg(null);
    try {
      const res = await fetch('/api/admin/settings/drive/test', { method: 'POST' });
      const data = await res.json();
      setTestResultMsg(data.message);
      setTestResultSuccess(data.success);
    } catch (err: any) {
      setTestResultMsg('✗ Google Drive connection failed.');
      setTestResultSuccess(false);
    } finally {
      setTestingDriveConn(false);
    }
  };

  const handleDisconnectDrive = async () => {
    setDisconnectingDrive(true);
    setTestResultMsg(null);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/settings/drive/disconnect', { method: 'POST' });
      const data = await parseResponseJson(res, 'Failed to disconnect');
      if (res.ok) {
        showSuccess('Google Drive account disconnected successfully.');
        fetchDriveSettings();
      } else {
        throw new Error(data.error || 'Failed to disconnect');
      }
    } catch (err: any) {
      showError(err, 'Failed to disconnect Google Drive');
    } finally {
      setDisconnectingDrive(false);
    }
  };

  const handleOpenSettingsModal = () => {
    if (user && user.role !== 'ADMIN') {
      showError('Access restricted: System configuration settings are restricted to Academy Administrators.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setSettingsSectionTab('attendance');
    fetchAttendanceSettings();
    fetchDriveSettings();
    handleTabSwitch('settings');
  };

  const handleNavigateToCurriculum = () => {
    if (user && user.role !== 'ADMIN') {
      showError('Access restricted: Curriculum configuration is restricted to Academy Administrators.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    const lvl = settingsActiveLevel || (configuredLevels.length > 0 ? configuredLevels[0] : '');
    setSettingsActiveLevel(lvl);
    fetchSettingsTasks(lvl);
    handleTabSwitch('curriculum');
  };

  const handleSettingsLevelSwitch = (level: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setSettingsActiveLevel(level);
    fetchSettingsTasks(level);
  };

  useEffect(() => {
    if (staffTab === 'curriculum') {
      fetchSettingsTasks(settingsActiveLevel);
    } else if (staffTab === 'settings') {
      fetchAttendanceSettings();
      fetchDriveSettings();
    }
  }, [staffTab]);

  const handleOpenAddLevelModal = () => {
    setNewLevelForm({ name: '', days: 10 });
    setNewLevelError('');
    setShowAddLevelModal(true);
  };

  const handleConfirmAddLevel = async () => {
    const name = newLevelForm.name.trim();
    if (!name) {
      setNewLevelError('Please provide a name for this training level.');
      return;
    }
    // Only check against currently configured levels (case-insensitive)
    if (configuredLevels.some((lvl) => lvl.toLowerCase() === name.toLowerCase())) {
      setNewLevelError('A level with this name already exists.');
      return;
    }

    const days = Math.max(1, Math.min(60, Number(newLevelForm.days) || 10));
    const newLevelKey = name;
    const updatedLevels = [...configuredLevels.filter((l) => l !== newLevelKey), newLevelKey];

    const initialTasks = Array.from({ length: days }, (_, i) => {
      const dayNum = i + 1;
      const isExam = dayNum === days;
      return {
        dayNumber: dayNum,
        taskTitle: isExam ? `Final Examination: ${name} Practical Assessment` : `Day ${dayNum} Assignment`,
        taskDescription: '',
        tasks: [
          {
            id: `task-${dayNum}-1`,
            title: isExam ? `Final Exam Practical Evaluation` : `Day ${dayNum} Assignment`,
            description: '',
          },
        ],
        resources: [],
      };
    });

    setCreatingLevel(true);
    setNewLevelError('');
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/settings/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: newLevelKey,
          levelName: name,
          days,
          tasks: initialTasks,
          updateLevelsList: updatedLevels,
        }),
      });
      const data = await parseResponseJson(res, 'Failed to save new training level');
      if (!res.ok) throw new Error(data.error || 'Failed to save new training level');

      const returnedLevels = (data.configuredLevels && Array.isArray(data.configuredLevels))
        ? data.configuredLevels
        : updatedLevels;

      setConfiguredLevels(returnedLevels);
      setLevelDisplayNames((prev) => ({ ...prev, [newLevelKey]: name }));
      setSettingsActiveLevel(newLevelKey);
      setSettingsLevelName(name);
      setSettingsLevelTasks(initialTasks);
      setShowAddLevelModal(false);
      showSuccess(`✓ Successfully created and saved training level "${name}" with ${days} training days!`);
    } catch (err: any) {
      setNewLevelError(formatFriendlyError(err, 'Failed to create training level.'));
    } finally {
      setCreatingLevel(false);
    }
  };

  const handleRemoveSettingsLevel = async () => {
    if (!settingsActiveLevel || configuredLevels.length === 0) return;
    const levelToRemove = settingsActiveLevel;
    const levelLabel = levelDisplayNames[levelToRemove] || levelToRemove;
    if (!window.confirm(`Are you sure you want to remove the level "${levelLabel}"? This will delete its curriculum settings.`)) {
      return;
    }

    try {
      setErrorMsg('');
      setSuccessMsg('');
      const res = await fetch(`/api/admin/settings/tasks?level=${encodeURIComponent(levelToRemove)}`, {
        method: 'DELETE',
      });
      const data = await parseResponseJson(res, 'Failed to remove level');
      if (!res.ok) throw new Error(data.error || 'Failed to remove level');

      const updatedLevels = configuredLevels.filter((lvl) => lvl !== levelToRemove);
      setConfiguredLevels(updatedLevels);
      setLevelDisplayNames((prev) => {
        const next = { ...prev };
        delete next[levelToRemove];
        return next;
      });

      const nextActive = updatedLevels.length > 0 ? (updatedLevels[updatedLevels.length - 1] || updatedLevels[0]) : '';
      setSettingsActiveLevel(nextActive);
      if (nextActive) {
        fetchSettingsTasks(nextActive);
      } else {
        setSettingsLevelName('');
        setSettingsLevelTasks([]);
      }

      showSuccess(`✓ Level "${levelLabel}" removed from configuration.`);
    } catch (err: any) {
      showError(err, 'Failed to remove level');
    }
  };

  // Multi-Task & Resource Management Handlers
  const handleAddTask = (dayIdx: number, isCurriculum: boolean = false) => {
    if (isCurriculum) {
      const updated = [...curriculumCalendarDays];
      const curTasks = updated[dayIdx].tasks || [
        { id: `task-${updated[dayIdx].dayNumber}-1`, title: updated[dayIdx].taskTitle, description: updated[dayIdx].taskDescription }
      ];
      const newId = `task-${updated[dayIdx].dayNumber}-${curTasks.length + 1}`;
      updated[dayIdx].tasks = [...curTasks, { id: newId, title: '', description: '' }];
      setCurriculumCalendarDays(updated);
    } else {
      const updated = [...settingsLevelTasks];
      const curTasks = updated[dayIdx].tasks || [
        { id: `task-${updated[dayIdx].dayNumber}-1`, title: updated[dayIdx].taskTitle, description: updated[dayIdx].taskDescription }
      ];
      const newId = `task-${updated[dayIdx].dayNumber}-${curTasks.length + 1}`;
      updated[dayIdx].tasks = [...curTasks, { id: newId, title: '', description: '' }];
      setSettingsLevelTasks(updated);
    }
  };

  const handleRemoveTask = (dayIdx: number, taskIdx: number, isCurriculum: boolean = false) => {
    if (isCurriculum) {
      const updated = [...curriculumCalendarDays];
      if (!updated[dayIdx].tasks || updated[dayIdx].tasks!.length <= 1) return;
      updated[dayIdx].tasks = updated[dayIdx].tasks!.filter((_, i) => i !== taskIdx);
      updated[dayIdx].taskTitle = updated[dayIdx].tasks![0].title;
      updated[dayIdx].taskDescription = updated[dayIdx].tasks![0].description;
      setCurriculumCalendarDays(updated);
    } else {
      const updated = [...settingsLevelTasks];
      if (!updated[dayIdx].tasks || updated[dayIdx].tasks!.length <= 1) return;
      updated[dayIdx].tasks = updated[dayIdx].tasks!.filter((_, i) => i !== taskIdx);
      updated[dayIdx].taskTitle = updated[dayIdx].tasks![0].title;
      updated[dayIdx].taskDescription = updated[dayIdx].tasks![0].description;
      setSettingsLevelTasks(updated);
    }
  };

  const handleTaskFieldChange = (dayIdx: number, taskIdx: number, field: 'title' | 'description', value: string, isCurriculum: boolean = false) => {
    if (isCurriculum) {
      const updated = [...curriculumCalendarDays];
      const curTasks = [...(updated[dayIdx].tasks || [
        { id: `task-${updated[dayIdx].dayNumber}-1`, title: updated[dayIdx].taskTitle, description: updated[dayIdx].taskDescription }
      ])];
      curTasks[taskIdx] = { ...curTasks[taskIdx], [field]: value };
      updated[dayIdx].tasks = curTasks;
      if (taskIdx === 0) {
        if (field === 'title') updated[dayIdx].taskTitle = value;
        if (field === 'description') updated[dayIdx].taskDescription = value;
      }
      setCurriculumCalendarDays(updated);
    } else {
      const updated = [...settingsLevelTasks];
      const curTasks = [...(updated[dayIdx].tasks || [
        { id: `task-${updated[dayIdx].dayNumber}-1`, title: updated[dayIdx].taskTitle, description: updated[dayIdx].taskDescription }
      ])];
      curTasks[taskIdx] = { ...curTasks[taskIdx], [field]: value };
      updated[dayIdx].tasks = curTasks;
      if (taskIdx === 0) {
        if (field === 'title') updated[dayIdx].taskTitle = value;
        if (field === 'description') updated[dayIdx].taskDescription = value;
      }
      setSettingsLevelTasks(updated);
    }
  };

  const handleAddResource = (dayIdx: number, isCurriculum: boolean = false) => {
    if (isCurriculum) {
      const updated = [...curriculumCalendarDays];
      const curRes = updated[dayIdx].resources || [];
      const newId = `res-${updated[dayIdx].dayNumber}-${curRes.length + 1}`;
      updated[dayIdx].resources = [...curRes, { id: newId, title: '', type: 'pdf', url: '' }];
      setCurriculumCalendarDays(updated);
    } else {
      const updated = [...settingsLevelTasks];
      const curRes = updated[dayIdx].resources || [];
      const newId = `res-${updated[dayIdx].dayNumber}-${curRes.length + 1}`;
      updated[dayIdx].resources = [...curRes, { id: newId, title: '', type: 'pdf', url: '' }];
      setSettingsLevelTasks(updated);
    }
  };

  const handleRemoveResource = (dayIdx: number, resIdx: number, isCurriculum: boolean = false) => {
    if (isCurriculum) {
      const updated = [...curriculumCalendarDays];
      if (!updated[dayIdx].resources) return;
      updated[dayIdx].resources = updated[dayIdx].resources!.filter((_, i) => i !== resIdx);
      setCurriculumCalendarDays(updated);
    } else {
      const updated = [...settingsLevelTasks];
      if (!updated[dayIdx].resources) return;
      updated[dayIdx].resources = updated[dayIdx].resources!.filter((_, i) => i !== resIdx);
      setSettingsLevelTasks(updated);
    }
  };

  const handleResourceFieldChange = (dayIdx: number, resIdx: number, field: 'title' | 'type' | 'url', value: string, isCurriculum: boolean = false) => {
    if (isCurriculum) {
      const updated = [...curriculumCalendarDays];
      const curRes = [...(updated[dayIdx].resources || [])];
      curRes[resIdx] = { ...curRes[resIdx], [field]: value as any };
      updated[dayIdx].resources = curRes;
      setCurriculumCalendarDays(updated);
    } else {
      const updated = [...settingsLevelTasks];
      const curRes = [...(updated[dayIdx].resources || [])];
      curRes[resIdx] = { ...curRes[resIdx], [field]: value as any };
      updated[dayIdx].resources = curRes;
      setSettingsLevelTasks(updated);
    }
  };

  const handleResourceUploadSuccess = (dayIdx: number, resIdx: number, url: string, filename: string, type: any, isCurriculum: boolean = false) => {
    if (isCurriculum) {
      const updated = [...curriculumCalendarDays];
      const curRes = [...(updated[dayIdx].resources || [])];
      curRes[resIdx] = {
        ...curRes[resIdx],
        url,
        filename,
        title: curRes[resIdx]?.title || filename.replace(/_/g, ' '),
        type: type || 'pdf',
      };
      updated[dayIdx].resources = curRes;
      setCurriculumCalendarDays(updated);
    } else {
      const updated = [...settingsLevelTasks];
      const curRes = [...(updated[dayIdx].resources || [])];
      curRes[resIdx] = {
        ...curRes[resIdx],
        url,
        filename,
        title: curRes[resIdx]?.title || filename.replace(/_/g, ' '),
        type: type || 'pdf',
      };
      updated[dayIdx].resources = curRes;
      setSettingsLevelTasks(updated);
    }
  };

  const handleAddSettingsDay = () => {
    const nextDayNum = settingsLevelTasks.length + 1;
    // If the previous last day had the default Final Exam title, rename it to a normal module
    const updatedPrev = settingsLevelTasks.map((t, idx) => {
      if (idx === settingsLevelTasks.length - 1 && t.taskTitle?.toLowerCase().startsWith('final exam')) {
        const title = `Day ${t.dayNumber} Spatial Computing Module`;
        const description = `Complete Day ${t.dayNumber} practical AR/VR training assignment.`;
        return {
          ...t,
          taskTitle: title,
          taskDescription: description,
          tasks: (t.tasks && t.tasks.length > 0) ? t.tasks : [{ id: `task-${t.dayNumber}-1`, title, description }],
        };
      }
      return t;
    });

    const examTitle = `Final Examination: ${settingsActiveLevel} Comprehensive Practical Assessment`;
    const examDesc = `Final practical examination and capstone assessment for ${settingsActiveLevel}. Complete the required exam module, build and test your solution, and submit your final execution output for grading. Your instructor will evaluate this exam and assign your final certificate grade.`;

    const newDay = {
      dayNumber: nextDayNum,
      taskTitle: examTitle,
      taskDescription: examDesc,
      tasks: [{ id: `task-${nextDayNum}-1`, title: examTitle, description: examDesc }],
      resources: [],
    };
    setSettingsLevelTasks([...updatedPrev, newDay]);
  };

  const handleDeleteSettingsDay = (index: number) => {
    if (settingsLevelTasks.length <= 1) {
      setErrorMsg('A level must contain at least 1 training day.');
      return;
    }
    const updated = settingsLevelTasks
      .filter((_, i) => i !== index)
      .map((day, idx) => ({
        ...day,
        dayNumber: idx + 1,
      }));
    setSettingsLevelTasks(updated);
  };

  const handleClearCurriculum = () => {
    if (confirm(`Clear all curriculum tasks and details for '${settingsLevelName || settingsActiveLevel}'? This will reset all days to empty fields.`)) {
      setSettingsLevelName(settingsActiveLevel);
      setSettingsLevelTasks(
        Array.from({ length: 1 }, (_, i) => ({
          dayNumber: 1,
          taskTitle: '',
          taskDescription: '',
          tasks: [{ id: 'task-1-1', title: '', description: '' }],
          resources: [],
        }))
      );
      showSuccess(`✓ All curriculum tasks for '${settingsActiveLevel}' have been cleared.`);
    }
  };

  const handleSaveSettingsTasks = async () => {
    if (!settingsActiveLevel) {
      showError('Please select or add a training level first.');
      return;
    }
    setSavingSettingsTasks(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const sanitizedTasks = settingsLevelTasks.map((day) => {
        const primaryTask = day.tasks?.[0];
        return {
          ...day,
          taskTitle: primaryTask?.title || day.taskTitle || `Day ${day.dayNumber} Task`,
          taskDescription: primaryTask?.description || day.taskDescription || '',
          tasks: (day.tasks && day.tasks.length > 0)
            ? day.tasks
            : [{ id: `task-${day.dayNumber}-1`, title: day.taskTitle, description: day.taskDescription }],
          resources: day.resources || [],
        };
      });

      const res = await fetch('/api/admin/settings/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: settingsActiveLevel,
          levelName: settingsLevelName || settingsActiveLevel,
          days: sanitizedTasks.length,
          tasks: sanitizedTasks,
          updateLevelsList: configuredLevels,
        }),
      });

      const data = await parseResponseJson(res, 'Failed to save task configuration');
      if (!res.ok) throw new Error(data.error || 'Failed to save task configuration');

      if (data.configuredLevels && Array.isArray(data.configuredLevels)) {
        setConfiguredLevels(data.configuredLevels);
      }
      setLevelDisplayNames((prev) => ({
        ...prev,
        [settingsActiveLevel]: settingsLevelName || settingsActiveLevel,
      }));

      showSuccess(`✓ Configuration & Curriculum Title for '${settingsLevelName || settingsActiveLevel}' (${sanitizedTasks.length} Days) saved successfully!`);
    } catch (err: any) {
      showError(err, 'Error saving task configuration');
    } finally {
      setSavingSettingsTasks(false);
    }
  };

  const handleOpenCurriculumModal = async (batch: any) => {
    setCurriculumBatch(batch);
    setIsEditingDates(false);

    const existing = batch.trainingCalendar || [];
    const bLevel = batch.level || 'Level 1';

    let levelDaysCount = batch.trainingDays || LEVEL_CONFIG[bLevel]?.days || 15;
    let customLevelTasks: any[] = [];

    try {
      const res = await fetch(`/api/admin/settings/tasks?level=${encodeURIComponent(bLevel)}`);
      const data = await res.json();
      if (data.tasks && Array.isArray(data.tasks)) {
        customLevelTasks = data.tasks;
        levelDaysCount = data.days || data.tasks.length;
      }
    } catch (e) {}

    const totalDays = Math.max(batch.trainingDays || 0, levelDaysCount, existing.length);
    const start = new Date(batch.startDate);
    const calGen = generateTrainingDaysCalendar(start, bLevel, totalDays);

    const daysArr = [];
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const match = existing.find((item: any) => item.dayNumber === dayNum);
      const defaultItem = calGen.find((c) => c.dayNumber === dayNum);
      const customTaskItem = customLevelTasks.find((t: any) => t.dayNumber === dayNum);

      let dayDateStr = defaultItem ? defaultItem.dateStr : new Date(start.getTime() + (dayNum - 1) * 86400000).toISOString().split('T')[0];
      if (match?.date) {
        dayDateStr = new Date(match.date).toISOString().split('T')[0];
      }

      const rawTasks = match?.tasks || customTaskItem?.tasks || defaultItem?.tasks;
      const tasksList = (rawTasks && Array.isArray(rawTasks) && rawTasks.length > 0)
        ? rawTasks
        : [{
            id: `task-${dayNum}-1`,
            title: match?.taskTitle || customTaskItem?.taskTitle || defaultItem?.taskTitle || `Day ${dayNum} Task`,
            description: match?.taskDescription || customTaskItem?.taskDescription || defaultItem?.taskDescription || `Day ${dayNum} Instructions`,
          }];

      const resourcesList = (match?.resources && Array.isArray(match.resources))
        ? match.resources
        : (customTaskItem?.resources && Array.isArray(customTaskItem.resources))
        ? customTaskItem.resources
        : defaultItem?.resources || [];

      daysArr.push({
        dayNumber: dayNum,
        dateStr: dayDateStr,
        taskTitle: tasksList[0]?.title || `Day ${dayNum} Task`,
        taskDescription: tasksList[0]?.description || `Day ${dayNum} Instructions`,
        tasks: tasksList,
        resources: resourcesList,
      });
    }

    setCurriculumCalendarDays(daysArr);
    setShowCurriculumModal(true);
  };

  const handleDayDateChange = (changedIdx: number, newDateStr: string) => {
    if (!newDateStr) return;
    const updated = [...curriculumCalendarDays];
    updated[changedIdx].dateStr = newDateStr;
    updated[changedIdx].isManualOverride = true;

    // Ripple & recalculate subsequent training dates sequentially
    const baseDate = new Date(newDateStr);
    if (!isNaN(baseDate.getTime())) {
      for (let i = changedIdx + 1; i < updated.length; i++) {
        baseDate.setDate(baseDate.getDate() + 1);
        updated[i].dateStr = baseDate.toISOString().split('T')[0];
        updated[i].isManualOverride = true;
      }
    }

    setCurriculumCalendarDays(updated);
  };

  const handleAutoFillCurriculumTemplate = () => {
    if (!curriculumBatch) return;
    const totalDays = curriculumBatch.trainingDays || 15;
    const bLevel = curriculumBatch.level || 'Level 1';
    const levelDefaults = DEFAULT_CURRICULUM_BY_LEVEL[bLevel] || DEFAULT_CURRICULUM_BY_LEVEL['Level 1'];

    const updated = curriculumCalendarDays.map((day) => {
      const def = levelDefaults.find((item) => item.dayNumber === day.dayNumber) || {
        taskTitle: `Day ${day.dayNumber} Spatial Computing Module`,
        taskDescription: `Complete Day ${day.dayNumber} practical AR/VR training assignment.`,
      };
      return {
        ...day,
        taskTitle: def.taskTitle,
        taskDescription: def.taskDescription,
      };
    });

    setCurriculumCalendarDays(updated);
    setSuccessMsg(`Populated standard ${bLevel} curriculum template for ${totalDays} training days!`);
  };

  const handleRegenerateCalendar = () => {
    if (!curriculumBatch) return;
    const start = new Date(curriculumBatch.startDate);
    const bLevel = curriculumBatch.level || 'Level 1';
    const totalDays = curriculumBatch.trainingDays || LEVEL_CONFIG[bLevel]?.days || 15;
    const calGen = generateTrainingDaysCalendar(start, bLevel, totalDays);

    const regenerated = curriculumCalendarDays.map((day) => {
      const gen = calGen.find((c) => c.dayNumber === day.dayNumber);
      return {
        ...day,
        dateStr: gen ? gen.dateStr : day.dateStr,
        isManualOverride: false,
      };
    });

    setCurriculumCalendarDays(regenerated);
    setShowRegenerateConfirmModal(false);
    setSuccessMsg('✓ Calendar dates regenerated sequentially from Start Date.');
  };

  const handleSaveCurriculumSubmit = async () => {
    if (!curriculumBatch) return;
    setSavingCurriculum(true);
    try {
      const res = await fetch(`/api/admin/batches/${curriculumBatch.id}/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: curriculumCalendarDays }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save calendar & curriculum');

      setSuccessMsg(`✓ Training Calendar & Curriculum saved for ${curriculumBatch.name}!`);
      setIsEditingDates(false);
      setShowCurriculumModal(false);

      // Refresh batches
      const fetchRes = await fetch('/api/admin/batches');
      const fetchJson = await fetchRes.json();
      if (fetchJson.batches) setBatches(fetchJson.batches);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving calendar & curriculum');
    } finally {
      setSavingCurriculum(false);
    }
  };

  const handleOpenBatchDetails = (batch: any) => {
    setSelectedBatchDetail(batch);
    setShowBatchDetailsModal(true);
  };

  // Calendar Day Form
  const [calDayNum, setCalDayNum] = useState(1);
  const [calTitle, setCalTitle] = useState('');
  const [calDesc, setCalDesc] = useState('');

  // Certificate check
  const [runningCheck, setRunningCheck] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  // Student Search & Bulk Import State
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importBatchId, setImportBatchId] = useState('');
  const [importCsvText, setImportCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleDownloadSampleCsv = () => {
    const csvContent = "name,registerNo,email,contactNumber,department,year,section,pin\nJohn Smith,21CS101,john.smith@example.com,9876543210,Computer Science,3rd Year,Sec A,123456\nEmily Davis,21CS102,emily.davis@example.com,9876543211,Information Tech,3rd Year,Sec B,123456";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_student_roster.csv';
    a.click();
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => h.includes('name'));
    const regIdx = headers.findIndex((h) => h.includes('reg') || h.includes('number'));
    const emailIdx = headers.findIndex((h) => h.includes('email'));
    const phoneIdx = headers.findIndex((h) => h.includes('contact') || h.includes('phone'));
    const deptIdx = headers.findIndex((h) => h.includes('dept') || h.includes('department'));
    const yearIdx = headers.findIndex((h) => h.includes('year'));
    const secIdx = headers.findIndex((h) => h.includes('sec'));
    const pinIdx = headers.findIndex((h) => h.includes('pin'));

    const results: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (cols.length < 3) continue;

      results.push({
        name: cols[nameIdx !== -1 ? nameIdx : 0] || '',
        registerNo: cols[regIdx !== -1 ? regIdx : 1] || '',
        email: cols[emailIdx !== -1 ? emailIdx : 2] || '',
        contactNumber: cols[phoneIdx !== -1 ? phoneIdx : 3] || '9999999999',
        department: cols[deptIdx !== -1 ? deptIdx : 4] || 'Computer Science',
        year: cols[yearIdx !== -1 ? yearIdx : 5] || '3rd Year',
        section: cols[secIdx !== -1 ? secIdx : 6] || 'Sec A',
        pin: cols[pinIdx !== -1 ? pinIdx : 7] || '123456',
      });
    }
    return results;
  };

  const handleProcessBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importBatchId) {
      setErrorMsg('Please select a target batch for student import');
      return;
    }

    const parsedStudents = parseCSV(importCsvText);
    if (parsedStudents.length === 0) {
      setErrorMsg('No valid student rows found in CSV data.');
      return;
    }

    setImporting(true);
    setErrorMsg('');
    setImportResult(null);

    try {
      const res = await fetch('/api/admin/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: importBatchId, students: parsedStudents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setImportResult(data);
      fetchStudents();
      fetchStats();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setImporting(false);
    }
  };

  const isStaffLoggedIn = user && (user.role === 'ADMIN' || (user as any).role === 'TRAINER');

  useEffect(() => {
    if (isStaffLoggedIn) {
      fetchStats();
      fetchBatches();
      fetchStudents();
      fetchActivities();
      fetchConfiguredLevels();
      fetchPageSettings();
    }
  }, [user]);

  useEffect(() => {
    if (selectedBatchId) {
      fetchCalendar(selectedBatchId);
      fetchBatchSubmissions(selectedBatchId, selectedDayNumber);
    }
  }, [selectedBatchId, selectedDayNumber]);

  // Keyboard Escape Handler for Accessible Modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (hoveredTaskTip) {
          setHoveredTaskTip(null);
        } else if (evaluatingTask) {
          setEvaluatingTask(null);
          setSelectedSubmissionStudent(null);
        } else if (showEditTaskModal) {
          setShowEditTaskModal(false);
        } else if (showNewRegisterModal) {
          setShowNewRegisterModal(false);
        } else if (showRegSuccessModal) {
          setShowRegSuccessModal(false);
        } else if (showCertRecordModal) {
          setShowCertRecordModal(false);
        } else if (showAdminProfileModal) {
          setShowAdminProfileModal(false);
        } else if (showImportModal) {
          setShowImportModal(false);
        } else if (showCreateBatchModal) {
          setShowCreateBatchModal(false);
        } else if (showSettingsModal) {
          setShowSettingsModal(false);
        } else if (showCurriculumModal) {
          setShowCurriculumModal(false);
        } else if (showStudentProfileModal) {
          setShowStudentProfileModal(false);
        } else if (showEditStudentModal) {
          setShowEditStudentModal(false);
        } else if (showBatchDetailsModal) {
          setShowBatchDetailsModal(false);
        } else if (showRegenerateConfirmModal) {
          setShowRegenerateConfirmModal(false);
        } else if (showAddLevelModal) {
          setShowAddLevelModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [
    evaluatingTask,
    showEditTaskModal,
    showNewRegisterModal,
    showRegSuccessModal,
    showCertRecordModal,
    showAdminProfileModal,
    showImportModal,
    showCreateBatchModal,
    showSettingsModal,
    showCurriculumModal,
    showStudentProfileModal,
    showEditStudentModal,
    showBatchDetailsModal,
    showRegenerateConfirmModal,
    showAddLevelModal,
  ]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid admin credentials');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };


  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (e) {
      console.error('Error fetching stats', e);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/admin/batches');
      const data = await res.json();
      if (res.ok && data.batches) {
        setBatches(data.batches);
        if (data.batches.length > 0 && !selectedBatchId) {
          setSelectedBatchId(data.batches[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching batches', e);
    }
  };



  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState<boolean>(false);

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      const res = await fetch('/api/admin/activity');
      const data = await res.json();
      if (res.ok && data.activities) setRecentActivities(data.activities);
    } catch (e) {
      console.error('Error fetching activity', e);
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/admin/students');
      const data = await res.json();
      if (res.ok && data.students) {
        setStudents(data.students);
        return data.students;
      }
    } catch (e) {
      console.error('Error fetching students', e);
    }
    return null;
  };

  const fetchCalendar = async (batchId: string) => {
    try {
      const res = await fetch(`/api/admin/batches/${batchId}/calendar`);
      const data = await res.json();
      if (res.ok && data.calendar) setBatchCalendar(data.calendar);
    } catch (e) {
      console.error('Error fetching calendar', e);
    }
  };

  const fetchBatchSubmissions = async (batchId: string, day: string) => {
    try {
      let url = `/api/trainer/batches/${batchId}/tasks`;
      if (day) url += `?day=${day}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.students) {
        setStudentsSubmissions(data.students);
      }
    } catch (e) {
      console.error('Error fetching batch tasks', e);
    }
  };

  const handleScoreChange = (scoreVal: number) => {
    setEvalScore(scoreVal);
    if (scoreVal >= 90) setEvalGrade('O');
    else if (scoreVal >= 80) setEvalGrade('A_PLUS');
    else if (scoreVal >= 70) setEvalGrade('A');
    else if (scoreVal >= 60) setEvalGrade('B_PLUS');
    else if (scoreVal >= 50) setEvalGrade('B');
    else setEvalGrade('C');
  };

  const handleOpenEvaluationModal = (task: any) => {
    setEvaluatingTask(task);
    if (task.evaluation) {
      setEvalScore(task.evaluation.score);
      setEvalGrade(task.evaluation.grade);
      setEvalLevel(task.evaluation.trainingLevel);
      setEvalComments(task.evaluation.comments || '');
    } else {
      setEvalScore(85);
      setEvalGrade('A_PLUS');
      setEvalLevel('Level 1 Foundation');
      setEvalComments('Great VR interaction setup.');
    }
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingTask) return;
    setSubmittingEval(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/trainer/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: evaluatingTask.id,
          score: Number(evalScore),
          grade: evalGrade,
          trainingLevel: evalLevel,
          comments: evalComments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evaluation failed');
      setSuccessMsg('Task evaluated successfully!');
      setEvaluatingTask(null);
      fetchBatchSubmissions(selectedBatchId, selectedDayNumber);
      fetchStats();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingEval(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBatchName,
          startDate: newStartDate,
          endDate: newEndDate,
          trainingDays: Number(newTrainingDays),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create batch');
      setSuccessMsg(`Batch "${newBatchName}" created successfully!`);
      setNewBatchName('');
      fetchBatches();
      fetchStats();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleAddCalendarDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/admin/batches/${selectedBatchId}/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayNumber: calDayNum,
          taskTitle: calTitle,
          taskDescription: calDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update calendar');
      setSuccessMsg(`Day ${calDayNum} task saved to calendar!`);
      setCalTitle('');
      setCalDesc('');
      fetchCalendar(selectedBatchId);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRunCompletionCheck = async () => {
    if (!selectedBatchId) return;
    setRunningCheck(true);
    setErrorMsg('');
    setCheckResult(null);
    try {
      const res = await fetch(`/api/admin/batches/${selectedBatchId}/check-completion`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Completion check failed');
      setCheckResult(data.message);
      fetchStats();
      fetchStudents();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setRunningCheck(false);
    }
  };

  const handleExportExcel = () => {
    if (!selectedBatchId) return;
    window.open(`/api/admin/batches/${selectedBatchId}/certificate-export`, '_blank');
  };

  // Clean up error messages for display
  const cleanOverrideError = (msg: string) => {
    if (!msg) return 'An unexpected error occurred.';
    if (msg.includes('Unique constraint failed') || msg.includes('P2002')) {
      return 'Duplicate record: A record for this session/day or certificate number already exists.';
    }
    if (msg.includes('already assigned to another student')) {
      return msg;
    }
    if (msg.includes('TURBOPACK') || msg.includes('invocation in')) {
      const lines = msg.split('\n').filter((l) => !l.includes('TURBOPACK') && !l.includes('invocation in') && !l.trim().startsWith('at ') && !l.includes('clientVersion'));
      const joined = lines.join(' ').replace(/\s+/g, ' ').trim();
      return joined.length > 0 ? joined.slice(0, 180) : 'Database operation failed. Please check field formats.';
    }
    return msg;
  };

  // Open Manual Student Data & Certificate Override Modal
  const handleOpenManualOverride = (student: any) => {
    setOverrideStudent(student);
    const existingCert = student.certificate;
    const cleanBatch = (student.batch?.name || 'BATCH').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
    const defaultCertNo = existingCert?.certificateNo || `ARVR-${cleanBatch}-${String(student.registerNo).slice(-4)}`;
    setOverrideCertNo(defaultCertNo);
    const rawGrade = existingCert?.finalGrade || 'A+';
    const normalizedGrade = rawGrade === 'A_PLUS' ? 'A+' : rawGrade === 'B_PLUS' ? 'B+' : rawGrade;
    setOverrideFinalGrade(normalizedGrade);
    setOverrideFinalLevel(existingCert?.finalLevel || 'Level 1 Foundation');
    setOverrideIsValid(existingCert ? existingCert.isValid !== false : true);
    setOverrideIsManual(existingCert ? existingCert.isManualOverride === true : true);
    setOverrideReason(existingCert?.overrideReason || 'Admin manual override & data modification');
    setOverrideActionMsg(null);
    setShowManualOverrideModal(true);
  };

  // Grant 100% Attendance for a Student across all batch sessions
  const handleGrant100Attendance = async (studentId: string) => {
    setSavingOverride(true);
    setOverrideActionMsg(null);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/override-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'grant_100_attendance' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grant 100% attendance');
      setOverrideActionMsg({ type: 'success', text: data.message || 'Granted 100% attendance!' });
      const freshStudents = await fetchStudents();
      await fetchStats();
      if (freshStudents) {
        const updated = freshStudents.find((s: any) => s.id === studentId);
        if (updated) setOverrideStudent(updated);
      }
    } catch (err: any) {
      setOverrideActionMsg({ type: 'error', text: cleanOverrideError(err.message) });
    } finally {
      setSavingOverride(false);
    }
  };

  // Accept all curriculum tasks and add default evaluation
  const handleGrantAllTasks = async (studentId: string) => {
    setSavingOverride(true);
    setOverrideActionMsg(null);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/override-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'grant_all_tasks', score: 90, grade: overrideFinalGrade, level: overrideFinalLevel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept all tasks');
      setOverrideActionMsg({ type: 'success', text: data.message || 'All practical tasks accepted!' });
      const freshStudents = await fetchStudents();
      await fetchStats();
      if (freshStudents) {
        const updated = freshStudents.find((s: any) => s.id === studentId);
        if (updated) setOverrideStudent(updated);
      }
    } catch (err: any) {
      setOverrideActionMsg({ type: 'error', text: cleanOverrideError(err.message) });
    } finally {
      setSavingOverride(false);
    }
  };

  // Grant Full Qualification (100% attendance + all tasks + issued certificate)
  const handleGrantFullQualification = async (studentId: string) => {
    setSavingOverride(true);
    setOverrideActionMsg(null);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/override-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grant_full_qualification',
          score: 95,
          grade: overrideFinalGrade,
          level: overrideFinalLevel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply full qualification');
      setOverrideActionMsg({ type: 'success', text: data.message || 'Full qualification successfully applied!' });
      const freshStudents = await fetchStudents();
      await fetchStats();
      if (freshStudents) {
        const updated = freshStudents.find((s: any) => s.id === studentId);
        if (updated) setOverrideStudent(updated);
      }
    } catch (err: any) {
      setOverrideActionMsg({ type: 'error', text: cleanOverrideError(err.message) });
    } finally {
      setSavingOverride(false);
    }
  };

  // Save/Update manual certificate record
  const handleSaveManualCertificate = async () => {
    if (!overrideStudent) return;
    setSavingOverride(true);
    setOverrideActionMsg(null);
    try {
      const sanitizedCertNo = (overrideCertNo || '').trim().toUpperCase();
      const res = await fetch('/api/admin/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: overrideStudent.id,
          certificateNo: sanitizedCertNo,
          finalGrade: overrideFinalGrade,
          finalLevel: overrideFinalLevel,
          isValid: overrideIsValid,
          isManualOverride: overrideIsManual,
          overrideReason: overrideReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update certificate');
      setOverrideActionMsg({ type: 'success', text: data.message || 'Certificate data saved!' });
      const freshStudents = await fetchStudents();
      await fetchStats();
      if (freshStudents) {
        const updated = freshStudents.find((s: any) => s.id === overrideStudent.id);
        if (updated) setOverrideStudent(updated);
      }
      setSuccessMsg(`Certificate data updated for ${overrideStudent.name}!`);
    } catch (err: any) {
      setOverrideActionMsg({ type: 'error', text: cleanOverrideError(err.message) });
    } finally {
      setSavingOverride(false);
    }
  };

  // Revoke/Delete certificate record
  const handleRevokeCertificate = async (studentId: string) => {
    if (!confirm('Are you sure you want to revoke/delete this certificate?')) return;
    setSavingOverride(true);
    setOverrideActionMsg(null);
    try {
      const res = await fetch(`/api/admin/certificates?studentId=${studentId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke certificate');
      setOverrideActionMsg({ type: 'success', text: 'Certificate revoked successfully.' });
      const freshStudents = await fetchStudents();
      await fetchStats();
      if (freshStudents) {
        const updated = freshStudents.find((s: any) => s.id === studentId);
        if (updated) setOverrideStudent(updated);
      }
    } catch (err: any) {
      setOverrideActionMsg({ type: 'error', text: cleanOverrideError(err.message) });
    } finally {
      setSavingOverride(false);
    }
  };

  // Not Logged In View
  if (!isStaffLoggedIn) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="pro-card rounded-3xl p-8 shadow-xl">
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff & Trainer Login</h2>
              <p className="text-xs text-slate-600 font-medium">Trainer Evaluation Workspace & System Administration</p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-login-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Staff / Trainer Email Address
              </label>
              <input
                id="admin-login-email"
                type="email"
                required
                placeholder="admin@arvr.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pro-input rounded-xl px-4 py-2.5 text-sm placeholder-slate-400"
              />
            </div>

            <div>
              <label htmlFor="admin-login-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="admin-login-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pro-input rounded-xl px-4 py-2.5 text-sm placeholder-slate-400"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl pro-button-primary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>Sign In to Staff Portal</span>
              </button>

              {onSwitchToStudent && (
                <div className="text-center pt-2 border-t border-purple-100">
                  <button
                    type="button"
                    onClick={onSwitchToStudent}
                    className="text-xs text-slate-500 hover:text-purple-900 transition-colors font-semibold"
                  >
                    &larr; Back to Student Portal
                  </button>
                </div>
              )}
            </div>
          </form>

        </div>
      </div>
    );
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.registerNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      
      {/* MASTER TOP HEADER BAR */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-purple-200/80 sticky top-0 z-40 px-4 sm:px-8 py-3.5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            <ShieldCheck className="w-5 h-5 text-purple-200" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-purple-700 font-extrabold uppercase">AR/VR COE TRAINING MANAGEMENT</div>
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Admin Portal</span>
              <button
                type="button"
                onClick={() => setShowAdminProfileModal(true)}
                title="View Admin Profile"
                className="text-[10px] font-mono font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 transition-colors border border-purple-200 px-2 py-0.5 rounded-full cursor-pointer"
              >
                SYSTEM ADMIN
              </button>
            </h1>
          </div>
        </div>

        {/* Header Logout Action */}
        <button
          onClick={handleLogout}
          title="Logout of Admin Portal"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-purple-200/90 shadow-sm shadow-purple-900/5 text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5 text-slate-500" />
          <span>Logout</span>
        </button>
      </header>

      <div className="max-w-[1600px] mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Main Layout Container: Side Floating Dock + Main Content */}
        <div className="flex flex-col lg:flex-row gap-6 items-start relative">

          {/* Side Floating Dock Navigation Bar - Touch-accessible on mobile, icon-dock on desktop */}
          <aside className="w-full lg:w-20 lg:sticky lg:top-24 z-30 shrink-0">
            <div className="bg-white/95 backdrop-blur-2xl border border-purple-200/90 rounded-3xl p-2 sm:p-2.5 lg:p-3 shadow-xl shadow-purple-900/10">
              <nav className="grid grid-cols-5 sm:grid-cols-6 lg:flex lg:flex-col lg:space-y-2" aria-label="Staff Portal navigation">
                {/* 1. Overview */}
                <div className="relative group/btn flex-1">
                  <button
                    onClick={() => handleTabSwitch('overview')}
                    title="Overview"
                    aria-label="Overview"
                    aria-current={staffTab === 'overview' ? 'page' : undefined}
                    className={`w-full flex flex-col lg:flex-row items-center justify-center p-2 sm:p-2.5 lg:p-3 rounded-2xl text-xs font-bold transition-all duration-200 min-h-[44px] ${
                      staffTab === 'overview'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                        : 'text-slate-600 hover:text-purple-900 hover:bg-purple-100/60'
                    }`}
                  >
                    <LayoutDashboard className={`w-5 h-5 shrink-0 ${staffTab === 'overview' ? 'text-white' : 'text-purple-600'}`} />
                    <span className="text-[10px] font-bold mt-1 lg:hidden leading-none truncate max-w-full text-center">
                      Overview
                    </span>
                  </button>
                  <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover/btn:opacity-100 transition-opacity z-50">
                    Overview
                  </div>
                </div>

                {/* 2. Batches */}
                <div className="relative group/btn flex-1">
                  <button
                    onClick={() => handleTabSwitch('batches')}
                    title="Batches"
                    aria-label="Training Batches"
                    aria-current={staffTab === 'batches' || staffTab === 'calendar' ? 'page' : undefined}
                    className={`w-full flex flex-col lg:flex-row items-center justify-center p-2 sm:p-2.5 lg:p-3 rounded-2xl text-xs font-bold transition-all duration-200 min-h-[44px] ${
                      staffTab === 'batches' || staffTab === 'calendar'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                        : 'text-slate-600 hover:text-purple-900 hover:bg-purple-100/60'
                    }`}
                  >
                    <Layers className={`w-5 h-5 shrink-0 ${staffTab === 'batches' || staffTab === 'calendar' ? 'text-white' : 'text-purple-600'}`} />
                    <span className="text-[10px] font-bold mt-1 lg:hidden leading-none truncate max-w-full text-center">
                      Batches
                    </span>
                  </button>
                  <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover/btn:opacity-100 transition-opacity z-50">
                    Batches
                  </div>
                </div>

                {/* 3. Curriculum */}
                <div className="relative group/btn flex-1">
                  <button
                    onClick={() => handleTabSwitch('curriculum')}
                    title="Curriculum & Tasks"
                    aria-label="Curriculum and Tasks"
                    aria-current={staffTab === 'curriculum' ? 'page' : undefined}
                    className={`w-full flex flex-col lg:flex-row items-center justify-center p-2 sm:p-2.5 lg:p-3 rounded-2xl text-xs font-bold transition-all duration-200 min-h-[44px] ${
                      staffTab === 'curriculum'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                        : 'text-slate-600 hover:text-purple-900 hover:bg-purple-100/60'
                    }`}
                  >
                    <BookOpen className={`w-5 h-5 shrink-0 ${staffTab === 'curriculum' ? 'text-white' : 'text-purple-600'}`} />
                    <span className="text-[10px] font-bold mt-1 lg:hidden leading-none truncate max-w-full text-center">
                      Curriculum
                    </span>
                  </button>
                  <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover/btn:opacity-100 transition-opacity z-50">
                    Curriculum & Tasks
                  </div>
                </div>

                {/* 3. Students */}
                <div className="relative group/btn flex-1">
                  <button
                    onClick={() => handleTabSwitch('students')}
                    title="Students"
                    aria-label="Students Directory"
                    aria-current={staffTab === 'students' ? 'page' : undefined}
                    className={`w-full flex flex-col lg:flex-row items-center justify-center p-2 sm:p-2.5 lg:p-3 rounded-2xl text-xs font-bold transition-all duration-200 min-h-[44px] ${
                      staffTab === 'students'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                        : 'text-slate-600 hover:text-purple-900 hover:bg-purple-100/60'
                    }`}
                  >
                    <Users className={`w-5 h-5 shrink-0 ${staffTab === 'students' ? 'text-white' : 'text-purple-600'}`} />
                    <span className="text-[10px] font-bold mt-1 lg:hidden leading-none truncate max-w-full text-center">
                      Students
                    </span>
                  </button>
                  <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover/btn:opacity-100 transition-opacity z-50">
                    Students
                  </div>
                </div>

                {/* 4. Task Portal */}
                <div className="relative group/btn flex-1">
                  <button
                    onClick={() => handleTabSwitch('evaluations')}
                    title="Task Portal"
                    aria-label="Task Portal"
                    aria-current={staffTab === 'evaluations' ? 'page' : undefined}
                    className={`w-full flex flex-col lg:flex-row items-center justify-center p-2 sm:p-2.5 lg:p-3 rounded-2xl text-xs font-bold transition-all duration-200 min-h-[44px] ${
                      staffTab === 'evaluations'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                        : 'text-slate-600 hover:text-purple-900 hover:bg-purple-100/60'
                    }`}
                  >
                    <CheckSquare className={`w-5 h-5 shrink-0 ${staffTab === 'evaluations' ? 'text-white' : 'text-purple-600'}`} />
                    <span className="text-[10px] font-bold mt-1 lg:hidden leading-none truncate max-w-full text-center">
                      Tasks
                    </span>
                  </button>
                  <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover/btn:opacity-100 transition-opacity z-50">
                    Task Portal
                  </div>
                </div>

                {/* 5. Certificates */}
                <div className="relative group/btn flex-1">
                  <button
                    onClick={() => handleTabSwitch('certificates')}
                    title="Certificates"
                    aria-label="Certificates and Reports"
                    aria-current={staffTab === 'certificates' ? 'page' : undefined}
                    className={`w-full flex flex-col lg:flex-row items-center justify-center p-2 sm:p-2.5 lg:p-3 rounded-2xl text-xs font-bold transition-all duration-200 min-h-[44px] ${
                      staffTab === 'certificates'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                        : 'text-slate-600 hover:text-purple-900 hover:bg-purple-100/60'
                    }`}
                  >
                    <Award className={`w-5 h-5 shrink-0 ${staffTab === 'certificates' ? 'text-white' : 'text-purple-600'}`} />
                    <span className="text-[10px] font-bold mt-1 lg:hidden leading-none truncate max-w-full text-center">
                      Reports
                    </span>
                  </button>
                  <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover/btn:opacity-100 transition-opacity z-50">
                    Certificates
                  </div>
                </div>

                {/* 6. Settings (Admin only) */}
                {user && user.role === 'ADMIN' && (
                  <div className="relative group/btn flex-1">
                    <button
                      onClick={() => handleTabSwitch('settings')}
                      title="System Settings"
                      aria-label="System and Training Settings"
                      aria-current={staffTab === 'settings' ? 'page' : undefined}
                      className={`w-full flex flex-col lg:flex-row items-center justify-center p-2 sm:p-2.5 lg:p-3 rounded-2xl text-xs font-bold transition-all duration-200 min-h-[44px] ${
                        staffTab === 'settings'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                          : 'text-slate-600 hover:text-purple-900 hover:bg-purple-100/60'
                      }`}
                    >
                      <Settings className={`w-5 h-5 shrink-0 ${staffTab === 'settings' ? 'text-white' : 'text-purple-600'}`} />
                      <span className="text-[10px] font-bold mt-1 lg:hidden leading-none truncate max-w-full text-center">
                        Settings
                      </span>
                    </button>
                    <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover/btn:opacity-100 transition-opacity z-50">
                      System Settings
                    </div>
                  </div>
                )}
              </nav>
            </div>
          </aside>

          {/* Dynamic Main Content Container */}
          <main className="flex-1 w-full min-w-0 space-y-6">

            {/* BREADCRUMB NAVIGATION */}
            <div className="flex items-center justify-between border-b border-purple-100/80 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900 font-mono">
                <span className="text-slate-400 font-medium">Portal /</span>
                <span className="px-3 py-1 rounded-xl bg-purple-100/80 border border-purple-200/80 text-purple-950 font-extrabold shadow-2xs">
                  {staffTab === 'overview' && 'Admin / Overview'}
                  {(staffTab === 'batches' || staffTab === 'calendar') && 'Admin / Batches'}
                  {staffTab === 'curriculum' && 'Admin / Curriculum & Tasks'}
                  {staffTab === 'students' && 'Admin / Students List with New Registration'}
                  {staffTab === 'evaluations' && 'Staff & Trainer / Task Portal'}
                  {staffTab === 'certificates' && 'Admin / Certificates & Reports'}
                  {staffTab === 'settings' && 'Admin / System Settings'}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-slate-500 hidden sm:block">
                System Control: <strong className="text-purple-900">ACTIVE SESSION</strong>
              </div>
            </div>

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-3 min-w-0">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg('')}
                className="p-1 text-red-500 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors shrink-0 cursor-pointer"
                title="Dismiss alert"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg('')}
                className="p-1 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg transition-colors shrink-0 cursor-pointer"
                title="Dismiss alert"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

      {/* SUB-TAB 1: EXECUTIVE OVERVIEW */}
      {staffTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="pro-card-interactive rounded-2xl p-6 bg-white border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Students</span>
                <span className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                  <Users className="w-5 h-5" />
                </span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{stats?.totalStudents ?? students.length}</div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Registered system database total</p>
            </div>

            <div className="pro-card-interactive rounded-2xl p-6 bg-white border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Batches</span>
                <span className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
                  <Layers className="w-5 h-5" />
                </span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {stats?.activeBatches ?? batches.filter((b) => b.status === 'ACTIVE' && new Date(b.endDate) >= new Date()).length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Currently active training cohorts</p>
            </div>

            <div className="pro-card-interactive rounded-2xl p-6 bg-white border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Certified Graduates</span>
                <span className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                  <Award className="w-5 h-5" />
                </span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{stats?.stats?.completedCertificates ?? stats?.certifiedCount ?? 0}</div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Students satisfying completion criteria</p>
            </div>
          </div>

          {/* Recent System Activity Area */}
          <div className="pro-card rounded-3xl p-6 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-700" />
                <span>Recent System Activity</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">Real-time DB activity stream</span>
                <button
                  onClick={fetchActivities}
                  title="Refresh Activity Log"
                  className="p-1 rounded-lg hover:bg-purple-50 text-purple-700 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingActivities ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="divide-y divide-purple-100/60 text-xs font-medium space-y-2">
              {loadingActivities && recentActivities.length === 0 ? (
                <div className="py-6 text-center text-slate-400 font-medium">Loading real-time activities...</div>
              ) : recentActivities.length === 0 ? (
                <div className="py-6 text-center text-slate-400 font-medium">No recent system activity recorded yet.</div>
              ) : (
                recentActivities.map((act) => (
                  <div key={act.id} className="pt-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-[10px] shrink-0 ${
                        act.type === 'SUBMISSION' ? 'bg-blue-100 text-blue-800' :
                        act.type === 'EVALUATION' ? 'bg-emerald-100 text-emerald-800' :
                        act.type === 'ATTENDANCE' ? 'bg-amber-100 text-amber-800' :
                        act.type === 'DRIVE_CONNECT' ? 'bg-emerald-100 text-emerald-800' :
                        act.type === 'BATCH_CREATE' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {act.type === 'SUBMISSION' ? <UploadCloud className="w-3.5 h-3.5 text-blue-700" /> :
                         act.type === 'EVALUATION' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> :
                         act.type === 'ATTENDANCE' ? <Clock className="w-3.5 h-3.5 text-amber-700" /> :
                         act.type === 'DRIVE_CONNECT' ? <ExternalLink className="w-3.5 h-3.5 text-emerald-700" /> :
                         act.type === 'BATCH_CREATE' ? <Layers className="w-3.5 h-3.5 text-indigo-700" /> :
                         <UserPlus className="w-3.5 h-3.5 text-purple-700" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{act.title}</p>
                        <span className="font-mono text-[11px] text-slate-500 block truncate">{act.subtitle}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-purple-900 font-mono font-bold bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-lg shrink-0">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TASK PORTAL */}
      {staffTab === 'evaluations' && (() => {
        const selectedBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];
        const currentDayNum = parseInt(selectedDayNumber || '1', 10);
        const currentDayTaskObj = batchCalendar.find((d: any) => d.dayNumber === currentDayNum);

        // Student metric calculations for current batch & day
        const totalBatchStudents = studentsSubmissions.length;
        
        let eligibleCount = 0;
        let submittedCount = 0;
        let evaluatedCount = 0;
        let pendingEvalCount = 0;
        let missingCount = 0;
        let lockedCount = 0;

        const studentSubmissionList = studentsSubmissions.map((student: any) => {
          const fnPresent = (student.attendances || []).some((att: any) => att.session === 'FN');
          const anPresent = (student.attendances || []).some((att: any) => att.session === 'AN');
          const eligible = fnPresent && anPresent;

          if (eligible) eligibleCount++;
          else lockedCount++;

          const dayTask = (student.tasks || []).find((t: any) => t.trainingDay?.dayNumber === currentDayNum);

          let status: 'Locked' | 'Available' | 'Submitted' | 'Evaluated' | 'Missing' = 'Locked';
          let evalStatus: 'Pending Evaluation' | 'Evaluated' | 'N/A' = 'N/A';

          if (!eligible) {
            status = 'Locked';
          } else if (dayTask) {
            submittedCount++;
            if (dayTask.evaluation) {
              evaluatedCount++;
              status = 'Evaluated';
              evalStatus = 'Evaluated';
            } else {
              pendingEvalCount++;
              status = 'Submitted';
              evalStatus = 'Pending Evaluation';
            }
          } else {
            missingCount++;
            status = 'Missing';
          }

          return {
            ...student,
            fnPresent,
            anPresent,
            eligible,
            dayTask,
            status,
            evalStatus,
          };
        });

        const taskCompletionPercent = totalBatchStudents > 0
          ? Math.round((submittedCount / totalBatchStudents) * 100)
          : 0;

        const filteredTaskStudents = studentSubmissionList.filter((item: any) => {
          const matchesSearch =
            !taskPortalSearch ||
            item.name.toLowerCase().includes(taskPortalSearch.toLowerCase()) ||
            item.registerNo.toLowerCase().includes(taskPortalSearch.toLowerCase());

          const matchesSubStatus = filterSubStatus === 'All' || item.status === filterSubStatus;
          const matchesEvalStatus = filterEvalStatus === 'All' || item.evalStatus === filterEvalStatus;

          const cleanSec = item.section ? item.section.replace(/^Sec\s*/, '') : 'A';
          const matchesSec = filterSection === 'All' || cleanSec === filterSection;

          return matchesSearch && matchesSubStatus && matchesEvalStatus && matchesSec;
        });

        return (
          <div className="space-y-6">
            
            {/* Section Header Card */}
            <div className="pro-card rounded-3xl p-6 bg-gradient-to-r from-white via-purple-50/40 to-purple-100/30 border-purple-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
                  <CheckSquare className="w-4 h-4 text-purple-700" />
                  <span>Central Admin Evaluation Workspace</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Task Portal
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm mt-0.5 font-medium">
                  Manage daily training tasks, submissions and evaluations.
                </p>
              </div>

              {/* Batch & Training Day Dropdown Selectors */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Batch</label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => {
                      setSelectedBatchId(e.target.value);
                      setSelectedDayNumber('1');
                    }}
                    className="pro-input text-xs font-bold text-purple-950 rounded-xl px-4 py-2.5 bg-white"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Training Day</label>
                  <select
                    value={selectedDayNumber}
                    onChange={(e) => setSelectedDayNumber(e.target.value)}
                    className="pro-input text-xs font-bold text-slate-900 rounded-xl px-4 py-2.5 bg-white font-mono"
                  >
                    {(batchCalendar && batchCalendar.length > 0
                      ? batchCalendar
                      : Array.from({ length: selectedBatch?.trainingDays || 15 }, (_, i) => ({ dayNumber: i + 1 }))
                    ).map((dayObj: any) => {
                      const maxDays = batchCalendar?.length || selectedBatch?.trainingDays || 15;
                      const isFinal = dayObj.dayNumber === maxDays || 
                        dayObj.taskTitle?.toLowerCase().includes('final exam') || 
                        dayObj.taskTitle?.toLowerCase().includes('examination');
                      return (
                        <option key={dayObj.dayNumber} value={String(dayObj.dayNumber)}>
                          Day {String(dayObj.dayNumber).padStart(2, '0')}{isFinal ? ' 🎓 (Final Exam)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* Task Summary Dashboard Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="p-3.5 rounded-2xl bg-white border border-purple-200 text-center shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Students</span>
                <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">{totalBatchStudents}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-center shadow-xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Eligible</span>
                <span className="text-xl font-extrabold text-emerald-900 mt-0.5 block">{eligibleCount}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-center shadow-xs">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Submitted</span>
                <span className="text-xl font-extrabold text-indigo-900 mt-0.5 block">{submittedCount}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200 text-center shadow-xs">
                <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Evaluated</span>
                <span className="text-xl font-extrabold text-purple-900 mt-0.5 block">{evaluatedCount}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-center shadow-xs">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Pending Eval</span>
                <span className="text-xl font-extrabold text-amber-900 mt-0.5 block">{pendingEvalCount}</span>
              </div>

              <div
                onClick={() => setFilterSubStatus('Missing')}
                className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 text-center cursor-pointer hover:bg-rose-100 transition-colors shadow-xs"
                title="Click to filter Missing Submissions"
              >
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Missing</span>
                <span className="text-xl font-extrabold text-rose-900 mt-0.5 block">{missingCount}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-300 text-center shadow-xs">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Locked</span>
                <span className="text-xl font-extrabold text-slate-800 mt-0.5 block">{lockedCount}</span>
              </div>
            </div>

            {/* Task Completion Progress Bar */}
            <div className="p-4 rounded-2xl bg-white border border-purple-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5 text-purple-900">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span>Task Completion</span>
                </span>
                <span className="font-mono text-purple-950">{taskCompletionPercent}% ({submittedCount} / {totalBatchStudents} Submissions)</span>
              </div>
              <div className="w-full bg-purple-100 h-3 rounded-full overflow-hidden p-0.5 border border-purple-200">
                <div
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${taskCompletionPercent}%` }}
                />
              </div>
            </div>

            {/* Final Exam Notice Banner if last day */}
            {(() => {
              const maxBatchDays = batchCalendar?.length || selectedBatch?.trainingDays || 15;
              const isCurrentDayExam = currentDayNum === maxBatchDays ||
                currentDayTaskObj?.taskTitle?.toLowerCase().includes('final exam') ||
                currentDayTaskObj?.taskTitle?.toLowerCase().includes('examination');
              if (!isCurrentDayExam) return null;
              return (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-indigo-500/10 border-2 border-amber-400 text-slate-900 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-amber-950 font-extrabold text-sm">
                    <GraduationCap className="w-5 h-5 text-amber-700 shrink-0" />
                    <span>Final Examination & Assessment Day (Day {currentDayNum})</span>
                    <span className="px-2.5 py-0.5 bg-amber-200 text-amber-950 rounded-md text-[10px] uppercase font-mono font-bold tracking-wider border border-amber-300">
                      Direct Certificate Grading
                    </span>
                  </div>
                  <p className="text-xs text-amber-950 leading-relaxed font-medium">
                    This is the final examination for <strong>{selectedBatch?.name}</strong>. Student submissions on this day are their final exam practical projects. When evaluating submissions below, the grade awarded will be automatically registered as the student's <strong>Final Exam & Certificate Grade</strong>.
                  </p>
                </div>
              );
            })()}

            {/* Configured Task Information Card */}
            <div className="pro-card rounded-2xl p-5 bg-white border-purple-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-purple-700 uppercase tracking-widest">
                    DAY {String(currentDayNum).padStart(2, '0')} TASK DETAILS
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                    {currentDayTaskObj?.taskTitle || `Day ${currentDayNum} Practical VR Assignment`}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Task Status: Active
                  </span>

                  <button
                    onClick={() => {
                      setEditTaskTitle(currentDayTaskObj?.taskTitle || `Day ${currentDayNum} Practical VR Assignment`);
                      setEditTaskDesc(currentDayTaskObj?.taskDescription || `Complete and demonstrate Day ${currentDayNum} practical exercise output.`);
                      setShowEditTaskModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Task</span>
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-700 space-y-1 font-medium bg-purple-50/40 p-3.5 rounded-xl border border-purple-100">
                <span className="font-bold text-purple-950 uppercase text-[10px] tracking-wider block">Description</span>
                <p className="leading-relaxed">
                  {currentDayTaskObj?.taskDescription || `Complete and submit the interactive output for Day ${currentDayNum}.`}
                </p>
              </div>
            </div>

            {/* Filters & Search Control Bar */}
            <div className="pro-card rounded-2xl p-4 bg-white/90 border-purple-200/80 flex flex-col lg:flex-row items-center justify-between gap-4">
              {/* Search Field */}
              <div className="relative w-full lg:w-80">
                <Search className="w-4 h-4 text-purple-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search register no or name..."
                  value={taskPortalSearch}
                  onChange={(e) => setTaskPortalSearch(e.target.value)}
                  className="w-full pro-input rounded-xl pl-9 pr-4 py-2 text-xs placeholder-slate-400 font-medium"
                />
              </div>

              {/* Filter Dropdowns */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                <div className="flex items-center gap-1 text-xs text-slate-600 font-bold">
                  <Filter className="w-3.5 h-3.5 text-purple-600" />
                  <span>Filters:</span>
                </div>

                {/* Submission Status Filter */}
                <select
                  value={filterSubStatus}
                  onChange={(e) => setFilterSubStatus(e.target.value)}
                  className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
                >
                  <option value="All">Task Status: All</option>
                  <option value="Locked">Locked</option>
                  <option value="Available">Available</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Evaluated">Evaluated</option>
                  <option value="Missing">Missing</option>
                </select>

                {/* Evaluation Status Filter */}
                <select
                  value={filterEvalStatus}
                  onChange={(e) => setFilterEvalStatus(e.target.value)}
                  className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
                >
                  <option value="All">Evaluation: All</option>
                  <option value="Pending Evaluation">Pending Evaluation</option>
                  <option value="Evaluated">Evaluated</option>
                </select>

                {/* Section Filter */}
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
                >
                  <option value="All">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>
            </div>

            {/* Student Submissions List */}
            <div className="pro-card rounded-3xl p-6 bg-white space-y-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-700" />
                  <span>Student Submissions Roster ({filteredTaskStudents.length})</span>
                </h3>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-purple-100 bg-purple-50/60 text-[11px] font-extrabold uppercase text-purple-900 tracking-wider">
                      <th className="py-3 px-4 rounded-l-xl">Register No</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Section</th>
                      <th className="py-3 px-4 text-center">FN Attendance</th>
                      <th className="py-3 px-4 text-center">AN Attendance</th>
                      <th className="py-3 px-4">Task Status</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4">Evaluation</th>
                      <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100/60 text-xs text-slate-700 font-medium">
                    {filteredTaskStudents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-500 font-medium">
                          No matching student submissions found for selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTaskStudents.map((item: any) => {
                        const cleanSec = item.section ? item.section.replace(/^Sec\s*/, '') : 'A';
                        const submittedAt = item.dayTask?.submittedAt;

                        return (
                          <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-purple-900">
                              {item.registerNo}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {item.name}
                            </td>
                            <td className="py-3.5 px-4 font-bold">
                              {cleanSec}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {item.fnPresent ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">✓</span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-700 font-bold text-xs">✗</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {item.anPresent ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">✓</span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-700 font-bold text-xs">✗</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                                item.status === 'Evaluated' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                                item.status === 'Submitted' ? 'bg-indigo-100 text-indigo-900 border-indigo-300' :
                                item.status === 'Available' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                item.status === 'Missing' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                                'bg-slate-100 text-slate-700 border-slate-300'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px]">
                              {submittedAt ? formatDateDisplay(submittedAt) : '—'}
                            </td>
                            <td className="py-3.5 px-4">
                              {item.evalStatus === 'Evaluated' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                                  Evaluated ({item.dayTask?.evaluation?.score}/100)
                                </span>
                              ) : item.evalStatus === 'Pending Evaluation' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  Pending
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedSubmissionStudent(item);
                                  const task = item.dayTask;
                                  setEvaluatingTask(task || null);
                                  if (task?.evaluation) {
                                    setEvalScore(task.evaluation.score);
                                    setEvalGrade(task.evaluation.grade);
                                    setEvalLevel(task.evaluation.trainingLevel || 'Level 1 Foundation');
                                    setEvalComments(task.evaluation.comments || '');
                                  } else {
                                    setEvalScore(85);
                                    setEvalGrade('A_PLUS');
                                    setEvalLevel('Level 2 VR Developer');
                                    setEvalComments('Great VR interaction implementation.');
                                  }
                                }}
                                disabled={item.status === 'Locked' || item.status === 'Missing' || item.status === 'Available'}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs ${
                                  item.status === 'Locked' || item.status === 'Missing' || item.status === 'Available'
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                    : item.status === 'Evaluated'
                                    ? 'bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300'
                                    : 'pro-button-primary text-white shadow-sm'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{item.status === 'Evaluated' ? 'View / Re-evaluate' : 'View'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-3">
                {filteredTaskStudents.map((item: any) => {
                  const cleanSec = item.section ? item.section.replace(/^Sec\s*/, '') : 'A';
                  const submittedAt = item.dayTask?.submittedAt;

                  return (
                    <div key={item.id} className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                          <span className="font-mono font-bold text-purple-900 text-xs">{item.registerNo} • Section {cleanSec}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === 'Evaluated' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                          item.status === 'Submitted' ? 'bg-indigo-100 text-indigo-900 border-indigo-300' :
                          item.status === 'Available' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          item.status === 'Missing' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-700 font-semibold bg-white p-2.5 rounded-xl border border-purple-100">
                        <span>Attendance: FN {item.fnPresent ? '✓' : '✗'} AN {item.anPresent ? '✓' : '✗'}</span>
                        <span className="font-mono">{submittedAt ? formatDateDisplay(submittedAt) : 'No Submission'}</span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedSubmissionStudent(item);
                          const task = item.dayTask;
                          setEvaluatingTask(task || null);
                          if (task?.evaluation) {
                            setEvalScore(task.evaluation.score);
                            setEvalGrade(task.evaluation.grade);
                            setEvalLevel(task.evaluation.trainingLevel || 'Level 1 Foundation');
                            setEvalComments(task.evaluation.comments || '');
                          } else {
                            setEvalScore(85);
                            setEvalGrade('A_PLUS');
                            setEvalLevel('Level 2 VR Developer');
                            setEvalComments('Great VR interaction implementation.');
                          }
                        }}
                        disabled={item.status === 'Locked' || item.status === 'Missing' || item.status === 'Available'}
                        className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs ${
                          item.status === 'Locked' || item.status === 'Missing' || item.status === 'Available'
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'pro-button-primary text-white'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{item.status === 'Evaluated' ? 'View / Re-evaluate' : 'View Submission'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        );
      })()}

      {/* SUB-TAB 2: BATCHES & CURRICULUM MANAGEMENT */}
      {(staffTab === 'batches' || staffTab === 'calendar') && (
        <div className="space-y-6">

          {/* Section Header Card */}
          <div className="pro-card rounded-3xl p-6 bg-gradient-to-r from-white via-purple-50/40 to-purple-100/30 border-purple-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
                <Layers className="w-4 h-4 text-purple-700" />
                <span>Training Batches Hub</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Training Batches
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm mt-0.5 font-medium">
                Manage training batches, active schedules, and student enrollment.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => handleTabSwitch('curriculum')}
                className="py-3 px-4 rounded-2xl bg-purple-50 text-purple-900 border border-purple-200 font-bold text-xs flex items-center gap-2 hover:bg-purple-100 transition-all shadow-xs"
              >
                <BookOpen className="w-4 h-4 text-purple-700" />
                <span>Curriculum & Tasks</span>
              </button>

              <button
                onClick={handleOpenCreateBatchModal}
                className="py-3 px-5 rounded-2xl pro-button-primary text-white font-bold text-xs flex items-center gap-2 shadow-md hover:scale-[1.02] transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Batch</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Control Bar */}
          <div className="pro-card rounded-2xl p-4 bg-white/90 border-purple-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-purple-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Batch Name or Batch No..."
                value={batchSearchQuery}
                onChange={(e) => setBatchSearchQuery(e.target.value)}
                className="w-full pro-input rounded-xl pl-9 pr-4 py-2 text-xs placeholder-slate-400 font-medium"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                <Filter className="w-3.5 h-3.5 text-purple-600" />
                <span>Filters:</span>
              </div>

              {/* Level filter */}
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
              >
                <option value="All">All Levels</option>
                {configuredLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {levelDisplayNames[lvl] || LEVEL_CONFIG[lvl]?.name || lvl}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
              >
                <option value="All">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="Deactivated">Deactivated</option>
              </select>

              {/* Curriculum Status filter */}
              <select
                value={filterCurriculumStatus}
                onChange={(e) => setFilterCurriculumStatus(e.target.value)}
                className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
              >
                <option value="All">Curriculum: All</option>
                <option value="Not Set">Curriculum: Not Set</option>
                <option value="In Progress">Curriculum: In Progress</option>
                <option value="Completed">Curriculum: Completed</option>
              </select>
            </div>
          </div>

          {/* Professional Table View for Existing Batches */}
          <div className="pro-card rounded-3xl p-6 bg-white space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-700" />
                <span>Registered Batches Roster ({batches.length})</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-purple-100 bg-purple-50/60 text-[10px] sm:text-[11px] font-extrabold uppercase text-purple-900 tracking-wider whitespace-nowrap">
                    <th className="py-2.5 px-2.5 sm:px-3 rounded-l-xl align-middle">Batch Name</th>
                    <th className="py-2.5 px-2 align-middle">No</th>
                    <th className="py-2.5 px-2 align-middle">Level</th>
                    <th className="py-2.5 px-2 align-middle">Start Date</th>
                    <th className="py-2.5 px-2 align-middle text-center">Days</th>
                    <th className="py-2.5 px-2 align-middle">End Date</th>
                    <th className="py-2.5 px-2 align-middle">Instructor</th>
                    <th className="py-2.5 px-2 align-middle">Status</th>
                    <th className="py-2.5 px-2 align-middle">Curriculum</th>
                    <th className="py-2.5 px-2.5 sm:px-3 text-right rounded-r-xl align-middle">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100/60 text-[11px] sm:text-xs text-slate-700 font-medium">
                  {batches.filter((b) => {
                    const matchesSearch =
                      !batchSearchQuery ||
                      b.name.toLowerCase().includes(batchSearchQuery.toLowerCase()) ||
                      (b.batchNo && b.batchNo.toLowerCase().includes(batchSearchQuery.toLowerCase()));

                    const matchesLevel = filterLevel === 'All' || (b.level || 'Level 1') === filterLevel;

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const start = new Date(b.startDate);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(b.endDate);
                    end.setHours(0, 0, 0, 0);

                    let calcStatus = 'ACTIVE';
                    if (start > today) calcStatus = 'UPCOMING';
                    else if (end < today) calcStatus = 'Completed';

                    const currentStatus = b.status === 'CLOSED' ? 'Completed' : (b.status || calcStatus);
                    const matchesStatus = filterStatus === 'All' || currentStatus === filterStatus;

                    const currStatus = b.curriculumStatus || (b.trainingCalendar && b.trainingCalendar.length >= b.trainingDays ? 'Completed' : b.trainingCalendar && b.trainingCalendar.length > 0 ? 'In Progress' : 'Not Set');
                    const matchesCurriculum = filterCurriculumStatus === 'All' || currStatus === filterCurriculumStatus;

                    return matchesSearch && matchesLevel && matchesStatus && matchesCurriculum;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500 font-medium">
                        No matching batches found.
                      </td>
                    </tr>
                  ) : (
                    batches.filter((b) => {
                      const matchesSearch =
                        !batchSearchQuery ||
                        b.name.toLowerCase().includes(batchSearchQuery.toLowerCase()) ||
                        (b.batchNo && b.batchNo.toLowerCase().includes(batchSearchQuery.toLowerCase()));

                      const matchesLevel = filterLevel === 'All' || (b.level || 'Level 1') === filterLevel;

                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const start = new Date(b.startDate);
                      start.setHours(0, 0, 0, 0);
                      const end = new Date(b.endDate);
                      end.setHours(0, 0, 0, 0);

                      let calcStatus = 'ACTIVE';
                      if (start > today) calcStatus = 'UPCOMING';
                      else if (end < today) calcStatus = 'Deactivated';

                      const currentStatus = (b.status === 'CLOSED' || b.status === 'DEACTIVATED' || end < today) ? 'Deactivated' : (b.status || calcStatus);
                      const matchesStatus = filterStatus === 'All' || currentStatus === filterStatus;

                      const currStatus = b.curriculumStatus || (b.trainingCalendar && b.trainingCalendar.length >= b.trainingDays ? 'Completed' : b.trainingCalendar && b.trainingCalendar.length > 0 ? 'In Progress' : 'Not Set');
                      const matchesCurriculum = filterCurriculumStatus === 'All' || currStatus === filterCurriculumStatus;

                      return matchesSearch && matchesLevel && matchesStatus && matchesCurriculum;
                    }).map((b) => {
                      const bLevel = b.level || 'Level 1';
                      const bNo = b.batchNo || '001';
                      const currStatus = b.curriculumStatus || (b.trainingCalendar && b.trainingCalendar.length >= b.trainingDays ? 'Completed' : b.trainingCalendar && b.trainingCalendar.length > 0 ? 'In Progress' : 'Not Set');
                      
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const start = new Date(b.startDate);
                      start.setHours(0, 0, 0, 0);
                      const end = new Date(b.endDate);
                      end.setHours(0, 0, 0, 0);

                      let displayStatus = b.status || 'ACTIVE';
                      if (b.status === 'CLOSED' || b.status === 'DEACTIVATED' || end < today) displayStatus = 'Deactivated';
                      else if (start > today) displayStatus = 'UPCOMING';

                      return (
                        <tr key={b.id} className="hover:bg-purple-50/30 transition-colors border-b border-purple-50">
                          <td className="py-3 px-2.5 sm:px-3 font-bold text-slate-900 font-mono whitespace-nowrap align-middle">
                            {b.name}
                          </td>
                          <td className="py-3 px-2 font-mono font-bold text-purple-900 whitespace-nowrap align-middle">
                            {bNo}
                          </td>
                          <td className="py-3 px-2 whitespace-nowrap align-middle">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[10px] sm:text-[11px] border border-purple-200 shadow-2xs whitespace-nowrap">
                              {bLevel}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-mono text-slate-800 whitespace-nowrap align-middle text-[11px]">
                            {formatDateDisplay(b.startDate)}
                          </td>
                          <td className="py-3 px-2 font-mono font-bold text-center whitespace-nowrap align-middle">
                            {b.trainingDays}
                          </td>
                          <td className="py-3 px-2 font-mono text-slate-800 whitespace-nowrap align-middle text-[11px]">
                            {formatDateDisplay(b.endDate)}
                          </td>
                          <td className="py-3 px-2 font-semibold text-slate-700 whitespace-nowrap align-middle text-[11px]">
                            AR/VR COE
                          </td>
                          <td className="py-3 px-2 whitespace-nowrap align-middle">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold border shadow-2xs whitespace-nowrap ${
                              displayStatus === 'UPCOMING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              displayStatus === 'Deactivated' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {displayStatus}
                            </span>
                          </td>
                          <td className="py-3 px-2 whitespace-nowrap align-middle">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border shadow-2xs whitespace-nowrap ${
                              currStatus === 'Completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              currStatus === 'In Progress' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                              'bg-rose-100 text-rose-800 border-rose-300'
                            }`}>
                              {currStatus}
                            </span>
                          </td>
                          <td className="py-3 px-2.5 sm:px-3 text-right whitespace-nowrap align-middle">
                            <div className="flex items-center justify-end gap-1.5 shrink-0">
                              <button
                                onClick={() => handleOpenCurriculumModal(b)}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs shrink-0 whitespace-nowrap ${
                                  currStatus === 'Not Set'
                                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                                    : 'bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300'
                                }`}
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>{currStatus === 'Not Set' ? 'Set' : 'Curriculum'}</span>
                              </button>

                              <button
                                onClick={() => handleOpenBatchDetails(b)}
                                className="px-2 py-1 rounded-xl bg-purple-50 text-slate-700 hover:bg-purple-100 border border-purple-200 transition-colors text-[11px] font-semibold shrink-0"
                                title="View Batch Details"
                              >
                                <Eye className="w-3.5 h-3.5 text-purple-700" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* CREATE NEW BATCH MODAL OVERLAY */}
      {showCreateBatchModal && (
        <div 
          onClick={() => setShowCreateBatchModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-purple-200 max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto cursor-default"
          >
            
            <div className="flex items-center justify-between border-b border-purple-100 pb-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-purple-700 font-extrabold uppercase">AR/VR COE</span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Create New Batch</h2>
              </div>
              <button
                onClick={() => setShowCreateBatchModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatchSubmit} className="space-y-4">
              
              {/* Field 1: Batch Level */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Batch Level <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createLevel}
                  onChange={(e) => handleLevelChange(e.target.value)}
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-purple-50/40"
                >
                  {configuredLevels.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {levelDisplayNames[lvl] || LEVEL_CONFIG[lvl]?.name || lvl}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Batch No (Automatic / Manual) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Batch No <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-4 text-xs font-semibold text-purple-900">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="createNoMode"
                        checked={createNoMode === 'automatic'}
                        onChange={() => handleNoModeChange('automatic')}
                        className="accent-purple-600"
                      />
                      <span>Automatic</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="createNoMode"
                        checked={createNoMode === 'manual'}
                        onChange={() => handleNoModeChange('manual')}
                        className="accent-purple-600"
                      />
                      <span>Manual</span>
                    </label>
                  </div>
                </div>

                <input
                  type="text"
                  required
                  readOnly={createNoMode === 'automatic'}
                  value={createBatchNo}
                  onChange={(e) => handleBatchNoChange(e.target.value)}
                  placeholder="e.g. 001"
                  className={`w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold ${
                    createNoMode === 'automatic' ? 'bg-purple-100/60 text-purple-900 cursor-not-allowed border-purple-200' : 'bg-white text-slate-900'
                  }`}
                />
                {createNoMode === 'automatic' && (
                  <p className="text-[11px] text-purple-600 mt-1 font-medium">✓ System generated next available batch number</p>
                )}
              </div>

              {/* Field 3: Number of Days (NON-EDITABLE) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>No. of Days</span>
                  <span className="text-[11px] font-semibold text-purple-600">Fixed by Batch Level</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${createDaysCount} Days`}
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold bg-purple-100/60 text-purple-900 cursor-not-allowed border-purple-200"
                />
              </div>

              {/* Field 4: Start Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={createStartDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-medium"
                />
              </div>

              {/* Field 5: End Date (Exam Date) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>End Date (Exam Date)</span>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Day {createDaysCount} (Final Exam Day)
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatDateDisplay(createExamDate || createEndDate)}
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold bg-purple-100/60 text-purple-900 cursor-not-allowed border-purple-200"
                />
              </div>

              {/* Field 6: Exam Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Exam Date</span>
                  <span className="text-[11px] font-semibold text-purple-600">Day {createDaysCount} (Final Day of Batch)</span>
                </label>
                <input
                  type="date"
                  value={createExamDate}
                  onChange={(e) => {
                    setCreateExamDate(e.target.value);
                    setCreateEndDate(e.target.value);
                  }}
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold bg-white text-purple-950 border-purple-200"
                />
              </div>

              {/* Field 7: Batch Name (AUTOMATICALLY GENERATED) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Generated Batch Name</span>
                  <span className="text-[11px] font-semibold text-purple-600">System Formula</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={createBatchName}
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-950 border-purple-300 cursor-not-allowed"
                />
              </div>

              {/* Field 8: Default Instructor / Team */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Instructor / Team
                </label>
                <input
                  type="text"
                  readOnly
                  value="AR/VR COE Team"
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-bold bg-purple-100/60 text-purple-900 cursor-not-allowed border-purple-200"
                />
              </div>

              {/* GENERATED TRAINING CALENDAR & DEFAULT CURRICULUM PREVIEW TABLE */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-700" />
                    <span>Training Calendar & Level Curriculum Preview</span>
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    Auto Loaded ({createLevel})
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto border border-purple-200 rounded-2xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-purple-50/80 text-purple-900 font-extrabold border-b border-purple-100 uppercase text-[10px]">
                        <th className="p-2.5">Day</th>
                        <th className="p-2.5">Calendar Date</th>
                        <th className="p-2.5">Curriculum Module Topic</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100/60 font-medium">
                      {generateTrainingDaysCalendar(createStartDate, createLevel, createDaysCount).map((item) => {
                        const customTask = createLevelTasks.find((t) => t.dayNumber === item.dayNumber);
                        const isExamDay = item.dayNumber === createDaysCount || item.isExam;
                        return (
                          <tr
                            key={item.dayNumber}
                            className={
                              isExamDay
                                ? 'bg-amber-50/80 border-t-2 border-amber-300 font-bold'
                                : 'hover:bg-purple-50/40'
                            }
                          >
                            <td className="p-2.5 font-bold font-mono text-purple-900 flex items-center gap-1.5">
                              {isExamDay && <GraduationCap className="w-3.5 h-3.5 text-amber-700 shrink-0" />}
                              <span>Day {item.dayNumber}</span>
                              {isExamDay && (
                                <span className="text-[10px] bg-amber-200 text-amber-950 font-sans px-2 py-0.5 rounded-full font-extrabold border border-amber-300 uppercase tracking-wide">
                                  Final Exam Day
                                </span>
                              )}
                            </td>
                            <td className={`p-2.5 font-mono font-bold ${isExamDay ? 'text-amber-950' : 'text-slate-800'}`}>
                              {item.dateDisplay}
                            </td>
                            <td className={`p-2.5 ${isExamDay ? 'text-amber-950 font-bold' : 'font-semibold text-slate-900'}`}>
                              {customTask?.taskTitle || item.taskTitle}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => setShowCreateBatchModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-slate-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Batch</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CURRICULUM & CALENDAR SCHEDULE CONFIGURATION MODAL OVERLAY */}
      {showCurriculumModal && curriculumBatch && (
        <div 
          onClick={() => {
            setIsEditingDates(false);
            setShowCurriculumModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-purple-200 max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto cursor-default"
          >
            
            {/* Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100 pb-4">
              <div>
                <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
                  <BookOpen className="w-4 h-4" />
                  <span>Curriculum & Training Calendar Schedule</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {curriculumBatch.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-semibold text-slate-600">
                  <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-md border border-purple-200 font-bold">
                    {curriculumBatch.level || 'Level 1'}
                  </span>
                  <span>Start: <strong className="text-slate-900 font-mono">{formatDateDisplay(curriculumBatch.startDate)}</strong></span>
                  <span>Derived End: <strong className="text-purple-900 font-mono font-bold">{formatDateDisplay(curriculumCalendarDays[curriculumCalendarDays.length - 1]?.dateStr || curriculumBatch.endDate)}</strong></span>
                  <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md border border-indigo-200 font-mono">
                    {curriculumCalendarDays.length} Days Total
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={savingCurriculum}
                  onClick={isEditingDates ? handleSaveCurriculumSubmit : () => setIsEditingDates(true)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isEditingDates
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm hover:bg-emerald-700'
                      : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  {savingCurriculum ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : isEditingDates ? (
                    <Save className="w-3.5 h-3.5" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5" />
                  )}
                  <span>{isEditingDates ? 'Save & Close Dates' : 'Edit Dates'}</span>
                </button>

                {isEditingDates && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDates(false)}
                    className="py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
                    title="Cancel date editing"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowRegenerateConfirmModal(true)}
                  className="py-2 px-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Regenerate calendar dates sequentially from Start Date"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Regenerate Calendar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditingDates(false);
                    setShowCurriculumModal(false);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Curriculum & Calendar Days List */}
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
              {curriculumCalendarDays.map((day, idx) => {
                const isExamDay = idx === curriculumCalendarDays.length - 1;
                return (
                  <div
                    key={day.dayNumber}
                    className={`p-4 rounded-2xl space-y-3 transition-all ${
                      isExamDay
                        ? 'bg-gradient-to-br from-amber-50/90 via-white to-amber-50/50 border-2 border-amber-300 shadow-sm'
                        : 'bg-purple-50/50 border border-purple-200/80'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-extrabold font-mono px-3 py-1 rounded-lg border flex items-center gap-2 ${
                            isExamDay
                              ? 'bg-amber-100 text-amber-950 border-amber-300 ring-2 ring-amber-300/60 shadow-2xs'
                              : 'bg-purple-100 text-purple-900 border-purple-200'
                          }`}
                        >
                          {isExamDay && <GraduationCap className="w-3.5 h-3.5 text-amber-700" />}
                          <span>Day {String(day.dayNumber).padStart(2, '0')}</span>
                        </span>
                        {isExamDay && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            <span>Final Exam Day</span>
                          </span>
                        )}
                      </div>

                      {/* Calendar Date Cell */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Calendar Date:</span>
                        {isEditingDates ? (
                          <input
                            type="date"
                            value={day.dateStr}
                            onChange={(e) => handleDayDateChange(idx, e.target.value)}
                            className="pro-input rounded-xl px-3 py-1 text-xs font-mono font-bold text-purple-950 bg-white border-purple-300"
                          />
                        ) : (
                          <span className="px-3 py-1 rounded-lg bg-white border border-purple-200 text-xs font-mono font-bold text-slate-900 shadow-2xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-purple-600" />
                            <span>{formatDateDisplay(day.dateStr)}</span>
                            {day.isManualOverride && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-sans font-bold">Manual</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                  {/* Multi-Task & Resources Read-Only View in Batch Curriculum */}
                  {(() => {
                    const dayTasks = (day.tasks && day.tasks.length > 0)
                      ? day.tasks
                      : [{ id: `task-${day.dayNumber}-1`, title: day.taskTitle || `Day ${day.dayNumber} Task`, description: day.taskDescription || '' }];
                    const dayResources = day.resources || [];

                    return (
                      <div className="space-y-4 pt-1">
                        {/* Tasks List Section (Read-Only) */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between border-b border-purple-200/70 pb-2">
                            <div className="flex items-center gap-2">
                              <ListChecks className="w-4 h-4 text-purple-700" />
                              <span className="text-xs font-bold text-slate-900">
                                {isExamDay ? 'Exam Tasks & Practical Requirements' : 'Tasks & Practical Requirements'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                                {dayTasks.length} {dayTasks.length === 1 ? 'Task' : 'Tasks'}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Read-Only (Configured in Curriculum)
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {dayTasks.map((taskItem, tIdx) => (
                              <div
                                key={taskItem.id || tIdx}
                                className="p-3.5 rounded-xl bg-white border border-purple-200/80 shadow-2xs space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-extrabold text-purple-950 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
                                      Task #{tIdx + 1}
                                    </span>
                                    {isExamDay && tIdx === 0 && (
                                      <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                                        Primary Exam Deliverable
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="text-xs font-extrabold text-slate-900">
                                    {taskItem.title || `Day ${day.dayNumber} Task ${tIdx + 1}`}
                                  </div>
                                  {taskItem.description ? (
                                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-purple-50/30 p-2.5 rounded-lg border border-purple-100">
                                      {taskItem.description}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-slate-400 italic">No description specified.</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Learning Resources Section (Read-Only) */}
                        <div className="space-y-2.5 pt-2 border-t border-purple-200/70">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Paperclip className="w-4 h-4 text-indigo-700" />
                              <span className="text-xs font-bold text-slate-900">
                                Day Resources (PDFs, Links & Materials)
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                {dayResources.length} {dayResources.length === 1 ? 'Resource' : 'Resources'}
                              </span>
                            </div>
                          </div>

                          {dayResources.length === 0 ? (
                            <div className="p-3 rounded-xl border border-dashed border-purple-200 bg-purple-50/20 text-center">
                              <p className="text-[11px] text-slate-500 font-medium">
                                No resources attached for this day.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {dayResources.map((resItem, rIdx) => (
                                <div
                                  key={resItem.id || rIdx}
                                  className="p-3 rounded-xl bg-white border border-purple-200/80 shadow-2xs flex items-center justify-between gap-3"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                                      {resItem.type === 'pdf' ? (
                                        <FileText className="w-4 h-4" />
                                      ) : resItem.type === 'link' ? (
                                        <LinkIcon className="w-4 h-4" />
                                      ) : (
                                        <Paperclip className="w-4 h-4" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-xs font-bold text-slate-900 truncate block">
                                        {resItem.title || 'Attached Resource'}
                                      </span>
                                      <span className="text-[10px] font-mono text-purple-700 font-bold uppercase tracking-wider">
                                        {resItem.type === 'pdf' ? 'PDF Document' : resItem.type === 'link' ? 'Web Link' : resItem.type || 'Resource'}
                                      </span>
                                    </div>
                                  </div>

                                  {resItem.url && (
                                    <a
                                      href={resItem.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="py-1 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                                      title="Open resource"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      <span>View</span>
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs font-bold text-amber-950">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-700" />
                  <span>Scheduled Exam Date:</span>
                </span>
                <span className="font-mono text-sm">{formatDateDisplay(calculateExamDate(curriculumCalendarDays[curriculumCalendarDays.length - 1]?.dateStr || curriculumBatch.endDate))}</span>
              </div>
            </div>

            {/* Save Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-purple-100">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Curriculum & tasks are read-only here. To edit task definitions, visit the <strong>Curriculum & Tasks</strong> tab.</span>
              </div>
              <div className="flex gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowCurriculumModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-purple-50 border border-purple-200 text-slate-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                >
                  {isEditingDates ? 'Cancel' : 'Close'}
                </button>
                <button
                  type="button"
                  disabled={savingCurriculum}
                  onClick={handleSaveCurriculumSubmit}
                  className="py-2.5 px-5 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md flex items-center justify-center gap-2"
                >
                  {savingCurriculum ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{savingCurriculum ? 'Saving Schedule...' : 'Save Calendar Dates'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CURRICULUM & TASK CONFIGURATION FULL PAGE */}
      {staffTab === 'curriculum' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Section Header Card */}
          <div className="pro-card rounded-3xl p-6 bg-gradient-to-r from-white via-purple-50/40 to-purple-100/30 border-purple-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
                <BookOpen className="w-4 h-4 text-purple-700" />
                <span>Curriculum & Task Architecture Hub</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Curriculum & Tasks
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm mt-0.5 font-medium">
                Configure training levels, days, task requirements, and learning resources (PDFs, docs, and links).
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => handleTabSwitch('batches')}
                className="py-2.5 px-4 rounded-xl bg-purple-50 border border-purple-200 text-slate-700 text-xs font-bold hover:bg-purple-100 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Batches</span>
              </button>

              {configuredLevels.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleClearCurriculum}
                    className="py-2.5 px-4 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Clear all tasks and descriptions to start fresh"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Clear Curriculum</span>
                  </button>

                  <button
                    type="button"
                    disabled={savingSettingsTasks}
                    onClick={handleSaveSettingsTasks}
                    className="py-2.5 px-5 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] transition-all cursor-pointer"
                  >
                    {savingSettingsTasks ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Tasks & Days</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Level Sub-tabs Selector & Total Days Control */}
          <div className="pro-card rounded-2xl p-3 bg-gradient-to-r from-purple-50/70 to-indigo-50/70 border-purple-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 flex-1 overflow-x-auto pb-1 sm:pb-0">
              {configuredLevels.length === 0 && (
                <span className="text-xs font-semibold text-purple-900/60 italic px-2">No levels configured yet</span>
              )}
              {configuredLevels.map((lvl) => {
                const displayName = (settingsActiveLevel === lvl ? settingsLevelName : levelDisplayNames[lvl]) || LEVEL_CONFIG[lvl]?.name || lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleSettingsLevelSwitch(lvl)}
                    title={displayName}
                    className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 max-w-[260px] ${
                      settingsActiveLevel === lvl
                        ? 'bg-purple-900 text-white shadow-md scale-[1.02]'
                        : 'bg-white text-slate-700 hover:bg-purple-100/70 hover:text-purple-950 border border-purple-200/80 shadow-2xs'
                    }`}
                  >
                    <Layers className={`w-3.5 h-3.5 shrink-0 ${settingsActiveLevel === lvl ? 'text-purple-300' : 'text-purple-500'}`} />
                    <span className="truncate">{displayName}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
              {configuredLevels.length > 0 && (
                <>
                  <span className="text-xs font-mono font-extrabold text-purple-950 bg-white border border-purple-200 px-3 py-1.5 rounded-xl shadow-2xs">
                    {settingsLevelTasks.length} Training Days
                  </span>
                  {settingsLevelTasks.length > 0 && (
                    <span className="text-xs font-bold text-amber-950 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-amber-700" />
                      <span>Day {settingsLevelTasks.length} is Exam Day</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleRemoveSettingsLevel}
                    className="py-1.5 px-3 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-900 border border-rose-200 text-xs font-bold transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                    title={`Remove ${levelDisplayNames[settingsActiveLevel] || settingsActiveLevel}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span className="max-w-[140px] truncate">Remove Level</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleOpenAddLevelModal}
                className="py-1.5 px-3.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Level</span>
              </button>
            </div>
          </div>

              {/* ADD NEW TRAINING LEVEL MODAL OVERLAY */}
              {showAddLevelModal && (
                <div
                  className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-pointer"
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !creatingLevel) setShowAddLevelModal(false);
                  }}
                >
                  <div
                    className="bg-white rounded-3xl border border-purple-200 max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-800 border border-purple-200/80 shadow-2xs">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900">Add New Training Level</h3>
                          <p className="text-xs text-slate-500 font-medium">Create and persist a custom curriculum track</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={creatingLevel}
                        onClick={() => setShowAddLevelModal(false)}
                        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {newLevelError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{newLevelError}</span>
                      </div>
                    )}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleConfirmAddLevel();
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          <span>Level Name / Title *</span>
                        </label>
                        <input
                          type="text"
                          autoFocus
                          value={newLevelForm.name}
                          onChange={(e) => {
                            setNewLevelForm((prev) => ({ ...prev, name: e.target.value }));
                            if (newLevelError) setNewLevelError('');
                          }}
                          placeholder="e.g. WebXR & Three.js Development"
                          className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-purple-50/40 border-purple-200 focus:bg-white"
                        />
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">
                          This title will appear on level tabs, batches, and student certificates.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-600" />
                          <span>Total Training Days *</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={newLevelForm.days}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setNewLevelForm((prev) => ({ ...prev, days: isNaN(val) ? 1 : val }));
                          }}
                          className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 bg-purple-50/40 border-purple-200 focus:bg-white"
                        />
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl">
                          <GraduationCap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Day {newLevelForm.days || 1} will be configured automatically as the final Exam Day.</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-purple-100">
                        <button
                          type="button"
                          disabled={creatingLevel}
                          onClick={() => setShowAddLevelModal(false)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={creatingLevel}
                          className="pro-button-primary px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {creatingLevel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          <span>{creatingLevel ? 'Saving...' : 'Create Level'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Empty state when no levels configured */}
              {configuredLevels.length === 0 ? (
                <div className="pro-card rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-purple-50/40 via-white to-indigo-50/30 border-2 border-dashed border-purple-200/80 shadow-xs">
                  <div className="p-4 rounded-3xl bg-purple-100/80 text-purple-700 shadow-2xs border border-purple-200/60">
                    <Layers className="w-10 h-10" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <h3 className="text-lg font-extrabold text-slate-800">No Training Levels Configured</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      There are currently no curriculum levels. Click below to add your first level (e.g. Level 1).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddLevelModal}
                    className="pro-button-primary px-6 py-3 rounded-2xl text-xs font-extrabold text-white shadow-md flex items-center gap-2 hover:scale-[1.02] transition-transform cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Level</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Level Title / Custom Name Field */}
                  <div className="pro-card rounded-2xl p-5 bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/80 border border-purple-200 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-extrabold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                        <span>Level Name / Curriculum Title</span>
                      </label>
                      <span className="text-[11px] font-semibold text-purple-700">Appears on Level Tabs, Batch Creation & Certificates</span>
                    </div>
                    <input
                      type="text"
                      value={settingsLevelName}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setSettingsLevelName(newTitle);
                        setLevelDisplayNames((prev) => ({
                          ...prev,
                          [settingsActiveLevel]: newTitle,
                        }));
                      }}
                      placeholder="e.g. AR/VR Core Fundamentals or Advanced WebXR"
                      className="w-full pro-input rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 bg-white border-purple-300"
                    />
                  </div>

              {/* Task Editor List */}
              {loadingSettingsTasks ? (
                <div className="pro-card rounded-3xl p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
                  <span className="text-xs font-bold text-slate-700">Loading {settingsActiveLevel} task configuration...</span>
                </div>
              ) : (
                <div className="space-y-5">
                  {settingsLevelTasks.map((day, idx) => {
                    const isExamDay = idx === settingsLevelTasks.length - 1;
                    return (
                      <div
                        key={day.dayNumber}
                        className={`pro-card rounded-3xl p-5 sm:p-6 space-y-5 transition-all ${
                          isExamDay
                            ? 'bg-gradient-to-br from-amber-50/90 via-white to-amber-50/50 border-2 border-amber-300 shadow-sm'
                            : 'bg-white border border-purple-200/90 shadow-sm hover:border-purple-300'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-extrabold font-mono px-3 py-1 rounded-lg border flex items-center gap-1.5 ${
                                isExamDay
                                  ? 'bg-amber-100 text-amber-950 border-amber-300 ring-2 ring-amber-300/60 shadow-2xs'
                                  : 'bg-purple-100 text-purple-900 border-purple-200'
                              }`}
                            >
                              {isExamDay && <GraduationCap className="w-3.5 h-3.5 text-amber-700" />}
                              <span>{settingsActiveLevel} • Day {String(day.dayNumber).padStart(2, '0')}</span>
                            </span>

                            {isExamDay && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" />
                                <span>Official Final Exam Day</span>
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteSettingsDay(idx)}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
                            title="Remove this training day"
                          >
                            Remove Day
                          </button>
                        </div>

                        {isExamDay && (
                          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/70 border border-amber-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
                            <div className="flex items-start gap-2.5">
                              <GraduationCap className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                              <div>
                                <strong className="block font-bold text-xs text-amber-950">
                                  🎓 Day {day.dayNumber} is the Final Examination & Assessment Day
                                </strong>
                                <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed font-medium">
                                  This is the final day of {settingsActiveLevel}. The practical assessment completed on this day determines the student's Final Exam & Certificate Performance Grade.
                                </p>
                              </div>
                            </div>
                            {(!day.taskTitle?.toLowerCase().includes('exam') || !day.taskTitle?.toLowerCase().includes('final')) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...settingsLevelTasks];
                                  updated[idx].taskTitle = `Final Examination: ${settingsActiveLevel} Comprehensive Practical Assessment`;
                                  updated[idx].taskDescription = `Final practical examination and capstone assessment for ${settingsActiveLevel}. Complete the required exam module, build and test your solution, and submit your final execution output for grading. Your instructor will evaluate this exam and assign your final certificate grade.`;
                                  setSettingsLevelTasks(updated);
                                }}
                                className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 text-[10px] font-bold transition-colors border border-amber-400/60 flex items-center gap-1 shadow-2xs"
                                title="Auto-fill standard Final Exam title & requirements"
                              >
                                <Sparkles className="w-3 h-3 text-amber-800" />
                                <span>Use Exam Template</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Multi-Task & Resources Editor */}
                        {(() => {
                          const dayTasks = (day.tasks && day.tasks.length > 0)
                            ? day.tasks
                            : [{ id: `task-${day.dayNumber}-1`, title: day.taskTitle || `Day ${day.dayNumber} Task`, description: day.taskDescription || '' }];
                          const dayResources = day.resources || [];

                          return (
                            <div className="space-y-4 pt-1">
                              {/* Tasks List Section */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between border-b border-purple-200/70 pb-2">
                                  <div className="flex items-center gap-2">
                                    <ListChecks className="w-4 h-4 text-purple-700" />
                                    <span className="text-xs font-bold text-slate-900">
                                      {isExamDay ? 'Exam Tasks & Practical Requirements' : 'Tasks & Practical Requirements'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                                      {dayTasks.length} {dayTasks.length === 1 ? 'Task' : 'Tasks'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleAddTask(idx, false)}
                                    className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 text-[11px] font-bold transition-all flex items-center gap-1 border border-purple-300 shadow-2xs"
                                  >
                                    <Plus className="w-3.5 h-3.5 text-purple-700" />
                                    <span>Add Task</span>
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  {dayTasks.map((taskItem, tIdx) => (
                                    <div
                                      key={taskItem.id || tIdx}
                                      className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/80 shadow-2xs space-y-3"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[11px] font-extrabold text-purple-950 bg-white px-2.5 py-0.5 rounded-md border border-purple-200">
                                            Task #{tIdx + 1}
                                          </span>
                                          {isExamDay && tIdx === 0 && (
                                            <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                                              Primary Exam Deliverable
                                            </span>
                                          )}
                                        </div>
                                        {dayTasks.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveTask(idx, tIdx, false)}
                                            className="text-[11px] text-rose-600 hover:text-rose-800 px-2 py-0.5 rounded hover:bg-rose-50 transition-colors flex items-center gap-1 font-semibold"
                                            title="Remove this task"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            <span>Remove Task</span>
                                          </button>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                                        <div className="lg:col-span-4">
                                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                            Task Title
                                          </label>
                                          <input
                                            type="text"
                                            value={taskItem.title}
                                            onChange={(e) => handleTaskFieldChange(idx, tIdx, 'title', e.target.value, false)}
                                            placeholder={isExamDay ? `Final Examination Task ${tIdx + 1}` : `e.g. Task ${tIdx + 1}: Scene Setup`}
                                            className="w-full pro-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 bg-white"
                                          />
                                        </div>
                                        <div className="lg:col-span-8">
                                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                            Task Description & Requirements
                                          </label>
                                          <textarea
                                            rows={3}
                                            value={taskItem.description}
                                            onChange={(e) => handleTaskFieldChange(idx, tIdx, 'description', e.target.value, false)}
                                            placeholder="Specify technical instructions, Unity components to configure, steps, and required deliverables..."
                                            className="w-full pro-input rounded-xl px-3 py-2 text-xs text-slate-800 resize-y bg-white"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Learning Resources Section (PDFs, Links, Others) */}
                              <div className="space-y-3 pt-2 border-t border-purple-200/70">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Paperclip className="w-4 h-4 text-indigo-700" />
                                    <span className="text-xs font-bold text-slate-900">
                                      Day Resources (PDFs, Links & Materials)
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                      {dayResources.length} {dayResources.length === 1 ? 'Resource' : 'Resources'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleAddResource(idx, false)}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-[11px] font-bold transition-all flex items-center gap-1 border border-indigo-300 shadow-2xs"
                                  >
                                    <Plus className="w-3.5 h-3.5 text-indigo-700" />
                                    <span>Add Resource</span>
                                  </button>
                                </div>

                                {dayResources.length === 0 ? (
                                  <div className="p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 text-center">
                                    <p className="text-[11px] text-slate-600 font-medium">
                                      No resources added for this day yet. Click <strong className="text-indigo-800 font-bold">+ Add Resource</strong> to provide lecture PDFs, documentation links, or starter assets.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2.5">
                                    {dayResources.map((resItem, rIdx) => (
                                      <div
                                        key={resItem.id || rIdx}
                                        className="p-3.5 rounded-xl bg-white border border-indigo-200/80 shadow-2xs space-y-2.5"
                                      >
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                          <div className="sm:col-span-8">
                                            <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                              Resource Title / Name
                                            </label>
                                            <input
                                              type="text"
                                              value={resItem.title}
                                              onChange={(e) => handleResourceFieldChange(idx, rIdx, 'title', e.target.value, false)}
                                              placeholder="e.g. Day 1 VR Setup Guide (PDF) or Unity Official Manual"
                                              className="w-full pro-input rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900"
                                            />
                                          </div>
                                          <div className="sm:col-span-4">
                                            <div className="flex items-center justify-between mb-1">
                                              <label className="block text-[10px] font-bold text-slate-600">Type</label>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveResource(idx, rIdx, false)}
                                                className="text-rose-600 hover:text-rose-800 text-[10px] font-bold flex items-center gap-0.5"
                                                title="Remove this resource"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                                <span>Remove</span>
                                              </button>
                                            </div>
                                            <select
                                              value={resItem.type || 'pdf'}
                                              onChange={(e) => handleResourceFieldChange(idx, rIdx, 'type', e.target.value, false)}
                                              className="w-full pro-input rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white"
                                            >
                                              <option value="pdf">📄 PDF Document</option>
                                              <option value="link">🔗 Web Link / URL</option>
                                              <option value="doc">📁 Document / Zip Asset</option>
                                              <option value="video">🎥 Video Reference</option>
                                              <option value="other">📌 Other Reference</option>
                                            </select>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <div className="flex-1">
                                            <input
                                              type="text"
                                              value={resItem.url}
                                              onChange={(e) => handleResourceFieldChange(idx, rIdx, 'url', e.target.value, false)}
                                              placeholder={resItem.type === 'pdf' ? 'URL to PDF (e.g. https://... or upload PDF below)' : 'https://... resource URL'}
                                              className="w-full pro-input rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono"
                                            />
                                          </div>

                                          {/* Direct Upload PDF / File Button */}
                                          <label className="cursor-pointer shrink-0">
                                            <input
                                              type="file"
                                              accept=".pdf,.docx,.zip,.mp4,image/*"
                                              className="hidden"
                                              disabled={uploadingResourceKey === `settings-${idx}-${rIdx}`}
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  handleResourceFileUpload(
                                                    file,
                                                    (url, filename, type) => {
                                                      handleResourceUploadSuccess(idx, rIdx, url, filename, type, false);
                                                    },
                                                    `settings-${idx}-${rIdx}`
                                                  );
                                                }
                                                e.target.value = '';
                                              }}
                                            />
                                            <span className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                                              uploadingResourceKey === `settings-${idx}-${rIdx}`
                                                ? 'bg-purple-100 text-purple-700 border-purple-300 animate-pulse'
                                                : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100 shadow-2xs'
                                            }`}>
                                              {uploadingResourceKey === `settings-${idx}-${rIdx}` ? (
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-700" />
                                              ) : (
                                                <FileUp className="w-3.5 h-3.5 text-purple-700" />
                                              )}
                                              <span>{uploadingResourceKey === `settings-${idx}-${rIdx}` ? 'Uploading...' : 'Upload File'}</span>
                                            </span>
                                          </label>

                                          {resItem.url && (
                                            <a
                                              href={resItem.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shrink-0"
                                              title="Open and test resource"
                                            >
                                              <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleAddSettingsDay}
                    className="w-full py-3.5 rounded-2xl border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50/50 text-purple-900 text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4 text-purple-600" />
                    <span>Add Training Day {settingsLevelTasks.length + 1} to {settingsActiveLevel}</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pro-card rounded-2xl p-4 bg-white border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <span className="text-xs text-slate-500 font-medium">
                  Edits persist in database for all future {settingsActiveLevel} batches.
                </span>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('batches')}
                    className="py-2.5 px-4 rounded-xl bg-purple-50 border border-purple-200 text-slate-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                  >
                    Back to Batches
                  </button>
                  <button
                    type="button"
                    disabled={savingSettingsTasks}
                    onClick={handleSaveSettingsTasks}
                    className="py-2.5 px-6 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] transition-all"
                  >
                    {savingSettingsTasks ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Tasks & Days</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* SYSTEM SETTINGS FULL PAGE */}
      {staffTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Section Header Card */}
          <div className="pro-card rounded-3xl p-6 bg-gradient-to-r from-white via-purple-50/40 to-purple-100/30 border-purple-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
                <Settings className="w-4 h-4 text-purple-700" />
                <span>Admin Settings • System Configuration</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                System Settings
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm mt-0.5 font-medium">
                Manage portal branding, page title & details, daily attendance marking windows, and Google Drive cloud storage.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => handleTabSwitch('batches')}
                className="py-2.5 px-4 rounded-xl bg-purple-50 border border-purple-200 text-slate-700 text-xs font-bold hover:bg-purple-100 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Batches</span>
              </button>

              {settingsSectionTab === 'pageDetails' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetPageSettingsToDefault}
                    className="py-2.5 px-4 rounded-xl bg-purple-50 border border-purple-200 text-slate-700 text-xs font-bold hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                  <button
                    type="button"
                    disabled={savingPageSettings}
                    onClick={handleSavePageSettings}
                    className="py-2.5 px-5 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] transition-all cursor-pointer"
                  >
                    {savingPageSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Page Details</span>
                  </button>
                </div>
              )}

              {settingsSectionTab === 'attendance' && (
                <button
                  type="button"
                  disabled={savingAttendanceSettings}
                  onClick={handleSaveAttendanceSettings}
                  className="py-2.5 px-5 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] transition-all cursor-pointer"
                >
                  {savingAttendanceSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Attendance Settings</span>
                </button>
              )}
            </div>
          </div>

          {/* Section Tabs: Page Details, Attendance & Drive */}
          <div className="pro-card rounded-2xl p-2 bg-white/95 border-purple-200/90 flex flex-wrap items-center gap-2 shadow-xs">
            <button
              type="button"
              onClick={() => {
                setSettingsSectionTab('pageDetails');
                fetchPageSettings();
              }}
              className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                settingsSectionTab === 'pageDetails'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-purple-50/70 text-slate-700 hover:bg-purple-100/80 border border-purple-200/70'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Page Title & Branding Details</span>
            </button>

            <button
              type="button"
              onClick={() => setSettingsSectionTab('attendance')}
              className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                settingsSectionTab === 'attendance'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-purple-50/70 text-slate-700 hover:bg-purple-100/80 border border-purple-200/70'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Attendance Window Settings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSettingsSectionTab('drive');
                fetchDriveSettings();
              }}
              className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                settingsSectionTab === 'drive'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-purple-50/70 text-slate-700 hover:bg-purple-100/80 border border-purple-200/70'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>Google Drive Storage Settings</span>
              <span className={`w-2 h-2 rounded-full ml-0.5 ${driveStorageInfo?.isConnected ? 'bg-emerald-500' : driveStorageInfo?.hasConnectionRecord ? 'bg-amber-500' : 'bg-rose-400'}`} />
            </button>
          </div>

          {/* TAB 1: PAGE TITLE & BRANDING DETAILS */}
          {settingsSectionTab === 'pageDetails' && (
            <div className="space-y-6">
              <div className="pro-card rounded-2xl p-5 bg-purple-50/70 border border-purple-200 text-xs text-purple-950 leading-relaxed font-medium flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold text-slate-900 mb-0.5">Customize Page Title & Portal Details</strong>
                  Change the application branding, navigation bar title, edition badge, page subtitle, browser tab title, institutional details, and footer text. Updates reflect immediately across the entire portal.
                </div>
              </div>

              {loadingPageSettings ? (
                <div className="pro-card rounded-3xl p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
                  <span className="text-xs font-bold text-slate-700">Loading page settings & branding...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card 1: Navbar & Header Branding */}
                  <div className="pro-card rounded-3xl p-6 bg-white border border-purple-200 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-purple-100">
                      <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                        <LayoutDashboard className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-purple-950">
                          Portal Header Branding
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">Main application title and header subtitle</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Page / Application Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={pageTitle}
                          onChange={(e) => setPageTitle(e.target.value)}
                          placeholder="e.g. AR/VR ACADEMY"
                          className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white"
                        />
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">
                          Displayed in the top navigation bar brand section.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Edition / Status Badge
                          </label>
                          <input
                            type="text"
                            value={pageBadge}
                            onChange={(e) => setPageBadge(e.target.value)}
                            placeholder="e.g. ENTERPRISE, PRO, ACADEMY"
                            className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-purple-950 bg-white border-purple-300"
                          />
                          <p className="text-[11px] text-slate-400 mt-1 font-medium">
                            Small pill badge next to the title (optional).
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Organization / COE Short Tag
                          </label>
                          <input
                            type="text"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            placeholder="e.g. AR/VR COE"
                            className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white"
                          />
                          <p className="text-[11px] text-slate-400 mt-1 font-medium">
                            Institutional tag used in Admin headers.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Page Subtitle / Tagline
                        </label>
                        <input
                          type="text"
                          value={pageSubtitle}
                          onChange={(e) => setPageSubtitle(e.target.value)}
                          placeholder="e.g. Spatial Computing & Immersive Training Hub"
                          className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-white"
                        />
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">
                          Subtext displayed beneath the title in the navigation bar.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Browser Tab & SEO Details */}
                  <div className="pro-card rounded-3xl p-6 bg-white border border-purple-200 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-purple-100">
                      <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-purple-950">
                          Browser Window & Page Details
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">Browser tab title, overview, and contact info</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Browser Tab Title (&lt;title&gt;) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={browserTitle}
                          onChange={(e) => setBrowserTitle(e.target.value)}
                          placeholder="e.g. AR/VR Spatial Computing Academy | Immersive Training Platform"
                          className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white"
                        />
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">
                          Appears in the browser tab and bookmarks.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Page Description & Details
                        </label>
                        <textarea
                          rows={3}
                          value={pageDescription}
                          onChange={(e) => setPageDescription(e.target.value)}
                          placeholder="Brief description of the training academy and portal features..."
                          className="w-full pro-input rounded-xl p-3.5 text-xs font-medium text-slate-800 bg-white leading-relaxed resize-y"
                        />
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">
                          Comprehensive summary used for page metadata and portal overview.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Footer Text & Copyright
                          </label>
                          <input
                            type="text"
                            value={footerText}
                            onChange={(e) => setFooterText(e.target.value)}
                            placeholder="e.g. AR/VR Spatial Computing Academy © 2026"
                            className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Support / Helpdesk Email
                          </label>
                          <input
                            type="email"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            placeholder="e.g. support@arvr.com"
                            className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Action Buttons */}
              <div className="pro-card rounded-2xl p-4 bg-white border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <span className="text-xs text-slate-500 font-medium">
                  Changes apply dynamically across the entire website and all user sessions.
                </span>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('batches')}
                    className="py-2.5 px-4 rounded-xl bg-purple-50 border border-purple-200 text-slate-700 text-xs font-bold hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    Back to Batches
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPageSettingsToDefault}
                    className="py-2.5 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                  <button
                    type="button"
                    disabled={savingPageSettings}
                    onClick={handleSavePageSettings}
                    className="py-2.5 px-6 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] transition-all cursor-pointer"
                  >
                    {savingPageSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Page Details</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE WINDOW SETTINGS */}
          {settingsSectionTab === 'attendance' && (
            <div className="space-y-6">
              <div className="pro-card rounded-2xl p-5 bg-purple-50/70 border border-purple-200 text-xs text-purple-950 leading-relaxed font-medium flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold text-slate-900 mb-0.5">Daily Attendance Marking Windows</strong>
                  Set opening and closing (cutoff) times for student attendance marking. Students can mark attendance only during these active windows.
                </div>
              </div>

              {loadingAttendanceSettings ? (
                <div className="pro-card rounded-3xl p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
                  <span className="text-xs font-bold text-slate-700">Loading attendance window settings...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Morning (FN) Session */}
                  <div className="pro-card rounded-3xl p-6 bg-white border border-purple-200 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-purple-100">
                      <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-purple-950">
                          FN Session (Morning)
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">Forenoon attendance marking window</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Opening Time (e.g. 08:30 AM)</label>
                        <input
                          type="time"
                          value={settingsFnStart}
                          onChange={(e) => setSettingsFnStart(e.target.value)}
                          className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Closing / Cutoff Time (e.g. 09:00 AM)</label>
                        <input
                          type="time"
                          value={settingsFnCutoff}
                          onChange={(e) => setSettingsFnCutoff(e.target.value)}
                          className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-purple-950 bg-white border-purple-300"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-purple-100/70 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Active Window:</span>
                      <span className="font-mono font-extrabold text-purple-900 bg-purple-100/80 px-3 py-1 rounded-lg border border-purple-200">
                        {settingsFnStart} – {settingsFnCutoff}
                      </span>
                    </div>
                  </div>

                  {/* Afternoon (AN) Session */}
                  <div className="pro-card rounded-3xl p-6 bg-white border border-purple-200 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-purple-100">
                      <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-purple-950">
                          AN Session (Afternoon)
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">Afternoon attendance marking window</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Opening Time (e.g. 12:40 PM)</label>
                        <input
                          type="time"
                          value={settingsAnStart}
                          onChange={(e) => setSettingsAnStart(e.target.value)}
                          className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Closing / Cutoff Time (e.g. 01:10 PM / 13:10)</label>
                        <input
                          type="time"
                          value={settingsAnCutoff}
                          onChange={(e) => setSettingsAnCutoff(e.target.value)}
                          className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-purple-950 bg-white border-purple-300"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-purple-100/70 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Active Window:</span>
                      <span className="font-mono font-extrabold text-purple-900 bg-purple-100/80 px-3 py-1 rounded-lg border border-purple-200">
                        {settingsAnStart} – {settingsAnCutoff}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pro-card rounded-2xl p-4 bg-white border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <span className="text-xs text-slate-500 font-medium">
                  Changes apply immediately across Student Attendance Marking portals.
                </span>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('batches')}
                    className="py-2.5 px-4 rounded-xl bg-purple-50 border border-purple-200 text-slate-700 text-xs font-bold hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    Back to Batches
                  </button>
                  <button
                    type="button"
                    disabled={savingAttendanceSettings}
                    onClick={handleSaveAttendanceSettings}
                    className="py-2.5 px-6 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] transition-all cursor-pointer"
                  >
                    {savingAttendanceSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Attendance Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE DRIVE STORAGE SETTINGS */}
          {settingsSectionTab === 'drive' && (
            /* Google Drive OAuth Connection Tab */
            <div className="space-y-6">
              <div className="pro-card rounded-3xl p-6 sm:p-8 bg-white border border-purple-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-purple-100 text-purple-800">
                      <ExternalLink className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Google Drive Storage Integration</h3>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">Automated student task submission uploads to Admin's Google Drive</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-600">Status:</span>
                    <span className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold border flex items-center gap-1.5 ${
                      driveStorageInfo?.isConnected
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : driveStorageInfo?.hasConnectionRecord
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        driveStorageInfo?.isConnected ? 'bg-emerald-600' : driveStorageInfo?.hasConnectionRecord ? 'bg-amber-600' : 'bg-rose-600'
                      }`} />
                      <span>{driveStorageInfo?.isConnected ? 'Connected' : driveStorageInfo?.hasConnectionRecord ? 'Token Expired' : 'Not Connected'}</span>
                    </span>
                  </div>
                </div>

                {/* Google Cloud API Credentials Configuration Form */}
                <div className="rounded-2xl p-5 bg-purple-50/70 border border-purple-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-100">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-purple-700" />
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-950">
                        Google Cloud OAuth Credentials
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border w-fit ${
                      driveStorageInfo?.hasSecret && driveStorageInfo?.clientId
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {driveStorageInfo?.hasSecret && driveStorageInfo?.clientId ? 'Credentials Saved ✓' : 'Configuration Required'}
                    </span>
                  </div>

                  {/* Redirect URI Display with Copy */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Authorized Redirect URI (Copy & paste into Google Cloud Console):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={
                          driveStorageInfo?.redirectUri && !driveStorageInfo.redirectUri.includes('0.0.0.0')
                            ? driveStorageInfo.redirectUri
                            : 'https://lms.xarc.online/api/google-drive/oauth/callback'
                        }
                        className="w-full pro-input rounded-xl px-3 py-2 text-xs font-mono font-bold text-purple-950 bg-white border border-purple-200 select-all focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const uri =
                            driveStorageInfo?.redirectUri && !driveStorageInfo.redirectUri.includes('0.0.0.0')
                              ? driveStorageInfo.redirectUri
                              : 'https://lms.xarc.online/api/google-drive/oauth/callback';
                          navigator.clipboard.writeText(uri);
                          showSuccess('Redirect URI copied to clipboard!');
                        }}
                        className="px-3.5 py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-xl text-xs font-bold whitespace-nowrap transition-colors"
                      >
                        Copy URI
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Add this exact URL under <em>"Authorized redirect URIs"</em> in your Google Cloud Console OAuth 2.0 Client.
                    </p>
                  </div>

                  {/* Inputs for Client ID & Secret */}
                  <form onSubmit={handleSaveDriveCredentials} className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Google Client ID <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={googleClientIdInput}
                          onChange={(e) => setGoogleClientIdInput(e.target.value)}
                          placeholder="e.g. 123456789-xyz.apps.googleusercontent.com"
                          className="w-full pro-input rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 bg-white border border-purple-200 focus:outline-none focus:border-purple-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Google Client Secret {driveStorageInfo?.hasSecret && <span className="text-emerald-700 font-bold text-[10px]">(Already Saved ✓)</span>}
                        </label>
                        <input
                          type="password"
                          value={googleClientSecretInput}
                          onChange={(e) => setGoogleClientSecretInput(e.target.value)}
                          placeholder={driveStorageInfo?.hasSecret ? '••••••••••••••••••••••••' : 'Enter Google Client Secret (starts with GOCSPX-)'}
                          className="w-full pro-input rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 bg-white border border-purple-200 focus:outline-none focus:border-purple-600"
                        />
                        <p className="text-[10px] text-slate-500 font-medium mt-1">
                          From Google Cloud Console (starts with <code className="text-purple-700 bg-purple-50 px-1 py-0.5 rounded font-mono">GOCSPX-</code>). Do not enter your admin password here.
                        </p>
                      </div>
                    </div>

                    {driveCredsSuccessMsg && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{driveCredsSuccessMsg}</span>
                      </div>
                    )}

                    {driveCredsErrorMsg && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{driveCredsErrorMsg}</span>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={savingDriveCreds}
                        className="py-2.5 px-5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-xs"
                      >
                        {savingDriveCreds ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Save API Credentials</span>
                      </button>
                    </div>
                  </form>
                </div>

                {loadingDriveSettings ? (
                  <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
                    <span className="text-xs font-bold text-slate-700">Checking Google Drive connection status...</span>
                  </div>
                ) : driveStorageInfo?.isConnected ? (
                  <div className="space-y-5">
                    <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Connected Google Account:</span>
                      <span className="text-sm font-extrabold font-mono text-purple-950">{driveStorageInfo?.connectedAccount || 'admin@gmail.com'}</span>
                      <p className="text-xs text-slate-500 font-medium pt-1">
                        Submissions will be automatically organized under <code className="font-bold text-purple-950 bg-white px-2 py-0.5 rounded border border-purple-200 font-mono">ARVR_Student_Submissions/{"{Batch_Name}"}/</code> in this Google Drive.
                      </p>
                    </div>

                    {testResultMsg && (
                      <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                        testResultSuccess ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}>
                        <span>{testResultMsg}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        disabled={testingDriveConn}
                        onClick={handleTestDriveConnection}
                        className="py-2.5 px-5 rounded-xl bg-purple-900 text-white font-bold text-xs hover:bg-purple-800 transition-colors shadow-xs flex items-center gap-2"
                      >
                        {testingDriveConn ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        <span>Test Connection</span>
                      </button>

                      <button
                        type="button"
                        disabled={disconnectingDrive}
                        onClick={handleDisconnectDrive}
                        className="py-2.5 px-5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs hover:bg-rose-100 transition-colors flex items-center gap-2"
                      >
                        {disconnectingDrive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                ) : driveStorageInfo?.hasConnectionRecord ? (
                  <div className="space-y-5">
                    <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                      <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <span>OAuth Refresh Token Expired</span>
                      </div>
                      <div className="text-xs text-slate-700 space-y-1.5">
                        <p>
                          <span className="font-bold">Previously Linked Account: </span>
                          <span className="font-mono font-bold text-purple-950">{driveStorageInfo?.connectedAccount}</span>
                        </p>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          {driveStorageInfo?.message || 'Google OAuth tokens in Testing mode automatically expire every 7 days. Click Reconnect Google Drive to grant a fresh token.'}
                        </p>
                      </div>
                    </div>

                    {testResultMsg && (
                      <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                        testResultSuccess ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}>
                        <span>{testResultMsg}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        disabled={connectingDrive}
                        onClick={handleConnectDrive}
                        className="py-3 px-6 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-700/20 hover:from-purple-600 hover:to-indigo-600 transition-all flex items-center gap-2"
                      >
                        {connectingDrive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                        <span>Reconnect Google Drive</span>
                      </button>

                      <button
                        type="button"
                        disabled={disconnectingDrive}
                        onClick={handleDisconnectDrive}
                        className="py-2.5 px-5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs hover:bg-rose-100 transition-colors flex items-center gap-2"
                      >
                        {disconnectingDrive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Connect your personal Google Drive account using Google OAuth 2.0. Submissions will be uploaded directly into your Drive under <code className="font-bold text-purple-950 bg-white px-2 py-0.5 rounded border border-purple-200 font-mono">ARVR_Student_Submissions/{"{Batch_Name}"}/</code>.
                    </p>

                    {testResultMsg && (
                      <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                        testResultSuccess ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}>
                        <span>{testResultMsg}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={connectingDrive}
                      onClick={handleConnectDrive}
                      className="py-3 px-6 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-700/20 hover:from-purple-600 hover:to-indigo-600 transition-all flex items-center gap-2"
                    >
                      {connectingDrive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                      <span>Connect Google Drive</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="pro-card rounded-2xl p-4 bg-white border border-purple-200 flex items-center justify-end shadow-sm">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('batches')}
                  className="py-2.5 px-5 rounded-xl bg-purple-50 border border-purple-200 text-slate-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                >
                  Back to Batches
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REGENERATE CALENDAR CONFIRMATION MODAL OVERLAY */}
      {showRegenerateConfirmModal && (
        <div 
          onClick={() => setShowRegenerateConfirmModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-purple-200 max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 cursor-default"
          >
            <div className="flex items-center gap-3 text-amber-700 bg-amber-50 p-3 rounded-2xl border border-amber-200">
              <AlertCircle className="w-6 h-6 shrink-0 text-amber-600" />
              <h3 className="text-sm font-extrabold text-amber-950">Confirm Calendar Regeneration</h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Regenerating the calendar will replace manually modified training dates. Continue?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerateCalendar}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors shadow-md cursor-pointer"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH DETAILS MODAL OVERLAY */}
      {showBatchDetailsModal && selectedBatchDetail && (
        <div 
          onClick={() => setShowBatchDetailsModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-purple-200 max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-purple-100 pb-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-purple-700 font-extrabold uppercase">AR/VR COE</span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Batch Details</h2>
              </div>
              <button
                onClick={() => setShowBatchDetailsModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Batch Name:</span>
                  <strong className="font-mono text-purple-950 font-bold">{selectedBatchDetail.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Batch No:</span>
                  <strong className="font-mono text-slate-900">{selectedBatchDetail.batchNo || '001'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Batch Level:</span>
                  <strong className="text-purple-800 font-bold">{selectedBatchDetail.level || 'Level 1'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Start Date:</span>
                  <strong className="font-mono text-slate-900">{formatDateDisplay(selectedBatchDetail.startDate)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">End Date:</span>
                  <strong className="font-mono text-slate-900">{formatDateDisplay(selectedBatchDetail.endDate)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Training Days:</span>
                  <strong className="font-mono text-slate-900">{selectedBatchDetail.trainingDays} Days</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Instructor / Team:</span>
                  <strong className="text-slate-900">AR/VR COE Team</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Status:</span>
                  <strong className="text-emerald-700 font-bold">{selectedBatchDetail.status}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Curriculum Status:</span>
                  <strong className="text-indigo-700 font-bold">{selectedBatchDetail.curriculumStatus || 'Not Set'}</strong>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowBatchDetailsModal(false);
                  handleOpenCurriculumModal(selectedBatchDetail);
                }}
                className="flex-1 py-2.5 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>Configure Curriculum</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SUB-TAB 5: CERTIFICATES & REPORTS */}
      {staffTab === 'certificates' && (() => {
        const selectedBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];
        const batchStudents = students.filter((s) => s.batchId === selectedBatchId);
        
        const totalStudents = batchStudents.length;
        const totalDays = selectedBatch?.trainingDays || 15;
        const maxSessions = totalDays * 2;

        let completedCount = 0;
        let eligibleCount = 0;
        let certReadyCount = 0;
        let pendingCount = 0;

        const effectiveCalendarDays = (curriculumCalendarDays && curriculumCalendarDays.length > 0)
          ? curriculumCalendarDays
          : (batchCalendar && batchCalendar.length > 0)
            ? batchCalendar
            : [];

        const calendarDaysSorted = [...effectiveCalendarDays].sort((a: any, b: any) => b.dayNumber - a.dayNumber);
        const examDayObj = calendarDaysSorted[0];
        const examDateStr = examDayObj 
          ? (examDayObj.dateStr 
              ? new Date(examDayObj.dateStr).toISOString().split('T')[0] 
              : (examDayObj.date ? new Date(examDayObj.date).toISOString().split('T')[0] : ''))
          : (selectedBatch?.endDate ? new Date(selectedBatch.endDate).toISOString().split('T')[0] : '');

        const certRoster = batchStudents.map((s) => {
          const fnCount = (s.attendances || []).filter((a: any) => a.session === 'FN').length;
          const anCount = (s.attendances || []).filter((a: any) => a.session === 'AN').length;
          const totalAtt = (s.attendances || []).length;
          const attPct = maxSessions > 0 ? Math.round((totalAtt / maxSessions) * 100) : 0;

          // Detailed task breakdown per day
          const studentTasks = s.tasks || [];
          const effectiveDaysCount = Math.max(totalDays, effectiveCalendarDays.length || 0);

          const tasksBreakdown = Array.from({ length: effectiveDaysCount }, (_, idx) => {
            const dayNum = idx + 1;
            const calDay = effectiveCalendarDays.find((cd: any) => cd.dayNumber === dayNum);
            const taskTitle = calDay?.taskTitle 
              || (calDay?.tasks && calDay.tasks[0]?.title) 
              || `Day ${dayNum} Practical Task`;
            const taskDescription = calDay?.taskDescription || (calDay?.tasks && calDay.tasks[0]?.description) || '';

            const submission = studentTasks.find((t: any) => {
              if (calDay?.id && t.trainingDayId === calDay.id) return true;
              if (t.trainingDay?.dayNumber === dayNum) return true;
              if (t.dayNumber === dayNum) return true;
              return false;
            });

            const isCompleted = Boolean(submission);

            return {
              dayNumber: dayNum,
              title: taskTitle,
              description: taskDescription,
              isCompleted,
              status: submission ? (submission.status || 'SUBMITTED') : 'NOT_SUBMITTED',
              submittedAt: submission?.submittedAt,
              screenshotUrl: submission?.screenshotUrl,
              evaluation: submission?.evaluation,
            };
          });

          const completedTasks = tasksBreakdown.filter((t) => t.isCompleted);
          const missingTasks = tasksBreakdown.filter((t) => !t.isCompleted);
          const taskCount = completedTasks.length > 0 ? completedTasks.length : (s.tasks || []).length;
          const missingCount = Math.max(0, effectiveDaysCount - taskCount);
          const taskPct = effectiveDaysCount > 0 ? Math.round((taskCount / effectiveDaysCount) * 100) : 0;
          
          const evalCount = (s.evaluations || []).length;

          // Check if student marked attendance on the Exam Date
          const hasExamAttendance = (s.attendances || []).some((a: any) => {
            const attDateStr = a.date ? new Date(a.date).toISOString().split('T')[0] : '';
            return Boolean(attDateStr && examDateStr && attDateStr === examDateStr);
          });

          // Completion rules (Requires 100% Attendance per institutional requirement)
          const isAttendance100 = attPct >= 100;
          const isTaskOk = taskCount > 0;
          const isEvalOk = evalCount > 0;
          const isManuallyOverridden = s.certificate?.isManualOverride === true;

          // Standard rule: requires 100% attendance & exam attendance, OR manual admin override
          const isEligible = isManuallyOverridden || (isAttendance100 && isTaskOk && isEvalOk && hasExamAttendance);
          const isCertValid = s.certificate ? (s.certificate.isValid !== false && (isAttendance100 || isManuallyOverridden)) : false;
          const isCompleted = s.certificate !== null && isCertValid;

          let pendingReason = '';
          if (!isAttendance100 && !isManuallyOverridden) pendingReason = `Attendance < 100% (${attPct}%) — Certificate Invalid`;
          else if (!hasExamAttendance && !isManuallyOverridden) pendingReason = 'Exam Day Attendance Not Marked';
          else if (!isTaskOk && !isManuallyOverridden) pendingReason = 'Tasks Pending (0 submitted)';
          else if (!isEvalOk && !isManuallyOverridden) pendingReason = 'Evaluation Pending';

          if (isCompleted) completedCount++;
          else pendingCount++;

          if (isEligible) eligibleCount++;

          const certNo = s.certificate?.certificateNo || 'Pending';
          if (s.certificate) certReadyCount++;

          let certStatus: 'Completed' | 'Pending' | 'Certificate Data Ready' | 'Exported' | 'Invalid (< 100%)' = 'Pending';
          if (s.certificate && !isCertValid) certStatus = 'Invalid (< 100%)';
          else if (s.certificate?.exportedAt) certStatus = 'Exported';
          else if (s.certificate) certStatus = 'Certificate Data Ready';
          else if (isCompleted) certStatus = 'Completed';

          const scores = (s.evaluations || []).map((e: any) => e.score);
          const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : (s.certificate?.finalGrade ? 85 : 0);

          return {
            ...s,
            fnCount,
            anCount,
            totalAtt,
            attPct,
            taskCount,
            missingCount,
            taskPct,
            tasksBreakdown,
            completedTasks,
            missingTasks,
            evalCount,
            isCompleted,
            isEligible,
            isCertValid,
            isManuallyOverridden,
            pendingReason,
            certNo,
            certStatus,
            avgScore,
            grade: s.certificate?.finalGrade || (avgScore >= 90 ? 'O' : avgScore >= 80 ? 'A+' : avgScore >= 70 ? 'A' : 'B+'),
            level: s.certificate?.finalLevel || 'Level 1 Foundation',
          };
        });

        const filteredCertRoster = certRoster.filter((item) => {
          const matchesSearch =
            !certSearch ||
            item.name.toLowerCase().includes(certSearch.toLowerCase()) ||
            item.registerNo.toLowerCase().includes(certSearch.toLowerCase()) ||
            (item.certNo && item.certNo.toLowerCase().includes(certSearch.toLowerCase()));

          const matchesCompletion =
            certFilterCompletion === 'All' ||
            (certFilterCompletion === 'Completed' && item.isCompleted) ||
            (certFilterCompletion === 'Pending' && !item.isCompleted);

          const matchesGrade = certFilterGrade === 'All' || item.grade === certFilterGrade;
          const matchesLevel = certFilterLevel === 'All' || item.level.includes(certFilterLevel);
          const matchesStatus = certFilterStatus === 'All' || item.certStatus === certFilterStatus;

          return matchesSearch && matchesCompletion && matchesGrade && matchesLevel && matchesStatus;
        });

        const handleSelectAllEligible = () => {
          const eligibleIds = certRoster.filter((i) => i.isEligible || i.certificate).map((i) => i.id);
          setSelectedCertStudentIds(eligibleIds);
        };

        const toggleSelectStudent = (id: string) => {
          if (selectedCertStudentIds.includes(id)) {
            setSelectedCertStudentIds(selectedCertStudentIds.filter((item) => item !== id));
          } else {
            setSelectedCertStudentIds([...selectedCertStudentIds, id]);
          }
        };

        return (
          <div className="space-y-6">
            
            {/* Section Header Card */}
            <div className="pro-card rounded-3xl p-6 bg-gradient-to-r from-white via-purple-50/40 to-purple-100/30 border-purple-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
                  <Award className="w-4 h-4 text-purple-700" />
                  <span>Official Certification & Reporting System</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Certificates & Reports
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm mt-0.5 font-medium">
                  Manage certificate records, training completion and reports.
                </p>
              </div>

              {/* Batch Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Batch</label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="pro-input text-xs font-bold text-purple-950 rounded-xl px-4 py-2.5 bg-white shadow-2xs"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-purple-200 text-center shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Students</span>
                <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{totalStudents}</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-center shadow-xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Completed</span>
                <span className="text-2xl font-extrabold text-emerald-900 mt-1 block">{completedCount}</span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-center shadow-xs">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Eligible</span>
                <span className="text-2xl font-extrabold text-indigo-900 mt-1 block">{eligibleCount}</span>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-center shadow-xs">
                <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Certificates Ready</span>
                <span className="text-2xl font-extrabold text-purple-900 mt-1 block">{certReadyCount}</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-center shadow-xs">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Pending</span>
                <span className="text-2xl font-extrabold text-amber-900 mt-1 block">{pendingCount}</span>
              </div>
            </div>

            {/* Primary Action Buttons Bar */}
            <div className="pro-card rounded-2xl p-4 bg-white border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span>Certificate Pipeline Control</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleRunCompletionCheck}
                  disabled={runningCheck}
                  className="py-2.5 px-4 rounded-xl bg-purple-100 text-purple-900 border border-purple-300 font-bold text-xs hover:bg-purple-200 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  {runningCheck ? <RefreshCw className="w-4 h-4 animate-spin text-purple-700" /> : <Award className="w-4 h-4 text-purple-700" />}
                  <span>{runningCheck ? 'Checking...' : 'Run Completion Check'}</span>
                </button>

                <button
                  onClick={handleSelectAllEligible}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs hover:bg-slate-200 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Select All Eligible ({eligibleCount})</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  disabled={exportingCert}
                  className="py-2.5 px-5 rounded-xl pro-button-primary text-white font-bold text-xs hover:scale-[1.01] transition-all flex items-center gap-2 shadow-md"
                >
                  {exportingCert ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                  <span>Export Certificate Data (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* System Boundary Reminder Alert */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium leading-relaxed">
                <strong>System Note:</strong> The web portal verifies completion and exports certificate data to <code>.xlsx</code>. Final certificate document generation is executed via the external PowerPoint add-in.
              </span>
            </div>

            {/* Validation Warning Alert */}
            {exportValidationErr && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span className="font-medium">{exportValidationErr}</span>
              </div>
            )}

            {/* Reports Workspace Navigation Switcher */}
            <div className="flex items-center gap-2 border-b border-purple-100 pb-2 overflow-x-auto">
              <button
                onClick={() => setCertReportTab('roster')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${certReportTab === 'roster' ? 'pro-button-primary text-white shadow-xs' : 'text-slate-600 hover:bg-purple-50'}`}
              >
                Certificate Data Roster
              </button>
              <button
                onClick={() => setCertReportTab('training')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${certReportTab === 'training' ? 'pro-button-primary text-white shadow-xs' : 'text-slate-600 hover:bg-purple-50'}`}
              >
                Training Report
              </button>
              <button
                onClick={() => setCertReportTab('attendance')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${certReportTab === 'attendance' ? 'pro-button-primary text-white shadow-xs' : 'text-slate-600 hover:bg-purple-50'}`}
              >
                Attendance Report
              </button>
              <button
                onClick={() => setCertReportTab('tasks')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${certReportTab === 'tasks' ? 'pro-button-primary text-white shadow-xs' : 'text-slate-600 hover:bg-purple-50'}`}
              >
                Task Completion Report
              </button>
              <button
                onClick={() => setCertReportTab('performance')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${certReportTab === 'performance' ? 'pro-button-primary text-white shadow-xs' : 'text-slate-600 hover:bg-purple-50'}`}
              >
                Performance Report
              </button>
              <button
                onClick={() => setCertReportTab('completion')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${certReportTab === 'completion' ? 'pro-button-primary text-white shadow-xs' : 'text-slate-600 hover:bg-purple-50'}`}
              >
                Completion Report
              </button>
              <button
                onClick={() => setCertReportTab('certReport')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${certReportTab === 'certReport' ? 'pro-button-primary text-white shadow-xs' : 'text-slate-600 hover:bg-purple-50'}`}
              >
                Certificate Report
              </button>
            </div>

            {/* TAB 1: CERTIFICATE DATA ROSTER */}
            {certReportTab === 'roster' && (
              <div className="space-y-4">
                
                {/* Search & Filter Bar */}
                <div className="pro-card rounded-2xl p-4 bg-white/90 border-purple-200/80 flex flex-col lg:flex-row items-center justify-between gap-4">
                  <div className="relative w-full lg:w-80">
                    <Search className="w-4 h-4 text-purple-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search name, reg no, cert no..."
                      value={certSearch}
                      onChange={(e) => setCertSearch(e.target.value)}
                      className="w-full pro-input rounded-xl pl-9 pr-4 py-2 text-xs placeholder-slate-400 font-medium"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    <div className="flex items-center gap-1 text-xs text-slate-600 font-bold">
                      <Filter className="w-3.5 h-3.5 text-purple-600" />
                      <span>Filters:</span>
                    </div>

                    <select
                      value={certFilterCompletion}
                      onChange={(e) => setCertFilterCompletion(e.target.value)}
                      className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
                    >
                      <option value="All">Completion: All</option>
                      <option value="Completed">Completed</option>
                      <option value="Pending">Pending</option>
                    </select>

                    <select
                      value={certFilterGrade}
                      onChange={(e) => setCertFilterGrade(e.target.value)}
                      className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
                    >
                      <option value="All">All Grades</option>
                      <option value="O">Grade O</option>
                      <option value="A+">Grade A+</option>
                      <option value="A">Grade A</option>
                      <option value="B+">Grade B+</option>
                      <option value="B">Grade B</option>
                      <option value="C">Grade C</option>
                    </select>

                    <select
                      value={certFilterLevel}
                      onChange={(e) => setCertFilterLevel(e.target.value)}
                      className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
                    >
                      <option value="All">All Levels</option>
                      <option value="Level 1">Level 1</option>
                      <option value="Level 2">Level 2</option>
                      <option value="Level 3">Level 3</option>
                    </select>

                    <select
                      value={certFilterStatus}
                      onChange={(e) => setCertFilterStatus(e.target.value)}
                      className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
                    >
                      <option value="All">Cert Status: All</option>
                      <option value="Certificate Data Ready">Data Ready</option>
                      <option value="Exported">Exported</option>
                      <option value="Completed">Completed</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

                {/* Table View */}
                <div className="pro-card rounded-3xl p-6 bg-white space-y-4 overflow-hidden">
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-purple-100 bg-purple-50/60 text-[11px] font-extrabold uppercase text-purple-900 tracking-wider">
                          <th className="py-3 px-3 rounded-l-xl w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedCertStudentIds.length > 0 && selectedCertStudentIds.length === filteredCertRoster.length}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCertStudentIds(filteredCertRoster.map((i) => i.id));
                                else setSelectedCertStudentIds([]);
                              }}
                              className="accent-purple-600 rounded cursor-pointer"
                            />
                          </th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">Register No</th>
                          <th className="py-3 px-4">Start Date</th>
                          <th className="py-3 px-4">End Date</th>
                          <th className="py-3 px-4">Grade</th>
                          <th className="py-3 px-4">Training Level</th>
                          <th className="py-3 px-4">Certificate No</th>
                          <th className="py-3 px-4">Completion Status</th>
                          <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-100/60 text-xs text-slate-700 font-medium">
                        {filteredCertRoster.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-10 text-center text-slate-500 font-medium">
                              No matching student certificate records found.
                            </td>
                          </tr>
                        ) : (
                          filteredCertRoster.map((item) => {
                            const isChecked = selectedCertStudentIds.includes(item.id);
                            return (
                              <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                                <td className="py-3.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleSelectStudent(item.id)}
                                    className="accent-purple-600 rounded cursor-pointer"
                                  />
                                </td>
                                <td className="py-3.5 px-4 font-bold text-slate-900">
                                  {item.name}
                                </td>
                                <td className="py-3.5 px-4 font-mono font-bold text-purple-900">
                                  {item.registerNo}
                                </td>
                                <td className="py-3.5 px-4 font-mono">
                                  {formatDateDisplay(selectedBatch?.startDate)}
                                </td>
                                <td className="py-3.5 px-4 font-mono">
                                  {formatDateDisplay(selectedBatch?.endDate)}
                                </td>
                                <td className="py-3.5 px-4 font-bold text-purple-900 font-mono">
                                  {item.grade}
                                </td>
                                <td className="py-3.5 px-4 font-semibold text-slate-800">
                                  {item.level}
                                </td>
                                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                  {item.certNo}
                                </td>
                                <td className="py-3.5 px-4">
                                  {item.certificate && !item.isCertValid ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-rose-100 text-rose-800 border-rose-300" title={item.pendingReason}>
                                      ❌ Invalid (&lt; 100%)
                                    </span>
                                  ) : item.isCompleted && item.isManuallyOverridden ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-purple-100 text-purple-900 border-purple-300" title="Manually authorized by Admin">
                                      ★ Valid (Override)
                                    </span>
                                  ) : item.isCompleted ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-100 text-emerald-800 border-emerald-300">
                                      ✓ Valid (100%)
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-amber-100 text-amber-900 border-amber-300" title={item.pendingReason}>
                                      ⚠ Pending (&lt; 100%)
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleOpenManualOverride(item)}
                                      className="px-2.5 py-1.5 rounded-xl bg-purple-700 text-white hover:bg-purple-800 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                                      title="Manual Student Data & Certificate Override"
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                      <span>Override</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedCertRecordStudent(item);
                                        setEditCertNo(item.certNo !== 'Pending' ? item.certNo : `ARVR-2026-${String(item.registerNo).slice(-3)}`);
                                        setShowCertRecordModal(true);
                                      }}
                                      className="px-2.5 py-1.5 rounded-xl bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>View</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="md:hidden space-y-3">
                    {filteredCertRoster.map((item) => (
                      <div key={item.id} className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200 space-y-3 text-xs">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                            <span className="font-mono font-bold text-purple-900 text-xs">{item.registerNo}</span>
                          </div>
                          {item.certificate && !item.isCertValid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold border bg-rose-100 text-rose-800 border-rose-300">
                              ❌ Invalid (&lt; 100%)
                            </span>
                          ) : item.isCompleted && item.isManuallyOverridden ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold border bg-purple-100 text-purple-900 border-purple-300">
                              ★ Valid (Override)
                            </span>
                          ) : item.isCompleted ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-100 text-emerald-800 border-emerald-300">
                              ✓ Valid (100%)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold border bg-amber-100 text-amber-900 border-amber-300">
                              ⚠ Pending (&lt; 100%)
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 font-medium text-slate-700 bg-white p-2.5 rounded-xl border border-purple-100">
                          <p>Grade: <strong className="text-purple-900 font-mono">{item.grade}</strong> • Level: <strong>{item.level}</strong></p>
                          <p>Cert No: <strong className="font-mono text-slate-900">{item.certNo}</strong></p>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleOpenManualOverride(item)}
                            className="flex-1 py-2 rounded-xl bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span>Manual Override</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCertRecordStudent(item);
                              setEditCertNo(item.certNo !== 'Pending' ? item.certNo : `ARVR-2026-${String(item.registerNo).slice(-3)}`);
                              setShowCertRecordModal(true);
                            }}
                            className="px-3 py-2 rounded-xl bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

              </div>
            )}

            {/* TAB 2: TRAINING REPORT */}
            {certReportTab === 'training' && (
              <div className="pro-card rounded-3xl p-6 bg-white space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-700" />
                  <span>Training Report Summary</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
                    <span className="text-slate-500 font-semibold block uppercase">Batch Name</span>
                    <strong className="text-slate-900 font-mono text-sm block">{selectedBatch?.name}</strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
                    <span className="text-slate-500 font-semibold block uppercase">Start Date & End Date</span>
                    <strong className="text-slate-900 font-mono text-sm block">
                      {formatDateDisplay(selectedBatch?.startDate)} — {formatDateDisplay(selectedBatch?.endDate)}
                    </strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
                    <span className="text-slate-500 font-semibold block uppercase">Total Training Days</span>
                    <strong className="text-slate-900 font-mono text-sm block">{selectedBatch?.trainingDays} Days</strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
                    <span className="text-slate-500 font-semibold block uppercase">Enrolled Students</span>
                    <strong className="text-slate-900 font-mono text-sm block">{totalStudents} Students</strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                    <span className="text-emerald-800 font-semibold block uppercase">Completed Students</span>
                    <strong className="text-emerald-900 font-mono text-sm block">{completedCount} Students</strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                    <span className="text-amber-800 font-semibold block uppercase">Pending Requirements</span>
                    <strong className="text-amber-900 font-mono text-sm block">{pendingCount} Students</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ATTENDANCE REPORT */}
            {certReportTab === 'attendance' && (
              <div className="pro-card rounded-3xl p-6 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-700" />
                    <span>Attendance Report</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">FN Cutoff: 9:15 AM • AN Cutoff: 2:00 PM</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-purple-50/60 text-purple-900 font-bold border-b border-purple-100 uppercase">
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Reg No</th>
                        <th className="p-3 text-center">FN Attendance</th>
                        <th className="p-3 text-center">AN Attendance</th>
                        <th className="p-3 text-right">Overall Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100/60 font-medium">
                      {certRoster.map((item) => (
                        <tr key={item.id}>
                          <td className="p-3 font-bold text-slate-900">{item.name}</td>
                          <td className="p-3 font-mono font-bold text-purple-900">{item.registerNo}</td>
                          <td className="p-3 text-center font-mono">{item.fnCount} / {totalDays}</td>
                          <td className="p-3 text-center font-mono">{item.anCount} / {totalDays}</td>
                          <td className="p-3 text-right font-mono font-bold text-purple-950">{item.attPct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: TASK COMPLETION REPORT */}
            {certReportTab === 'tasks' && (
              <div className="pro-card rounded-3xl p-6 bg-white space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-purple-700" />
                    <span>Task Completion Report</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5 bg-purple-50 text-purple-800 px-3 py-1 rounded-xl border border-purple-100/80 shadow-2xs">
                      <Info className="w-3.5 h-3.5 text-purple-600" />
                      Hover any task number to view completed & missing tasks
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-purple-50/60 text-purple-900 font-bold border-b border-purple-100 uppercase">
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Reg No</th>
                        <th className="p-3 text-center">Submitted Tasks</th>
                        <th className="p-3 text-center">Missing Tasks</th>
                        <th className="p-3 text-right">Task Completion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100/60 font-medium">
                      {certRoster.map((item) => (
                        <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{item.name}</td>
                          <td className="p-3 font-mono font-bold text-purple-900">{item.registerNo}</td>
                          
                          {/* SUBMITTED TASKS with Hover Tooltip Trigger */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onMouseEnter={(e) => handleTaskNumberMouseEnter(item, 'submitted', e)}
                              onMouseLeave={handleTaskNumberMouseLeave}
                              onClick={(e) => handleTaskNumberMouseEnter(item, 'submitted', e)}
                              className="inline-flex items-center justify-center gap-1.5 min-w-[38px] px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-mono font-bold text-xs border border-emerald-200 shadow-2xs cursor-pointer transition-all hover:scale-105 active:scale-95 group"
                              title="Hover to view completed & missing tasks"
                            >
                              <span>{item.taskCount}</span>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </td>

                          {/* MISSING TASKS with Hover Tooltip Trigger */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onMouseEnter={(e) => handleTaskNumberMouseEnter(item, 'missing', e)}
                              onMouseLeave={handleTaskNumberMouseLeave}
                              onClick={(e) => handleTaskNumberMouseEnter(item, 'missing', e)}
                              className="inline-flex items-center justify-center gap-1.5 min-w-[38px] px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 font-mono font-bold text-xs border border-rose-200 shadow-2xs cursor-pointer transition-all hover:scale-105 active:scale-95 group"
                              title="Hover to view completed & missing tasks"
                            >
                              <span>{item.missingCount}</span>
                              <XCircle className="w-3 h-3 text-rose-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </td>

                          {/* TASK COMPLETION with Hover Tooltip Trigger */}
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onMouseEnter={(e) => handleTaskNumberMouseEnter(item, 'all', e)}
                              onMouseLeave={handleTaskNumberMouseLeave}
                              onClick={(e) => handleTaskNumberMouseEnter(item, 'all', e)}
                              className="inline-flex items-center gap-1.5 font-mono font-bold text-purple-950 hover:text-purple-700 cursor-pointer transition-colors"
                              title="Hover to view task breakdown"
                            >
                              <span>{item.taskPct}%</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* FLOATING HOVER TOOLTIP FOR TASK BREAKDOWN */}
                {hoveredTaskTip && (() => {
                  const tipWidth = 380;
                  let left = hoveredTaskTip.rect.left + hoveredTaskTip.rect.width / 2 - tipWidth / 2;
                  if (left < 16) left = 16;
                  if (typeof window !== 'undefined' && left + tipWidth > window.innerWidth - 16) {
                    left = window.innerWidth - tipWidth - 16;
                  }

                  const spaceBelow = typeof window !== 'undefined' ? window.innerHeight - hoveredTaskTip.rect.bottom : 500;
                  const showAbove = spaceBelow < 380 && hoveredTaskTip.rect.top > 380;
                  const top = showAbove ? undefined : hoveredTaskTip.rect.bottom + 8;
                  const bottom = showAbove && typeof window !== 'undefined' ? (window.innerHeight - hoveredTaskTip.rect.top + 8) : undefined;
                  const arrowLeft = Math.max(20, Math.min(tipWidth - 20, hoveredTaskTip.rect.left + hoveredTaskTip.rect.width / 2 - left));

                  const completedPercent = hoveredTaskTip.totalDays > 0 
                    ? Math.round((hoveredTaskTip.completedTasks.length / hoveredTaskTip.totalDays) * 100) 
                    : 0;

                  return (
                    <div
                      onMouseEnter={handleTooltipMouseEnter}
                      onMouseLeave={handleTooltipMouseLeave}
                      style={{
                        position: 'fixed',
                        left: `${left}px`,
                        top: top != null ? `${top}px` : undefined,
                        bottom: bottom != null ? `${bottom}px` : undefined,
                        width: `${tipWidth}px`,
                        zIndex: 9999,
                      }}
                      className="bg-white rounded-2xl shadow-2xl border border-purple-200/90 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150"
                    >
                      {/* Arrow Indicator pointing towards hovered number */}
                      <div
                        className={`absolute w-3.5 h-3.5 bg-white border-purple-200 ${
                          showAbove ? '-bottom-1.5 border-b border-r' : '-top-1.5 border-t border-l'
                        }`}
                        style={{
                          left: `${arrowLeft}px`,
                          transform: 'translateX(-50%) rotate(45deg)',
                        }}
                      />

                      {/* Header */}
                      <div className="p-3.5 bg-gradient-to-r from-purple-50 via-slate-50 to-purple-50/60 border-b border-purple-100 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-2xs">
                            <CheckSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{hoveredTaskTip.studentName}</span>
                              <span className="font-mono text-[11px] font-bold text-purple-700 bg-purple-100/80 px-1.5 py-0.5 rounded border border-purple-200">
                                {hoveredTaskTip.registerNo}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {hoveredTaskTip.completedTasks.length} of {hoveredTaskTip.totalDays} tasks completed ({completedPercent}%)
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-mono font-black ${completedPercent === 100 ? 'text-emerald-600' : 'text-purple-900'}`}>
                            {completedPercent}%
                          </span>
                        </div>
                      </div>

                      {/* Dual color progress bar */}
                      <div className="px-3.5 pt-2 pb-1 bg-white">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${completedPercent}%` }}
                          />
                          <div
                            className="bg-rose-400 h-full transition-all duration-300"
                            style={{ width: `${100 - completedPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Filter Pills */}
                      <div className="flex items-center gap-1.5 px-3.5 py-1.5 border-b border-slate-100 bg-slate-50/50">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setTipActiveFilter('all'); }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            tipActiveFilter === 'all'
                              ? 'bg-purple-700 text-white shadow-2xs'
                              : 'text-slate-600 hover:bg-slate-200/60'
                          }`}
                        >
                          All Tasks ({hoveredTaskTip.totalDays})
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setTipActiveFilter('completed'); }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            tipActiveFilter === 'completed'
                              ? 'bg-emerald-700 text-white shadow-2xs'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/60'
                          }`}
                        >
                          <Check className="w-2.5 h-2.5" />
                          <span>Completed ({hoveredTaskTip.completedTasks.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setTipActiveFilter('missing'); }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            tipActiveFilter === 'missing'
                              ? 'bg-rose-700 text-white shadow-2xs'
                              : 'text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/60'
                          }`}
                        >
                          <X className="w-2.5 h-2.5" />
                          <span>Missing ({hoveredTaskTip.missingTasks.length})</span>
                        </button>
                      </div>

                      {/* Scrollable Tasks Body */}
                      <div className="p-3 max-h-64 overflow-y-auto space-y-3 bg-white">
                        {/* Completed Section */}
                        {(tipActiveFilter === 'all' || tipActiveFilter === 'completed') && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 uppercase tracking-wider px-0.5">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Completed Tasks ({hoveredTaskTip.completedTasks.length})
                              </span>
                            </div>
                            {hoveredTaskTip.completedTasks.length === 0 ? (
                              <div className="text-[11px] text-slate-400 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                                No tasks submitted yet.
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {hoveredTaskTip.completedTasks.map((t: any) => (
                                  <div
                                    key={t.dayNumber}
                                    className="flex items-center gap-2 p-2 bg-emerald-50/40 rounded-xl border border-emerald-100/80 hover:bg-emerald-50/80 transition-colors"
                                  >
                                    <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">
                                      Day {t.dayNumber}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-bold text-slate-900 truncate leading-snug" title={t.title}>
                                        {t.title}
                                      </p>
                                    </div>
                                    <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200 shadow-2xs">
                                      {t.evaluation?.score != null ? `Score: ${t.evaluation.score}` : 'Submitted'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Missing Section */}
                        {(tipActiveFilter === 'all' || tipActiveFilter === 'missing') && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-rose-800 uppercase tracking-wider px-0.5">
                              <span className="flex items-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                Missing Tasks ({hoveredTaskTip.missingTasks.length})
                              </span>
                            </div>
                            {hoveredTaskTip.missingTasks.length === 0 ? (
                              <div className="text-[11px] text-emerald-700 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>All {hoveredTaskTip.totalDays} tasks completed! 🎉</span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {hoveredTaskTip.missingTasks.map((t: any) => (
                                  <div
                                    key={t.dayNumber}
                                    className="flex items-center gap-2 p-2 bg-rose-50/30 rounded-xl border border-rose-100/70 hover:bg-rose-50/70 transition-colors"
                                  >
                                    <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-mono font-bold border border-rose-200">
                                      Day {t.dayNumber}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-bold text-slate-700 truncate leading-snug" title={t.title}>
                                        {t.title}
                                      </p>
                                    </div>
                                    <span className="shrink-0 text-[10px] font-bold text-rose-700 bg-white px-1.5 py-0.5 rounded border border-rose-200 shadow-2xs">
                                      Missing
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 5: PERFORMANCE REPORT */}
            {certReportTab === 'performance' && (
              <div className="pro-card rounded-3xl p-6 bg-white space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-700" />
                  <span>Performance Report</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-purple-50/60 text-purple-900 font-bold border-b border-purple-100 uppercase">
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Reg No</th>
                        <th className="p-3 text-center">Score</th>
                        <th className="p-3 text-center">Grade</th>
                        <th className="p-3 text-right">Training Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100/60 font-medium">
                      {certRoster.map((item) => (
                        <tr key={item.id}>
                          <td className="p-3 font-bold text-slate-900">{item.name}</td>
                          <td className="p-3 font-mono font-bold text-purple-900">{item.registerNo}</td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-800">{item.avgScore} / 100</td>
                          <td className="p-3 text-center font-mono font-extrabold text-purple-900">{item.grade}</td>
                          <td className="p-3 text-right font-bold text-slate-900">{item.level}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: COMPLETION REPORT */}
            {certReportTab === 'completion' && (
              <div className="pro-card rounded-3xl p-6 bg-white space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-purple-700" />
                  <span>Completion Status Breakdown</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-purple-50/60 text-purple-900 font-bold border-b border-purple-100 uppercase">
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Reg No</th>
                        <th className="p-3">Completion Status</th>
                        <th className="p-3 text-right">Pending Reason / Status Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100/60 font-medium">
                      {certRoster.map((item) => (
                        <tr key={item.id}>
                          <td className="p-3 font-bold text-slate-900">{item.name}</td>
                          <td className="p-3 font-mono font-bold text-purple-900">{item.registerNo}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                              item.isCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}>
                              {item.isCompleted ? '✓ Completed' : '⚠ Pending'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-semibold text-slate-600">
                            {item.isCompleted ? 'Training Criteria Satisfied' : item.pendingReason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 7: CERTIFICATE REPORT */}
            {certReportTab === 'certReport' && (
              <div className="pro-card rounded-3xl p-6 bg-white space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-700" />
                  <span>Certificate Status Report</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-purple-50/60 text-purple-900 font-bold border-b border-purple-100 uppercase">
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Reg No</th>
                        <th className="p-3 font-mono">Certificate Number</th>
                        <th className="p-3 text-right">Certificate Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100/60 font-medium">
                      {certRoster.map((item) => (
                        <tr key={item.id}>
                          <td className="p-3 font-bold text-slate-900">{item.name}</td>
                          <td className="p-3 font-mono font-bold text-purple-900">{item.registerNo}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">{item.certNo}</td>
                          <td className="p-3 text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                              {item.certStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {/* SUB-TAB 6: STUDENTS LIST WITH NEW REGISTRATION */}
      {staffTab === 'students' && (
        <div className="space-y-6">
          
          {/* Section Header Card */}
          <div className="pro-card rounded-3xl p-6 bg-gradient-to-r from-white via-purple-50/40 to-purple-100/30 border-purple-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
                <UserPlus className="w-4 h-4 text-purple-700" />
                <span>Student Roster & Registration Center</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Students List with New Registration
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm mt-0.5 font-medium">
                Manage registered students and add new students.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  setImportBatchId(batches[0]?.id || '');
                  setShowImportModal(true);
                }}
                className="py-3 px-4 rounded-2xl bg-purple-100 text-purple-900 border border-purple-300 font-bold text-xs flex items-center gap-2 shadow-2xs hover:bg-purple-200 transition-all"
              >
                <UploadCloud className="w-4 h-4 text-purple-700" />
                <span>Bulk Import CSV</span>
              </button>

              <button
                onClick={handleOpenNewRegistration}
                className="py-3 px-5 rounded-2xl pro-button-primary text-white font-bold text-xs flex items-center gap-2 shadow-md hover:scale-[1.02] transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>New Registration</span>
              </button>
            </div>
          </div>

          {/* Search & Filters Control Bar */}
          <div className="pro-card rounded-2xl p-4 bg-white/90 border-purple-200/80 flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Search Field */}
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 text-purple-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pro-input rounded-xl pl-9 pr-4 py-2 text-xs placeholder-slate-400 font-medium"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              <div className="flex items-center gap-1 text-xs text-slate-600 font-bold">
                <Filter className="w-3.5 h-3.5 text-purple-600" />
                <span>Filters:</span>
              </div>

              {/* Batch Filter */}
              <select
                value={studentFilterBatch}
                onChange={(e) => setStudentFilterBatch(e.target.value)}
                className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
              >
                <option value="All">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {/* Department Filter */}
              <select
                value={studentFilterDept}
                onChange={(e) => setStudentFilterDept(e.target.value)}
                className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
              >
                <option value="All">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Tech">Information Tech</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Civil">Civil</option>
              </select>

              {/* Year Filter */}
              <select
                value={studentFilterYear}
                onChange={(e) => setStudentFilterYear(e.target.value)}
                className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
              >
                <option value="All">All Years</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>

              {/* Section Filter */}
              <select
                value={studentFilterSec}
                onChange={(e) => setStudentFilterSec(e.target.value)}
                className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
              >
                <option value="All">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>

              {/* Status Filter */}
              <select
                value={studentFilterStatus}
                onChange={(e) => setStudentFilterStatus(e.target.value)}
                className="pro-input rounded-xl px-3 py-1.5 text-xs bg-purple-50/50 font-semibold"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Student Roster Table & Cards */}
          <div className="pro-card rounded-3xl p-6 bg-white space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-700" />
                <span>Registered Students Directory ({students.filter((s) => {
                  const matchesSearch =
                    !studentSearch ||
                    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    s.registerNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    (s.email && s.email.toLowerCase().includes(studentSearch.toLowerCase())) ||
                    (s.batch && s.batch.name.toLowerCase().includes(studentSearch.toLowerCase()));

                  const matchesBatch = studentFilterBatch === 'All' || s.batchId === studentFilterBatch;
                  const matchesDept = studentFilterDept === 'All' || s.department === studentFilterDept;
                  const matchesYear = studentFilterYear === 'All' || s.year === studentFilterYear;
                  
                  const cleanSec = s.section ? s.section.replace(/^Sec\s*/, '') : 'A';
                  const matchesSec = studentFilterSec === 'All' || cleanSec === studentFilterSec;

                  const currentStatus = s.status || 'Active';
                  const matchesStatus = studentFilterStatus === 'All' || currentStatus === studentFilterStatus;

                  return matchesSearch && matchesBatch && matchesDept && matchesYear && matchesSec && matchesStatus;
                }).length})</span>
              </h3>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-purple-100 bg-purple-50/60 text-[11px] font-extrabold uppercase text-purple-900 tracking-wider">
                    <th className="py-3 px-4 rounded-l-xl">Register No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Year</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100/60 text-xs text-slate-700 font-medium">
                  {students.filter((s) => {
                    const matchesSearch =
                      !studentSearch ||
                      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                      s.registerNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
                      (s.email && s.email.toLowerCase().includes(studentSearch.toLowerCase())) ||
                      (s.batch && s.batch.name.toLowerCase().includes(studentSearch.toLowerCase()));

                    const matchesBatch = studentFilterBatch === 'All' || s.batchId === studentFilterBatch;
                    const matchesDept = studentFilterDept === 'All' || s.department === studentFilterDept;
                    const matchesYear = studentFilterYear === 'All' || s.year === studentFilterYear;
                    
                    const cleanSec = s.section ? s.section.replace(/^Sec\s*/, '') : 'A';
                    const matchesSec = studentFilterSec === 'All' || cleanSec === studentFilterSec;

                    const currentStatus = s.status || 'Active';
                    const matchesStatus = studentFilterStatus === 'All' || currentStatus === filterStatus;

                    return matchesSearch && matchesBatch && matchesDept && matchesYear && matchesSec && matchesStatus;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 font-medium space-y-3">
                        <p className="text-sm font-semibold text-slate-700">No students registered yet.</p>
                        <button
                          onClick={handleOpenNewRegistration}
                          className="py-2 px-4 rounded-xl pro-button-primary text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>New Registration</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    students.filter((s) => {
                      const matchesSearch =
                        !studentSearch ||
                        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        s.registerNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        (s.email && s.email.toLowerCase().includes(studentSearch.toLowerCase())) ||
                        (s.batch && s.batch.name.toLowerCase().includes(studentSearch.toLowerCase()));

                      const matchesBatch = studentFilterBatch === 'All' || s.batchId === studentFilterBatch;
                      const matchesDept = studentFilterDept === 'All' || s.department === studentFilterDept;
                      const matchesYear = studentFilterYear === 'All' || s.year === studentFilterYear;
                      
                      const cleanSec = s.section ? s.section.replace(/^Sec\s*/, '') : 'A';
                      const matchesSec = studentFilterSec === 'All' || cleanSec === studentFilterSec;

                      const currentStatus = s.status || 'Active';
                      const matchesStatus = studentFilterStatus === 'All' || currentStatus === studentFilterStatus;

                      return matchesSearch && matchesBatch && matchesDept && matchesYear && matchesSec && matchesStatus;
                    }).map((s) => {
                      const cleanSec = s.section ? s.section.replace(/^Sec\s*/, '') : 'A';
                      const statusVal = s.status || 'Active';

                      return (
                        <tr key={s.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-purple-900">
                            {s.registerNo}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {s.name}
                          </td>
                          <td className="py-3.5 px-4 font-medium">
                            {s.department}
                          </td>
                          <td className="py-3.5 px-4 font-medium">
                            {s.year}
                          </td>
                          <td className="py-3.5 px-4 font-bold">
                            Section {cleanSec}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-purple-900 font-semibold">
                            {s.batch?.name || 'Unassigned'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              statusVal === 'Completed' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                              statusVal === 'Inactive' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                              'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}>
                              {statusVal}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenManualOverride(s)}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-700 text-white hover:bg-purple-800 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                                title="Manual Attendance & Certificate Override"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>Override</span>
                              </button>

                              <button
                                onClick={() => handleOpenStudentProfile(s)}
                                className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Profile</span>
                              </button>

                              <button
                                onClick={() => handleOpenEditStudent(s)}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-50 text-slate-700 hover:bg-purple-100 border border-purple-200 transition-colors text-xs font-semibold"
                                title="Edit Student"
                              >
                                <Edit className="w-3.5 h-3.5 text-purple-700" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {students.filter((s) => {
                const matchesSearch =
                  !studentSearch ||
                  s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                  s.registerNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
                  (s.email && s.email.toLowerCase().includes(studentSearch.toLowerCase())) ||
                  (s.batch && s.batch.name.toLowerCase().includes(studentSearch.toLowerCase()));

                const matchesBatch = studentFilterBatch === 'All' || s.batchId === studentFilterBatch;
                const matchesDept = studentFilterDept === 'All' || s.department === studentFilterDept;
                const matchesYear = studentFilterYear === 'All' || s.year === studentFilterYear;
                
                const cleanSec = s.section ? s.section.replace(/^Sec\s*/, '') : 'A';
                const matchesSec = studentFilterSec === 'All' || cleanSec === studentFilterSec;

                const currentStatus = s.status || 'Active';
                const matchesStatus = studentFilterStatus === 'All' || currentStatus === studentFilterStatus;

                return matchesSearch && matchesBatch && matchesDept && matchesYear && matchesSec && matchesStatus;
              }).map((s) => {
                const cleanSec = s.section ? s.section.replace(/^Sec\s*/, '') : 'A';
                const statusVal = s.status || 'Active';

                return (
                  <div key={s.id} className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                        <span className="font-mono font-bold text-purple-900 text-xs">{s.registerNo}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        statusVal === 'Completed' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                        statusVal === 'Inactive' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                        'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}>
                        {statusVal}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-0.5 font-medium">
                      <p>{s.department} • {s.year} • Section {cleanSec}</p>
                      <p className="font-mono text-purple-950 font-semibold">{s.batch?.name || 'Unassigned Batch'}</p>
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-purple-100">
                      <button
                        onClick={() => handleOpenManualOverride(s)}
                        className="py-1.5 px-3 rounded-xl bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Override</span>
                      </button>
                      <button
                        onClick={() => handleOpenStudentProfile(s)}
                        className="flex-1 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditStudent(s)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-slate-700 text-xs font-semibold"
                      >
                        <Edit className="w-3.5 h-3.5 text-purple-700" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* NEW STUDENT REGISTRATION MODAL OVERLAY */}
      {showNewRegisterModal && (
        <div 
          onClick={() => setShowNewRegisterModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-purple-200 max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto cursor-default"
          >
            
            <div className="flex items-center justify-between border-b border-purple-100 pb-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-purple-700 font-extrabold uppercase">AR/VR COE</span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">New Student Registration</h2>
              </div>
              <button
                onClick={() => setShowNewRegisterModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleNewRegistrationSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Student Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arun Kumar"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Register Number <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-purple-600 font-medium">Unrestricted format • Unique</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 23CS101, MECH001, 101, ABC123"
                  value={regForm.registerNo}
                  onChange={(e) => setRegForm({ ...regForm, registerNo: e.target.value })}
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-purple-950"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={regForm.contactNumber}
                    onChange={(e) => setRegForm({ ...regForm, contactNumber: e.target.value })}
                    className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="arun@example.com"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={regForm.department}
                    onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                    className="w-full pro-input rounded-xl px-3 py-2.5 text-xs font-medium"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Tech">Information Tech</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                    <option value="AI & Data Science">AI & Data Science</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Year</label>
                  <select
                    value={regForm.year}
                    onChange={(e) => setRegForm({ ...regForm, year: e.target.value })}
                    className="w-full pro-input rounded-xl px-3 py-2.5 text-xs font-medium"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Section</label>
                  <select
                    value={regForm.section}
                    onChange={(e) => setRegForm({ ...regForm, section: e.target.value })}
                    className="w-full pro-input rounded-xl px-3 py-2.5 text-xs font-bold"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Training Batch <span className="text-rose-500">*</span></span>
                  {batches.length > 0 && (
                    <span className="text-[10px] text-purple-700 font-semibold">{batches.length} Batches</span>
                  )}
                </label>
                <select
                  required
                  value={regForm.batchId || batches[0]?.id || ''}
                  onChange={(e) => setRegForm({ ...regForm, batchId: e.target.value })}
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-bold text-purple-950 bg-white"
                >
                  {batches.length === 0 ? (
                    <option value="">No batches available</option>
                  ) : (
                    batches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>6-Digit PIN <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] font-mono text-purple-600">Exactly 6 numbers</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="e.g. 123456"
                  value={regForm.pin}
                  onChange={(e) => setRegForm({ ...regForm, pin: e.target.value })}
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold tracking-widest text-purple-950"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => setShowNewRegisterModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-slate-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="flex-1 py-2.5 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
                >
                  {registering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>{registering ? 'Registering...' : 'Register Student'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* REGISTRATION SUCCESS MODAL OVERLAY */}
      {showRegSuccessModal && registeredSuccessStudent && (
        <div 
          onClick={() => setShowRegSuccessModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-purple-200 max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 cursor-default"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Student Registered Successfully</h3>
                <p className="text-xs text-slate-600 font-medium">New student record active in training system</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-xs space-y-2 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <strong className="text-slate-900 font-bold">{registeredSuccessStudent.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Register Number:</span>
                <strong className="font-mono text-purple-900 font-bold">{registeredSuccessStudent.registerNo}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Training Batch:</span>
                <strong className="font-mono text-slate-900">{registeredSuccessStudent.batch?.name || 'Assigned Batch'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Section:</span>
                <strong className="text-slate-900">{registeredSuccessStudent.section || 'Sec A'}</strong>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowRegSuccessModal(false);
                  handleOpenStudentProfile(registeredSuccessStudent);
                }}
                className="flex-1 py-2.5 rounded-xl bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold hover:bg-purple-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>View Student Profile</span>
              </button>

              <button
                onClick={() => {
                  setShowRegSuccessModal(false);
                  handleOpenNewRegistration();
                }}
                className="flex-1 py-2.5 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Another</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE DETAILED WORKSPACE MODAL */}
      {showStudentProfileModal && profileStudent && (
        <div 
          onClick={() => setShowStudentProfileModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-purple-200 max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto cursor-default"
          >
            
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100 pb-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-purple-700 font-extrabold uppercase">STUDENT PROFILE</span>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{profileStudent.name}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-semibold text-slate-600">
                  <span className="font-mono text-purple-900 font-bold bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                    Reg No: {profileStudent.registerNo}
                  </span>
                  <span>{profileStudent.department} • {profileStudent.year} • {profileStudent.section}</span>
                  <span className="text-purple-950 font-bold font-mono">Batch: {profileStudent.batch?.name}</span>
                </div>
              </div>

              <button
                onClick={() => setShowStudentProfileModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors self-end sm:self-auto"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-purple-100 pb-2 overflow-x-auto">
              <button
                onClick={() => setProfileTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${profileTab === 'overview' ? 'pro-button-primary text-white shadow-xs' : 'text-slate-600 hover:bg-purple-50'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setProfileTab('attendance')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${profileTab === 'attendance' ? 'pro-button-primary text-white shadow-xs' : 'text-slate-600 hover:bg-purple-50'}`}
              >
                Attendance
              </button>
              <button
                onClick={() => setProfileTab('tasks')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${profileTab === 'tasks' ? 'pro-button-primary text-white shadow-xs' : 'text-slate-600 hover:bg-purple-50'}`}
              >
                Tasks History
              </button>
              <button
                onClick={() => setProfileTab('performance')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${profileTab === 'performance' ? 'pro-button-primary text-white shadow-xs' : 'text-slate-600 hover:bg-purple-50'}`}
              >
                Performance
              </button>
            </div>

            {/* Tab 1: Overview */}
            {profileTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Attendance</span>
                    <div className="text-2xl font-extrabold text-slate-900 mt-1">92%</div>
                    <div className="w-full bg-purple-200 h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-purple-600 h-full rounded-full w-[92%]" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Tasks Completed</span>
                    <div className="text-2xl font-extrabold text-slate-900 mt-1">{profileStudent.taskSubmissions?.length || 0} Submissions</div>
                    <div className="w-full bg-indigo-200 h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full w-[85%]" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Evaluations</span>
                    <div className="text-2xl font-extrabold text-slate-900 mt-1">{profileStudent.evaluations?.length || 0} Graded</div>
                    <div className="w-full bg-amber-200 h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-amber-600 h-full rounded-full w-[80%]" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Overall Progress</span>
                    <div className="text-2xl font-extrabold text-emerald-800 mt-1">86%</div>
                    <div className="w-full bg-emerald-200 h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full w-[86%]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Attendance */}
            {profileTab === 'attendance' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-purple-50 text-purple-900 text-xs font-semibold flex items-center justify-between">
                  <span>FN Cutoff: <strong>9:15 AM</strong></span>
                  <span>AN Cutoff: <strong>2:00 PM</strong></span>
                </div>
                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-purple-100 text-purple-900 font-bold border-b border-purple-200">
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Session</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100 font-medium">
                      {(profileStudent.attendances || []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-slate-500">No attendance logs found.</td>
                        </tr>
                      ) : (
                        profileStudent.attendances.map((att: any) => (
                          <tr key={att.id}>
                            <td className="p-2.5 font-mono">{formatDateDisplay(att.date)}</td>
                            <td className="p-2.5 font-bold text-purple-900">{att.session}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Present</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 3: Tasks History */}
            {profileTab === 'tasks' && (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {(profileStudent.taskSubmissions || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 text-center">No task submissions uploaded yet.</p>
                ) : (
                  profileStudent.taskSubmissions.map((task: any) => (
                    <div key={task.id} className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center font-bold">
                        <span className="font-mono text-purple-900">Day {task.trainingDay?.dayNumber || 1} • {task.trainingDay?.taskTitle || 'Task'}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">{task.status}</span>
                      </div>
                      {task.description && <p className="text-slate-700 italic">{task.description}</p>}
                      {task.evaluation && (
                        <div className="pt-2 border-t border-purple-200 font-semibold text-purple-950 flex justify-between">
                          <span>Score: {task.evaluation.score}/100 ({task.evaluation.grade})</span>
                          <span>Level: {task.evaluation.trainingLevel}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 4: Performance */}
            {profileTab === 'performance' && (
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-bold">Grade Evaluation:</span>
                  <strong className="text-purple-900 font-bold font-mono text-sm">A+ (Excellent)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-bold">Training Level Achieved:</span>
                  <strong className="text-slate-900 font-bold">Level 2 VR Developer</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-bold">Average Task Score:</span>
                  <strong className="text-emerald-800 font-bold font-mono">88 / 100</strong>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL OVERLAY */}
      {showEditStudentModal && editStudentData && (
        <div 
          onClick={() => setShowEditStudentModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-purple-200 max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-purple-100 pb-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-purple-700 font-extrabold uppercase">ADMIN ACTIONS</span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Edit Student Profile</h2>
              </div>
              <button
                onClick={() => setShowEditStudentModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student Name</label>
                <input
                  type="text"
                  required
                  value={editStudentData.name}
                  onChange={(e) => setEditStudentData({ ...editStudentData, name: e.target.value })}
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Number</label>
                  <input
                    type="tel"
                    required
                    value={editStudentData.contactNumber}
                    onChange={(e) => setEditStudentData({ ...editStudentData, contactNumber: e.target.value })}
                    className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editStudentData.email}
                    onChange={(e) => setEditStudentData({ ...editStudentData, email: e.target.value })}
                    className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={editStudentData.department}
                    onChange={(e) => setEditStudentData({ ...editStudentData, department: e.target.value })}
                    className="w-full pro-input rounded-xl px-2.5 py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Year</label>
                  <input
                    type="text"
                    required
                    value={editStudentData.year}
                    onChange={(e) => setEditStudentData({ ...editStudentData, year: e.target.value })}
                    className="w-full pro-input rounded-xl px-2.5 py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Section</label>
                  <select
                    value={editStudentData.section}
                    onChange={(e) => setEditStudentData({ ...editStudentData, section: e.target.value })}
                    className="w-full pro-input rounded-xl px-2.5 py-2 text-xs font-bold"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Training Batch</label>
                <select
                  value={editStudentData.batchId}
                  onChange={(e) => setEditStudentData({ ...editStudentData, batchId: e.target.value })}
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-bold text-purple-950"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
                <select
                  value={editStudentData.status}
                  onChange={(e) => setEditStudentData({ ...editStudentData, status: e.target.value })}
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-bold text-purple-950"
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => setShowEditStudentModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-slate-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStudent}
                  className="flex-1 py-2.5 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
                >
                  {updatingStudent ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                  <span>{updatingStudent ? 'Updating...' : 'Update Student'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ADMIN PROFILE MODAL */}
      {showAdminProfileModal && (
        <div 
          onClick={() => setShowAdminProfileModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-purple-200 max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-purple-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-900 text-white flex items-center justify-center font-bold text-sm">
                  <ShieldCheck className="w-6 h-6 text-purple-200" />
                </div>
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-purple-700 font-extrabold uppercase">ACCOUNT PROFILE</span>
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Admin Credentials</h2>
                </div>
              </div>
              <button
                onClick={() => setShowAdminProfileModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs p-4 rounded-2xl bg-purple-50/60 border border-purple-200 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Admin Name:</span>
                <strong className="text-slate-900 font-bold">{user.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Email Address:</span>
                <strong className="font-mono text-purple-900">{user.email || 'admin@arvr.com'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">System Role:</span>
                <strong className="font-mono text-purple-800 font-extrabold bg-purple-100 px-2 py-0.5 rounded border border-purple-200">{user.role}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Access Scope:</span>
                <strong className="text-emerald-700 font-bold">FULL ADMIN PRIVILEGES</strong>
              </div>
            </div>

            <button
              onClick={() => setShowAdminProfileModal(false)}
              className="w-full py-2.5 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}

      {/* CERTIFICATE RECORD MODAL OVERLAY */}
      {showCertRecordModal && selectedCertRecordStudent && (() => {
        const batchObj = batches.find((b) => b.id === selectedBatchId);
        return (
          <div 
            onClick={() => setShowCertRecordModal(false)}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl border border-purple-200 max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 cursor-default"
            >
              <div className="flex items-center justify-between border-b border-purple-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-purple-700 font-extrabold uppercase">CERTIFICATE RECORD</span>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Official Certificate Data</h2>
                </div>
                <button
                  onClick={() => setShowCertRecordModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs p-4 rounded-2xl bg-purple-50/60 border border-purple-200 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <strong className="text-slate-900 font-bold text-sm">{selectedCertRecordStudent.name}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Register Number:</span>
                  <strong className="font-mono text-purple-900 font-bold">{selectedCertRecordStudent.registerNo}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Batch:</span>
                  <strong className="font-mono text-slate-900">{batchObj?.name || 'Batch'}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Start Date:</span>
                  <strong className="font-mono text-slate-900">{formatDateDisplay(batchObj?.startDate)}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">End Date:</span>
                  <strong className="font-mono text-slate-900">{formatDateDisplay(batchObj?.endDate)}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Performance Grade:</span>
                  <strong className="font-mono text-purple-900 font-bold text-sm">{selectedCertRecordStudent.grade}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Training Level:</span>
                  <strong className="text-slate-900 font-bold">{selectedCertRecordStudent.level}</strong>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-purple-200">
                  <span className="text-slate-700 font-bold">Certificate Number:</span>
                  <strong className="font-mono text-purple-950 font-extrabold text-sm">{selectedCertRecordStudent.certNo}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Completion Status:</span>
                  <strong className={selectedCertRecordStudent.isCompleted ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {selectedCertRecordStudent.isCompleted ? '✓ Completed' : '⚠ Pending'}
                  </strong>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCertRecordModal(false);
                    handleOpenManualOverride(selectedCertRecordStudent);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-purple-700 text-white text-xs font-bold shadow-md hover:bg-purple-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Manual Override & Data</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCertRecordModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-purple-50 text-slate-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MANUAL STUDENT DATA & CERTIFICATE OVERRIDE MODAL */}
      {showManualOverrideModal && overrideStudent && (() => {
        const batchObj = batches.find((b) => b.id === overrideStudent.batchId) || batches.find((b) => b.id === selectedBatchId);
        const totalDays = batchObj?.trainingDays || 10;
        const maxSessions = totalDays * 2;
        const studentAtt = (overrideStudent.attendances || []).length;
        const currentAttPct = maxSessions > 0 ? Math.round((studentAtt / maxSessions) * 100) : 0;
        const studentTasks = (overrideStudent.tasks || []).length;
        const currentTaskPct = totalDays > 0 ? Math.round((studentTasks / totalDays) * 100) : 0;
        const isAtt100 = currentAttPct >= 100;
        const existingCert = overrideStudent.certificate;
        const isCurrentlyValid = existingCert ? (existingCert.isValid !== false && (isAtt100 || existingCert.isManualOverride)) : false;

        return (
          <div 
            onClick={() => setShowManualOverrideModal(false)}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl border border-purple-200 max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] overflow-y-auto cursor-default"
            >
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-purple-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    <ShieldCheck className="w-5 h-5 text-purple-200" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-purple-700 font-extrabold uppercase">ADMIN OVERRIDE CENTER</span>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Manual Student Data & Certificate Override</h2>
                  </div>
                </div>
                <button
                  onClick={() => setShowManualOverrideModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Header Card */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-xs flex flex-wrap items-center justify-between gap-3 font-medium">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{overrideStudent.name}</h3>
                  <p className="font-mono text-purple-900 font-bold">{overrideStudent.registerNo} • {overrideStudent.department}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Batch</span>
                  <span className="font-mono text-purple-950 font-bold">{batchObj?.name || 'Unassigned'}</span>
                </div>
              </div>

              {/* Live Metric Breakdown & Status */}
              <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                <div className={`p-3 rounded-xl border ${isAtt100 ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-rose-50/80 border-rose-200 text-rose-900'}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500">Attendance</span>
                  <span className="text-base font-extrabold block mt-0.5">{currentAttPct}%</span>
                  <span className="text-[10px] font-bold block">{studentAtt}/{maxSessions} sess</span>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold ${isAtt100 ? 'bg-emerald-200/80 text-emerald-900' : 'bg-rose-200/80 text-rose-900'}`}>
                    {isAtt100 ? '✓ 100% Attended' : '❌ < 100%'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200 text-purple-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500">Tasks</span>
                  <span className="text-base font-extrabold block mt-0.5">{currentTaskPct}%</span>
                  <span className="text-[10px] font-bold block">{studentTasks}/{totalDays} days</span>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-purple-200/80 text-purple-900">
                    {studentTasks >= totalDays ? '✓ Completed' : 'In Progress'}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${isCurrentlyValid ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900' : 'bg-amber-50/80 border-amber-200 text-amber-900'}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500">Cert Validity</span>
                  <span className="text-base font-extrabold block mt-0.5">
                    {isCurrentlyValid ? 'VALID' : 'INVALID'}
                  </span>
                  <span className="text-[10px] font-bold block truncate">{existingCert?.certificateNo || 'Not Issued'}</span>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold ${isCurrentlyValid ? 'bg-indigo-200/80 text-indigo-900' : 'bg-amber-200/80 text-amber-900'}`}>
                    {existingCert?.isManualOverride ? '★ Override' : isCurrentlyValid ? '✓ Auto Qualified' : '⚠ Action Req'}
                  </span>
                </div>
              </div>

              {/* Notice Banner */}
              {!isAtt100 && !existingCert?.isManualOverride ? (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">Automated Rule: Certificate is INVALID (&lt; 100% attendance)</p>
                    <p className="text-amber-800 text-[11px] leading-relaxed">
                      Institutional policy dictates that certificates are not valid unless the student achieves 100% attendance. You can either use the quick actions below to grant attendance/tasks, or authorize a manual override with justification.
                    </p>
                  </div>
                </div>
              ) : existingCert?.isManualOverride ? (
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">Manual Admin Override Active</p>
                    <p className="text-purple-800 text-[11px] leading-relaxed">
                      Reason: <strong className="font-medium text-slate-900">"{existingCert.overrideReason || 'Admin manual override'}"</strong>. This certificate is certified valid under administrative authority.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Action Message Alert */}
              {overrideActionMsg && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${overrideActionMsg.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'}`}>
                  {overrideActionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                  <span>{overrideActionMsg.text}</span>
                </div>
              )}

              {/* Quick Actions Card */}
              <div className="p-4 rounded-2xl bg-white border border-purple-200 space-y-3 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Quick Student Data Adjustments</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={savingOverride}
                    onClick={() => handleGrant100Attendance(overrideStudent.id)}
                    className="py-2.5 px-3 rounded-xl bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5 text-purple-700" />
                    <span>Grant 100% Att</span>
                  </button>

                  <button
                    type="button"
                    disabled={savingOverride}
                    onClick={() => handleGrantAllTasks(overrideStudent.id)}
                    className="py-2.5 px-3 rounded-xl bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-purple-700" />
                    <span>Accept All Tasks</span>
                  </button>

                  <button
                    type="button"
                    disabled={savingOverride}
                    onClick={() => handleGrantFullQualification(overrideStudent.id)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Full Qualify</span>
                  </button>
                </div>
              </div>

              {/* Manual Certificate Configuration Form */}
              <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-purple-700" />
                    <span>Certificate & Validity Customization</span>
                  </span>
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-purple-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideIsManual}
                      onChange={(e) => setOverrideIsManual(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span>Manual Override Mode</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Certificate Number</label>
                    <input
                      type="text"
                      value={overrideCertNo}
                      onChange={(e) => setOverrideCertNo(e.target.value)}
                      placeholder="e.g. ARVR-2026-001"
                      className="w-full pro-input rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Certificate Validity</label>
                    <div className="flex items-center gap-4 py-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 cursor-pointer">
                        <input
                          type="radio"
                          name="certValidRadio"
                          checked={overrideIsValid === true}
                          onChange={() => setOverrideIsValid(true)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>✓ Valid</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-rose-900 cursor-pointer">
                        <input
                          type="radio"
                          name="certValidRadio"
                          checked={overrideIsValid === false}
                          onChange={() => setOverrideIsValid(false)}
                          className="text-rose-600 focus:ring-rose-500"
                        />
                        <span>❌ Invalid</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Performance Grade</label>
                    <select
                      value={overrideFinalGrade}
                      onChange={(e) => setOverrideFinalGrade(e.target.value)}
                      className="w-full pro-input rounded-xl px-3 py-2 text-xs font-bold text-purple-950 bg-white"
                    >
                      <option value="O">Grade O (Outstanding / &ge; 90)</option>
                      <option value="A+">Grade A+ (Excellent / 80-89)</option>
                      <option value="A">Grade A (Very Good / 70-79)</option>
                      <option value="B+">Grade B+ (Good / 60-69)</option>
                      <option value="B">Grade B (Above Average / 50-59)</option>
                      <option value="C">Grade C (Pass / &lt; 50)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Training Level</label>
                    <select
                      value={overrideFinalLevel}
                      onChange={(e) => setOverrideFinalLevel(e.target.value)}
                      className="w-full pro-input rounded-xl px-3 py-2 text-xs font-bold text-purple-950 bg-white"
                    >
                      <option value="Level 1 Foundation">Level 1 Foundation</option>
                      <option value="Level 2 Advanced">Level 2 Advanced</option>
                      <option value="Level 3 Master">Level 3 Master</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Admin Override Reason / Remarks <span className="text-slate-400 font-normal">(Recorded for audit trail)</span>
                  </label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. Approved by Dean of Academics / Medical exemption / Hackathon participant"
                    className="w-full pro-input rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div>
                  {existingCert && (
                    <button
                      type="button"
                      disabled={savingOverride}
                      onClick={() => handleRevokeCertificate(overrideStudent.id)}
                      className="py-2.5 px-3.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke Certificate</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setShowManualOverrideModal(false)}
                    className="py-2.5 px-4 rounded-xl bg-purple-50 text-slate-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingOverride}
                    onClick={handleSaveManualCertificate}
                    className="py-2.5 px-5 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md hover:scale-[1.02] transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingOverride ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save & Update Certificate</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* EDIT TASK MODAL OVERLAY */}
      {showEditTaskModal && (
        <div 
          onClick={() => setShowEditTaskModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-purple-200 max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-purple-100 pb-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-purple-700 font-extrabold uppercase">TASK MANAGEMENT</span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Edit Task Details • Day {selectedDayNumber}</h2>
              </div>
              <button
                onClick={() => setShowEditTaskModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  placeholder="e.g. Create an interactive VR assembly sequence."
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description <span className="text-rose-500">*</span></label>
                <textarea
                  rows={4}
                  required
                  value={editTaskDesc}
                  onChange={(e) => setEditTaskDesc(e.target.value)}
                  placeholder="Create and demonstrate the required VR interaction sequence."
                  className="w-full pro-input rounded-xl p-3.5 text-xs font-medium text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => setShowEditTaskModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-slate-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="flex-1 py-2.5 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
                >
                  {savingTask ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{savingTask ? 'Saving...' : 'Save Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED STUDENT SUBMISSION REVIEW & EVALUATION MODAL */}
      {evaluatingTask && selectedSubmissionStudent && (() => {
        const curBatch = batches.find((b) => b.id === selectedBatchId);
        const curDayObj = batchCalendar.find((d: any) => d.dayNumber === parseInt(selectedDayNumber || '1', 10));
        const maxDaysInBatch = batchCalendar?.length || curBatch?.trainingDays || 15;
        const isFinalExamDay = (parseInt(selectedDayNumber || '1', 10) === maxDaysInBatch) ||
          curDayObj?.taskTitle?.toLowerCase().includes('final exam') ||
          curDayObj?.taskTitle?.toLowerCase().includes('examination') ||
          evaluatingTask.trainingDay?.taskTitle?.toLowerCase().includes('final exam') ||
          evaluatingTask.trainingDay?.taskTitle?.toLowerCase().includes('examination');

        return (
          <div 
            onClick={() => {
              setEvaluatingTask(null);
              setSelectedSubmissionStudent(null);
            }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="eval-modal-title"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl border border-purple-200 max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto cursor-default"
            >
              
              {/* Header Context */}
              <div className="flex items-center justify-between border-b border-purple-100 pb-4">
                <div>
                  <span className={`text-[10px] font-mono tracking-widest font-extrabold uppercase ${
                    isFinalExamDay ? 'text-amber-700' : 'text-purple-700'
                  }`}>
                    {isFinalExamDay ? `FINAL EXAM EVALUATION WORKSPACE • DAY ${selectedDayNumber}` : 'SUBMISSION EVALUATION WORKSPACE'}
                  </span>
                  <h2 id="eval-modal-title" className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    {isFinalExamDay && <GraduationCap className="w-5 h-5 text-amber-600" />}
                    <span>{isFinalExamDay ? 'Final Exam Submission & Grading' : 'Student Submission Review'}</span>
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setEvaluatingTask(null);
                    setSelectedSubmissionStudent(null);
                  }}
                  aria-label="Close evaluation modal"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Final Exam Highlight Banner */}
              {isFinalExamDay && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/60 border-2 border-amber-300 text-amber-950 flex items-start gap-2.5 shadow-xs">
                  <GraduationCap className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-xs text-amber-950">
                      🎓 Final Examination Assessment (Last Day of Batch)
                    </strong>
                    <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed font-medium">
                      This is the Final Exam practical on the last day of the batch. The Performance Grade selected below will be awarded as the student's <strong>Final Exam & Certificate Grade</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Student Metadata Card */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Student Name:</span>
                  <strong className="text-slate-900 font-bold block text-sm mt-0.5">{selectedSubmissionStudent.name}</strong>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Register Number:</span>
                  <strong className="font-mono text-purple-900 font-bold block text-sm mt-0.5">{selectedSubmissionStudent.registerNo}</strong>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Batch & Section:</span>
                  <span className="text-slate-900 font-semibold block mt-0.5">{curBatch?.name || 'Batch'} • Section {selectedSubmissionStudent.section?.replace(/^Sec\s*/, '') || 'A'}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Training Day & Submission Time:</span>
                  <span className="font-mono text-slate-900 font-semibold block mt-0.5">
                    Day {selectedDayNumber} • {evaluatingTask.submittedAt ? formatDateDisplay(evaluatingTask.submittedAt) : 'Submitted'}
                  </span>
                </div>
              </div>

              {/* Original Task & Resources Context */}
              {(() => {
                const evalDayTasks = (curDayObj?.tasks && curDayObj.tasks.length > 0)
                  ? curDayObj.tasks
                  : (evaluatingTask.trainingDay?.tasks && evaluatingTask.trainingDay.tasks.length > 0)
                  ? evaluatingTask.trainingDay.tasks
                  : [{ id: '1', title: curDayObj?.taskTitle || evaluatingTask.trainingDay?.taskTitle || 'Day Task', description: curDayObj?.taskDescription || evaluatingTask.trainingDay?.taskDescription || 'Task Description' }];

                const evalDayResources = (curDayObj?.resources && Array.isArray(curDayObj.resources))
                  ? curDayObj.resources
                  : (evaluatingTask.trainingDay?.resources && Array.isArray(evaluatingTask.trainingDay.resources))
                  ? evaluatingTask.trainingDay.resources
                  : [];

                return (
                  <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <ListChecks className="w-3.5 h-3.5 text-purple-700" />
                        <span>Assigned Tasks & Requirements ({evalDayTasks.length})</span>
                      </span>
                    </div>

                    <div className="space-y-2">
                      {evalDayTasks.map((t: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-white border border-purple-100 shadow-2xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded">Task #{idx + 1}</span>
                            <h4 className="font-bold text-slate-900 text-xs">{t.title}</h4>
                          </div>
                          {t.description && <p className="text-slate-600 font-medium text-[11px] leading-relaxed">{t.description}</p>}
                        </div>
                      ))}
                    </div>

                    {evalDayResources.length > 0 && (
                      <div className="pt-2 border-t border-purple-100 space-y-1.5">
                        <span className="font-bold text-slate-700 text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <Paperclip className="w-3 h-3 text-indigo-600" />
                          <span>Attached Learning Resources ({evalDayResources.length})</span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {evalDayResources.map((res: any, idx: number) => (
                            <a
                              key={idx}
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-900 text-[11px] font-semibold hover:bg-indigo-50 transition-colors flex items-center gap-1.5 shadow-2xs"
                            >
                              <span>{res.type === 'pdf' ? '📄' : res.type === 'link' ? '🔗' : '📁'}</span>
                              <span className="truncate max-w-[200px]">{res.title || res.filename || 'Resource'}</span>
                              <ExternalLink className="w-3 h-3 text-indigo-500 shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Uploaded Screenshot / File */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">Uploaded Screenshot / Task File</span>
                  {evaluatingTask.storedFilename && (
                    <span className="font-mono text-[11px] font-bold text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-lg border border-purple-200">
                      {evaluatingTask.storedFilename}
                    </span>
                  )}
                </div>

                {evaluatingTask.screenshotUrl ? (
                  <div className="p-3 rounded-2xl border border-purple-200 bg-purple-50/30 space-y-2">
                    <div className="relative max-h-64 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
                      <img
                        src={evaluatingTask.screenshotUrl}
                        alt="Task Submission File Output"
                        className="max-h-60 object-contain w-full"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-xs gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-950 font-bold font-mono text-[11px]">
                          {evaluatingTask.storedFilename || 'Submission File'}
                        </span>
                        {evaluatingTask.googleDriveFileId && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                            Google Drive Verified
                          </span>
                        )}
                      </div>
                      <a
                        href={evaluatingTask.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-700 hover:text-purple-950 underline font-mono text-xs flex items-center gap-1 font-bold bg-white px-3 py-1 rounded-xl border border-purple-200 shadow-2xs"
                      >
                        <span>[ View Submission ]</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-center text-xs text-slate-500 font-medium">
                    No screenshot file attached.
                  </div>
                )}
              </div>

              {/* Student Submission Description */}
              <div className="space-y-1 text-xs bg-purple-50/50 p-4 rounded-2xl border border-purple-200">
                <span className="font-bold text-purple-950 uppercase tracking-wider text-[10px] block">Student Submission Description</span>
                <p className="text-slate-800 font-medium italic">
                  {evaluatingTask.description || 'Student provided no submission text.'}
                </p>
              </div>

              {/* Evaluation Form Panel */}
              <form onSubmit={handleSubmitEvaluation} className="space-y-4 border-t border-purple-100 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span>{isFinalExamDay ? 'Final Exam Evaluation Panel' : 'Evaluation Panel'}</span>
                  </h4>
                  {evaluatingTask.evaluation?.evaluatedAt && (
                    <span className="text-[11px] font-mono text-purple-900 font-semibold bg-purple-100 px-2.5 py-0.5 rounded-md border border-purple-200">
                      Evaluated At: {formatDateDisplay(evaluatingTask.evaluation.evaluatedAt)}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>{isFinalExamDay ? 'Final Exam Score (0 - 100 Scale)' : 'Score (0 - 100 Scale)'} <span className="text-rose-500">*</span></span>
                    <span className="text-purple-900 font-mono font-extrabold text-base bg-purple-100 px-2.5 py-0.5 rounded-md border border-purple-200">{evalScore} / 100</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={evalScore}
                    onChange={(e) => handleScoreChange(Number(e.target.value))}
                    className="w-full accent-purple-600 h-2 bg-purple-100 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1 font-bold">
                    <span>0 (Invalid/Fail)</span>
                    <span>50 (Satisfactory)</span>
                    <span>80 (Excellent)</span>
                    <span>100 (Outstanding)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Performance</label>
                    <select
                      value={evalPerformance}
                      onChange={(e) => setEvalPerformance(e.target.value)}
                      className="w-full pro-input rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="Outstanding">Outstanding</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Good">Good</option>
                      <option value="Satisfactory">Satisfactory</option>
                      <option value="Needs Improvement">Needs Improvement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isFinalExamDay ? 'Final Exam Grade (Certificate)' : 'Performance Grade'}
                    </label>
                    <select
                      value={evalGrade}
                      onChange={(e) => setEvalGrade(e.target.value)}
                      className={`w-full pro-input rounded-xl px-3 py-2 text-xs font-bold ${
                        isFinalExamDay ? 'text-amber-950 bg-amber-50/50 border-amber-300 ring-1 ring-amber-300/60' : 'text-purple-900'
                      }`}
                    >
                      <option value="O">O (Outstanding 90+)</option>
                      <option value="A_PLUS">A+ (Excellent 80+)</option>
                      <option value="A">A (Very Good 70+)</option>
                      <option value="B_PLUS">B+ (Good 60+)</option>
                      <option value="B">B (Satisfactory 50+)</option>
                      <option value="C">C (Needs Work)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Training Level</label>
                    <select
                      value={evalLevel}
                      onChange={(e) => setEvalLevel(e.target.value)}
                      className="w-full pro-input rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="Level 1 Foundation">Level 1 Foundation</option>
                      <option value="Level 2 VR Developer">Level 2 VR Developer</option>
                      <option value="Level 3 Advanced AR/VR Engineer">Level 3 Advanced AR/VR Engineer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Evaluation Comments</label>
                  <textarea
                    rows={3}
                    value={evalComments}
                    onChange={(e) => setEvalComments(e.target.value)}
                    className="w-full pro-input rounded-xl p-3 text-xs placeholder-slate-400 font-medium"
                    placeholder="Provide constructive evaluation feedback for the student..."
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-purple-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEvaluatingTask(null);
                      setSelectedSubmissionStudent(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-purple-50 text-slate-700 text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEval}
                    className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 ${
                      isFinalExamDay ? 'bg-gradient-to-r from-amber-600 to-purple-600 hover:opacity-95' : 'pro-button-primary'
                    }`}
                  >
                    {submittingEval ? <RefreshCw className="w-4 h-4 animate-spin" /> : isFinalExamDay ? <GraduationCap className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    <span>{submittingEval ? 'Saving...' : isFinalExamDay ? 'Award Final Exam Grade & Save' : evaluatingTask.evaluation ? 'Update Evaluation' : 'Save Evaluation'}</span>
                  </button>
                </div>
              </form>

            </div>
          </div>
        );
      })()}

      {/* Bulk CSV Roster Import Modal */}
      {showImportModal && (
        <div 
          onClick={() => setShowImportModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="pro-card rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl border border-purple-200 bg-white cursor-default"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                <UploadCloud className="w-5 h-5 text-purple-700" />
                <span>Bulk Student CSV Roster Import</span>
              </h3>
              <button
                onClick={handleDownloadSampleCsv}
                className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            <form onSubmit={handleProcessBulkImport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Training Batch</label>
                <select
                  value={importBatchId}
                  onChange={(e) => setImportBatchId(e.target.value)}
                  className="w-full pro-input rounded-xl px-3.5 py-2.5 text-xs font-bold text-purple-900"
                  required
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Paste CSV Data or Drag & Drop Content
                  </label>
                  <span className="text-[11px] text-slate-500">Headers: name, registerNo, email...</span>
                </div>
                <textarea
                  rows={7}
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  placeholder={`name,registerNo,email,contactNumber,department,year,section,pin\nJohn Smith,21CS101,john@arvr.com,9876543210,Computer Science,3rd Year,Sec A,123456\nEmily Davis,21CS102,emily@arvr.com,9876543211,Information Tech,3rd Year,Sec B,123456`}
                  className="w-full pro-input rounded-xl p-3 text-xs font-mono placeholder-slate-400"
                  required
                />
              </div>

              {importResult && (
                <div className={`p-4 rounded-2xl text-xs space-y-1.5 ${
                  importResult.skippedCount > 0 ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                }`}>
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{importResult.message}</span>
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="pt-1 text-[11px] space-y-0.5 text-amber-800 max-h-24 overflow-y-auto">
                      {importResult.errors.map((errStr: string, idx: number) => (
                        <p key={idx}>• {errStr}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportResult(null);
                    setImportCsvText('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-purple-50 text-slate-700 text-xs font-semibold hover:bg-purple-100 transition-colors border border-purple-200"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="flex-1 py-2.5 rounded-xl pro-button-primary text-white text-xs font-bold shadow-md flex items-center justify-center gap-2"
                >
                  {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>{importing ? 'Processing Import...' : 'Import Students'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        </main>
      </div>
    </div>
  </div>
  );
}
