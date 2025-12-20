import React, { useState, useEffect } from 'react';
import { JacClient } from '../../services/jacService';
import { generatePedagogicalStrategy } from '../../services/geminiService';
import { Student, User, ClassInsights } from '../../types';

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
    const saved = localStorage.getItem('last_pedagogical_strategy');
    if (saved) setAiStrategy(saved);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await JacClient.spawnWalker('get_all_students', {}, user);
      setStudents(data as Student[]);
      const insightData = await JacClient.spawnWalker('get_class_insights', {}, user);
      setInsights(insightData as ClassInsights);
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

  const saveOffline = () => {
    if (aiStrategy) {
      localStorage.setItem('last_pedagogical_strategy', aiStrategy);
      alert("Pedagogical Strategy has been saved to the offline registry.");
    }
  };

  const downloadStrategy = () => {
    if (!aiStrategy) return;
    const timestamp = new Date().toLocaleString();
    const content = `STEM ELIMUSMARTPLAN\nAI PEDAGOGICAL STRATEGY\nGenerated: ${timestamp}\n\n====================================\n\n${aiStrategy}\n\n====================================\nInstitutional Intelligence Node: ${user.name}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pedagogical_Strategy_${new Date().toISOString().split('T')[0]}.txt`;
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
      case 'Lab': return <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>;
      case 'Quiz': return <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
      default: return <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
    }
  };

  const renderInsightsDashboard = () => {
    if (!insights) return null;

    return (
      <div className="bg-[#0f172a] rounded-[40px] shadow-2xl overflow-hidden mb-8 border border-slate-800 animate-fade-in flex flex-col shrink-0">
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 p-10 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/10 rounded-3xl backdrop-blur-xl border border-white/20 shadow-2xl">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h3 className="text-3xl font-black text-white tracking-tight lowercase">Intelligence Command Center</h3>
                <p className="text-indigo-200/60 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Powered by Jaseci OSP Graph & Gemini GenAI</p>
              </div>
            </div>
            <button
              onClick={handleDeepDive}
              disabled={isGeneratingStrategy}
              className={`flex items-center gap-3 bg-[#10b981] hover:bg-[#059669] text-white font-black uppercase text-xs tracking-widest py-4 px-10 rounded-[24px] transition-all shadow-2xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50`}
            >
              {isGeneratingStrategy ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              )}
              {isGeneratingStrategy ? 'Traversing Graph...' : 'AI Pedagogical Deep Dive'}
            </button>
          </div>
        </div>

        <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar max-h-[500px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <div className="bg-slate-800/40 p-8 rounded-[32px] border border-slate-700/50 backdrop-blur-sm">
              <h4 className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] mb-6">Class-wide Knowledge Gaps</h4>
              <div className="space-y-6">
                {insights.commonGaps.map((gap, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-indigo-50 text-sm font-black">{gap.gap}</span>
                      <span className="text-emerald-400 font-black text-sm">{gap.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${gap.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/40 p-8 rounded-[32px] border border-slate-700/50 backdrop-blur-sm">
              <h4 className="text-rose-400 font-black text-[10px] uppercase tracking-[0.3em] mb-6">At-Risk Skill Progress</h4>
              <div className="space-y-4">
                {insights.decliningSkills.map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="bg-rose-500/10 text-rose-400 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-rose-500/20">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-100 tracking-tight">{item.skill}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Declining for {item.studentCount} students</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/40 p-8 rounded-[32px] border border-slate-700/50 backdrop-blur-sm">
              <h4 className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] mb-6">Recommended Actions</h4>
              <div className="space-y-3">
                {insights.recommendedInterventions.slice(0, 3).map((rec, i) => (
                  <div key={i} className="flex gap-4 text-xs text-indigo-50/80 leading-relaxed bg-indigo-950/30 p-4 rounded-2xl border border-indigo-500/10 font-medium">
                    <span className="text-emerald-400">●</span>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {aiStrategy && (
            <div className="mt-4 bg-emerald-500/5 border border-emerald-500/10 rounded-[40px] p-10 animate-scale-in relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500 p-2.5 rounded-2xl text-white shadow-2xl shadow-emerald-500/40">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <h4 className="text-2xl font-black text-emerald-400 tracking-tighter lowercase">Gemini Reasoning Node</h4>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={saveOffline}
                    className="bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest py-3 px-6 rounded-xl border border-white/10 transition-all"
                  >
                    Save Offline
                  </button>
                  <button
                    onClick={downloadStrategy}
                    className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black uppercase text-[10px] tracking-widest py-3 px-6 rounded-xl shadow-xl shadow-emerald-500/20 transition-all"
                  >
                    Download Txt
                  </button>
                </div>
              </div>

              <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-4 border-l-4 border-emerald-500/20 pl-8 py-2 bg-slate-900/40 rounded-2xl">
                <div className="text-emerald-50/80 text-base leading-relaxed whitespace-pre-wrap font-medium">
                  {aiStrategy}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Confidence Score: 0.98</span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Institutional Context Applied</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (selectedStudent) {
    return (
      <div className="h-full flex flex-col min-h-0 px-2 overflow-hidden">
        <div className="flex-shrink-0 mb-6">
          <button onClick={() => setSelectedStudent(null)} className="flex items-center text-slate-400 hover:text-slate-800 font-black uppercase text-[10px] tracking-widest group transition-colors">
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Return to Class Overview
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-8 pb-10">
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
            <div className="flex items-center gap-8">
              <div className="w-24 h-24 rounded-[32px] bg-indigo-600 text-white flex items-center justify-center text-4xl font-black shadow-2xl shadow-indigo-600/30">
                {selectedStudent.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{selectedStudent.name}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{selectedStudent.grade}</span>
                  <span className="text-indigo-600 font-black uppercase text-[10px] tracking-widest">{selectedStudent.admissionNumber}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-12 px-10 border-l border-slate-50">
              <div className="text-center">
                <span className="block text-5xl font-black text-emerald-600 tracking-tighter">{selectedStudent.overallPerformance}%</span>
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2 block">Mastery Score</span>
              </div>
              <div className="text-center">
                <span className="block text-5xl font-black text-blue-600 tracking-tighter">{selectedStudent.attendanceRate}%</span>
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2 block">Attendance</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col min-h-[400px]">
              <h3 className="flex-shrink-0 font-black text-xl text-slate-900 mb-10 flex items-center gap-3 uppercase tracking-tighter">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                CBE Skill Matrix
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-10">
                {selectedStudent.skills.map(skill => (
                  <div key={skill.id} className="group">
                    <div className="flex justify-between items-end mb-3">
                      <span className="font-black text-slate-700 uppercase text-xs tracking-tight group-hover:text-indigo-600 transition-colors">{skill.name}</span>
                      <div className="flex items-center gap-4">
                        <span className={`text-[9px] font-black flex items-center gap-1 ${calculateTrendColor(skill.trend)} bg-slate-50 px-3 py-1 rounded-full border border-slate-100 uppercase tracking-widest`}>
                          {skill.trend === 'up' ? '▲' : skill.trend === 'down' ? '▼' : '●'} {skill.trend.toUpperCase()}
                        </span>
                        <span className="font-black text-slate-900 text-xl">{skill.score}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-50 rounded-full h-3 overflow-hidden border border-slate-100 p-0.5">
                      <div className={`h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all duration-1000`} style={{ width: `${skill.score}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col min-h-[400px]">
              <h3 className="flex-shrink-0 font-black text-xl text-slate-900 mb-8 uppercase tracking-tighter">Interaction Timeline</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-8">
                {selectedStudent.recentActivity.map((act, i) => (
                  <div key={act.id} className="flex gap-6 relative">
                    {i !== selectedStudent.recentActivity.length - 1 && <div className="absolute left-6 top-12 w-0.5 h-full bg-slate-50"></div>}
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 shadow-sm relative z-10">
                      {getActivityIcon(act.type)}
                    </div>
                    <div className="pb-6">
                      <p className="text-sm font-black text-slate-800 leading-tight uppercase tracking-tight">{act.lessonTopic}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">{act.date} • {act.type}</p>
                      <div className="mt-3 flex gap-2">
                        <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-100">Validated</span>
                      </div>
                    </div>
                  </div>
                ))}
                {selectedStudent.recentActivity.length === 0 && (
                  <div className="text-center py-10 opacity-30">
                    <p className="text-xs font-black uppercase tracking-widest">No traversal logs found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 px-2 overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-10 pb-10">
        {renderInsightsDashboard()}

        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[400px] flex-grow">
          <div className="p-10 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 flex-shrink-0">
            <div>
              <h3 className="font-black text-2xl text-slate-900 lowercase tracking-tighter">Performance Index</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Real-time Learner Analytics</p>
            </div>
            <div className="relative w-full sm:w-96">
              <input type="text" placeholder="Filter node registry..." className="w-full border border-slate-100 bg-slate-50/50 rounded-2xl pl-12 pr-6 py-4 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium" />
              <svg className="absolute left-4 top-4.5 h-5 w-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
          <div className="overflow-auto flex-grow custom-scrollbar">
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
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-black text-slate-800 uppercase tracking-tight text-sm">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-slate-500 font-bold uppercase text-[10px] tracking-widest">{student.admissionNumber}</td>
                    <td className="px-10 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest ${student.attendanceRate >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {student.attendanceRate}%
                      </span>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-black text-slate-900 text-lg tracking-tighter">{student.overallPerformance}%</span>
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden p-0.5 border border-slate-100">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${student.overallPerformance}%` }}></div>
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