import React, { useState, useEffect } from 'react';
import { JacClient } from '../services/jacService';
import { generatePedagogicalStrategy } from '../services/geminiService';
import { Student, User, ClassInsights } from '../types';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await JacClient.spawnWalker('get_all_students', {}, user);
      setStudents(data);
      const insightData = await JacClient.spawnWalker('get_class_insights', {}, user);
      setInsights(insightData);
    } catch (e) {
      console.error("Failed to load students", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeepDive = async () => {
    if (!insights || students.length === 0) return;
    setIsGeneratingStrategy(true);
    try {
      const strategy = await generatePedagogicalStrategy(insights, students);
      setAiStrategy(strategy);
    } catch (error) {
      console.error("Strategy generation failed", error);
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const calculateTrendColor = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return 'text-emerald-400';
    if (trend === 'down') return 'text-rose-400';
    return 'text-slate-400';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Lab': return <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>;
      case 'Quiz': return <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
      default: return <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
    }
  };

  const renderInsightsDashboard = () => {
    if (!insights) return null;

    return (
      <div className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden mb-8 border border-slate-800">
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Intelligence Command Center</h3>
                <p className="text-indigo-100/70 text-sm">Powered by Jaseci OSP Graph & Gemini GenAI</p>
              </div>
            </div>
            <button
              onClick={handleDeepDive}
              disabled={isGeneratingStrategy}
              className={`flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isGeneratingStrategy ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              )}
              {isGeneratingStrategy ? 'Generating Strategy...' : 'AI Pedagogical Deep Dive'}
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
              <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-4">Class-wide Knowledge Gaps</h4>
              <div className="space-y-4">
                {insights.commonGaps.map((gap, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-indigo-100 text-sm font-medium">{gap.gap}</span>
                      <span className="text-emerald-400 font-bold text-sm">{gap.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${gap.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
              <h4 className="text-rose-400 font-bold text-xs uppercase tracking-widest mb-4">At-Risk Skill Progress</h4>
              <div className="space-y-4">
                {insights.decliningSkills.map((item, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <div className="bg-rose-500/20 text-rose-400 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-rose-500/30 group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-100">{item.skill}</p>
                      <p className="text-xs text-slate-400">Declining for {item.studentCount} students</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
              <h4 className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-4">Recommended Actions</h4>
              <div className="space-y-3">
                {insights.recommendedInterventions.slice(0, 3).map((rec, i) => (
                  <div key={i} className="flex gap-3 text-xs text-indigo-100/90 leading-relaxed bg-indigo-900/40 p-3 rounded-xl border border-indigo-500/20">
                    <span className="text-emerald-400 font-bold">●</span>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {aiStrategy && (
            <div className="mt-8 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-lg shadow-emerald-500/30">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                </div>
                <h4 className="text-xl font-bold text-emerald-400">Gemini AI Pedagogical Strategy</h4>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="text-emerald-50/90 text-base leading-relaxed whitespace-pre-wrap border-l-2 border-emerald-500/30 pl-6 py-1">
                  {aiStrategy}
                </div>
                <div className="flex flex-col justify-center gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-xs font-bold text-emerald-400 uppercase mb-2">Success Metric</p>
                    <p className="text-sm text-white">Projected +15% class-wide mastery in targeted areas.</p>
                  </div>
                  <button className="bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                    Update Weekly Lesson Flow
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (selectedStudent) {
    return (
      <div className="h-full overflow-y-auto overflow-x-hidden">
        <div className="space-y-6 pr-2 pb-6">
          <button onClick={() => setSelectedStudent(null)} className="flex items-center text-slate-500 hover:text-slate-800 mb-6 font-medium group transition-colors">
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Return to Class Overview
          </button>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-indigo-600/20">
                {selectedStudent.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900">{selectedStudent.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-slate-500 font-medium">{selectedStudent.grade}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="text-indigo-600 font-bold">{selectedStudent.admissionNumber}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-8 px-8 border-l border-slate-100">
              <div className="text-center">
                <span className="block text-4xl font-black text-emerald-600">{selectedStudent.overallPerformance}%</span>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Mastery Score</span>
              </div>
              <div className="text-center">
                <span className="block text-4xl font-black text-blue-600">{selectedStudent.attendanceRate}%</span>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Attendance</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-xl text-slate-900 mb-8 flex items-center gap-2">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                CBE Skill Matrix
              </h3>
              <div className="space-y-8">
                {selectedStudent.skills.map(skill => (
                  <div key={skill.id} className="group">
                    <div className="flex justify-between items-end mb-2">
                      <span className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{skill.name}</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-black flex items-center gap-1 ${calculateTrendColor(skill.trend)} bg-slate-50 px-2 py-1 rounded-lg border border-slate-100`}>
                          {skill.trend === 'up' ? '▲' : skill.trend === 'down' ? '▼' : '●'} {skill.trend.toUpperCase()}
                        </span>
                        <span className="font-black text-slate-900 text-lg">{skill.score}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-100">
                      <div className={`h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-700`} style={{ width: `${skill.score}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 h-fit">
              <h3 className="font-bold text-xl text-slate-900 mb-6">Interaction Timeline</h3>
              <div className="space-y-6">
                {selectedStudent.recentActivity.map((act, i) => (
                  <div key={act.id} className="flex gap-4 relative">
                    {i !== selectedStudent.recentActivity.length - 1 && <div className="absolute left-5 top-10 w-0.5 h-full bg-slate-100"></div>}
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 shadow-sm relative z-10">
                      {getActivityIcon(act.type)}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-bold text-slate-800 leading-tight">{act.lessonTopic}</p>
                      <p className="text-xs text-slate-400 mt-1 font-medium">{act.date} • {act.type}</p>
                      <div className="mt-2 flex gap-2">
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-emerald-100">CBE Meeting</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="space-y-6 pb-6 pr-2">
        {renderInsightsDashboard()}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <h3 className="font-bold text-xl text-slate-900">Class Performance Index</h3>
            <div className="relative w-full sm:w-80">
              <input type="text" placeholder="Search by name or ADM..." className="w-full border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
              <svg className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-8 py-5">Full Student Name</th>
                  <th className="px-8 py-5">Admission No.</th>
                  <th className="px-8 py-5 text-center">Attendance Rate</th>
                  <th className="px-8 py-5 text-center">Mastery Avg.</th>
                  <th className="px-8 py-5 text-right">Insight Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-800">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-slate-500 font-medium">{student.admissionNumber}</td>
                    <td className="px-8 py-5 text-center">
                      <span className={`px-3 py-1 rounded-lg font-black text-xs ${student.attendanceRate >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {student.attendanceRate}%
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-black text-slate-900 text-base">{student.overallPerformance}%</span>
                        <div className="w-16 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: `${student.overallPerformance}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="bg-white border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 text-slate-600 font-bold text-xs py-2 px-6 rounded-xl transition-all shadow-sm hover:shadow-indigo-600/10"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentTracker;