import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';

const JacClient = {
  spawnWalker: async (walker, params) => {
    const response = await fetch(`${API_BASE}/walker/${walker}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Request failed');
    }

    const result = await response.json();
    if (Array.isArray(result)) return result;
    if (result.success && result.data !== undefined) return result.data;
    if (result.success) return result;
    return result;
  }
};

const AttendanceTracker = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [lessonDetails, setLessonDetails] = useState({
    subject: '',
    class: '',
    period: '',
    topic: ''
  });
  const [showLessonForm, setShowLessonForm] = useState(false);

  useEffect(() => {
    loadAttendanceLogs();
    checkActiveSession();

    // Update clock every second
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Auto-refresh logs every 10 seconds
    const refreshInterval = setInterval(() => {
      loadAttendanceLogs(true);
      checkActiveSession();
    }, 10000);

    return () => {
      clearInterval(timer);
      clearInterval(refreshInterval);
    };
  }, []);

  const loadAttendanceLogs = async (silent = false) => {
    try {
      const data = await JacClient.spawnWalker('get_teacher_attendance_logs', {
        teacherId: user.id,
        limit: 20
      });
      if (data) setLogs(data);
    } catch (e) {
      if (!silent) {
        console.error('Failed to load attendance logs:', e);
      }
    }
  };

  const checkActiveSession = async () => {
    try {
      const data = await JacClient.spawnWalker('get_active_session', {
        teacherId: user.id
      });
      if (data && data.active) {
        setCurrentSession(data.session);
      } else {
        setCurrentSession(null);
      }
    } catch (e) {
      console.error('Failed to check active session:', e);
    }
  };

  const handleClockIn = async () => {
    if (!lessonDetails.subject || !lessonDetails.period) {
      setError('Please fill in Subject and Period before clocking in.');
      setTimeout(() => setError(null), 3000);
      setShowLessonForm(true);
      return;
    }

    setLoading(true);
    setError(null);

    const now = new Date();
    const sessionData = {
      id: `session_${Date.now()}`,
      userId: user.id,
      teacherId: user.id,
      teacherName: user.name,
      date: now.toISOString().split('T')[0],
      clockIn: now.toISOString(),
      clockInTime: now.toLocaleTimeString(),
      subject: lessonDetails.subject,
      class: lessonDetails.class,
      period: lessonDetails.period,
      topic: lessonDetails.topic,
      sendNotification: true,
      notifySupervisor: true
    };

    try {
      const result = await JacClient.spawnWalker('clock_in_teacher', sessionData);

      if (result) {
        setCurrentSession(result);
        setSuccess(`✓ Clocked in at ${now.toLocaleTimeString()}. Supervisor notified.`);
        setTimeout(() => setSuccess(null), 3000);
        setShowLessonForm(false);
        setLessonDetails({ subject: '', class: '', period: '', topic: '' });
        await loadAttendanceLogs();
      }
    } catch (e) {
      console.error('Clock in failed:', e);
      setError(`Failed to clock in: ${e.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentSession) return;

    const confirmation = window.confirm('Are you sure you want to clock out? This will end your current lesson session.');
    if (!confirmation) return;

    setLoading(true);
    setError(null);

    const now = new Date();
    const start = new Date(currentSession.clockIn);
    const diffMs = now.getTime() - start.getTime();
    const durationMins = Math.round(diffMs / 60000);
    const hours = Math.floor(durationMins / 60);
    const mins = durationMins % 60;

    try {
      const completedSession = await JacClient.spawnWalker('clock_out_teacher', {
        sessionId: currentSession.id,
        teacherId: user.id,
        clockOut: now.toISOString(),
        clockOutTime: now.toLocaleTimeString(),
        duration: `${hours}h ${mins}m`,
        durationMinutes: durationMins,
        sendNotification: true,
        notifySupervisor: true,
        updateTPAD: true
      });

      if (completedSession) {
        setCurrentSession(null);
        setSuccess(`✓ Clocked out at ${now.toLocaleTimeString()}. Attendance synced to TPAD.`);
        setTimeout(() => setSuccess(null), 3000);
        await loadAttendanceLogs();
      }
    } catch (e) {
      console.error('Clock out failed:', e);
      setError(`Failed to clock out: ${e.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const getSessionDuration = () => {
    if (!currentSession) return '0:00:00';
    const start = new Date(currentSession.clockIn);
    const now = currentTime;
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100">
      <div className="max-w-5xl mx-auto p-6 space-y-6 pb-20">

        {success && (
          <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 px-6 py-5 rounded-3xl flex items-center justify-between shadow-lg animate-slideDown">
            <div className="flex items-center gap-4">
              <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-bold">{success}</span>
            </div>
            <button onClick={() => setSuccess(null)}>
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 px-6 py-5 rounded-3xl flex items-center justify-between shadow-lg animate-slideDown">
            <div className="flex items-center gap-4">
              <svg className="w-6 h-6 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-bold text-sm">{error}</span>
            </div>
            <button onClick={() => setError(null)}>
              <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="bg-white rounded-[40px] shadow-xl border-2 border-slate-200 p-10 text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-3 uppercase tracking-wide">Teacher Attendance Clock</h2>
          <p className="text-slate-600 mb-8 font-medium">Track your lesson delivery time. Automatically syncs to supervisor & TPAD.</p>

          <div className="mb-8">
            <div className="text-6xl font-mono font-black text-slate-900 mb-2">
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="text-sm text-slate-500 font-bold">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {currentSession && (
            <div className="mb-8 p-6 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-3xl border-2 border-emerald-300">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-900 font-black uppercase text-sm tracking-wide">Active Session</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-500 mb-1">Subject</p>
                  <p className="font-black text-slate-900">{currentSession.subject}</p>
                </div>
                <div className="bg-white rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-500 mb-1">Class</p>
                  <p className="font-black text-slate-900">{currentSession.class}</p>
                </div>
                <div className="bg-white rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-500 mb-1">Period</p>
                  <p className="font-black text-slate-900">{currentSession.period}</p>
                </div>
                <div className="bg-white rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-500 mb-1">Started</p>
                  <p className="font-black text-slate-900">{currentSession.clockInTime}</p>
                </div>
              </div>
              {currentSession.topic && (
                <div className="bg-white rounded-2xl p-4 mb-4">
                  <p className="text-xs font-bold text-slate-500 mb-1">Topic</p>
                  <p className="font-black text-slate-900">{currentSession.topic}</p>
                </div>
              )}
              <div className="text-4xl font-mono font-black text-emerald-700">
                {getSessionDuration()}
              </div>
              <p className="text-xs text-emerald-600 font-bold mt-2">Session Duration</p>
            </div>
          )}

          <div className="flex justify-center gap-4">
            {!currentSession ? (
              <button
                onClick={() => setShowLessonForm(true)}
                disabled={loading}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black py-5 px-16 rounded-3xl shadow-2xl shadow-emerald-600/40 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed uppercase text-lg tracking-wide"
              >
                🕐 Clock In
              </button>
            ) : (
              <button
                onClick={handleClockOut}
                disabled={loading}
                className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-black py-5 px-16 rounded-3xl shadow-2xl shadow-rose-600/40 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed uppercase text-lg tracking-wide"
              >
                {loading ? 'Processing...' : '⏹ Clock Out'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-xl border-2 border-slate-200 overflow-hidden">
          <div className="p-8 border-b-2 border-slate-200 bg-slate-50">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wide">Attendance History</h3>
            <p className="text-sm text-slate-600 mt-1">Your recent lesson attendance records</p>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0">
                <tr>
                  <th className="px-8 py-5 font-black text-slate-600 uppercase text-xs tracking-wide">Date</th>
                  <th className="px-8 py-5 font-black text-slate-600 uppercase text-xs tracking-wide">Subject</th>
                  <th className="px-8 py-5 font-black text-slate-600 uppercase text-xs tracking-wide">Class</th>
                  <th className="px-8 py-5 font-black text-slate-600 uppercase text-xs tracking-wide">Period</th>
                  <th className="px-8 py-5 font-black text-slate-600 uppercase text-xs tracking-wide">Clock In</th>
                  <th className="px-8 py-5 font-black text-slate-600 uppercase text-xs tracking-wide">Clock Out</th>
                  <th className="px-8 py-5 font-black text-slate-600 uppercase text-xs tracking-wide">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-20 text-center">
                      <svg className="w-24 h-24 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-slate-700 font-black text-lg">No Attendance Records</p>
                      <p className="text-slate-500 text-sm mt-1">Clock in to start tracking your lessons</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5 font-bold text-slate-900">{log.date}</td>
                      <td className="px-8 py-5 font-bold text-indigo-600">{log.subject}</td>
                      <td className="px-8 py-5 text-slate-700 font-medium">{log.class}</td>
                      <td className="px-8 py-5 text-slate-700 font-medium">{log.period}</td>
                      <td className="px-8 py-5 text-slate-700 font-medium">{log.clockInTime}</td>
                      <td className="px-8 py-5 text-slate-700 font-medium">{log.clockOutTime || '-'}</td>
                      <td className="px-8 py-5">
                        {log.duration ? (
                          <span className="font-black text-emerald-600">{log.duration}</span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-amber-600 font-bold">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                            In Progress
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showLessonForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-10 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
              <h3 className="text-3xl font-black mb-2">Lesson Details</h3>
              <p className="text-indigo-200 font-medium">Please provide lesson information before clocking in</p>
            </div>
            <div className="p-10 space-y-6">
              <div>
                <label className="block text-sm font-black text-slate-700 uppercase tracking-wide mb-3">Subject *</label>
                <input
                  type="text"
                  value={lessonDetails.subject}
                  onChange={(e) => setLessonDetails({ ...lessonDetails, subject: e.target.value })}
                  placeholder="e.g., Mathematics"
                  className="w-full border-2 border-slate-200 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 uppercase tracking-wide mb-3">Class *</label>
                <input
                  type="text"
                  value={lessonDetails.class}
                  onChange={(e) => setLessonDetails({ ...lessonDetails, class: e.target.value })}
                  placeholder="e.g., Grade 8A"
                  className="w-full border-2 border-slate-200 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 uppercase tracking-wide mb-3">Period *</label>
                <input
                  type="text"
                  value={lessonDetails.period}
                  onChange={(e) => setLessonDetails({ ...lessonDetails, period: e.target.value })}
                  placeholder="e.g., Period 1"
                  className="w-full border-2 border-slate-200 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 uppercase tracking-wide mb-3">Topic (Optional)</label>
                <input
                  type="text"
                  value={lessonDetails.topic}
                  onChange={(e) => setLessonDetails({ ...lessonDetails, topic: e.target.value })}
                  placeholder="e.g., Algebra - Linear Equations"
                  className="w-full border-2 border-slate-200 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                />
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  onClick={() => {
                    setShowLessonForm(false);
                    setLessonDetails({ subject: '', class: '', period: '', topic: '' });
                  }}
                  className="flex-1 py-4 px-6 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClockIn}
                  disabled={loading || !lessonDetails.subject || !lessonDetails.period}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black py-4 px-6 rounded-2xl uppercase text-sm tracking-wide shadow-xl shadow-emerald-600/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Clocking In...' : 'Clock In Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-slideDown {
          animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};

// wrapper with mock user
const App = () => {
  const mockUser = {
    id: 'teacher_001',
    name: 'Ms. Jane Kariuki',
    email: 'jane.kariuki@school.ac.ke',
    role: 'teacher',
    tscNumber: 'TSC123456'
  };

  return <AttendanceTracker user={mockUser} />;
};

export default App;