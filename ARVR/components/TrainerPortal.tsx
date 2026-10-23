'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, KeyRound, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Star, Layers, Calendar, Search, ExternalLink } from 'lucide-react';

interface TrainerPortalProps {
  user: any;
  onLoginSuccess: (user: any) => void;
}

const QUICK_GRADES = [
  { label: 'O', score: 95, color: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20' },
  { label: 'A+', score: 85, color: 'border-blue-500/40 text-blue-400 hover:bg-blue-500/20' },
  { label: 'A', score: 75, color: 'border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/20' },
  { label: 'B+', score: 65, color: 'border-amber-500/40 text-amber-400 hover:bg-amber-500/20' },
  { label: 'B', score: 55, color: 'border-orange-500/40 text-orange-400 hover:bg-orange-500/20' },
  { label: 'C', score: 45, color: 'border-rose-500/40 text-rose-400 hover:bg-rose-500/20' },
];

const QUICK_FEEDBACK_CHIPS = [
  '✨ Clean XR locomotion & Rig setup',
  '🎯 Accurate 3D collision physics',
  '🔊 Spatial audio attenuation verified',
  '⚠️ Check raycast interaction',
  '👍 Approved — Great Progress!',
];

export default function TrainerPortal({ user, onLoginSuccess }: TrainerPortalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Trainer data state
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [studentsSubmissions, setStudentsSubmissions] = useState<any[]>([]);
  const [selectedDayNumber, setSelectedDayNumber] = useState<string>('');

  // Search & Status filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'GRADED'>('ALL');

  // Evaluation form state
  const [evaluatingTaskId, setEvaluatingTaskId] = useState<string | null>(null);
  const [evaluatingTask, setEvaluatingTask] = useState<any | null>(null);
  const [evalScore, setEvalScore] = useState<number>(85);
  const [evalGrade, setEvalGrade] = useState<string>('A_PLUS');
  const [evalLevel, setEvalLevel] = useState<string>('Level 1 Foundation');
  const [evalComments, setEvalComments] = useState<string>('Excellent VR project structure.');
  const [submittingEval, setSubmittingEval] = useState(false);

  useEffect(() => {
    if (user && user.role === 'TRAINER') {
      fetchTrainerBatches();
    }
  }, [user]);

  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchSubmissions(selectedBatchId, selectedDayNumber);
    }
  }, [selectedBatchId, selectedDayNumber]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/trainer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Trainer login failed');
      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainerBatches = async () => {
    try {
      const res = await fetch('/api/trainer/batches');
      const data = await res.json();
      if (data.batches) {
        setBatches(data.batches);
        if (data.batches.length > 0) {
          setSelectedBatchId(data.batches[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching trainer batches', e);
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
    setEvaluatingTaskId(task.id);
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
    if (!evaluatingTaskId) return;
    setSubmittingEval(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/trainer/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: evaluatingTaskId,
          score: Number(evalScore),
          grade: evalGrade,
          trainingLevel: evalLevel,
          comments: evalComments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evaluation failed');
      setSuccessMsg('Evaluation submitted successfully!');
      setEvaluatingTaskId(null);
      setEvaluatingTask(null);
      fetchBatchSubmissions(selectedBatchId, selectedDayNumber);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingEval(false);
    }
  };

  // Not Logged In View
  if (!user || user.role !== 'TRAINER') {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-blue-950/50">
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Trainer Portal</h2>
              <p className="text-xs text-slate-400">Review Submissions & Grade VR Tasks</p>
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
                Trainer Email
              </label>
              <input
                type="email"
                required
                placeholder="trainer@arvr.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>Sign In as Trainer</span>
              </button>

            </div>
          </form>

        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      
      {/* Trainer Header */}
      <div className="bg-gradient-to-r from-blue-900/50 via-slate-900 to-indigo-900/40 border border-blue-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-widest mb-1">
              <UserCheck className="w-4 h-4" />
              <span>Trainer Control Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Welcome, {user.name}</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">Review student task screenshots and assign official level evaluations</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="bg-slate-950 border border-blue-500/30 text-xs font-bold text-blue-300 rounded-xl px-4 py-2.5 focus:outline-none"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select
              value={selectedDayNumber}
              onChange={(e) => setSelectedDayNumber(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none"
            >
              <option value="">All Days</option>
              <option value="1">Day 1</option>
              <option value="2">Day 2</option>
              <option value="3">Day 3</option>
              <option value="4">Day 4</option>
              <option value="5">Day 5</option>
            </select>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search & Status Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student name, reg no, department..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['ALL', 'PENDING', 'GRADED'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {filter === 'ALL' ? 'All Submissions' : filter === 'PENDING' ? '⏳ Needs Grading' : '✓ Graded'}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {(() => {
          const filteredStudents = studentsSubmissions.filter((student) => {
            const matchesSearch =
              student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              student.registerNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              student.department?.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            if (statusFilter === 'PENDING') {
              return (student.tasks || []).some((t: any) => !t.evaluation);
            }
            if (statusFilter === 'GRADED') {
              return (student.tasks || []).length > 0 && (student.tasks || []).every((t: any) => Boolean(t.evaluation));
            }
            return true;
          });

          return (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" />
                  <span>Student Task Submissions ({filteredStudents.length} Students)</span>
                </h2>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Clear Search
                  </button>
                )}
              </div>

              {filteredStudents.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No student submissions match your search or filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredStudents.map((studentItem) => {
                    const taskList = studentItem.tasks || [];
                    return (
                      <div key={studentItem.id} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between space-y-4">
                        
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                            <div>
                              <h3 className="font-bold text-white text-sm">{studentItem.name}</h3>
                              <p className="text-xs text-slate-400 font-mono">{studentItem.registerNo} ({studentItem.department})</p>
                            </div>
                            <span className="px-2.5 py-1 text-[10px] font-semibold bg-slate-800 text-slate-300 rounded-full">
                              Sec {studentItem.section}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {taskList.length === 0 ? (
                              <p className="text-xs text-slate-500 italic py-4 text-center">No tasks submitted yet</p>
                            ) : (
                              taskList.map((task: any) => (
                                <div key={task.id} className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-blue-400 truncate max-w-[180px]">
                                      Day {task.trainingDay?.dayNumber}: {task.trainingDay?.taskTitle}
                                    </span>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                      task.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                    }`}>
                                      {task.status}
                                    </span>
                                  </div>

                                  {task.screenshotUrl && (
                                    <div className="relative w-full h-24 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center my-1">
                                      <img
                                        src={task.screenshotUrl}
                                        alt="Task thumbnail"
                                        className="max-h-full max-w-full object-contain"
                                      />
                                    </div>
                                  )}

                                  {task.description && (
                                    <p className="text-xs text-slate-300 italic line-clamp-2">{task.description}</p>
                                  )}

                                  {task.evaluation ? (
                                    <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                                      <div>
                                        <span className="text-emerald-400 font-bold">Score: {task.evaluation.score}/100</span>
                                        <span className="text-slate-400 ml-2">({task.evaluation.grade})</span>
                                      </div>
                                      <button
                                        onClick={() => handleOpenEvaluationModal(task)}
                                        className="text-[11px] text-blue-400 hover:underline font-semibold"
                                      >
                                        Edit Grade
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenEvaluationModal(task)}
                                      className="w-full mt-2 py-2 px-3 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-semibold hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-1.5"
                                    >
                                      <Star className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Review & Grade Task</span>
                                    </button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Phase 4: Split-Pane Evaluation Drawer */}
      {evaluatingTaskId && (
        <div 
          onClick={() => { setEvaluatingTaskId(null); setEvaluatingTask(null); }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl cursor-default"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Evaluate Student Task Submission</h3>
                  <p className="text-xs text-slate-400">
                    Day {evaluatingTask?.trainingDay?.dayNumber || 1}: {evaluatingTask?.trainingDay?.taskTitle || 'Practical Task'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setEvaluatingTaskId(null); setEvaluatingTask(null); }}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Split-Pane Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Student Submission Evidence */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Submission Evidence</span>
                  {evaluatingTask?.screenshotUrl && (
                    <a
                      href={evaluatingTask.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold underline"
                    >
                      <span>Full Image</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {evaluatingTask?.screenshotUrl ? (
                  <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center p-2 shadow-inner">
                    <img
                      src={evaluatingTask.screenshotUrl}
                      alt="Student submission screenshot"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-44 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-center text-slate-500 text-xs italic">
                    No screenshot preview available
                  </div>
                )}

                {/* Student Notes */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Student Notes</span>
                  <p className="text-xs text-slate-200 leading-relaxed italic font-medium">
                    {evaluatingTask?.description ? `"${evaluatingTask.description}"` : 'No written description provided.'}
                  </p>
                </div>
              </div>

              {/* Right Column: Grading & Feedback Controls */}
              <form onSubmit={handleSubmitEvaluation} className="space-y-4 flex flex-col justify-between">
                
                <div className="space-y-4">
                  {/* Quick-Grade One-Click Chips */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Quick Grade Preset (Click to Apply)
                    </label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {QUICK_GRADES.map((g) => (
                        <button
                          key={g.label}
                          type="button"
                          onClick={() => handleScoreChange(g.score)}
                          className={`py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${g.color} ${
                            evalGrade === (g.label === 'A+' ? 'A_PLUS' : g.label === 'B+' ? 'B_PLUS' : g.label)
                              ? 'ring-2 ring-blue-400 bg-slate-800 scale-105'
                              : 'bg-slate-950'
                          }`}
                        >
                          <div>{g.label}</div>
                          <div className="text-[9px] opacity-70 font-mono">{g.score}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Score Slider & Live Value */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">Detailed Score</label>
                      <span className="text-sm font-extrabold text-blue-400 font-mono bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20">
                        {evalScore} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={evalScore}
                      onChange={(e) => handleScoreChange(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>

                  {/* Grade and Training Level Dropdowns */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Grade</label>
                      <select
                        value={evalGrade}
                        onChange={(e) => setEvalGrade(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
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
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Proficiency Level</label>
                      <select
                        value={evalLevel}
                        onChange={(e) => setEvalLevel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="Level 1 Foundation">Level 1 Foundation</option>
                        <option value="Level 2 VR Developer">Level 2 VR Developer</option>
                        <option value="Level 3 Advanced AR/VR Engineer">Level 3 Advanced AR/VR Engineer</option>
                      </select>
                    </div>
                  </div>

                  {/* Quick Feedback Chips */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Quick Feedback Suggestions (Click to Append)
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {QUICK_FEEDBACK_CHIPS.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setEvalComments((prev) => prev ? `${prev} ${chip}` : chip);
                          }}
                          className="text-[10px] font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-left"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={3}
                      value={evalComments}
                      onChange={(e) => setEvalComments(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      placeholder="Write customized qualitative feedback for student..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setEvaluatingTaskId(null); setEvaluatingTask(null); }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEval}
                    className="flex-1 py-2.5 rounded-xl pro-button-primary text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30"
                  >
                    {submittingEval ? 'Saving...' : 'Confirm & Assign Grade'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
