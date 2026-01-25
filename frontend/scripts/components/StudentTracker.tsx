import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const JacClient = {
  spawnWalker: async (walker, params) => {
    try {
      const response = await fetch(`${API_BASE}/walker/${walker}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Request failed: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.detail || errorMsg;
        } catch {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`API Error (${walker}):`, error);
      throw error;
    }
  }
};

const StudentTracker = ({ user }) => {
  const [students, setStudents] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dailySummaries, setDailySummaries] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [aiStrategy, setAiStrategy] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  const [lessonForm, setLessonForm] = useState({
    period: '',
    class: '',
    stream: '',
    subject: '',
    strand: '',
    objectives: ''
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  // Scroll detection effect
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollButtons(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll functions
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  const defaultUser = user || {
    id: 'teacher_001',
    name: 'John Kamau',
    email: 'jkamau@school.edu',
    role: 'teacher',
    tscNumber: 'TSC-123456'
  };

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const studentData = await JacClient.spawnWalker('get_all_students', {
        userId: defaultUser.id,
        teacherId: defaultUser.id
      });
      setStudents(studentData || []);

      const summaryData = await JacClient.spawnWalker('get_daily_summaries', {
        userId: defaultUser.id,
        teacherId: defaultUser.id
      });
      setDailySummaries(summaryData || []);

      const insightData = await JacClient.spawnWalker('get_class_insights', {
        userId: defaultUser.id,
        teacherId: defaultUser.id
      });
      setInsights(insightData || { totalStudents: 0, averageAttendance: 0, averagePerformance: 0 });

    } catch (e) {
      console.error("Failed to load data:", e);
      if (!silent) {
        setError(`Backend connection failed: ${e.message}`);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleRunAI = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const data = await JacClient.spawnWalker('generate_pedagogical_strategy', {
        userId: defaultUser.id,
        teacherId: defaultUser.id,
        students: students,
        classInsights: insights
      });

      if (data && data.strategy) {
        setAiStrategy(data.strategy);
        setSuccess("✓ AI analysis completed!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (e) {
      console.error("AI analysis failed:", e);
      setError(`AI generation failed: ${e.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartLesson = () => {
    if (!lessonForm.subject || !lessonForm.period) {
      setError("Subject and Period are required");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (students.length === 0) {
      setError("No students enrolled. Add students in Admin Panel first.");
      setTimeout(() => setError(null), 4000);
      return;
    }

    const lesson = {
      id: `lesson_${Date.now()}`,
      teacher: defaultUser.name,
      teacherId: defaultUser.id,
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toISOString(),
      ...lessonForm
    };

    setCurrentLesson(lesson);
    setAttendanceRecords([]);
    setShowAttendanceModal(true);
  };

  const handleMarkAttendance = (student) => {
    const alreadyMarked = attendanceRecords.some(r => r.studentId === student.id);

    if (alreadyMarked) {
      setAttendanceRecords(prev => prev.filter(r => r.studentId !== student.id));
      return;
    }

    const record = {
      id: `${Date.now()}_${student.id}`,
      studentId: student.id,
      studentName: student.name,
      date: currentLesson.date,
      subject: currentLesson.subject,
      period: currentLesson.period,
      status: 'present',
      lessonId: currentLesson.id,
      teacherId: defaultUser.id
    };

    setAttendanceRecords(prev => [...prev, record]);
  };

  const handleClockOut = async () => {
    if (attendanceRecords.length === 0) {
      setError("Mark at least one student present");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const presentCount = attendanceRecords.length;
    const totalCount = students.length;
    const attendanceRate = Math.round((presentCount / totalCount) * 100);
    const averageLessonScore = attendanceRate > 80 ? 85 : attendanceRate > 60 ? 70 : 60;

    const summary = {
      id: `summary_${Date.now()}`,
      date: currentLesson.date,
      subject: currentLesson.subject,
      period: currentLesson.period,
      class: currentLesson.class,
      stream: currentLesson.stream,
      strand: currentLesson.strand,
      objectives: currentLesson.objectives,
      totalStudents: totalCount,
      presentStudents: presentCount,
      absentStudents: totalCount - presentCount,
      attendanceRate: attendanceRate,
      averageLessonScore: averageLessonScore,
      averageParticipation: attendanceRate,
      teacherId: defaultUser.id,
      teacherName: defaultUser.name,
      lessonId: currentLesson.id,
      startTime: currentLesson.startTime,
      endTime: new Date().toISOString(),
      attendanceRecords: attendanceRecords,
      autoPopulateToTPAD: true
    };

    setLoading(true);
    setError(null);

    try {
      await JacClient.spawnWalker('save_daily_summary', summary);

      setDailySummaries(prev => [summary, ...prev]);
      setSuccess('✓ Lesson saved and synced to TPAD!');
      setTimeout(() => setSuccess(null), 3000);

      const newInsights = await JacClient.spawnWalker('get_class_insights', {
        userId: defaultUser.id,
        teacherId: defaultUser.id
      });
      setInsights(newInsights);

      setCurrentLesson(null);
      setShowAttendanceModal(false);
      setAttendanceRecords([]);
      setLessonForm({ period: '', class: '', stream: '', subject: '', strand: '', objectives: '' });

      await loadData(true);

    } catch (e) {
      console.error("Failed to save summary:", e);
      setError(`Save failed: ${e.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  if (loading && students.length === 0 && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-700 font-black text-xl mb-2">Loading StudentTracker</p>
          <p className="text-slate-500">Connecting to backend...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 relative overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6 pb-32">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg border-2 border-emerald-200">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-black text-slate-700 uppercase">Live • Auto-sync every 5s</span>
          </div>
          <button
            onClick={() => loadData()}
            className="px-4 py-2 bg-white hover:bg-slate-50 rounded-full shadow-lg border-2 border-slate-200 transition-all"
            title="Refresh data"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {success && (
          <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 px-6 py-5 rounded-3xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-bold">{success}</span>
            </div>
            <button onClick={() => setSuccess(null)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 px-6 py-5 rounded-3xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-bold text-sm">{error}</span>
            </div>
            <button onClick={() => setError(null)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* AI Analytics */}
        <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 rounded-[40px] p-10 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <div className="inline-block px-4 py-1.5 bg-emerald-500/20 rounded-full text-xs font-black text-emerald-400 uppercase mb-3">
                🤖 AI Intelligence Centre
              </div>
              <h3 className="text-3xl font-black text-white mb-2">Learner Analytics Engine</h3>
              <p className="text-slate-400">Real-time AI-powered classroom insights & TPAD integration</p>
            </div>
            <button
              onClick={handleRunAI}
              disabled={isAnalyzing || students.length === 0 || dailySummaries.length === 0}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black uppercase text-xs rounded-2xl shadow-xl disabled:opacity-50 transition-all"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </span>
              ) : (
                '🚀 Generate AI Insights'
              )}
            </button>
          </div>
          {aiStrategy ? (
            <div className="bg-white/5 backdrop-blur p-8 rounded-3xl border border-white/10 text-indigo-50 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">
              {aiStrategy}
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur p-8 rounded-3xl border border-white/10 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p className="font-bold mb-2 text-white">No AI Insights Yet</p>
              <p className="text-sm text-indigo-400">Complete lessons and click "Generate AI Insights"</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-3 bg-white p-3 rounded-3xl shadow-lg border-2 border-slate-200">
          {['overview', 'summaries'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 px-6 rounded-2xl font-black uppercase text-xs transition-all ${activeTab === tab
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-xl'
                : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              {tab === 'overview' ? '📊 Overview' : '📝 Lesson History'}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* Lesson Form */}
            <div className="bg-white p-10 rounded-[40px] shadow-xl border-2 border-slate-200">
              <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase">🎓 Initialize Lesson Session</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Period (e.g., Period 1) *"
                  value={lessonForm.period}
                  onChange={e => setLessonForm({ ...lessonForm, period: e.target.value })}
                  className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold text-sm"
                />
                <input
                  type="text"
                  placeholder="Subject *"
                  value={lessonForm.subject}
                  onChange={e => setLessonForm({ ...lessonForm, subject: e.target.value })}
                  className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold text-sm"
                />
                <input
                  type="text"
                  placeholder="Class (e.g., Grade 8)"
                  value={lessonForm.class}
                  onChange={e => setLessonForm({ ...lessonForm, class: e.target.value })}
                  className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold text-sm"
                />
                <input
                  type="text"
                  placeholder="Stream (Optional)"
                  value={lessonForm.stream}
                  onChange={e => setLessonForm({ ...lessonForm, stream: e.target.value })}
                  className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold text-sm"
                />
                <input
                  type="text"
                  placeholder="Strand/Topic"
                  value={lessonForm.strand}
                  onChange={e => setLessonForm({ ...lessonForm, strand: e.target.value })}
                  className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold text-sm"
                />
                <input
                  type="text"
                  placeholder="Learning Objectives"
                  value={lessonForm.objectives}
                  onChange={e => setLessonForm({ ...lessonForm, objectives: e.target.value })}
                  className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold text-sm"
                />
              </div>
              <button
                onClick={handleStartLesson}
                disabled={!lessonForm.subject || !lessonForm.period || students.length === 0}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-5 rounded-3xl font-black uppercase text-sm shadow-2xl transition-all disabled:opacity-50"
              >
                🚀 Start Lesson & Track Attendance
              </button>
              {students.length === 0 && (
                <p className="text-amber-600 text-sm font-bold mt-3 text-center">
                  ⚠️ No students enrolled. Run: <code className="bg-amber-100 px-2 py-1 rounded">curl -X POST {API_BASE}/walker/add_sample_data</code>
                </p>
              )}
            </div>

            {/* Insights Cards */}
            {insights && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-3xl p-8 border-2 border-indigo-200">
                  <p className="text-xs font-black text-indigo-600 uppercase mb-2">Total Students</p>
                  <p className="text-5xl font-black text-indigo-900">{insights.totalStudents}</p>
                  <p className="text-sm text-indigo-700 mt-2">Enrolled & Active</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl p-8 border-2 border-emerald-200">
                  <p className="text-xs font-black text-emerald-600 uppercase mb-2">Avg Performance</p>
                  <p className="text-5xl font-black text-emerald-900">{insights.averagePerformance}%</p>
                  <p className="text-sm text-emerald-700 mt-2">Updates after each lesson</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-3xl p-8 border-2 border-amber-200">
                  <p className="text-xs font-black text-amber-600 uppercase mb-2">Lessons Taught</p>
                  <p className="text-5xl font-black text-amber-900">{dailySummaries.length}</p>
                  <p className="text-sm text-amber-700 mt-2">Synced to TPAD</p>
                </div>
              </div>
            )}

            {/* Student Roster */}
            <div className="bg-white rounded-[40px] shadow-xl border-2 border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-8 py-6 border-b-2 border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-xl text-slate-900 uppercase">👥 Student Roster</h3>
                  <p className="text-sm text-slate-600 mt-1">Performance updates live after each lesson</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-indigo-600">{students.length}</p>
                  <p className="text-xs text-slate-500 uppercase font-bold">Students</p>
                </div>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-8 py-5 text-left text-xs font-black text-slate-600 uppercase">#</th>
                      <th className="px-8 py-5 text-left text-xs font-black text-slate-600 uppercase">Student Name</th>
                      <th className="px-8 py-5 text-left text-xs font-black text-slate-600 uppercase">Admission No.</th>
                      <th className="px-8 py-5 text-center text-xs font-black text-slate-600 uppercase">Attendance</th>
                      <th className="px-8 py-5 text-center text-xs font-black text-slate-600 uppercase">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <svg className="w-24 h-24 mx-auto mb-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <p className="text-slate-700 font-black text-xl mb-2">No Students Enrolled</p>
                          <p className="text-slate-500 mb-4">Run add_sample_data to populate students</p>
                          <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                            Auto-syncing every 5 seconds
                          </div>
                        </td>
                      </tr>
                    ) : (
                      students.map((student, index) => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-5 font-bold text-slate-700">{index + 1}</td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center font-black text-indigo-700 text-lg">
                                {student.name.charAt(0)}
                              </div>
                              <span className="font-black text-slate-900 text-lg">{student.name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-slate-600 font-bold font-mono">{student.admissionNumber}</td>
                          <td className="px-8 py-5 text-center">
                            <span className={`text-lg font-black ${student.attendanceRate >= 90 ? 'text-emerald-600' :
                              student.attendanceRate >= 75 ? 'text-amber-600' : 'text-rose-600'
                              }`}>
                              {student.attendanceRate || 0}%
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className={`text-2xl font-black ${student.overallPerformance >= 80 ? 'text-emerald-600' :
                              student.overallPerformance >= 60 ? 'text-amber-600' : 'text-rose-600'
                              }`}>
                              {student.overallPerformance || 0}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'summaries' && (
          <div className="bg-white p-8 rounded-[40px] border-2 border-slate-200">
            <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase">📝 Lesson History & TPAD Integration</h3>
            {dailySummaries.length === 0 ? (
              <div className="text-center py-20">
                <svg className="w-32 h-32 mx-auto mb-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-700 font-black text-xl mb-2">No Lessons Recorded</p>
                <p className="text-slate-500">Start and complete lessons to see their history here</p>
              </div>
            ) : (
              <div className="grid gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {dailySummaries.map((summary, index) => (
                  <div key={index} className="p-8 bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-3xl border-2 border-slate-200 hover:shadow-xl transition-shadow">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="text-2xl font-black text-slate-900">{summary.subject}</h4>
                        <p className="text-slate-600 font-bold mt-1">{summary.period} • {summary.class} {summary.stream}</p>
                        <p className="text-sm text-slate-500 mt-2">{summary.date}</p>
                        {summary.strand && (
                          <p className="text-sm text-indigo-600 font-bold mt-1">Strand: {summary.strand}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`inline-block px-4 py-2 rounded-full text-xs font-black mb-2 ${summary.attendanceRate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                          summary.attendanceRate >= 60 ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                          {summary.attendanceRate}% Attendance
                        </div>
                        <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                          ✓ Synced to TPAD
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-white rounded-2xl">
                        <p className="text-sm text-slate-500 font-bold mb-1">Present</p>
                        <p className="text-3xl font-black text-emerald-600">{summary.presentStudents}</p>
                      </div>
                      <div className="text-center p-4 bg-white rounded-2xl">
                        <p className="text-sm text-slate-500 font-bold mb-1">Absent</p>
                        <p className="text-3xl font-black text-rose-600">{summary.absentStudents}</p>
                      </div>
                      <div className="text-center p-4 bg-white rounded-2xl">
                        <p className="text-sm text-slate-500 font-bold mb-1">Lesson Score</p>
                        <p className="text-3xl font-black text-indigo-600">{summary.averageLessonScore}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attendance Modal */}
      {showAttendanceModal && currentLesson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[40px] max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-6 rounded-t-[40px] z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-white mb-2">✓ Mark Attendance</h3>
                  <p className="text-indigo-100">{currentLesson.subject} • {currentLesson.period}</p>
                  <p className="text-sm text-indigo-200 mt-1">{currentLesson.class} {currentLesson.stream}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAttendanceModal(false);
                    setCurrentLesson(null);
                    setAttendanceRecords([]);
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-3xl p-6 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-indigo-600 uppercase mb-1">Attendance Progress</p>
                    <p className="text-3xl font-black text-indigo-900">
                      {attendanceRecords.length} / {students.length}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-600 uppercase mb-1">Rate</p>
                    <p className="text-3xl font-black text-indigo-900">
                      {students.length > 0 ? Math.round((attendanceRecords.length / students.length) * 100) : 0}%
                    </p>
                  </div>
                </div>
                <div className="mt-4 bg-white rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${students.length > 0 ? (attendanceRecords.length / students.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {students.map(student => {
                  const isPresent = attendanceRecords.some(r => r.studentId === student.id);
                  return (
                    <button
                      key={student.id}
                      onClick={() => handleMarkAttendance(student)}
                      className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all ${isPresent
                        ? 'bg-emerald-50 border-emerald-500 shadow-md'
                        : 'bg-white border-slate-200 hover:border-indigo-300'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isPresent ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                          {student.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className={`font-black ${isPresent ? 'text-emerald-900' : 'text-slate-900'}`}>{student.name}</p>
                          <p className="text-xs font-bold text-slate-500">{student.admissionNumber}</p>
                        </div>
                      </div>
                      {isPresent && (
                        <div className="bg-emerald-500 text-white p-1 rounded-full">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleClockOut}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-5 rounded-3xl font-black uppercase text-sm shadow-2xl transition-all"
              >
                🏁 End Lesson & Sync to TPAD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Scroll Controls */}
      {showScrollButtons && (
        <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-40">
          <button
            onClick={scrollToTop}
            className="p-4 bg-white/90 backdrop-blur shadow-2xl rounded-2xl border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all group"
            title="Scroll to Top"
          >
            <svg className="w-6 h-6 transform group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={scrollToBottom}
            className="p-4 bg-white/90 backdrop-blur shadow-2xl rounded-2xl border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all group"
            title="Scroll to Bottom"
          >
            <svg className="w-6 h-6 transform group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentTracker;