'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, KeyRound, CheckCircle2, AlertCircle, Sparkles, RefreshCw, 
  Users, Layers, Award, FileSpreadsheet, Plus, Calendar, Settings, Search, Download
} from 'lucide-react';

interface AdminPortalProps {
  user: any;
  onLoginSuccess: (user: any) => void;
}

export default function AdminPortal({ user, onLoginSuccess }: AdminPortalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Admin Dashboard State
  const [adminTab, setAdminTab] = useState<'overview' | 'batches' | 'calendar' | 'certificates' | 'students' | 'settings'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Google Drive OAuth Connection State
  const [driveInfo, setDriveInfo] = useState<any>(null);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [testingDrive, setTestingDrive] = useState(false);
  const [disconnectingDrive, setDisconnectingDrive] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(true);
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [credSaveMsg, setCredSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  // Selected Batch for operations
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batchCalendar, setBatchCalendar] = useState<any[]>([]);

  // New Batch Form State
  const [newBatchName, setNewBatchName] = useState('');
  const [newStartDate, setNewStartDate] = useState('2026-09-01');
  const [newEndDate, setNewEndDate] = useState('2026-09-30');
  const [newTrainingDays, setNewTrainingDays] = useState(10);

  // Calendar Day Form
  const [calDayNum, setCalDayNum] = useState(1);
  const [calTitle, setCalTitle] = useState('');
  const [calDesc, setCalDesc] = useState('');

  // Certificate check
  const [runningCheck, setRunningCheck] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  // Student Search
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchStats();
      fetchBatches();
      fetchStudents();
      fetchDriveInfo();
    }
  }, [user]);

  const fetchDriveInfo = async () => {
    setLoadingDrive(true);
    try {
      const res = await fetch('/api/admin/settings/drive');
      const data = await res.json();
      if (res.ok) {
        setDriveInfo(data);
        if (data.clientId && !clientIdInput) {
          setClientIdInput(data.clientId);
        }
      }
    } catch (e) {
      console.error('Error fetching drive info', e);
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCredentials(true);
    setCredSaveMsg(null);
    try {
      const res = await fetch('/api/admin/settings/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientIdInput,
          clientSecret: clientSecretInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save credentials');
      setCredSaveMsg({ type: 'success', text: '✓ API Credentials saved in database successfully!' });
      setClientSecretInput('');
      fetchDriveInfo();
    } catch (err: any) {
      setCredSaveMsg({ type: 'error', text: err.message || 'Failed to save credentials' });
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleConnectDrive = async () => {
    setConnectingDrive(true);
    setTestMsg(null);
    try {
      const res = await fetch('/api/google-drive/oauth/connect');
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Failed to initiate OAuth flow.');
      window.location.href = data.url;
    } catch (err: any) {
      setTestMsg(err.message);
      setTestSuccess(false);
    } finally {
      setConnectingDrive(false);
    }
  };

  const handleTestDrive = async () => {
    setTestingDrive(true);
    setTestMsg(null);
    try {
      const res = await fetch('/api/admin/settings/drive/test', { method: 'POST' });
      const data = await res.json();
      setTestMsg(data.message);
      setTestSuccess(data.success);
    } catch (err) {
      setTestMsg('✗ Google Drive connection failed.');
      setTestSuccess(false);
    } finally {
      setTestingDrive(false);
    }
  };

  const handleDisconnectDrive = async () => {
    setDisconnectingDrive(true);
    setTestMsg(null);
    try {
      const res = await fetch('/api/admin/settings/drive/disconnect', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Google Drive account disconnected successfully.');
        fetchDriveInfo();
      } else {
        throw new Error(data.error || 'Failed to disconnect');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDisconnectingDrive(false);
    }
  };

  useEffect(() => {
    if (selectedBatchId) {
      fetchCalendar(selectedBatchId);
    }
  }, [selectedBatchId]);

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
      if (!res.ok) throw new Error(data.error || 'Admin login failed');
      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('admin@arvr.com');
    setPassword('admin123');
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



  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/admin/students');
      const data = await res.json();
      if (res.ok && data.students) setStudents(data.students);
    } catch (e) {
      console.error('Error fetching students', e);
    }
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
      setSuccessMsg(`Day ${calDayNum} task saved!`);
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

  // Not Logged In View
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-cyan-950/50">
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Admin Portal</h2>
              <p className="text-xs text-slate-400">System Administration & Certification Engine</p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                placeholder="admin@arvr.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-medium text-sm shadow-lg shadow-cyan-600/25 hover:from-cyan-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>Sign In as Admin</span>
              </button>

              <button
                type="button"
                onClick={handleDemoFill}
                className="w-full py-2 px-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo Fill: admin@arvr.com / admin123</span>
              </button>
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
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      
      {/* Admin Header & Sub-Navigation */}
      <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-widest mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">System Administration</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">Manage training batches, daily curriculum calendar, certificate engine, and exports</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto overflow-x-auto">
            <button
              onClick={() => setAdminTab('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${adminTab === 'overview' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setAdminTab('batches')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${adminTab === 'batches' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Batches
            </button>
            <button
              onClick={() => setAdminTab('calendar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${adminTab === 'calendar' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setAdminTab('certificates')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${adminTab === 'certificates' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Certificates & Excel
            </button>
            <button
              onClick={() => setAdminTab('students')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${adminTab === 'students' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Students
            </button>
            <button
              onClick={() => {
                setAdminTab('settings');
                fetchDriveInfo();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${adminTab === 'settings' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {adminTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase font-semibold">Total Registered Students</span>
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{stats?.totalStudents ?? students.length}</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase font-semibold">Active Batches</span>
                <Layers className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{stats?.totalBatches ?? batches.length}</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase font-semibold">Certified Graduates</span>
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{stats?.certifiedCount ?? 0}</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase font-semibold">Avg Program Attendance</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{stats?.avgAttendancePct ?? 100}%</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BATCH MANAGEMENT */}
      {adminTab === 'batches' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create Batch Form */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              <span>Create New Batch</span>
            </h2>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Batch Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AR/VR Advanced Batch 2"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Training Days</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newTrainingDays}
                    onChange={(e) => setNewTrainingDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 text-white font-medium text-xs hover:bg-cyan-500 transition-colors"
              >
                Create Batch
              </button>
            </form>
          </div>

          {/* Batches List */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Active & Registered Batches ({batches.length})</span>
            </h2>

            <div className="space-y-3">
              {batches.map((b) => (
                <div key={b.id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">{b.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Training Days: <span className="text-slate-200">{b.trainingDays}</span>
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: CALENDAR BUILDER */}
      {adminTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <span>Add / Update Day Task</span>
            </h2>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Batch</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <form onSubmit={handleAddCalendarDay} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Day Number</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={calDayNum}
                  onChange={(e) => setCalDayNum(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VR Physics & Hand Tracking"
                  value={calTitle}
                  onChange={(e) => setCalTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed instructions for the student task..."
                  value={calDesc}
                  onChange={(e) => setCalDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 text-white font-medium text-xs hover:bg-cyan-500 transition-colors"
              >
                Save Task to Calendar
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
            <h2 className="text-lg font-bold text-white">Configured Days ({batchCalendar.length})</h2>
            <div className="space-y-3">
              {batchCalendar.map((day) => (
                <div key={day.id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-400">Day {day.dayNumber}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm">{day.taskTitle}</h3>
                  <p className="text-xs text-slate-300">{day.taskDescription}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: CERTIFICATES & EXCEL EXPORT */}
      {adminTab === 'certificates' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Batch Certificate Engine</h2>
              <p className="text-xs text-slate-400">Verify attendance/evaluation criteria & generate official Excel records</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Select Batch</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {checkResult && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{checkResult}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleRunCompletionCheck}
                disabled={runningCheck}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium text-xs hover:from-amber-500 hover:to-orange-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
              >
                {runningCheck ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                <span>1. Run Completion Check</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-xs hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>2. Export Excel (.xlsx)</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Automatic Certificate sequence format: <code className="text-slate-300">ARVR-BATCHNAME-001</code>
            </p>
          </div>
        </div>
      )}

      {/* TAB 5: STUDENTS DIRECTORY */}
      {adminTab === 'students' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span>Registered Students Directory ({filteredStudents.length})</span>
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, reg no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Reg Number</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Certificate Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-white">{s.name}</td>
                    <td className="p-3 font-mono text-cyan-400">{s.registerNo}</td>
                    <td className="p-3 text-slate-400">{s.contactNumber}</td>
                    <td className="p-3">{s.department} ({s.year}, {s.section})</td>
                    <td className="p-3">
                      {s.certificate ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                          {s.certificate.certificateNo} ({s.certificate.finalGrade})
                        </span>
                      ) : (
                        <span className="text-slate-500">In Progress</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS & GOOGLE DRIVE */}
      {adminTab === 'settings' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">System Settings</h2>
              <p className="text-xs text-slate-400">Manage Google Drive OAuth 2.0 connection for student task uploads</p>
            </div>
          </div>

          {/* Google Drive Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Google Drive</h3>
                <p className="text-xs text-slate-400 mt-0.5">Connect Admin's personal Google account</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  driveInfo?.isConnected
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}>
                  {driveInfo?.isConnected ? 'Connected ✓' : 'Not Connected'}
                </span>
              </div>
            </div>

            {/* Credentials Configuration Box */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  Google Cloud Console Credentials
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  driveInfo?.hasSecret && driveInfo?.clientId 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {driveInfo?.hasSecret && driveInfo?.clientId ? 'Credentials Saved ✓' : 'Setup Required'}
                </span>
              </div>

              {/* Redirect URI with copy button */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400">
                  Authorized Redirect URI (Copy & paste into Google Cloud Console):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={driveInfo?.redirectUri || 'https://lms-system-zfzc.onrender.com/api/google-drive/oauth/callback'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const uri = driveInfo?.redirectUri || 'https://lms-system-zfzc.onrender.com/api/google-drive/oauth/callback';
                      navigator.clipboard.writeText(uri);
                      setCopiedRedirect(true);
                      setTimeout(() => setCopiedRedirect(false), 2500);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg whitespace-nowrap transition-colors"
                  >
                    {copiedRedirect ? 'Copied! ✓' : 'Copy URI'}
                  </button>
                </div>
              </div>

              {/* Form to save Client ID & Secret */}
              <form onSubmit={handleSaveCredentials} className="space-y-3 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Google Client ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 123456789-xyz.apps.googleusercontent.com"
                      value={clientIdInput}
                      onChange={(e) => setClientIdInput(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">
                      Google Client Secret {driveInfo?.hasSecret && <span className="text-emerald-400 text-[10px]">(Already Saved)</span>}
                    </label>
                    <input
                      type="password"
                      placeholder={driveInfo?.hasSecret ? '••••••••••••••••••••••••' : 'Enter Client Secret'}
                      value={clientSecretInput}
                      onChange={(e) => setClientSecretInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {credSaveMsg && (
                  <div className={`p-2.5 rounded-lg border text-xs font-semibold ${
                    credSaveMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {credSaveMsg.text}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingCredentials}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {savingCredentials ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Save API Credentials</span>
                  </button>
                </div>
              </form>
            </div>

            {loadingDrive ? (
              <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                <span className="text-xs font-medium">Checking Google Drive status...</span>
              </div>
            ) : driveInfo?.isConnected ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Connected Account:</span>
                  <span className="text-sm font-bold font-mono text-cyan-400">{driveInfo?.connectedAccount || 'admin@gmail.com'}</span>
                </div>

                {testMsg && (
                  <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    testSuccess ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    <span>{testMsg}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={testingDrive}
                    onClick={handleTestDrive}
                    className="py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors flex items-center gap-2"
                  >
                    {testingDrive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Test Connection</span>
                  </button>

                  <button
                    type="button"
                    disabled={disconnectingDrive}
                    onClick={handleDisconnectDrive}
                    className="py-2.5 px-4 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs hover:bg-rose-500/30 transition-colors flex items-center gap-2"
                  >
                    {disconnectingDrive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Connect your Google Drive account using Google OAuth 2.0. Student task submissions will be uploaded into folder <code className="font-mono text-cyan-400 font-bold bg-slate-900 px-2 py-0.5 rounded">ARVR_Student_Submissions/{"{Batch_Name}"}/</code>.
                </p>

                {testMsg && (
                  <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    testSuccess ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    <span>{testMsg}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={connectingDrive || !driveInfo?.hasSecret || !driveInfo?.clientId}
                  onClick={handleConnectDrive}
                  className={`py-3 px-6 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 ${
                    !driveInfo?.hasSecret || !driveInfo?.clientId
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-cyan-600/20 hover:from-cyan-500 hover:to-indigo-500'
                  }`}
                >
                  {connectingDrive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>{(!driveInfo?.hasSecret || !driveInfo?.clientId) ? 'Save Credentials Above to Connect' : 'Connect Google Drive'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
