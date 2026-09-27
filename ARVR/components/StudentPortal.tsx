'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap, KeyRound, Clock, CheckCircle2, AlertCircle,
  Upload, Send, Award, FileText, BarChart3, UserCheck, Sparkles, RefreshCw, ChevronRight, ExternalLink, BookOpen, Compass, Lock, Layers, Download,
  Paperclip, ListChecks, X
} from 'lucide-react';

interface StudentPortalProps {
  user: any;
  onLoginSuccess: (user: any) => void;
}

export default function StudentPortal({ user, onLoginSuccess }: StudentPortalProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeBatches, setActiveBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login form state
  const [registerNo, setRegisterNo] = useState('');
  const [pin, setPin] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDept, setRegDept] = useState('Computer Science');
  const [regYear, setRegYear] = useState('3rd Year');
  const [regSection, setRegSection] = useState('A');
  const [regBatchId, setRegBatchId] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');

  // Student Dashboard data
  const [progressData, setProgressData] = useState<any>(null);
  const [todayTask, setTodayTask] = useState<any>(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  // Attendance marking
  const [markingAttendance, setMarkingAttendance] = useState<'FN' | 'AN' | null>(null);
  const [attendanceNote, setAttendanceNote] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // Feedback
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Sub-Tab Navigation & Curriculum Hub State
  const [studentSubTab, setStudentSubTab] = useState<'workspace' | 'curriculum'>('workspace');
  const [curriculumData, setCurriculumData] = useState<any>(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  useEffect(() => {
    fetchActiveBatches();
  }, []);

  useEffect(() => {
    if (user && user.role === 'STUDENT') {
      fetchStudentProgress();
      fetchTodayTask();
      fetchCurriculum();
    }
  }, [user]);

  const fetchCurriculum = async () => {
    setLoadingCurriculum(true);
    try {
      const res = await fetch('/api/student/curriculum');
      const data = await res.json();
      if (res.ok) {
        setCurriculumData(data);
      }
    } catch (e) {
      console.error('Error fetching curriculum:', e);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  const fetchActiveBatches = async () => {
    try {
      const res = await fetch('/api/batches/active');
      const data = await res.json();
      if (data.batches && Array.isArray(data.batches) && data.batches.length > 0) {
        setActiveBatches(data.batches);
        setRegBatchId((prev) => prev || data.batches[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch active batches', e);
    }
  };

  const fetchStudentProgress = async () => {
    try {
      const res = await fetch('/api/student/progress');
      const data = await res.json();
      if (res.ok) {
        setProgressData(data);
      }
    } catch (e) {
      console.error('Error fetching student progress', e);
    }
  };

  const fetchTodayTask = async (dayNum?: number) => {
    try {
      const url = dayNum ? `/api/student/task/today?dayNumber=${dayNum}` : '/api/student/task/today';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setTodayTask(data);
      }
    } catch (e) {
      console.error('Error fetching today task', e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registerNo, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!/^\d{6}$/.test(regPin)) {
      setErrorMsg('PIN must be exactly 6 numeric digits');
      return;
    }

    if (!/^\d{6}$/.test(regConfirmPin)) {
      setErrorMsg('Confirm PIN must be exactly 6 numeric digits');
      return;
    }

    if (regPin !== regConfirmPin) {
      setErrorMsg('PINs do not match. Please ensure both 6-digit PIN fields are identical.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/student/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          registerNo: regNo,
          contactNumber: regContact,
          email: regEmail,
          department: regDept,
          year: regYear,
          section: regSection,
          batchId: regBatchId,
          pin: regPin,
          confirmPin: regConfirmPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      setSuccessMsg('Registration successful! You can now sign in.');
      setIsRegistering(false);
      setRegisterNo(regNo);
      setPin(regPin);
      setRegConfirmPin('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMarkAttendance = async (session: 'FN' | 'AN') => {
    setMarkingAttendance(session);
    setErrorMsg('');
    setSuccessMsg('');
    setAttendanceNote(null);
    try {
      const res = await fetch(`/api/student/attendance/${session}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        const title = data.status === 'BEFORE_WINDOW'
          ? '⏰ Window Not Started'
          : data.status === 'AFTER_CUTOFF'
            ? '❌ Cutoff Passed'
            : data.status === 'ALREADY_MARKED'
              ? '✓ Already Marked'
              : 'Attendance Criteria Notice';

        setAttendanceNote({
          type: data.status === 'BEFORE_WINDOW' ? 'warning' : data.status === 'AFTER_CUTOFF' ? 'error' : 'info',
          title,
          message: data.note || data.error || 'Attendance marking failed',
        });
        throw new Error(data.error || 'Attendance marking failed');
      }

      setSuccessMsg(data.message);
      if (data.note) {
        setAttendanceNote({
          type: 'success',
          title: '✓ Attendance Recorded',
          message: data.note,
        });
      }
      await fetchStudentProgress();
      await fetchTodayTask();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setMarkingAttendance(null);
    }
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const tDayId = todayTask?.trainingDay?.id;
    if (!tDayId) return;

    setSubmittingTask(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let res;
      if (selectedFile) {
        // 1. Request S3 Presigned Upload URL from backend
        const presignedRes = await fetch('/api/student/task/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trainingDayId: tDayId,
            filename: selectedFile.name,
            fileSize: selectedFile.size,
            mimeType: selectedFile.type || 'application/octet-stream',
          }),
        });

        const presignedData = await presignedRes.json();
        if (!presignedRes.ok) {
          throw new Error(presignedData.error || 'Failed to prepare secure upload');
        }

        // 2. Direct browser-to-S3 PUT upload
        const s3UploadRes = await fetch(presignedData.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': selectedFile.type || 'application/octet-stream',
          },
          body: selectedFile,
        });

        if (!s3UploadRes.ok) {
          throw new Error('Direct upload to cloud storage failed. Please check your connection and try again.');
        }

        // 3. Confirm submission and store metadata in PostgreSQL
        res = await fetch('/api/student/task/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trainingDayId: tDayId,
            s3Key: presignedData.s3Key,
            originalFilename: selectedFile.name,
            fileSize: selectedFile.size,
            mimeType: selectedFile.type || 'application/octet-stream',
            description: taskDescription,
          }),
        });
      } else {
        res = await fetch('/api/student/task/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trainingDayId: tDayId,
            description: taskDescription,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Task submission failed');
      }

      setSuccessMsg('Task solution submitted successfully! Awaiting instructor review.');
      setScreenshotUrl('');
      setSelectedFile(null);
      setTaskDescription('');
      fetchTodayTask();
      fetchStudentProgress();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      const res = await fetch('/api/student/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: feedbackText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit feedback');
      setSuccessMsg('Thank you! Feedback submitted.');
      setFeedbackText('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Not Logged In View
  if (!user || user.role !== 'STUDENT') {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="pro-card rounded-3xl p-8 shadow-xl">

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student Portal</h2>
              <p className="text-xs text-slate-600 font-medium">Access Daily VR Tasks & Attendance</p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {!isRegistering ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="student-login-regno" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Register Number
                </label>
                <input
                  id="student-login-regno"
                  type="text"
                  required
                  placeholder="e.g. 21CS001"
                  value={registerNo}
                  onChange={(e) => setRegisterNo(e.target.value.toUpperCase())}
                  className="w-full pro-input rounded-xl px-4 py-2.5 text-sm placeholder-slate-400 font-mono"
                />
              </div>

              <div>
                <label htmlFor="student-login-pin" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  6-Digit Security PIN
                </label>
                <input
                  id="student-login-pin"
                  type="password"
                  required
                  maxLength={6}
                  placeholder="••••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full pro-input rounded-xl px-4 py-2.5 text-sm placeholder-slate-400 tracking-widest font-mono"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl pro-button-primary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  <span>Sign In as Student</span>
                </button>

              </div>

              <div className="text-center pt-4 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-xs text-purple-700 hover:text-purple-900 transition-colors font-bold"
                >
                  New Student? Create Account Here &rarr;
                </button>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label htmlFor="student-reg-name" className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="student-reg-name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full pro-input rounded-xl px-3.5 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="student-reg-no" className="block text-xs font-bold text-slate-700 mb-1">
                    Register No <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="student-reg-no"
                    type="text"
                    required
                    placeholder="21CS001"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                    className="w-full pro-input rounded-xl px-3.5 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="student-reg-contact" className="block text-xs font-bold text-slate-700 mb-1">
                    Contact No <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="student-reg-contact"
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={regContact}
                    onChange={(e) => setRegContact(e.target.value)}
                    className="w-full pro-input rounded-xl px-3.5 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="student-reg-email" className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  id="student-reg-email"
                  type="email"
                  required
                  placeholder="john@student.edu"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full pro-input rounded-xl px-3.5 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label htmlFor="student-reg-dept" className="block text-xs font-bold text-slate-700 mb-1">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="student-reg-dept"
                    required
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value)}
                    className="w-full pro-input rounded-xl px-3 py-2 text-xs font-semibold bg-white text-slate-900"
                  >
                    <option value="Computer Science">Computer Science (CSE)</option>
                    <option value="Information Tech">Information Technology (IT)</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                    <option value="AI & Data Science">AI & Data Science (AIDS)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="student-reg-year" className="block text-xs font-bold text-slate-700 mb-1">
                    Year <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="student-reg-year"
                    required
                    value={regYear}
                    onChange={(e) => setRegYear(e.target.value)}
                    className="w-full pro-input rounded-xl px-3 py-2 text-xs font-semibold bg-white text-slate-900"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="student-reg-section" className="block text-xs font-bold text-slate-700 mb-1">
                    Section <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="student-reg-section"
                    required
                    value={regSection}
                    onChange={(e) => setRegSection(e.target.value)}
                    className="w-full pro-input rounded-xl px-3 py-2 text-xs font-bold bg-white text-purple-950"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="student-reg-batch" className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Assigned Batch <span className="text-rose-500">*</span></span>
                  {activeBatches.length > 0 && (
                    <span className="text-[10px] text-purple-700 font-semibold">{activeBatches.length} Active Batches</span>
                  )}
                </label>
                <select
                  id="student-reg-batch"
                  required
                  value={regBatchId}
                  onChange={(e) => setRegBatchId(e.target.value)}
                  className="w-full pro-input rounded-xl px-3.5 py-2 text-xs font-bold text-purple-950 bg-white"
                >
                  {activeBatches.length === 0 ? (
                    <option value="">No active training batches available</option>
                  ) : (
                    activeBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="student-reg-pin" className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Create 6-Digit Security PIN <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-purple-600 font-mono">Exactly 6 digits</span>
                </label>
                <input
                  id="student-reg-pin"
                  type="password"
                  required
                  maxLength={6}
                  placeholder="••••••"
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full pro-input rounded-xl px-3.5 py-2 text-sm tracking-widest font-mono"
                />
              </div>

              <div>
                <label htmlFor="student-reg-confirm-pin" className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Confirm 6-Digit Security PIN <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-purple-600 font-mono">Re-enter PIN</span>
                </label>
                <input
                  id="student-reg-confirm-pin"
                  type="password"
                  required
                  maxLength={6}
                  placeholder="••••••"
                  value={regConfirmPin}
                  onChange={(e) => setRegConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  aria-invalid={regConfirmPin && regPin !== regConfirmPin ? true : undefined}
                  aria-describedby={regConfirmPin && regPin !== regConfirmPin ? 'confirm-pin-mismatch' : undefined}
                  className={`w-full pro-input rounded-xl px-3.5 py-2 text-sm tracking-widest font-mono ${regConfirmPin && regPin !== regConfirmPin ? 'border-rose-400 focus:border-rose-500' : ''
                    }`}
                />
                {regConfirmPin && regPin !== regConfirmPin && (
                  <p id="confirm-pin-mismatch" role="alert" className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>PINs do not match</span>
                  </p>
                )}
                {regConfirmPin && regPin === regConfirmPin && regConfirmPin.length === 6 && (
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>PINs match</span>
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !regPin || !regConfirmPin || regPin !== regConfirmPin || regPin.length !== 6}
                  className="w-full py-3 px-4 rounded-xl pro-button-primary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>Register & Create Student Account</span>
                </button>
              </div>

              <div className="text-center pt-3 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-xs text-slate-600 hover:text-purple-900 transition-colors font-medium"
                >
                  &larr; Back to Sign In
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    );
  }

  // Logged In Student Dashboard
  const metrics = progressData?.metrics || {};
  const student = progressData?.student || {};
  const certificate = progressData?.certificate;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">

      {/* Student Welcome Header Card */}
      <div className="pro-card rounded-3xl p-6 sm:p-8 relative overflow-hidden bg-gradient-to-r from-white via-purple-50/40 to-purple-100/30 border-purple-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1.5">
              <GraduationCap className="w-4 h-4 text-purple-700" />
              <span>Student Overview Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {student.name || user.name}
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-1">
              Register No: <span className="text-purple-900 font-mono font-bold">{student.registerNo || user.registerNo}</span> • Dept: <span className="text-slate-700 font-semibold">{student.department || 'CSE'} ({student.year}, Sec {student.section})</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <div className="flex items-center gap-1 bg-purple-50/80 p-1.5 rounded-2xl border border-purple-200">
              <button
                onClick={() => setStudentSubTab('workspace')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${studentSubTab === 'workspace'
                    ? 'pro-button-primary text-white shadow-xs'
                    : 'text-slate-600 hover:text-purple-900 hover:bg-purple-100/60'
                  }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Daily Workspace</span>
              </button>
              <button
                onClick={() => setStudentSubTab('curriculum')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${studentSubTab === 'curriculum'
                    ? 'pro-button-primary text-white shadow-xs'
                    : 'text-slate-600 hover:text-purple-900 hover:bg-purple-100/60'
                  }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Curriculum & SDK Hub</span>
              </button>
            </div>

            <div className="bg-purple-100/80 border border-purple-200 rounded-2xl px-4 py-2 text-right">
              <span className="text-[10px] text-purple-800 font-bold uppercase tracking-wider block">Assigned Batch</span>
              <span className="text-sm font-bold text-purple-950">{student.batchName || 'AR/VR Development'}</span>
            </div>
          </div>
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

        {/* Attendance Metric */}
        <div className="pro-card-interactive rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Rate</span>
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-2">{metrics.attendancePct ?? 0}%</div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${metrics.attendancePct || 0}%` }} />
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-2.5">
            {metrics.sessionsMarked || 0} of {metrics.maxPossibleSessions || 0} sessions marked
          </p>
        </div>

        {/* Task Completion Metric */}
        <div className="pro-card-interactive rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasks Accepted</span>
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-2">{metrics.taskPct ?? 0}%</div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-600 h-full transition-all duration-500" style={{ width: `${metrics.taskPct || 0}%` }} />
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-2.5">
            {metrics.tasksAccepted || 0} of {metrics.totalTrainingDays || 0} tasks accepted
          </p>
        </div>

        {/* Evaluation Score Metric */}
        <div className="pro-card-interactive rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Eval Average</span>
            <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <BarChart3 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-2">{metrics.evalAvg ?? 0}<span className="text-sm font-normal text-slate-500">/100</span></div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${metrics.evalAvg || 0}%` }} />
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-2.5">
            {metrics.evalCount || 0} evaluations graded
          </p>
        </div>

        {/* Final Exam Grade Metric */}
        <div className="pro-card-interactive rounded-2xl p-5 border-2 border-amber-300/70 bg-gradient-to-b from-amber-50/50 to-white shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1">
              <span>Final Exam Grade</span>
            </span>
            <span className="p-2 rounded-xl bg-amber-200/80 text-amber-900 border border-amber-300">
              <GraduationCap className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {progressData?.finalExam?.grade || metrics.finalExamGrade || certificate?.finalGrade || '—'}
            </span>
            {progressData?.finalExam?.score !== null && progressData?.finalExam?.score !== undefined && (
              <span className="text-xs font-extrabold font-mono text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                {progressData.finalExam.score}/100
              </span>
            )}
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${progressData?.finalExam?.score || (metrics.finalExamGrade ? 85 : 0)}%` }}
            />
          </div>
          <p className="text-[11px] font-semibold text-slate-600 mt-2.5">
            {progressData?.finalExam?.isEvaluated
              ? `Awarded on Day ${progressData.finalExam.dayNumber} Final Exam`
              : progressData?.finalExam?.isSubmitted
                ? 'Final Exam under review'
                : `Final Exam on Day ${progressData?.finalExam?.dayNumber || metrics.totalTrainingDays || 10}`}
          </p>
        </div>

        {/* Overall Index Metric */}
        <div className="pro-card-interactive rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Score</span>
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-2">{metrics.overallPct ?? 0}%</div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-amber-500 h-full transition-all duration-500" style={{ width: `${metrics.overallPct || 0}%` }} />
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-2.5">Weighted performance index</p>
        </div>

      </div>


      {/* SUB-TAB 1: DAILY WORKSPACE */}
      {studentSubTab === 'workspace' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Quick Attendance Actions */}
          <div className="space-y-6">
            <div className="pro-card rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-700" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Daily Attendance Marking</h2>
                    <span className="text-[10px] text-purple-600 font-semibold tracking-wide uppercase">Strict Cutoff Enforcement</span>
                  </div>
                </div>
                {todayTask?.attendanceToday?.currentZonedTime && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-800 rounded-xl text-xs font-bold border border-purple-200">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>IST: {todayTask.attendanceToday.currentZonedTime}</span>
                  </div>
                )}
              </div>

              {/* Attendance Criteria Feedback / Response Note */}
              {attendanceNote && (
                <div
                  className={`mb-4 p-3.5 rounded-2xl border text-xs font-medium flex items-start gap-2.5 transition-all shadow-xs ${attendanceNote.type === 'warning'
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : attendanceNote.type === 'error'
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : attendanceNote.type === 'success'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-blue-50 border-blue-300 text-blue-900'
                    }`}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <strong className="block font-bold text-[13px]">{attendanceNote.title}</strong>
                    <p className="mt-0.5 leading-relaxed text-[11px] font-normal">{attendanceNote.message}</p>
                  </div>
                  <button
                    onClick={() => setAttendanceNote(null)}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold px-1"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Institute Cutoff Criteria Note */}
              <div className="mb-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <span>📅 Attendance Criteria & Cutoffs</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1.5 text-[11px]">
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="font-bold text-purple-900 block">Morning (FN)</span>
                    <span className="text-slate-600">{todayTask?.attendanceToday?.fnDetails?.startFormatted || '08:45 AM'} – {todayTask?.attendanceToday?.fnDetails?.cutoffFormatted || '09:15 AM'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="font-bold text-purple-900 block">Afternoon (AN)</span>
                    <span className="text-slate-600">{todayTask?.attendanceToday?.anDetails?.startFormatted || '01:00 PM'} – {todayTask?.attendanceToday?.anDetails?.cutoffFormatted || '01:30 PM'}</span>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-slate-500 italic">
                  * Attendance must be marked daily within the session window. Marking before start or after cutoff is rejected.
                </p>
              </div>

              <div className="space-y-3">
                {/* FN Session Card */}
                {(() => {
                  const fn = todayTask?.attendanceToday?.fnDetails;
                  const isMarked = todayTask?.attendanceToday?.fn;
                  const status = fn?.status || (isMarked ? 'MARKED' : 'BEFORE_WINDOW');
                  return (
                    <div className={`p-4 rounded-2xl border transition-all ${isMarked
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : status === 'OPEN'
                          ? 'bg-purple-50/80 border-purple-300 ring-1 ring-purple-300/50'
                          : status === 'AFTER_CUTOFF'
                            ? 'bg-rose-50/40 border-rose-200'
                            : 'bg-amber-50/40 border-amber-200'
                      }`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">FN Session (Morning)</span>
                            {isMarked ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Marked</span>
                              </span>
                            ) : status === 'OPEN' ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-300 flex items-center gap-1 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                <span>Window Open</span>
                              </span>
                            ) : status === 'AFTER_CUTOFF' ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-extrabold rounded-full border border-rose-300">
                                ❌ Cutoff Passed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full border border-amber-300">
                                ⏰ Opens at {fn?.startFormatted || '08:45 AM'}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                            Window: {fn?.startFormatted || '08:45 AM'} – {fn?.cutoffFormatted || '09:15 AM'} (IST)
                          </span>
                        </div>
                      </div>

                      {/* Criteria Note message for FN */}
                      {fn?.note && (
                        <div className={`mt-2 p-2 rounded-xl text-[11px] leading-relaxed border ${isMarked
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100 font-medium'
                            : status === 'OPEN'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-semibold'
                              : status === 'AFTER_CUTOFF'
                                ? 'bg-rose-50 text-rose-800 border-rose-100'
                                : 'bg-amber-50 text-amber-800 border-amber-100'
                          }`}>
                          {fn.note}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-end">
                        {isMarked ? (
                          <span className="py-1.5 px-3 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Marked at {fn?.markedAtFormatted || 'Recorded'}</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkAttendance('FN')}
                            disabled={markingAttendance === 'FN'}
                            className={`py-1.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 ${status === 'OPEN'
                                ? 'pro-button-primary text-white hover:opacity-95'
                                : status === 'AFTER_CUTOFF'
                                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                              }`}
                          >
                            {markingAttendance === 'FN' ? (
                              <span>Verifying...</span>
                            ) : status === 'OPEN' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark FN Attendance</span>
                              </>
                            ) : status === 'AFTER_CUTOFF' ? (
                              <span>Mark FN (Cutoff Passed)</span>
                            ) : (
                              <span>Mark FN (Window Not Started)</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* AN Session Card */}
                {(() => {
                  const an = todayTask?.attendanceToday?.anDetails;
                  const isMarked = todayTask?.attendanceToday?.an;
                  const status = an?.status || (isMarked ? 'MARKED' : 'BEFORE_WINDOW');
                  return (
                    <div className={`p-4 rounded-2xl border transition-all ${isMarked
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : status === 'OPEN'
                          ? 'bg-purple-50/80 border-purple-300 ring-1 ring-purple-300/50'
                          : status === 'AFTER_CUTOFF'
                            ? 'bg-rose-50/40 border-rose-200'
                            : 'bg-amber-50/40 border-amber-200'
                      }`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">AN Session (Afternoon)</span>
                            {isMarked ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Marked</span>
                              </span>
                            ) : status === 'OPEN' ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-300 flex items-center gap-1 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                <span>Window Open</span>
                              </span>
                            ) : status === 'AFTER_CUTOFF' ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-extrabold rounded-full border border-rose-300">
                                ❌ Cutoff Passed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full border border-amber-300">
                                ⏰ Opens at {an?.startFormatted || '01:00 PM'}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                            Window: {an?.startFormatted || '01:00 PM'} – {an?.cutoffFormatted || '01:30 PM'} (IST)
                          </span>
                        </div>
                      </div>

                      {/* Criteria Note message for AN */}
                      {an?.note && (
                        <div className={`mt-2 p-2 rounded-xl text-[11px] leading-relaxed border ${isMarked
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100 font-medium'
                            : status === 'OPEN'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-semibold'
                              : status === 'AFTER_CUTOFF'
                                ? 'bg-rose-50 text-rose-800 border-rose-100'
                                : 'bg-amber-50 text-amber-800 border-amber-100'
                          }`}>
                          {an.note}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-end">
                        {isMarked ? (
                          <span className="py-1.5 px-3 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Marked at {an?.markedAtFormatted || 'Recorded'}</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkAttendance('AN')}
                            disabled={markingAttendance === 'AN'}
                            className={`py-1.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 ${status === 'OPEN'
                                ? 'pro-button-primary text-white hover:opacity-95'
                                : status === 'AFTER_CUTOFF'
                                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                              }`}
                          >
                            {markingAttendance === 'AN' ? (
                              <span>Verifying...</span>
                            ) : status === 'OPEN' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark AN Attendance</span>
                              </>
                            ) : status === 'AFTER_CUTOFF' ? (
                              <span>Mark AN (Cutoff Passed)</span>
                            ) : (
                              <span>Mark AN (Window Not Started)</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {(todayTask?.attendanceToday?.fn || todayTask?.attendanceToday?.an || todayTask?.attendanceToday?.hasAnyAttendance) && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 animate-pulse" />
                    <span>
                      {todayTask?.attendanceToday?.fn && todayTask?.attendanceToday?.an
                        ? '✓ Both FN & AN Attendance Verified! Daily Task Unlocked →'
                        : todayTask?.attendanceToday?.fn
                          ? '✓ FN (Morning) Attendance Verified! Daily Task Unlocked →'
                          : todayTask?.attendanceToday?.an
                            ? '✓ AN (Afternoon) Attendance Verified! Daily Task Unlocked →'
                            : '✓ Attendance Verified! Daily Task Unlocked →'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Certificate Status Card */}
            <div className="pro-card rounded-3xl p-6 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-2 border border-purple-200">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Certificate Eligibility</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Complete 100% of training sessions and accepted tasks to qualify for certification.
              </p>
              {certificate && certificate.isValid !== false ? (
                <div className="pt-2">
                  <span className="inline-block px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold font-mono shadow-xs">
                    🏆 Certificate Granted: {certificate.certificateNo} ({certificate.finalGrade})
                  </span>
                </div>
              ) : certificate && certificate.isValid === false ? (
                <div className="pt-2">
                  <span className="inline-block px-3 py-1.5 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 text-xs font-extrabold shadow-xs">
                    ⚠️ Certificate Invalid (&lt; 100% Attendance)
                  </span>
                </div>
              ) : (
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-[11px] font-semibold border border-purple-200">
                    Attendance: {metrics?.attendancePct || 0}% • Tasks: {metrics?.tasksAccepted || 0}/{metrics?.totalTrainingDays || 10} Accepted
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Today's VR/AR Practical Task */}
          <div className="lg:col-span-2 space-y-6">
            <div className="pro-card rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-purple-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Today's VR/AR Practical Task</h2>
                    <p className="text-xs text-slate-500 font-medium">Read instructions, implement in Unity/Unreal, & submit execution screenshot</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {todayTask?.allTrainingDays && todayTask.allTrainingDays.length > 1 && (
                    <select
                      value={todayTask.trainingDay?.dayNumber || 1}
                      onChange={(e) => fetchTodayTask(parseInt(e.target.value, 10))}
                      className="text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                      title="Select training day to view or submit"
                    >
                      {todayTask.allTrainingDays.map((td: any) => (
                        <option key={td.id} value={td.dayNumber}>
                          Day {td.dayNumber}{td.isFinalExam ? ' 🎓 (Final Exam)' : ''}: {td.taskTitle.slice(0, 24)}...
                        </option>
                      ))}
                    </select>
                  )}
                  {todayTask?.trainingDay && (
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold font-mono border ${todayTask.trainingDay.isFinalExam || todayTask.isFinalExam
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-purple-100 text-purple-900 border-purple-200'
                      }`}>
                      {todayTask.trainingDay.isFinalExam || todayTask.isFinalExam ? `🎓 Final Exam (Day ${todayTask.trainingDay.dayNumber})` : `Day ${todayTask.trainingDay.dayNumber}`}
                    </span>
                  )}
                </div>
              </div>

              {todayTask?.trainingDay ? (
                <div className="space-y-6">
                  {(todayTask.trainingDay.isFinalExam || todayTask.isFinalExam) && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-indigo-500/10 border-2 border-amber-400 text-slate-900 space-y-1.5 shadow-xs">
                      <div className="flex items-center gap-2 text-amber-950 font-extrabold text-sm">
                        <GraduationCap className="w-5 h-5 text-amber-700 shrink-0" />
                        <span>Final Examination & Assessment</span>
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-950 rounded-md text-[10px] uppercase font-mono font-bold tracking-wider border border-amber-300">
                          Final Day
                        </span>
                      </div>
                      <p className="text-xs text-amber-950 leading-relaxed font-medium">
                        This is the official final examination of your batch. Your instructor will grade your project submission, and the grade awarded here will be directly assigned as your <strong>Final Exam & Certificate Grade</strong>.
                      </p>
                    </div>
                  )}

                  {/* Today's Tasks & Requirements */}
                  {(() => {
                    const currentTasks = (todayTask.trainingDay.tasks && Array.isArray(todayTask.trainingDay.tasks) && todayTask.trainingDay.tasks.length > 0)
                      ? todayTask.trainingDay.tasks
                      : [{ id: '1', title: todayTask.trainingDay.taskTitle, description: todayTask.trainingDay.taskDescription }];

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                          <div className="flex items-center gap-2">
                            <ListChecks className="w-5 h-5 text-purple-700" />
                            <h3 className="text-base font-bold text-slate-900">
                              {todayTask.isFinalExam ? 'Final Exam Practical Tasks & Requirements' : 'Assigned Practical Tasks & Deliverables'}
                            </h3>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-900 border border-purple-200 font-mono">
                            {currentTasks.length} {currentTasks.length === 1 ? 'Task' : 'Tasks'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3.5">
                          {currentTasks.map((taskItem: any, tIdx: number) => (
                            <div
                              key={taskItem.id || tIdx}
                              className="bg-white border border-purple-200/80 rounded-2xl p-4 sm:p-5 space-y-2 shadow-2xs hover:shadow-xs transition-shadow"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-purple-950 bg-purple-100/70 border border-purple-200 px-2.5 py-0.5 rounded-lg font-mono">
                                  Task #{tIdx + 1}
                                </span>
                                <h4 className="text-sm sm:text-base font-bold text-slate-900">{taskItem.title}</h4>
                              </div>
                              {taskItem.description && (
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium pl-1">
                                  {taskItem.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Day Learning Resources Section */}
                  {todayTask.trainingDay.resources && Array.isArray(todayTask.trainingDay.resources) && todayTask.trainingDay.resources.length > 0 && (
                    <div className="bg-gradient-to-r from-purple-50/60 to-indigo-50/60 border border-purple-200/90 rounded-2xl p-5 space-y-3.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200">
                            <Paperclip className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Day Learning Resources & Reference Materials</h4>
                            <p className="text-[11px] text-slate-500 font-medium">Instructor-provided PDFs, documentation links, and assets for this day</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold font-mono text-indigo-800 bg-white border border-indigo-200 px-2.5 py-1 rounded-xl shadow-2xs">
                          {todayTask.trainingDay.resources.length} Resource{todayTask.trainingDay.resources.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {todayTask.trainingDay.resources.map((res: any, rIdx: number) => {
                          const isPdf = res.type === 'pdf' || res.url?.toLowerCase().endsWith('.pdf');
                          return (
                            <div
                              key={res.id || rIdx}
                              className="p-3.5 rounded-xl bg-white border border-indigo-100 hover:border-indigo-300 transition-all shadow-2xs flex flex-col justify-between gap-2.5"
                            >
                              <div className="flex items-start gap-2.5">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isPdf
                                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                                    : res.type === 'link'
                                      ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                      : 'bg-purple-50 text-purple-600 border-purple-200'
                                  }`}>
                                  {isPdf ? <FileText className="w-5 h-5" /> : res.type === 'link' ? <ExternalLink className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${isPdf
                                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                                        : res.type === 'link'
                                          ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                          : 'bg-purple-100 text-purple-800 border-purple-200'
                                      }`}>
                                      {res.type ? res.type.toUpperCase() : 'RESOURCE'}
                                    </span>
                                  </div>
                                  <h5 className="text-xs font-bold text-slate-900 truncate" title={res.title}>
                                    {res.title || 'Day Learning Material'}
                                  </h5>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                                <a
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <span>{isPdf ? 'View PDF Guide' : 'Open Resource Link'}</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                {isPdf && (
                                  <a
                                    href={`${res.url}?download=true`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1"
                                    title="Download PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {todayTask.submission ? (
                    <div className="bg-purple-50/50 border border-purple-200/80 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Submitted Task Solution</span>
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${todayTask.submission.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                          {todayTask.submission.status}
                        </span>
                      </div>

                      {todayTask.submission.screenshotUrl && (
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Submitted Screenshot Preview</label>
                          <div className="relative rounded-2xl overflow-hidden border border-purple-200 bg-white max-h-72 flex items-center justify-center p-2 shadow-xs">
                            <img
                              src={todayTask.submission.screenshotUrl}
                              alt="Submitted Screenshot"
                              className="max-h-64 object-contain rounded-xl w-full"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-3 pt-1">
                            <a
                              href={todayTask.submission.screenshotUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-700 hover:text-purple-900 underline font-mono flex items-center gap-1"
                            >
                              <span>Open Full Screenshot Image</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`${todayTask.submission.screenshotUrl}?download=true`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-emerald-700 hover:text-emerald-900 underline font-mono flex items-center gap-1 font-bold"
                            >
                              <span>[ Download File ]</span>
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      )}

                      {todayTask.submission.description && (
                        <div className="bg-white border border-purple-200/80 rounded-xl p-3.5 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Implementation Notes</span>
                          <p className="text-xs text-slate-700 font-medium">{todayTask.submission.description}</p>
                        </div>
                      )}

                      {todayTask.submission.evaluation ? (
                        <div className={`p-4 rounded-xl border space-y-2 ${todayTask.trainingDay?.isFinalExam || todayTask.isFinalExam
                            ? 'bg-amber-50 border-amber-300 text-amber-950 ring-1 ring-amber-300/60 shadow-xs'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          }`}>
                          <div className="flex items-center justify-between text-xs font-bold">
                            {todayTask.trainingDay?.isFinalExam || todayTask.isFinalExam ? (
                              <span className="flex items-center gap-2 text-amber-950 font-extrabold text-sm">
                                <GraduationCap className="w-5 h-5 text-amber-700" />
                                <span>Official Final Exam Grade: <span className="font-mono text-base px-2 py-0.5 bg-amber-200 text-amber-950 rounded-md border border-amber-300 font-extrabold">{todayTask.submission.evaluation.grade}</span></span>
                              </span>
                            ) : (
                              <span>Instructor Grade: {todayTask.submission.evaluation.grade}</span>
                            )}
                            <span className="font-mono text-emerald-700 font-extrabold text-sm bg-white px-2 py-0.5 rounded-md border border-emerald-200">{todayTask.submission.evaluation.score}/100</span>
                          </div>
                          {todayTask.submission.evaluation.comments && (
                            <p className="text-xs text-slate-700 italic mt-1 font-medium">&ldquo;{todayTask.submission.evaluation.comments}&rdquo;</p>
                          )}
                          {(todayTask.trainingDay?.isFinalExam || todayTask.isFinalExam) && (
                            <div className="pt-1.5 text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 border-t border-amber-200">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>✓ Official Grade Recorded: Awarded on your Certificate of Completion ({todayTask.submission.evaluation.grade})</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-purple-100/60 border border-purple-200 text-purple-900 text-xs font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4 text-purple-700 shrink-0" />
                          <span>Submission uploaded successfully! Awaiting instructor evaluation and grading.</span>
                        </div>
                      )}
                    </div>
                  ) : (() => {
                    const isTaskUnlocked = Boolean(
                        todayTask?.isTaskUnlocked ||
                        todayTask?.attendanceToday?.fn ||
                        todayTask?.attendanceToday?.an ||
                        todayTask?.attendanceToday?.hasAnyAttendance ||
                        todayTask?.submission
                      );

                      return (
                        <form onSubmit={handleSubmitTask} className="space-y-4">
                          {!isTaskUnlocked && (
                            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
                              <Lock className="w-5 h-5 shrink-0 text-amber-600" />
                              <span>
                                <strong>Task Submission Locked:</strong> You must mark attendance for today before uploading your project output.
                              </span>
                            </div>
                          )}

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label htmlFor="task-screenshot-file" className="block text-xs font-bold text-slate-700">
                                Upload Practical Execution Screenshot (PNG, JPG, WebP - Max 5MB)
                              </label>
                              {isTaskUnlocked && (
                                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                  ✓ Ready to upload
                                </span>
                              )}
                            </div>

                            <div
                              onClick={() => {
                                if (isTaskUnlocked && fileInputRef.current) {
                                  fileInputRef.current.click();
                                }
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (isTaskUnlocked) setIsDraggingFile(true);
                              }}
                              onDragLeave={() => setIsDraggingFile(false)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setIsDraggingFile(false);
                                if (isTaskUnlocked && e.dataTransfer.files?.[0]) {
                                  const file = e.dataTransfer.files[0];
                                  if (file.type.startsWith('image/')) {
                                    setSelectedFile(file);
                                  } else {
                                    setErrorMsg('Please upload an image file (PNG, JPG, WebP).');
                                  }
                                }
                              }}
                              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                                !isTaskUnlocked
                                  ? 'border-slate-200 bg-slate-50/50 cursor-not-allowed opacity-75'
                                  : isDraggingFile
                                    ? 'border-purple-600 bg-purple-100/60 scale-[1.01] shadow-inner cursor-pointer'
                                    : 'border-purple-200 hover:border-purple-400 bg-purple-50/40 hover:bg-purple-50/70 cursor-pointer group'
                              }`}
                            >
                              {selectedFile ? (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 cursor-default"
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <span className="truncate">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedFile(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                      }}
                                      className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => fileInputRef.current?.click()}
                                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                    >
                                      Change
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center transition-transform group-hover:scale-110 ${
                                    !isTaskUnlocked ? 'bg-slate-200 text-slate-400' : 'bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs'
                                  }`}>
                                    <Upload className="w-6 h-6" />
                                  </div>

                                  <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-800">
                                      {isTaskUnlocked ? (
                                        <>
                                          <span className="text-purple-700 group-hover:underline">Click anywhere here to choose file</span>
                                          <span className="text-slate-500 font-normal"> or drag & drop</span>
                                        </>
                                      ) : (
                                        <span className="text-slate-500">Upload locked — mark your attendance first</span>
                                      )}
                                    </p>
                                    <p className="text-[11px] text-slate-400">PNG, JPG, WebP (up to 5MB)</p>
                                  </div>

                                  <input
                                    ref={fileInputRef}
                                    id="task-screenshot-file"
                                    type="file"
                                    accept="image/*"
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      setSelectedFile(file);
                                    }}
                                    disabled={!isTaskUnlocked}
                                    tabIndex={!isTaskUnlocked ? -1 : 0}
                                    className="hidden"
                                  />

                                  {isTaskUnlocked && (
                                    <div className="pt-1">
                                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-purple-200 text-purple-800 text-xs font-bold shadow-2xs group-hover:border-purple-400 group-hover:bg-purple-50 transition-colors">
                                        <Upload className="w-3.5 h-3.5 text-purple-600" />
                                        Choose Screenshot
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label htmlFor="task-student-notes" className="block text-xs font-bold text-slate-700 mb-1.5">
                              Student Implementation Notes & GitHub / Drive Link
                            </label>
                            <textarea
                              id="task-student-notes"
                              rows={3}
                              placeholder="Describe your Unity setup, XR rig components used, or paste your repository link..."
                              value={taskDescription}
                              onChange={(e) => setTaskDescription(e.target.value)}
                              disabled={!isTaskUnlocked}
                              className="w-full pro-input rounded-xl px-4 py-2.5 text-xs placeholder-slate-400 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={submittingTask || (!isTaskUnlocked && !todayTask?.submission)}
                            className="w-full py-3 px-4 rounded-xl pro-button-primary text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-md transition-all hover:scale-[1.01]"
                          >
                            {submittingTask ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            <span>{submittingTask ? 'Submitting Solution...' : todayTask?.submission ? 'Update Submitted Solution' : 'Submit Solution for Evaluation'}</span>
                          </button>
                        </form>
                      );
                    })()}

                </div>
              ) : (
                <div className="text-center py-10 text-slate-500 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-purple-300" />
                  <p className="text-sm font-medium">No active training task scheduled for today.</p>
                </div>
              )}
            </div>

            {/* Student Feedback Form */}
            <div className="pro-card rounded-3xl p-6 sm:p-7">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Submit Student Feedback</h3>
              <form onSubmit={handleSubmitFeedback} className="space-y-3">
                <textarea
                  rows={2}
                  required
                  placeholder="Share your thoughts or technical queries with instructors..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full pro-input rounded-xl px-4 py-2.5 text-xs placeholder-slate-400"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="px-4 py-2 rounded-xl pro-button-primary text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>
      )}

      {/* SUB-TAB 2: CURRICULUM & DEVELOPER SDK HUB */}
      {studentSubTab === 'curriculum' && (
        <div className="space-y-8">

          {/* Section 1: Full Batch Curriculum Schedule */}
          <div className="pro-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-purple-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Full Batch Training Schedule & Curriculum</h2>
                  <p className="text-xs text-slate-500 font-medium">Preview upcoming daily tasks, practical requirements, and submission statuses</p>
                </div>
              </div>

              {curriculumData?.batch && (
                <span className="px-3 py-1 bg-purple-100 text-purple-900 border border-purple-200 rounded-full text-xs font-bold">
                  {curriculumData.batch.trainingDays} Total Days
                </span>
              )}
            </div>

            {loadingCurriculum ? (
              <div className="py-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
                <span>Loading curriculum days...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(curriculumData?.days || []).map((day: any) => {
                  const isSubmitted = !!day.submission;
                  const isAccepted = day.submission?.status === 'ACCEPTED';
                  return (
                    <div
                      key={day.id}
                      className={`p-5 rounded-2xl border transition-all space-y-3 ${day.isFinalExam
                          ? isAccepted
                            ? 'bg-amber-50/60 border-2 border-amber-300 ring-1 ring-amber-200 shadow-sm'
                            : 'bg-gradient-to-br from-amber-50/40 to-purple-50/30 border-2 border-amber-300 shadow-sm'
                          : isAccepted
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : isSubmitted
                              ? 'bg-purple-50/40 border-purple-200'
                              : 'bg-white border-purple-200/80 hover:border-purple-300'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold font-mono flex items-center gap-1 ${day.isFinalExam ? 'bg-amber-200 text-amber-950 border border-amber-300' : 'bg-purple-100 text-purple-900'
                          }`}>
                          {day.isFinalExam ? <GraduationCap className="w-3.5 h-3.5 text-amber-800" /> : null}
                          <span>Day {day.dayNumber}{day.isFinalExam ? ' • Final Exam' : ''}</span>
                        </span>
                        {isAccepted ? (
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border flex items-center gap-1 ${day.isFinalExam ? 'bg-amber-100 text-amber-950 border-amber-300 font-extrabold' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{day.isFinalExam ? `Final Exam Grade: ${day.submission.evaluation?.grade} (${day.submission.evaluation?.score}/100)` : `Accepted (${day.submission.evaluation?.score}/100)`}</span>
                          </span>
                        ) : isSubmitted ? (
                          <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                            Submitted (Pending Eval)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                            Scheduled
                          </span>
                        )}
                      </div>

                      {/* Tasks List */}
                      {(() => {
                        const curDayTasks = (day.tasks && Array.isArray(day.tasks) && day.tasks.length > 0)
                          ? day.tasks
                          : [{ id: '1', title: day.taskTitle, description: day.taskDescription }];

                        return (
                          <div className="space-y-2">
                            {curDayTasks.map((tItem: any, tIdx: number) => (
                              <div key={tIdx} className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  {curDayTasks.length > 1 && (
                                    <span className="text-[10px] font-extrabold text-purple-950 bg-purple-100/80 px-1.5 py-0.2 rounded font-mono">
                                      #{tIdx + 1}
                                    </span>
                                  )}
                                  <h3 className="font-bold text-slate-900 text-sm tracking-tight">{tItem.title}</h3>
                                </div>
                                {tItem.description && (
                                  <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-3 pl-0.5">
                                    {tItem.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Day Attached Resources */}
                      {day.resources && Array.isArray(day.resources) && day.resources.length > 0 && (
                        <div className="pt-2 border-t border-purple-100/80 space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Paperclip className="w-3 h-3 text-indigo-600" />
                            <span>Day Resources ({day.resources.length})</span>
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {day.resources.map((r: any, rIdx: number) => (
                              <a
                                key={rIdx}
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-[11px] font-semibold border border-indigo-200 transition-colors flex items-center gap-1 shadow-2xs"
                              >
                                <span>{r.type === 'pdf' ? '📄' : r.type === 'link' ? '🔗' : '📁'}</span>
                                <span className="truncate max-w-[150px]">{r.title || 'Resource'}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {day.submission?.evaluation?.comments && (
                        <div className="pt-2 border-t border-purple-100 text-[11px] text-slate-600 italic">
                          Feedback: &ldquo;{day.submission.evaluation.comments}&rdquo;
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: AR/VR Developer Toolkit & SDK Reference Hub */}
          <div className="pro-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-2.5 border-b border-purple-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">AR/VR Developer Toolkit & Reference Hub</h2>
                <p className="text-xs text-slate-500 font-medium">Official SDK documentation, Unity packages, and performance optimization guides</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {(curriculumData?.resources || []).map((res: any) => (
                <a
                  key={res.id}
                  href={res.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pro-card-interactive rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-purple-300 transition-all group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-purple-100 text-purple-900 rounded-md">
                        {res.badge}
                      </span>
                      <ExternalLink className="w-4 h-4 text-purple-400 group-hover:text-purple-700 transition-colors" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm tracking-tight group-hover:text-purple-800 transition-colors">
                      {res.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {res.description}
                    </p>
                  </div>

                  <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                    <span>View Docs</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </a>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
