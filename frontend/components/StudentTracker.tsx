import React, { useState, useEffect } from 'react';
import { JacClient } from '../scripts/services/jacService';
import { Student, User, ClassInsights } from '../scripts/types';

interface StudentTrackerProps {
  user: User;
}

const StudentTracker: React.FC<StudentTrackerProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [insights, setInsights] = useState<ClassInsights | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Simulate fetching from Jac Graph
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

  const calculateTrendColor = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return 'text-emerald-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-slate-400';
  };

  const calculateTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const renderInsightsDashboard = () => {
    if (!insights) return null;

    return (
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl shadow-lg border border-indigo-700 text-white p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold flex items-center">
              <svg className="w-6 h-6 mr-2 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              AI Class Insights & Trends
            </h3>
            <p className="text-indigo-100 text-sm opacity-90">Analysis of common learning gaps and skill progression across the class.</p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-lg text-xs font-bold backdrop-blur-sm border border-white/20">
            Live Graph Data
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Common Gaps */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/10">
            <h4 className="font-bold text-sm text-indigo-100 mb-3 uppercase tracking-wide">Common Learning Gaps</h4>
            {insights.commonGaps.length > 0 ? (
              <div className="space-y-3">
                {insights.commonGaps.map((gap, i) => (
                  <div key={i} className="relative pt-1">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-medium text-white truncate w-3/4" title={gap.gap}>{gap.gap}</span>
                      <span className="font-bold text-yellow-300">{gap.percentage}%</span>
                    </div>
                    <div className="overflow-hidden h-1.5 text-xs flex rounded bg-indigo-900/50">
                      <div style={{ width: `${gap.percentage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-yellow-400"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-indigo-200 italic">No significant gaps detected.</p>
            )}
          </div>

          {/* Declining Skills */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/10">
            <h4 className="font-bold text-sm text-indigo-100 mb-3 uppercase tracking-wide">Skills Requiring Attention</h4>
            {insights.decliningSkills.length > 0 ? (
              <ul className="space-y-2">
                {insights.decliningSkills.map((item, i) => (
                  <li key={i} className="text-xs text-white flex items-start gap-2">
                    <span className="text-red-300 font-bold">↓</span>
                    <div>
                      <span className="font-bold">{item.skill}</span>
                      <span className="block text-indigo-200 text-[10px]">Affecting {item.studentCount} students</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-indigo-200 italic">All skills showing stable or positive trends.</p>
            )}
          </div>

          {/* Recommendations */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/10 flex flex-col">
            <h4 className="font-bold text-sm text-indigo-100 mb-3 uppercase tracking-wide">Suggested Interventions</h4>
            <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar max-h-32">
              {insights.recommendedInterventions.map((rec, i) => (
                <div key={i} className="flex gap-2 items-start bg-indigo-900/30 p-2 rounded border border-white/5">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-xs text-white leading-tight">{rec}</p>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 bg-white text-indigo-700 text-xs font-bold py-2 rounded hover:bg-indigo-50 transition-colors">
              Apply to Lesson Plan
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentList = () => (
    <div className="space-y-6">
      {renderInsightsDashboard()}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">Class Register & Performance</h3>
          <input
            type="text"
            placeholder="Search student..."
            className="border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 w-64"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Admission No.</th>
                <th className="px-6 py-4 text-center">Attendance</th>
                <th className="px-6 py-4 text-center">Performance Avg.</th>
                <th className="px-6 py-4 text-center">Trend</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{student.name}</td>
                  <td className="px-6 py-4 text-slate-500">{student.admissionNumber}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${student.attendanceRate >= 90 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {student.attendanceRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-700">{student.overallPerformance}%</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-emerald-500 font-bold">↗</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-xs border border-indigo-200 hover:border-indigo-400 px-3 py-1.5 rounded transition-all"
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
  );

  const renderStudentDetails = () => {
    if (!selectedStudent) return null;

    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedStudent(null)}
          className="flex items-center text-slate-500 hover:text-slate-800 mb-4 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Class List
        </button>

        {/* Header Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold">
              {selectedStudent.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{selectedStudent.name}</h2>
              <p className="text-slate-500">{selectedStudent.grade} • {selectedStudent.admissionNumber}</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <span className="block text-3xl font-bold text-emerald-600">{selectedStudent.overallPerformance}%</span>
              <span className="text-xs text-slate-400 uppercase tracking-wide">Overall Score</span>
            </div>
            <div className="text-center">
              <span className="block text-3xl font-bold text-blue-600">{selectedStudent.attendanceRate}%</span>
              <span className="text-xs text-slate-400 uppercase tracking-wide">Attendance</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Skill Graph */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-lg text-slate-800 mb-6">Core Competency Mastery</h3>
            <div className="space-y-6">
              {selectedStudent.skills.map(skill => (
                <div key={skill.id}>
                  <div className="flex justify-between items-end mb-1">
                    <span className="font-medium text-slate-700">{skill.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold flex items-center ${calculateTrendColor(skill.trend)}`}>
                        {calculateTrendIcon(skill.trend)} {skill.trend}
                      </span>
                      <span className="font-bold text-slate-800">{skill.score}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-1000 ${skill.score >= 80 ? 'bg-emerald-500' :
                        skill.score >= 60 ? 'bg-indigo-500' :
                          'bg-amber-500'
                        }`}
                      style={{ width: `${skill.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Learning Gaps */}
            {selectedStudent.learningGaps.length > 0 && (
              <div className="mt-8 bg-red-50 border border-red-100 p-4 rounded-lg">
                <h4 className="font-bold text-red-800 text-sm mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Identified Learning Gaps
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedStudent.learningGaps.map((gap, i) => (
                    <span key={i} className="bg-white text-red-600 text-xs px-2 py-1 rounded border border-red-200">
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <h3 className="font-bold text-lg text-slate-800 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {selectedStudent.recentActivity.length > 0 ? (
                selectedStudent.recentActivity.map(act => (
                  <div key={act.id} className="border-l-2 border-slate-200 pl-4 py-1 relative">
                    <div className={`absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full border-2 border-white ${act.performance === 'Exceeding' ? 'bg-emerald-500' :
                      act.performance === 'Meeting' ? 'bg-blue-500' : 'bg-amber-500'
                      }`}></div>
                    <p className="text-sm font-bold text-slate-800">{act.lessonTopic}</p>
                    <p className="text-xs text-slate-500 mb-1">{act.date}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${act.performance === 'Exceeding' ? 'bg-emerald-100 text-emerald-700' :
                      act.performance === 'Meeting' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                      {act.performance}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 italic">No recent activity recorded.</p>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="font-bold text-slate-700 text-sm mb-2">AI Recommendation</h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded">
                Based on recent performance in <strong>{selectedStudent.recentActivity[0]?.lessonTopic || "class"}</strong>,
                recommend assigning additional practical exercises in <strong>{selectedStudent.learningGaps[0] || "core concepts"}</strong> to improve mastery.
              </p>
              <button className="w-full mt-3 bg-indigo-600 text-white text-xs font-bold py-2 rounded hover:bg-indigo-700 transition-colors">
                Assign Remedial Lesson
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto pb-4">
      {/* Overview Stats (Only when no student selected) */}
      {!selectedStudent && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase">Total Students</p>
                <p className="text-3xl font-bold text-slate-800">{students.length}</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase">Class Average</p>
                <p className="text-3xl font-bold text-emerald-600">76%</p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase">Students at Risk</p>
                <p className="text-3xl font-bold text-red-500">
                  {students.filter(s => s.overallPerformance < 65).length}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg text-red-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {selectedStudent ? renderStudentDetails() : renderStudentList()}
    </div>
  );
};

export default StudentTracker;