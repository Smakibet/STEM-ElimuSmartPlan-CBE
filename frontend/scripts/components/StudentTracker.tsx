import React, { useState, useEffect } from 'react';
import { JacClient } from '../../services/jacService';
import { generatePedagogicalStrategy } from '../../services/geminiService';
import { Student, User, ClassInsights } from '../../types';

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  time: string;
  lessonPeriod: string;
  class: string;
  stream: string;
  pathway: string;
  subject: string;
  teacher: string;
  strand: string;
  subStrand: string;
  objectives: string[];
  loginMethod: 'manual' | 'fingerprint';
  status: 'present' | 'absent' | 'late';
}

interface ParticipationRecord {
  id: string;
  studentId: string;
  studentName: string;
  attendanceId: string;
  lessonDate: string;
  questionAnswered: number;
  contributions: number;
  engagement: 'high' | 'medium' | 'low';
  individualizedQuestions: string[];
  lessonScore: number;
  clockOutTime?: string;
}

interface DailySummary {
  date: string;
  subject: string;
  class: string;
  totalStudents: number;
  presentStudents: number;
  averageParticipation: number;
  averageLessonScore: number;
  teacherId: string;
  teacherName: string;
}

interface StudentTrackerProps {
  user: User;
}

const StudentTracker: React.FC<StudentTrackerProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [insights, setInsights] = useState<ClassInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<string | null>(null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Attendance & Participation States
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showParticipationTracker, setShowParticipationTracker] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [participationRecords, setParticipationRecords] = useState<ParticipationRecord[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'participation' | 'summaries'>('overview');

  // Lesson form state
  const [lessonForm, setLessonForm] = useState({
    period: '',
    class: '',
    stream: '',
    pathway: '',
    subject: '',
    strand: '',
    subStrand: '',
    objectives: ''
  });

  useEffect(() => {
    loadData();
    loadAttendanceData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await JacClient.spawnWalker('get_all_students', {}, user);
      if (data && Array.isArray(data)) {
        setStudents(data as Student[]);
      } else {
        setStudents([]);
      }

      const insightData = await JacClient.spawnWalker('get_class_insights', {}, user);
      if (insightData) {
        setInsights(insightData as ClassInsights);
      }
    } catch (e) {
      console.error("Failed to load students and insights:", e);
      setError("Failed to load data from server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceData = async () => {
    try {
      const attendance = await JacClient.spawnWalker('get_attendance_records', {}, user);
      const participation = await JacClient.spawnWalker('get_participation_records', {}, user);
      const summaries = await JacClient.spawnWalker('get_daily_summaries', {}, user);

      if (attendance && Array.isArray(attendance)) setAttendanceRecords(attendance);
      if (participation && Array.isArray(participation)) setParticipationRecords(participation);
      if (summaries && Array.isArray(summaries)) setDailySummaries(summaries);
    } catch (e) {
      console.error("Failed to load attendance data:", e);
    }
  };

  const handleStartLesson = () => {
    if (!lessonForm.period || !lessonForm.subject || !lessonForm.strand) {
      alert("Please fill all required lesson details (Period, Subject, Strand)");
      return;
    }

    const lesson = {
      id: crypto.randomUUID(),
      teacher: user.name,
      teacherId: user.id || user.email,
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
      ...lessonForm,
      objectives: lessonForm.objectives.split(',').map(o => o.trim()).filter(o => o),
      status: 'active'
    };

    setCurrentLesson(lesson);
    setShowAttendanceModal(true);
  };

  const handleMarkAttendance = async (student: Student, method: 'manual' | 'fingerprint') => {
    if (!currentLesson) return;

    const attendanceRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      studentId: student.id,
      studentName: student.name,
      date: currentLesson.date,
      time: new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
      lessonPeriod: currentLesson.period,
      class: currentLesson.class,
      stream: currentLesson.stream,
      pathway: currentLesson.pathway,
      subject: currentLesson.subject,
      teacher: currentLesson.teacher,
      strand: currentLesson.strand,
      subStrand: currentLesson.subStrand,
      objectives: currentLesson.objectives,
      loginMethod: method,
      status: 'present'
    };

    setAttendanceRecords(prev => [...prev, attendanceRecord]);

    // Save to backend/graph
    try {
      await JacClient.spawnWalker('record_attendance', attendanceRecord, user);
    } catch (error) {
      console.error("Failed to save attendance:", error);
    }

    // Create participation record
    const participationRecord: ParticipationRecord = {
      id: crypto.randomUUID(),
      studentId: student.id,
      studentName: student.name,
      attendanceId: attendanceRecord.id,
      lessonDate: currentLesson.date,
      questionAnswered: 0,
      contributions: 0,
      engagement: 'low',
      individualizedQuestions: [],
      lessonScore: 0
    };

    setParticipationRecords(prev => [...prev, participationRecord]);
  };

  const handleRecordParticipation = async (studentId: string, action: 'question' | 'contribution') => {
    setParticipationRecords(prev => prev.map(record => {
      if (record.studentId === studentId && !record.clockOutTime) {
        const updated = { ...record };
        if (action === 'question') updated.questionAnswered += 1;
        if (action === 'contribution') updated.contributions += 1;

        const totalActivity = updated.questionAnswered + updated.contributions;
        updated.engagement = totalActivity >= 5 ? 'high' : totalActivity >= 2 ? 'medium' : 'low';

        return updated;
      }
      return record;
    }));
  };

  const handleClockOut = async () => {
    if (!currentLesson) return;

    const clockOutTime = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

    const updatedParticipation = participationRecords.map(record => {
      if (!record.clockOutTime && record.lessonDate === currentLesson.date) {
        const totalActivity = record.questionAnswered + record.contributions;
        const lessonScore = Math.min(100, (totalActivity * 10) + (record.engagement === 'high' ? 20 : record.engagement === 'medium' ? 10 : 0));

        return {
          ...record,
          clockOutTime,
          lessonScore
        };
      }
      return record;
    });

    setParticipationRecords(updatedParticipation);

    const presentStudents = attendanceRecords.filter(
      r => r.date === currentLesson.date && r.subject === currentLesson.subject && r.status === 'present'
    ).length;

    const todayParticipation = updatedParticipation.filter(
      r => r.lessonDate === currentLesson.date
    );

    const averageParticipation = todayParticipation.reduce((sum, r) =>
      sum + r.questionAnswered + r.contributions, 0
    ) / (todayParticipation.length || 1);

    const averageLessonScore = todayParticipation.reduce((sum, r) =>
      sum + r.lessonScore, 0
    ) / (todayParticipation.length || 1);

    const summary: DailySummary = {
      date: currentLesson.date,
      subject: currentLesson.subject,
      class: currentLesson.class,
      totalStudents: students.length,
      presentStudents,
      averageParticipation,
      averageLessonScore,
      teacherId: currentLesson.teacherId,
      teacherName: currentLesson.teacher
    };

    setDailySummaries(prev => [...prev, summary]);

    try {
      await JacClient.spawnWalker('save_daily_summary', summary, user);
      await JacClient.spawnWalker('update_participation_records', updatedParticipation, user);
    } catch (error) {
      console.error("Failed to save lesson summary:", error);
    }

    setCurrentLesson(null);
    setShowAttendanceModal(false);
    setShowParticipationTracker(false);
    alert('Lesson ended successfully! All participation data recorded and saved for teacher appraisal.');
  };

  const handleDeepDive = async () => {
    if (!insights || students.length === 0) {
      alert("No data available for pedagogical analysis. Please ensure students are enrolled.");
      return;
    }

    setIsGeneratingStrategy(true);
    setError(null);
    try {
      const strategy = await generatePedagogicalStrategy(insights, students);
      setAiStrategy(strategy);
    } catch (error) {
      console.error("Strategy generation failed:", error);
      setError("Failed to generate pedagogical strategy. Please try again.");
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const downloadStrategy = () => {
    if (!aiStrategy) {
      alert("No strategy available to download");
      return;
    }

    const timestamp = new Date().toLocaleString('en-KE', {
      timeZone: 'Africa/Nairobi',
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const content = `STEM ElimuSmartPlan - SMACQX Technologies
AI PEDAGOGICAL STRATEGY REPORT
Generated: ${timestamp}
Educator: ${user.name} (${user.email})

====================================
MULTI-AGENT AI ANALYSIS
CBC/CBE ALIGNED RECOMMENDATIONS
====================================

${aiStrategy}

====================================
INSTITUTIONAL INTELLIGENCE NODE
Teacher: ${user.name}
Role: ${user.role}
System: Jaseci OSP Graph + Gemini GenAI
Platform: STEM ElimuSmartPlan by SMACQX Technologies
Contact: smacqxgrade@gmail.com
====================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `STEM_Pedagogical_Strategy_${new Date().toISOString().split('T')[0]}_${user.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const calculateTrendColor = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return 'text-emerald-400';
    if (trend === 'down') return 'text-rose-400';
    return 'text-slate-400';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Lab':
        return (
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
      case 'Quiz':
        return (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.grade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderAttendanceModal = () => {
    if (!showAttendanceModal || !currentLesson) return null;

    const presentStudents = attendanceRecords.filter(
      r => r.date === currentLesson.date && r.lessonPeriod === currentLesson.period
    );

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
          <div className="p-8 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-3xl shrink-0">
            <h3 className="font-black text-2xl mb-2">Attendance Registration - {currentLesson.subject}</h3>
            <p className="text-sm opacity-90">
              Period: {currentLesson.period} | Class: {currentLesson.class} {currentLesson.stream} |
              Strand: {currentLesson.strand} → {currentLesson.subStrand}
            </p>
            <p className="text-xs mt-2 opacity-75">Present: {presentStudents.length} / {students.length}</p>
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map(student => {
                const isPresent = presentStudents.some(r => r.studentId === student.id);
                return (
                  <div key={student.id} className={`p-4 rounded-xl border-2 transition-all ${isPresent ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.admissionNumber}</p>
                      </div>
                      {isPresent ? (
                        <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          ✓ Present
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMarkAttendance(student, 'manual')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all"
                          >
                            Manual
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(student, 'fingerprint')}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all"
                          >
                            👆 Scan
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center rounded-b-3xl shrink-0">
            <button
              onClick={() => setShowParticipationTracker(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
            >
              Start Lesson Tracking
            </button>
            <button
              onClick={handleClockOut}
              className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
            >
              Clock Out & Summarize
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderParticipationTracker = () => {
    if (!showParticipationTracker || !currentLesson) return null;

    const activeParticipation = participationRecords.filter(
      r => r.lessonDate === currentLesson.date && !r.clockOutTime
    );

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl">
          <div className="p-8 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-3xl shrink-0">
            <h3 className="font-black text-2xl mb-2">Live Participation Tracker</h3>
            <p className="text-sm opacity-90">{currentLesson.subject} - {currentLesson.strand}</p>
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeParticipation.map(record => {
                const student = students.find(s => s.id === record.studentId);
                if (!student) return null;

                return (
                  <div key={record.id} className="p-5 rounded-xl border-2 border-slate-200 bg-slate-50 hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-slate-800">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.admissionNumber}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${record.engagement === 'high' ? 'bg-emerald-100 text-emerald-700' :
                          record.engagement === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                        }`}>
                        {record.engagement.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Q&A:</span>
                        <span className="font-bold">{record.questionAnswered}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Contributions:</span>
                        <span className="font-bold">{record.contributions}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRecordParticipation(student.id, 'question')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        + Q&A
                      </button>
                      <button
                        onClick={() => handleRecordParticipation(student.id, 'contribution')}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        + Contrib
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end rounded-b-3xl shrink-0">
            <button
              onClick={() => setShowParticipationTracker(false)}
              className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
            >
              Close Tracker
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderInsightsDashboard = () => {
    if (!insights) return null;

    return (
      <div className="bg-[#0f172a] rounded-[40px] shadow-2xl overflow-hidden mb-8 border border-slate-800 flex flex-col shrink-0">
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 p-10 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/10 rounded-3xl backdrop-blur-xl border border-white/20 shadow-2xl">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-3xl font-black text-white tracking-tight lowercase">Intelligence Command Center</h3>
                <p className="text-indigo-200/60 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">
                  Powered by Jaseci OSP Graph & Gemini GenAI
                </p>
              </div>
            </div>
            <button
              onClick={handleDeepDive}
              disabled={isGeneratingStrategy || students.length === 0}
              className={`flex items-center gap-3 bg-[#10b981] hover:bg-[#059669] text-white font-black uppercase text-xs tracking-widest py-4 px-10 rounded-[24px] transition-all shadow-2xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isGeneratingStrategy ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Traversing Graph...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Pedagogical Deep Dive
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar max-h-[500px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Knowledge Gaps Card */}
            <div className="bg-slate-800/40 p-8 rounded-[32px] border border-slate-700/50 backdrop-blur-sm">
              <h4 className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] mb-6">
                Class-wide Knowledge Gaps
              </h4>
              <div className="space-y-6">
                {insights.commonGaps && insights.commonGaps.length > 0 ? (
                  insights.commonGaps.map((gap, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-indigo-50 text-sm font-black">{gap.gap}</span>
                        <span className="text-emerald-400 font-black text-sm">{gap.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${gap.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm">No gaps identified yet</p>
                )}
              </div>
            </div>

            {/* Declining Skills Card */}
            <div className="bg-slate-800/40 p-8 rounded-[32px] border border-slate-700/50 backdrop-blur-sm">
              <h4 className="text-rose-400 font-black text-[10px] uppercase tracking-[0.3em] mb-6">
                At-Risk Skill Progress
              </h4>
              <div className="space-y-4">
                {insights.decliningSkills && insights.decliningSkills.length > 0 ? (
                  insights.decliningSkills.map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="bg-rose-500/10 text-rose-400 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-rose-500/20">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-100 tracking-tight">{item.skill}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          Declining for {item.studentCount} students
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm">No declining skills detected</p>
                )}
              </div>
            </div>

            {/* Recommendations Card */}
            <div className="bg-slate-800/40 p-8 rounded-[32px] border border-slate-700/50 backdrop-blur-sm">
              <h4 className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] mb-6">
                CBC Recommended Actions
              </h4>
              <div className="space-y-3">
                {insights.recommendedInterventions && insights.recommendedInterventions.length > 0 ? (
                  insights.recommendedInterventions.slice(0, 3).map((rec, i) => (
                    <div key={i} className="flex gap-4 text-xs text-indigo-50/80 leading-relaxed bg-indigo-950/30 p-4 rounded-2xl border border-indigo-500/10 font-medium">
                      <span className="text-emerald-400">●</span>
                      {rec}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm">No specific recommendations yet</p>
                )}
              </div>
            </div>
          </div>

          {/* AI Strategy Display */}
          {aiStrategy && (
            <div className="mt-4 bg-emerald-500/5 border border-emerald-500/10 rounded-[40px] p-10 relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500 p-2.5 rounded-2xl text-white shadow-2xl shadow-emerald-500/40">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-emerald-400 tracking-tighter lowercase">
                      Gemini Reasoning Node
                    </h4>
                    <p className="text-xs text-emerald-300/60 font-bold uppercase tracking-wider mt-1">
                      Multi-Agent CBC Analysis
                    </p>
                  </div>
                </div>
                <button
                  onClick={downloadStrategy}
                  className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black uppercase text-[10px] tracking-widest py-3 px-6 rounded-xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                >
                  📥 Download Report
                </button>
              </div>

              <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-4 border-l-4 border-emerald-500/20 pl-8 py-2 bg-slate-900/40 rounded-2xl">
                <div className="text-emerald-50/80 text-base leading-relaxed whitespace-pre-wrap font-medium">
                  {aiStrategy}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    📊 Confidence Score: 0.98 | Graph Traversal Complete
                  </span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    🎓 CBC Context Applied | Teacher: {user.name}
                  </span>
                </div>
                <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">
                  SMACQX STEM ElimuSmartPlan
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSummariesTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <h3 className="font-black text-2xl text-slate-900 mb-6">Daily Summaries - Teacher Appraisal Data</h3>

        <div className="space-y-4">
          {dailySummaries.length > 0 ? (
            dailySummaries.map((summary, idx) => (
              <div key={idx} className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Date & Subject</p>
                    <p className="font-bold text-slate-800">{summary.date}</p>
                    <p className="text-sm text-indigo-600">{summary.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Attendance</p>
                    <p className="font-bold text-2xl text-emerald-600">{summary.presentStudents}/{summary.totalStudents}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Avg Participation</p>
                    <p className="font-bold text-2xl text-blue-600">{summary.averageParticipation.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Avg Lesson Score</p>
                    <p className="font-bold text-2xl text-purple-600">{summary.averageLessonScore.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm font-medium">No summaries available yet. Complete a lesson to see data.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Individual Student Detail View
  if (selectedStudent) {
    const studentAttendance = attendanceRecords.filter(r => r.studentId === selectedStudent.id);
    const studentParticipation = participationRecords.filter(r => r.studentId === selectedStudent.id);

    return (
      <div className="h-full flex flex-col min-h-0 px-2 overflow-hidden">
        <div className="flex-shrink-0 mb-6">
          <button
            onClick={() => setSelectedStudent(null)}
            className="flex items-center text-slate-400 hover:text-slate-800 font-black uppercase text-[10px] tracking-widest group transition-colors"
          >
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Class Overview
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-8 pb-10">
          {/* Student Header Card */}
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
            <div className="flex items-center gap-8">
              <div className="w-24 h-24 rounded-[32px] bg-indigo-600 text-white flex items-center justify-center text-4xl font-black shadow-2xl shadow-indigo-600/30">
                {selectedStudent.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
                  {selectedStudent.name}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                    {selectedStudent.grade}
                  </span>
                  <span className="text-indigo-600 font-black uppercase text-[10px] tracking-widest">
                    {selectedStudent.admissionNumber}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-12 px-10 border-l border-slate-50">
              <div className="text-center">
                <span className="block text-5xl font-black text-emerald-600 tracking-tighter">
                  {selectedStudent.overallPerformance}%
                </span>
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2 block">
                  Mastery Score
                </span>
              </div>
              <div className="text-center">
                <span className="block text-5xl font-black text-blue-600 tracking-tighter">
                  {selectedStudent.attendanceRate}%
                </span>
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2 block">
                  Attendance
                </span>
              </div>
            </div>
          </div>

          {/* Attendance and Participation Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="font-black text-xl text-slate-900 mb-6">Attendance History</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {studentAttendance.length > 0 ? (
                  studentAttendance.slice(0, 10).map(record => (
                    <div key={record.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-800">{record.subject}</p>
                          <p className="text-xs text-slate-500">{record.date} | {record.time}</p>
                          <p className="text-xs text-slate-400 mt-1">{record.strand} → {record.subStrand}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${record.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                          {record.loginMethod === 'fingerprint' ? '👆' : '✍️'} {record.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">No attendance records yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="font-black text-xl text-slate-900 mb-6">Participation Analytics</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {studentParticipation.length > 0 ? (
                  studentParticipation.slice(0, 10).map(record => (
                    <div key={record.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-start mb-3">
                        <p className="text-sm font-bold text-slate-800">{record.lessonDate}</p>
                        <span className="text-2xl font-black text-indigo-600">{record.lessonScore}%</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <p className="font-bold text-blue-700">{record.questionAnswered}</p>
                          <p className="text-blue-600">Q&A</p>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <p className="font-bold text-purple-700">{record.contributions}</p>
                          <p className="text-purple-600">Contrib</p>
                        </div>
                        <div className="text-center p-2 bg-emerald-50 rounded">
                          <p className="font-bold text-emerald-700 uppercase">{record.engagement}</p>
                          <p className="text-emerald-600">Level</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">No participation records yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Skills Matrix */}
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
            <h3 className="font-black text-xl text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-tighter">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              CBC Skill Matrix
            </h3>
            <div className="space-y-8">
              {selectedStudent.skills && selectedStudent.skills.length > 0 ? (
                selectedStudent.skills.map(skill => (
                  <div key={skill.id} className="group">
                    <div className="flex justify-between items-end mb-3">
                      <span className="font-black text-slate-700 uppercase text-xs tracking-tight group-hover:text-indigo-600 transition-colors">
                        {skill.name}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className={`text-[9px] font-black flex items-center gap-1 ${calculateTrendColor(skill.trend)} bg-slate-50 px-3 py-1 rounded-full border border-slate-100 uppercase tracking-widest`}>
                          {skill.trend === 'up' ? '▲' : skill.trend === 'down' ? '▼' : '●'} {skill.trend.toUpperCase()}
                        </span>
                        <span className="font-black text-slate-900 text-xl">{skill.score}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-50 rounded-full h-3 overflow-hidden border border-slate-100 p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all duration-1000"
                        style={{ width: `${skill.score}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-center py-8">No skill data available yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Class Overview
  return (
    <div className="h-full flex flex-col min-h-0 px-2 overflow-hidden">
      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center justify-between">
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex-shrink-0">
        {['overview', 'attendance', 'participation', 'summaries'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-3 px-4 rounded-xl font-bold uppercase text-xs tracking-wider transition-all ${activeTab === tab
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-10 pb-10">
        {activeTab === 'overview' && (
          <>
            {renderInsightsDashboard()}

            {/* Lesson Starter */}
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="font-black text-2xl text-slate-900 mb-6">Start New Lesson Session</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <input type="text" placeholder="Period (e.g., 1, 2, 3)" value={lessonForm.period} onChange={e => setLessonForm({ ...lessonForm, period: e.target.value })} className="p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="text" placeholder="Class (e.g., Grade 8)" value={lessonForm.class} onChange={e => setLessonForm({ ...lessonForm, class: e.target.value })} className="p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="text" placeholder="Stream (e.g., A, B)" value={lessonForm.stream} onChange={e => setLessonForm({ ...lessonForm, stream: e.target.value })} className="p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="text" placeholder="Pathway (e.g., STEM)" value={lessonForm.pathway} onChange={e => setLessonForm({ ...lessonForm, pathway: e.target.value })} className="p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="text" placeholder="Subject" value={lessonForm.subject} onChange={e => setLessonForm({ ...lessonForm, subject: e.target.value })} className="p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="text" placeholder="Strand" value={lessonForm.strand} onChange={e => setLessonForm({ ...lessonForm, strand: e.target.value })} className="p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="text" placeholder="Sub-Strand" value={lessonForm.subStrand} onChange={e => setLessonForm({ ...lessonForm, subStrand: e.target.value })} className="p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 md:col-span-2" />
                <input type="text" placeholder="Objectives (comma separated)" value={lessonForm.objectives} onChange={e => setLessonForm({ ...lessonForm, objectives: e.target.value })} className="p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 md:col-span-3" />
              </div>
              <button onClick={handleStartLesson} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl text-lg uppercase tracking-wider transition-all shadow-lg">
                🚀 Launch Attendance & Start Lesson
              </button>
            </div>

            {/* Student Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-10 border-b border-slate-50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
                  <div>
                    <h3 className="font-black text-2xl text-slate-900 lowercase tracking-tighter">
                      Performance Index
                    </h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
                      Real-time Learner Analytics • {filteredStudents.length} students
                    </p>
                  </div>
                  <div className="relative w-full sm:w-96">
                    <input
                      type="text"
                      placeholder="Filter by name, admission, or grade..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border border-slate-100 bg-slate-50/50 rounded-2xl pl-12 pr-6 py-4 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                    />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] font-black tracking-[0.3em] sticky top-0 z-10">
                    <tr>
                      <th className="px-10 py-6 bg-slate-50">Identity Node</th>
                      <th className="px-10 py-6 bg-slate-50">Admission Path</th>
                      <th className="px-10 py-6 text-center bg-slate-50">Attendance</th>
                      <th className="px-10 py-6 text-center bg-slate-50">Mastery Avg.</th>
                      <th className="px-10 py-6 text-right bg-slate-50">Telemetry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-10 py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <p className="font-bold">
                              {searchQuery ? 'No students match your search' : 'No students enrolled yet'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map(student => (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-all group">
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                {student.name.charAt(0)}
                              </div>
                              <span className="font-black text-slate-800 uppercase tracking-tight text-sm">
                                {student.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-10 py-6 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                            {student.admissionNumber}
                          </td>
                          <td className="px-10 py-6 text-center">
                            <span className={`px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest ${student.attendanceRate >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {student.attendanceRate}%
                            </span>
                          </td>
                          <td className="px-10 py-6 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-black text-slate-900 text-lg tracking-tighter">
                                {student.overallPerformance}%
                              </span>
                              <div className="w-20 bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden p-0.5 border border-slate-100">
                                <div
                                  className="bg-emerald-500 h-full rounded-full"
                                  style={{ width: `${student.overallPerformance}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="bg-white border border-slate-200 hover:border-slate-900 text-slate-400 hover:text-slate-900 font-black uppercase text-[9px] tracking-widest py-3 px-8 rounded-2xl transition-all shadow-sm active:scale-95"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'summaries' && renderSummariesTab()}
      </div>

      {renderAttendanceModal()}
      {renderParticipationTracker()}
    </div>
  );
};

export default StudentTracker;