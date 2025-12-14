import React, { useState } from 'react';

const SupervisorDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'staff' | 'reports'>('staff');
  const [reportPeriod, setReportPeriod] = useState('Today');
  const [reportGrade, setReportGrade] = useState('All');

  // Mock data representing the real-time node data from Jac
  const teachers = [
    { id: 1, name: "Jane Doe", tsc: "TSC-10023", department: "Science", planned: 45, taught: 42, rating: 4.8, appraisalScore: 88, status: "Promotable", gaps: 0 },
    { id: 2, name: "John Smith", tsc: "TSC-29910", department: "Mathematics", planned: 50, taught: 40, rating: 4.2, appraisalScore: 72, status: "Good Standing", gaps: 2 },
    { id: 3, name: "Sarah Connor", tsc: "TSC-44002", department: "Computer Sci", planned: 30, taught: 30, rating: 5.0, appraisalScore: 95, status: "Promotable", gaps: 0 },
    { id: 4, name: "Michael Kamau", tsc: "TSC-11002", department: "Languages", planned: 40, taught: 25, rating: 2.5, appraisalScore: 45, status: "Intervention Needed", gaps: 5 },
  ];

  const attendanceData = [
    { grade: 'Grade 4', present: '95%', lessonCount: 4, teacher: 'Jane Doe' },
    { grade: 'Grade 5', present: '92%', lessonCount: 5, teacher: 'John Smith' },
    { grade: 'Grade 6', present: '88%', lessonCount: 3, teacher: 'Sarah Connor' },
    { grade: 'Grade 7', present: '90%', lessonCount: 6, teacher: 'Jane Doe' },
    { grade: 'Grade 8', present: '85%', lessonCount: 4, teacher: 'Michael Kamau' },
  ];

  const [filter, setFilter] = useState('All');

  const filteredTeachers = filter === 'All' ? teachers : teachers.filter(t => t.status === filter);

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Staff Appraisal & Promotion Tracking</h2>
          <p className="text-slate-500 text-sm">Real-time data for merit-based promotion and instructional quality.</p>
        </div>
        <div className="flex space-x-3">
           <button className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center">
             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
             Export TSC Compliance Report
           </button>
           <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm">
             Submit Term Returns
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button 
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'staff' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Staff Appraisal
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'reports' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Attendance Reports
        </button>
      </div>

      {activeTab === 'staff' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
              <h3 className="text-blue-100 text-xs font-bold uppercase mb-2">Avg. Appraisal Score</h3>
              <p className="text-3xl font-bold">75.0%</p>
              <span className="text-blue-100 text-sm opacity-80">School Mean Score</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-slate-500 text-xs font-bold uppercase mb-2">Lesson Completion</h3>
              <p className="text-3xl font-bold text-slate-800">88%</p>
              <span className="text-emerald-500 text-sm font-medium">Standardized delivery on track</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-slate-500 text-xs font-bold uppercase mb-2">Promotion Candidates</h3>
              <p className="text-3xl font-bold text-slate-800">12</p>
              <span className="text-slate-400 text-sm font-medium">Teachers Eligible</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-slate-500 text-xs font-bold uppercase mb-2">TPD Interventions</h3>
              <p className="text-3xl font-bold text-slate-800">5</p>
              <span className="text-red-500 text-sm font-medium">Pending Gaps</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex space-x-4">
                <button onClick={() => setFilter('All')} className={`text-sm font-medium ${filter === 'All' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'}`}>All Staff</button>
                <button onClick={() => setFilter('Promotable')} className={`text-sm font-medium ${filter === 'Promotable' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'}`}>Promotable</button>
                <button onClick={() => setFilter('Intervention Needed')} className={`text-sm font-medium ${filter === 'Intervention Needed' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'}`}>Needs Support</button>
              </div>
              <input type="text" placeholder="Search by TSC No..." className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="overflow-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Teacher Details</th>
                    <th className="px-6 py-4 font-semibold text-center">Lessons (P/T)</th>
                    <th className="px-6 py-4 font-semibold text-center">Appraisal Score</th>
                    <th className="px-6 py-4 font-semibold text-center">TPD Gaps</th>
                    <th className="px-6 py-4 font-semibold">Promotion Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{teacher.name}</p>
                        <p className="text-xs text-slate-500">{teacher.tsc} • {teacher.department}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center bg-slate-100 rounded-lg px-2 py-1">
                          <span className="font-medium text-slate-600">{teacher.taught}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-slate-400">{teacher.planned}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-lg font-bold ${teacher.appraisalScore >= 80 ? 'text-emerald-600' : teacher.appraisalScore >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
                          {teacher.appraisalScore}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {teacher.gaps > 0 ? (
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">{teacher.gaps} Identified</span>
                        ) : (
                          <span className="text-slate-400 text-xs">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          teacher.status === 'Promotable' ? 'bg-green-50 text-green-700 border-green-200' :
                          teacher.status === 'Good Standing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {teacher.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button className="text-slate-600 hover:text-emerald-600 font-medium text-xs border border-slate-200 px-2 py-1 rounded">Review</button>
                        <button className="text-slate-600 hover:text-blue-600 font-medium text-xs border border-slate-200 px-2 py-1 rounded">Observe</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Attendance Summary Reports</h3>
            <div className="flex gap-2">
              <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)} className="border border-slate-300 rounded px-3 py-1 text-sm">
                <option>Today</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>This Term</option>
                <option>This Year</option>
              </select>
              <select value={reportGrade} onChange={(e) => setReportGrade(e.target.value)} className="border border-slate-300 rounded px-3 py-1 text-sm">
                <option value="All">All Grades</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
              </select>
              <button className="bg-slate-900 text-white px-3 py-1 rounded text-sm hover:bg-slate-800">Share with Teacher</button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                 <tr>
                   <th className="px-4 py-3">Grade</th>
                   <th className="px-4 py-3">Assigned Teacher</th>
                   <th className="px-4 py-3 text-center">Lessons Taught</th>
                   <th className="px-4 py-3 text-center">Avg. Duration</th>
                   <th className="px-4 py-3 text-right">Attendance Rate</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceData
                  .filter(d => reportGrade === 'All' || d.grade === reportGrade)
                  .map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{row.grade}</td>
                    <td className="px-4 py-3">{row.teacher}</td>
                    <td className="px-4 py-3 text-center">{row.lessonCount}</td>
                    <td className="px-4 py-3 text-center">42 mins</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{row.present}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorDashboard;