'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, KeyRound, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Star, Layers, Calendar } from 'lucide-react';

interface TrainerPortalProps {
  user: any;
  onLoginSuccess: (user: any) => void;
}

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

  // Evaluation form state
  const [evaluatingTaskId, setEvaluatingTaskId] = useState<string | null>(null);
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
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-purple-950/50">
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
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
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
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
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium text-sm shadow-lg shadow-purple-600/25 hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2"
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
      <div className="bg-gradient-to-r from-purple-900/50 via-slate-900 to-indigo-900/40 border border-purple-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-widest mb-1">
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
              className="bg-slate-950 border border-purple-500/30 text-xs font-bold text-purple-300 rounded-xl px-4 py-2.5 focus:outline-none"
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

      {/* Submissions List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-400" />
          <span>Student Task Submissions ({studentsSubmissions.length} Students)</span>
        </h2>

        {studentsSubmissions.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No student submissions found for selected filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentsSubmissions.map((studentItem) => {
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
                              <span className="font-bold text-purple-400">
                                Day {task.trainingDay?.dayNumber}: {task.trainingDay?.taskTitle}
                              </span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                task.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {task.status}
                              </span>
                            </div>

                            {task.screenshotUrl && (
                              <a
                                href={task.screenshotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-400 underline block truncate"
                              >
                                {task.screenshotUrl}
                              </a>
                            )}

                            {task.description && (
                              <p className="text-xs text-slate-300 italic">{task.description}</p>
                            )}

                            {task.evaluation ? (
                              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-emerald-400 font-bold">Score: {task.evaluation.score}/100</span>
                                  <span className="text-slate-400 ml-2">({task.evaluation.grade})</span>
                                </div>
                                <button
                                  onClick={() => handleOpenEvaluationModal(task)}
                                  className="text-[11px] text-purple-400 hover:underline"
                                >
                                  Edit Evaluation
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenEvaluationModal(task)}
                                className="w-full mt-2 py-1.5 px-3 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 text-xs font-semibold hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-1"
                              >
                                <Star className="w-3.5 h-3.5 text-amber-400" />
                                <span>Evaluate Task</span>
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
      </div>

      {/* Evaluation Drawer / Modal */}
      {evaluatingTaskId && (
        <div 
          onClick={() => setEvaluatingTaskId(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl cursor-default"
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              <span>Evaluate Task Submission</span>
            </h3>

            <form onSubmit={handleSubmitEvaluation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Score (0 - 100): <span className="text-indigo-400 font-bold">{evalScore}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={evalScore}
                  onChange={(e) => handleScoreChange(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Grade</label>
                  <select
                    value={evalGrade}
                    onChange={(e) => setEvalGrade(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Training Level</label>
                  <select
                    value={evalLevel}
                    onChange={(e) => setEvalLevel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Level 1 Foundation">Level 1 Foundation</option>
                    <option value="Level 2 VR Developer">Level 2 VR Developer</option>
                    <option value="Level 3 Advanced AR/VR Engineer">Level 3 Advanced AR/VR Engineer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Trainer Comments</label>
                <textarea
                  rows={3}
                  value={evalComments}
                  onChange={(e) => setEvalComments(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                  placeholder="Feedback for the student..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEvaluatingTaskId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEval}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-500"
                >
                  {submittingEval ? 'Saving...' : 'Save Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
