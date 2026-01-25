import React, { useState, useEffect } from 'react';

// API Configuration
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// API Client
const JacClient = {
    spawnWalker: async (walker, params = {}) => {
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

const SupervisorDashboard = ({ user }) => {
    // State Management
    const [activeTab, setActiveTab] = useState('staff');
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('All');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Observation State
    const [showObsForm, setShowObsForm] = useState(false);
    const [obsTeacherId, setObsTeacherId] = useState('');
    const [obsNotes, setObsNotes] = useState('');
    const [obsType, setObsType] = useState('Regular Walkthrough');
    const [allObservations, setAllObservations] = useState([]);

    // Attendance & Appraisal State
    const [attendanceStats, setAttendanceStats] = useState([]);
    const [pendingAppraisals, setPendingAppraisals] = useState([]);
    const [showAppraisalModal, setShowAppraisalModal] = useState(false);
    const [selectedAppraisal, setSelectedAppraisal] = useState(null);
    const [supervisorRatings, setSupervisorRatings] = useState({});

    const supervisorUser = user || {
        id: 'supervisor_001',
        name: 'Dr. Sarah Kamau',
        role: 'supervisor',
        email: 'sarah.kamau@school.edu'
    };

    // Load data on mount
    useEffect(() => {
        loadAllData();
        const interval = setInterval(() => loadAllData(true), 30000);
        return () => clearInterval(interval);
    }, []);

    const loadAllData = async (silent = false) => {
        await Promise.all([
            loadStaff(silent),
            loadObservations(silent),
            loadAttendanceStats(silent),
            loadPendingAppraisals(silent)
        ]);
    };

    const loadStaff = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await JacClient.spawnWalker('get_staff_list', {
                supervisorId: supervisorUser.id
            });
            if (data && Array.isArray(data)) {
                setTeachers(data);
            }
        } catch (e) {
            if (!silent) {
                setError(`Failed to load staff: ${e.message}`);
                setTimeout(() => setError(null), 5000);
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const loadObservations = async (silent = false) => {
        try {
            const data = await JacClient.spawnWalker('get_supervisor_observations', {
                supervisorId: supervisorUser.id
            });
            if (data && Array.isArray(data)) {
                setAllObservations(data);
            }
        } catch (e) {
            if (!silent) console.error('Failed to load observations:', e);
        }
    };

    const loadAttendanceStats = async (silent = false) => {
        try {
            const data = await JacClient.spawnWalker('get_attendance_statistics', {
                supervisorId: supervisorUser.id
            });
            if (data && Array.isArray(data)) {
                setAttendanceStats(data);
            }
        } catch (e) {
            if (!silent) console.error('Failed to load attendance:', e);
        }
    };

    const loadPendingAppraisals = async (silent = false) => {
        try {
            const data = await JacClient.spawnWalker('get_pending_appraisals', {
                supervisorId: supervisorUser.id,
                status: 'Submitted to Supervisor'
            });
            if (data && Array.isArray(data)) {
                setPendingAppraisals(data);
            }
        } catch (e) {
            if (!silent) console.error('Failed to load appraisals:', e);
        }
    };

    const handleAddObservation = async (e) => {
        e.preventDefault();
        if (!obsTeacherId || !obsNotes.trim()) {
            setError('Teacher and observation notes are required');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setLoading(true);
        try {
            await JacClient.spawnWalker('record_observation', {
                teacherId: obsTeacherId,
                supervisorId: supervisorUser.id,
                supervisorName: supervisorUser.name,
                notes: obsNotes,
                type: obsType,
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString()
            });

            setSuccess('✓ Observation recorded successfully!');
            setTimeout(() => setSuccess(null), 3000);
            setObsNotes('');
            setObsTeacherId('');
            setShowObsForm(false);
            await loadObservations();
        } catch (e) {
            setError(`Failed to record observation: ${e.message}`);
            setTimeout(() => setError(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAppraisal = (appraisal) => {
        setSelectedAppraisal(appraisal);
        const ratings = {};
        if (appraisal.standards && Array.isArray(appraisal.standards)) {
            appraisal.standards.forEach(std => {
                ratings[std.id] = std.supervisorRating || 0;
            });
        }
        setSupervisorRatings(ratings);
        setShowAppraisalModal(true);
    };

    const handleRateStandard = (standardId, rating) => {
        setSupervisorRatings(prev => ({
            ...prev,
            [standardId]: rating
        }));
    };

    const handleSubmitAppraisal = async () => {
        if (!selectedAppraisal) return;

        const incompleteRatings = Object.values(supervisorRatings).filter(r => r === 0);
        if (incompleteRatings.length > 0) {
            setError('Please rate all standards before submitting');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setLoading(true);
        try {
            await JacClient.spawnWalker('submit_supervisor_appraisal', {
                appraisalId: selectedAppraisal.id,
                teacherId: selectedAppraisal.teacherId,
                supervisorId: supervisorUser.id,
                supervisorName: supervisorUser.name,
                ratings: supervisorRatings
            });

            setSuccess('✓ Appraisal reviewed and submitted to Principal!');
            setTimeout(() => setSuccess(null), 3000);
            setShowAppraisalModal(false);
            setSelectedAppraisal(null);
            setSupervisorRatings({});
            await loadPendingAppraisals();
            await loadStaff();
        } catch (e) {
            setError(`Failed to submit appraisal: ${e.message}`);
            setTimeout(() => setError(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleExportReport = async () => {
        try {
            const reportData = await JacClient.spawnWalker('generate_tsc_compliance_report', {
                supervisorId: supervisorUser.id
            });

            if (!reportData || !Array.isArray(reportData)) {
                throw new Error('Invalid report data received');
            }

            const headers = ["ID", "Name", "TSC Number", "Department", "Lessons Taught", "Attendance Rate", "Appraisal Score", "Status"];
            const rows = reportData.map(t => [
                t.id,
                t.name,
                t.tscNumber || 'N/A',
                t.department || 'General',
                t.lessonsTaught || 0,
                `${t.attendanceRate || 0}%`,
                `${t.appraisalScore || 0}%`,
                t.status || 'Unknown'
            ].join(","));

            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `TSC_Report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setSuccess('✓ Report exported successfully!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (e) {
            setError(`Failed to export report: ${e.message}`);
            setTimeout(() => setError(null), 5000);
        }
    };

    const filteredTeachers = filter === 'All'
        ? teachers
        : teachers.filter(t => t.status === filter);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100">
            <div className="max-w-7xl mx-auto p-6 space-y-6">

                {/* Success/Error Notifications */}
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

                {/* Header */}
                <div className="bg-white p-10 rounded-[40px] shadow-xl border-2 border-slate-200">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Supervisor Dashboard</h2>
                            <p className="text-slate-600 font-bold text-sm mt-2">Real-time Teacher Performance Monitoring</p>
                        </div>
                        <div className="flex gap-4 flex-wrap">
                            {pendingAppraisals.length > 0 && (
                                <div className="px-6 py-3 bg-amber-100 text-amber-800 rounded-2xl font-black text-sm border-2 border-amber-300">
                                    {pendingAppraisals.length} Pending
                                </div>
                            )}
                            <button
                                onClick={() => setShowObsForm(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase shadow-xl transition-all"
                            >
                                + Observation
                            </button>
                            <button
                                onClick={handleExportReport}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase shadow-xl transition-all"
                            >
                                Export
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-3 p-3 bg-white rounded-3xl shadow-lg border-2 border-slate-200 overflow-x-auto">
                    {[
                        { id: 'staff', label: 'Staff Overview' },
                        { id: 'appraisals', label: `Appraisals${pendingAppraisals.length > 0 ? ` (${pendingAppraisals.length})` : ''}` },
                        { id: 'observations', label: 'Observations' },
                        { id: 'attendance', label: 'Attendance' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-8 py-4 rounded-2xl text-xs font-black uppercase whitespace-nowrap transition-all ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-xl'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Staff Tab */}
                {activeTab === 'staff' && (
                    <div className="bg-white rounded-[40px] shadow-xl border-2 border-slate-200 overflow-hidden">
                        <div className="p-8 border-b-2 border-slate-200 flex flex-wrap justify-between items-center gap-4">
                            <h3 className="text-2xl font-black text-slate-900 uppercase">Teaching Staff</h3>
                            <div className="flex gap-2 flex-wrap">
                                {['All', 'Promotable', 'Good Standing', 'Intervention Needed'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-5 py-2 rounded-2xl text-xs font-black uppercase border-2 transition-all ${filter === f
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                            }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b-2 border-slate-200">
                                    <tr>
                                        <th className="px-8 py-5 text-left font-black uppercase text-xs">Teacher</th>
                                        <th className="px-8 py-5 text-left font-black uppercase text-xs">Department</th>
                                        <th className="px-8 py-5 text-center font-black uppercase text-xs">Lessons</th>
                                        <th className="px-8 py-5 text-center font-black uppercase text-xs">Attendance</th>
                                        <th className="px-8 py-5 text-center font-black uppercase text-xs">TPAD</th>
                                        <th className="px-8 py-5 text-left font-black uppercase text-xs">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                                                    <p className="text-slate-600 font-bold">Loading...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredTeachers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center">
                                                <p className="text-slate-400 font-bold">No teachers found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTeachers.map(t => (
                                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center font-black text-indigo-700 text-lg">
                                                            {t.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <span className="font-black text-slate-900 block">{t.name}</span>
                                                            <span className="text-xs text-indigo-600 font-bold">{t.tscNumber}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-slate-600 font-bold">{t.department}</td>
                                                <td className="px-8 py-6 text-center font-black text-slate-700">{t.lessonsTaught}</td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className={`font-black text-lg ${t.attendanceRate >= 90 ? 'text-emerald-600' :
                                                            t.attendanceRate >= 70 ? 'text-amber-600' : 'text-rose-600'
                                                        }`}>
                                                        {t.attendanceRate}%
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className={`text-2xl font-black ${t.appraisalScore >= 80 ? 'text-emerald-600' :
                                                            t.appraisalScore >= 60 ? 'text-amber-600' : 'text-rose-600'
                                                        }`}>
                                                        {t.appraisalScore}%
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-4 py-2 rounded-2xl font-black text-xs uppercase border-2 ${t.status === 'Promotable'
                                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                                            : t.status === 'Good Standing'
                                                                ? 'bg-blue-100 text-blue-700 border-blue-300'
                                                                : 'bg-amber-100 text-amber-700 border-amber-300'
                                                        }`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Appraisals Tab */}
                {activeTab === 'appraisals' && (
                    <div className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-slate-200">
                        <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase">Pending Appraisals</h3>
                        {pendingAppraisals.length === 0 ? (
                            <div className="text-center py-20">
                                <p className="text-slate-400 font-bold">No pending appraisals</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pendingAppraisals.map(appraisal => (
                                    <div key={appraisal.id} className="bg-gradient-to-br from-white to-indigo-50/30 p-8 rounded-3xl shadow-lg border-2 border-indigo-200">
                                        <div className="mb-4">
                                            <h4 className="font-black text-slate-900 text-xl">{appraisal.teacherName}</h4>
                                            <p className="text-sm text-indigo-600 font-bold">{appraisal.tscNumber}</p>
                                        </div>
                                        <div className="space-y-2 mb-6 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Period:</span>
                                                <span className="font-black">{appraisal.period}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Standards:</span>
                                                <span className="font-black">{appraisal.standards?.length || 0}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleOpenAppraisal(appraisal)}
                                            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black uppercase text-sm py-4 rounded-2xl shadow-xl transition-all"
                                        >
                                            Review & Rate
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Observations Tab */}
                {activeTab === 'observations' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allObservations.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-slate-200">
                                <p className="text-slate-400 font-bold">No observations recorded</p>
                            </div>
                        ) : (
                            allObservations.map(obs => {
                                const teacher = teachers.find(t => t.id === obs.teacherId);
                                return (
                                    <div key={obs.id} className="bg-white p-8 rounded-3xl shadow-xl border-2 border-slate-200">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-black uppercase">
                                                {obs.type}
                                            </div>
                                            <span className="text-xs text-slate-500 font-bold">{obs.date}</span>
                                        </div>
                                        <h4 className="font-black text-slate-900 text-xl mb-2">{teacher?.name || 'Unknown'}</h4>
                                        <p className="text-xs text-slate-500 font-bold mb-4">Observer: {obs.supervisorName}</p>
                                        <p className="text-sm text-slate-600 line-clamp-4">"{obs.notes}"</p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Attendance Tab */}
                {activeTab === 'attendance' && (
                    <div className="bg-white rounded-[40px] shadow-xl border-2 border-slate-200 overflow-hidden">
                        <div className="p-8 border-b-2 border-slate-200">
                            <h3 className="text-2xl font-black text-slate-900 uppercase">Attendance Statistics</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b-2 border-slate-200">
                                    <tr>
                                        <th className="px-8 py-5 text-left font-black uppercase text-xs">Teacher</th>
                                        <th className="px-8 py-5 text-center font-black uppercase text-xs">Lessons</th>
                                        <th className="px-8 py-5 text-center font-black uppercase text-xs">Rate</th>
                                        <th className="px-8 py-5 text-center font-black uppercase text-xs">Avg Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {attendanceStats.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-20 text-center">
                                                <p className="text-slate-400 font-bold">No attendance data</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        attendanceStats.map(stat => (
                                            <tr key={stat.id} className="hover:bg-slate-50">
                                                <td className="px-8 py-6">
                                                    <div className="font-black text-slate-900">{stat.name}</div>
                                                    <div className="text-xs text-slate-500 font-bold">{stat.department}</div>
                                                </td>
                                                <td className="px-8 py-6 text-center font-black">{stat.lessonCount}</td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className={`font-black text-xl ${stat.completionRate >= 90 ? 'text-emerald-600' :
                                                            stat.completionRate >= 70 ? 'text-amber-600' : 'text-rose-600'
                                                        }`}>
                                                        {stat.completionRate}%
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-center font-black">{stat.avgDuration} min</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Observation Modal */}
                {showObsForm && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
                        <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl">
                            <div className="p-10 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                                <h3 className="text-3xl font-black mb-2">Record Classroom Observation</h3>
                                <p className="text-indigo-200">Document teacher performance and instructional quality</p>
                            </div>
                            <form onSubmit={handleAddObservation} className="p-10 space-y-6">
                                <div>
                                    <label className="block text-sm font-black text-slate-700 uppercase tracking-wide mb-3">Select Teacher</label>
                                    <select
                                        value={obsTeacherId}
                                        onChange={e => setObsTeacherId(e.target.value)}
                                        className="w-full border-2 border-slate-200 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                                        required
                                    >
                                        <option value="">Choose a teacher...</option>
                                        {teachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.name} - {t.department}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-black text-slate-700 uppercase tracking-wide mb-3">Observation Type</label>
                                    <select
                                        value={obsType}
                                        onChange={e => setObsType(e.target.value)}
                                        className="w-full border-2 border-slate-200 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                                    >
                                        <option>Regular Walkthrough</option>
                                        <option>Full Lesson Observation</option>
                                        <option>CBC Compliance Review</option>
                                        <option>Performance Improvement</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-black text-slate-700 uppercase tracking-wide mb-3">Observation Notes</label>
                                    <textarea
                                        value={obsNotes}
                                        onChange={e => setObsNotes(e.target.value)}
                                        className="w-full border-2 border-slate-200 rounded-2xl p-6 min-h-[180px] outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-none"
                                        placeholder="Document instructional delivery, learner engagement, classroom management, and CBC compliance..."
                                        required
                                    />
                                </div>
                                <div className="flex gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowObsForm(false);
                                            setObsNotes('');
                                            setObsTeacherId('');
                                        }}
                                        className="flex-1 py-4 px-6 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black py-4 px-6 rounded-2xl uppercase text-sm tracking-wide shadow-xl shadow-indigo-600/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Saving...' : 'Save Observation'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showAppraisalModal && selectedAppraisal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
                        <div className="bg-white rounded-[40px] w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl my-6">
                            <div className="p-10 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white sticky top-0 z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-3xl font-black mb-2">{selectedAppraisal.teacherName}</h3>
                                        <p className="text-indigo-200 font-medium">TPAD Supervisor Review - {selectedAppraisal.period}</p>
                                        <p className="text-indigo-300 text-sm mt-2">TSC: {selectedAppraisal.tscNumber}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowAppraisalModal(false);
                                            setSelectedAppraisal(null);
                                            setSupervisorRatings({});
                                        }}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="p-10 space-y-6">
                                <h4 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-wide">Rate Teaching Standards</h4>

                                {selectedAppraisal.standards && selectedAppraisal.standards.map((standard, index) => (
                                    <div key={standard.id} className="bg-gradient-to-r from-white to-slate-50 rounded-3xl p-8 border-2 border-slate-200 hover:border-indigo-300 transition-all">
                                        <div className="flex items-start gap-6 mb-6">
                                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <h5 className="font-black text-slate-900 text-xl mb-2">{standard.name}</h5>
                                                <p className="text-slate-600 mb-4">{standard.description}</p>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-bold border-2 border-blue-200">
                                                        Teacher Rating: {standard.selfRating}/5
                                                    </div>
                                                    {standard.evidence && standard.evidence[0] && (
                                                        <div className="flex-1">
                                                            <p className="text-xs font-bold text-slate-500 mb-1">Evidence:</p>
                                                            <p className="text-sm text-slate-700 italic line-clamp-2">"{standard.evidence[0]}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-black text-slate-700 uppercase tracking-wide mb-4">Supervisor Rating</label>
                                            <div className="grid grid-cols-5 gap-3">
                                                {[1, 2, 3, 4, 5].map(rating => (
                                                    <button
                                                        key={rating}
                                                        type="button"
                                                        onClick={() => handleRateStandard(standard.id, rating)}
                                                        className={`py-5 rounded-2xl font-black text-2xl transition-all transform hover:scale-105 ${supervisorRatings[standard.id] === rating
                                                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-xl shadow-indigo-600/40'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                            }`}
                                                    >
                                                        {rating}
                                                        <span className="block text-xs font-bold uppercase mt-1 opacity-70">
                                                            {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'V.Good' : 'Excellent'}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="flex gap-4 pt-8 sticky bottom-0 bg-white pb-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAppraisalModal(false);
                                            setSelectedAppraisal(null);
                                            setSupervisorRatings({});
                                        }}
                                        className="flex-1 px-8 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSubmitAppraisal}
                                        disabled={loading || Object.values(supervisorRatings).some(r => r === 0)}
                                        className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl font-black uppercase text-sm tracking-wide shadow-2xl shadow-emerald-600/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                                    >
                                        {loading ? 'Submitting...' : 'Submit to Principal'}
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
        </div>
    );
};

const App = () => {
    const mockUser = {
        id: 'supervisor_001',
        name: 'Dr. Sarah Kamau',
        role: 'supervisor',
        email: 'sarah.kamau@school.edu'
    };

    return <SupervisorDashboard user={mockUser} />;
};

export default App;
