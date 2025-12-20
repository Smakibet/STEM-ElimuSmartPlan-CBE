
import React, { useState, useEffect } from 'react';
import AppraisalSystem from './AppraisalSystem';
import { JacClient } from '../../services/jacService';
import { User } from '../../types';

const SupervisorDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'staff' | 'observations' | 'reports'>('staff');
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
    const [filter, setFilter] = useState('All');

    // Observation Logic
    const [showObsForm, setShowObsForm] = useState(false);
    const [obsTeacherId, setObsTeacherId] = useState('');
    const [obsNotes, setObsNotes] = useState('');
    const [obsType, setObsType] = useState('Regular Walkthrough');
    const [allObservations, setAllObservations] = useState<any[]>([]);

    // Reports Stats
    const [attendanceStats, setAttendanceStats] = useState<any[]>([]);

    useEffect(() => {
        loadStaff();
        loadAllObservations();
        calculateAttendanceReports();
    }, []);

    const loadStaff = async () => {
        setLoading(true);
        const data = await JacClient.spawnWalker('get_staff_list', {}, { id: 'sup', name: 'Supervisor', role: 'supervisor', email: '' });
        setTeachers(data);
        setLoading(false);
    };

    const loadAllObservations = () => {
        const obs = JSON.parse(localStorage.getItem('inst_observations') || '[]');
        setAllObservations(obs);
    };

    const calculateAttendanceReports = () => {
        const logs = JSON.parse(localStorage.getItem('attendance_logs') || '[]');
        const staff = JSON.parse(localStorage.getItem('inst_staff_nodes') || '[]');

        const stats = staff.map((t: any) => {
            const teacherLogs = logs.filter((l: any) => l.userId === t.id);
            const totalMins = teacherLogs.reduce((acc: number, log: any) => {
                if (!log.duration) return acc;
                const [h, m] = log.duration.match(/\d+/g);
                return acc + (parseInt(h) * 60 + parseInt(m));
            }, 0);

            return {
                ...t,
                lessonCount: teacherLogs.length,
                avgDuration: teacherLogs.length > 0 ? Math.round(totalMins / teacherLogs.length) : 0,
                completionRate: t.planned > 0 ? Math.round((teacherLogs.length / t.planned) * 100) : 0
            };
        });
        setAttendanceStats(stats);
    };

    const handleAddObservation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!obsTeacherId || !obsNotes) return;
        setLoading(true);
        await JacClient.spawnWalker('record_observation', { teacherId: obsTeacherId, notes: obsNotes, type: obsType }, { id: 'sup', name: 'Supervisor', role: 'supervisor', email: '' });
        setObsNotes('');
        setShowObsForm(false);
        loadAllObservations();
        loadStaff();
        setLoading(false);
    };

    const handleExportReport = () => {
        const headers = ["ID", "Name", "TSC Number", "Department", "Lessons Planned", "Lessons Taught", "Appraisal Score", "Status"];
        const rows = teachers.map(t => [t.id, t.name, t.tscNumber, t.department, t.planned, t.taught, `${t.appraisalScore}%`, t.status].join(","));
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "TSC_Compliance_Report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredTeachers = filter === 'All' ? teachers : teachers.filter(t => t.status === filter);

    if (selectedTeacherId) {
        const teacher = teachers.find(t => t.id === selectedTeacherId);
        const targetUser: User = {
            id: selectedTeacherId,
            name: teacher?.name || '',
            email: teacher?.email || '',
            role: 'teacher',
            tscNumber: teacher?.tscNumber
        };

        return (
            <div className="h-full flex flex-col min-h-0">
                <button onClick={() => { setSelectedTeacherId(null); loadStaff(); }} className="mb-4 text-emerald-600 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:translate-x-1 transition-transform w-fit bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                    <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    Back to Analyzer List
                </button>
                <div className="flex-1 overflow-hidden">
                    <AppraisalSystem user={targetUser} mode="supervisor" />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-8 overflow-y-auto pb-10 px-2 custom-scrollbar">
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-6 shrink-0">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Teacher Monitoring Hub</h2>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1 italic">Real-time Merit & Compliance Tracking</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setShowObsForm(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 active:scale-95 transition-all">New Observation</button>
                    <button onClick={handleExportReport} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Export Returns</button>
                </div>
            </div>

            <div className="flex p-1 bg-slate-100 rounded-2xl w-fit shrink-0">
                {[
                    { id: 'staff', label: 'Staff Merit' },
                    { id: 'observations', label: 'Interaction Logs' },
                    { id: 'reports', label: 'Instructional Stats' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'staff' && (
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                        <div className="flex gap-2">
                            {['All', 'Promotable', 'Good Standing', 'Intervention Needed'].map(f => (
                                <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${filter === f ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-300 border-slate-100'}`}>{f}</button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 text-slate-400 uppercase text-[9px] font-black tracking-widest">
                                <tr>
                                    <th className="px-10 py-6">Staff Identity</th>
                                    <th className="px-10 py-6">Department</th>
                                    <th className="px-10 py-6 text-center">Appraisal Score</th>
                                    <th className="px-10 py-6">Status</th>
                                    <th className="px-10 py-6 text-right">Traversal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">Accessing Graph Registry Analysis...</td></tr>
                                ) : filteredTeachers.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-all group">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">{t.name.charAt(0)}</div>
                                                <div>
                                                    <span className="font-black text-slate-800 uppercase tracking-tighter block">{t.name}</span>
                                                    <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{t.tscNumber}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-slate-500 font-bold uppercase text-[10px] tracking-widest">{t.department}</td>
                                        <td className="px-10 py-6 text-center">
                                            <span className={`text-xl font-black ${t.appraisalScore >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>{t.appraisalScore}%</span>
                                        </td>
                                        <td className="px-10 py-6">
                                            <span className={`px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest border ${t.status === 'Promotable' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{t.status}</span>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <button onClick={() => setSelectedTeacherId(t.id)} className="bg-white border border-slate-200 hover:border-indigo-600 text-slate-400 hover:text-indigo-600 font-black uppercase text-[9px] tracking-widest py-3 px-8 rounded-2xl transition-all shadow-sm">Review Appraisal.</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'observations' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allObservations.map((obs) => {
                            const teacher = teachers.find(t => t.id === obs.teacherId);
                            return (
                                <div key={obs.id} className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100">{obs.type}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{obs.date}</span>
                                        </div>
                                        <h4 className="font-black text-slate-800 uppercase tracking-tighter mb-1">{teacher?.name || 'Unknown Node'}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Observed by: {obs.observer}</p>
                                        <p className="text-sm text-slate-600 leading-relaxed italic line-clamp-4">"{obs.notes}"</p>
                                    </div>
                                    <div className="mt-6 pt-6 border-t border-slate-50 flex justify-end">
                                        <button className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:underline">View Full &rarr;</button>
                                    </div>
                                </div>
                            );
                        })}
                        {allObservations.length === 0 && (
                            <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-slate-100">
                                <svg className="w-16 h-16 text-slate-100 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <p className="text-slate-300 font-black uppercase tracking-[0.2em] text-xs">No active interaction logs found in graph Analyzer.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                    <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                        <h3 className="font-black text-slate-800 uppercase tracking-tighter">Live Instructional Telemetry</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aggregated from Teacher Clock-ins and Class Registry</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] font-black tracking-widest">
                                <tr>
                                    <th className="px-10 py-6">Staff Member</th>
                                    <th className="px-10 py-6 text-center">Lessons Logged</th>
                                    <th className="px-10 py-6 text-center">Completion Rate</th>
                                    <th className="px-10 py-6 text-center">Avg Lesson Duration</th>
                                    <th className="px-10 py-6 text-right">Compliance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {attendanceStats.map((stat) => (
                                    <tr key={stat.id} className="hover:bg-slate-50/50 transition-all">
                                        <td className="px-10 py-6">
                                            <span className="font-black text-slate-800 uppercase tracking-tighter">{stat.name}</span>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{stat.department}</p>
                                        </td>
                                        <td className="px-10 py-6 text-center font-black text-slate-700">{stat.lessonCount} / {stat.planned}</td>
                                        <td className="px-10 py-6 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`font-black text-lg ${stat.completionRate >= 90 ? 'text-emerald-600' : 'text-amber-500'}`}>{stat.completionRate}%</span>
                                                <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500" style={{ width: `${stat.completionRate}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-center">
                                            <span className="font-black text-slate-500">{stat.avgDuration} <span className="text-[9px] font-bold">MINS</span></span>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <span className={`px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest border ${stat.lessonCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                {stat.lessonCount > 0 ? 'Validated' : 'No Data'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Observation Modal */}
            {showObsForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
                        <div className="p-10 bg-indigo-900 text-white">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Record Interaction Interventions</h3>
                            <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mt-1">Classroom Observation Entry</p>
                        </div>
                        <form onSubmit={handleAddObservation} className="p-10 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Teacher</label>
                                <select value={obsTeacherId} onChange={e => setObsTeacherId(e.target.value)} className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none">
                                    <option value="">Select identity...</option>
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.department})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observation Type</label>
                                <select value={obsType} onChange={e => setObsType(e.target.value)} className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none">
                                    <option>Regular Walkthrough</option>
                                    <option>Full Lesson Observation</option>
                                    <option>CBE Resource Review</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observation Notes</label>
                                <textarea value={obsNotes} onChange={e => setObsNotes(e.target.value)} className="w-full border border-slate-200 rounded-2xl p-6 text-sm min-h-[150px] outline-none focus:ring-4 focus:ring-indigo-500/10 font-medium" placeholder="Describe instructional delivery, learner engagement, and CBC compliance..." />
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowObsForm(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                                <button type="submit" className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-100 active:scale-95 transition-all">Commit to Graph Analyser</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupervisorDashboard;
