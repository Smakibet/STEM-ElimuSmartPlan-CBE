import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface User {
    id: string;
    role: 'admin' | 'supervisor' | 'teacher';
    name: string;
    email: string;
    tscNumber?: string;
}

interface Student {
    id: string;
    name: string;
    admissionNumber: string;
    grade: string;
    subjects: string[];
    overallPerformance: number;
    attendanceRate: number;
    skills: string[];
    recentActivity: string[];
}

interface SystemConfig {
    schoolName: string;
    currentTerm: string;
    academicYear: string;
    gradingScale: string;
}

const JacClient = {
    spawnWalker: async (walkerName: string, params: any) => {
        try {
            const response = await fetch(`${API_BASE}/walker/${walkerName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Backend request failed');
            }
            const result = await response.json();
            if (Array.isArray(result)) return result;
            if (result.success && result.data !== undefined) return result.data;
            return result;
        } catch (error) {
            console.error(`JacClient Error (${walkerName}):`, error);
            throw error;
        }
    }
};

const AdminPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'staff' | 'students' | 'system'>('staff');
    const [users, setUsers] = useState<User[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [config, setConfig] = useState<SystemConfig>({
        schoolName: 'SMACQX STEM Academy',
        currentTerm: 'Term 1',
        academicYear: '2026',
        gradingScale: 'Standard'
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [showUserModal, setShowUserModal] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);

    const [userForm, setUserForm] = useState<Partial<User>>({ role: 'teacher' });
    const [studentForm, setStudentForm] = useState<Partial<Student>>({
        grade: 'Grade 7',
        subjects: [],
        overallPerformance: 0,
        attendanceRate: 100,
        skills: [],
        recentActivity: []
    });

    const [systemStats, setSystemStats] = useState({
        totalStaff: 0,
        totalStudents: 0,
        activeTPAD: 0,
        pendingApprovals: 0
    });

    useEffect(() => {
        loadData();
        const interval = setInterval(() => loadData(true), 10000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [userData, studentData, configData] = await Promise.all([
                JacClient.spawnWalker('get_all_users', { userId: 'admin_default' }),
                JacClient.spawnWalker('get_all_students', { userId: 'admin_default' }),
                JacClient.spawnWalker('get_config', {})
            ]);

            if (userData && Array.isArray(userData)) setUsers(userData);
            if (studentData && Array.isArray(studentData)) setStudents(studentData);
            if (configData && !Array.isArray(configData)) setConfig(configData);

            setSystemStats({
                totalStaff: userData?.length || 0,
                totalStudents: studentData?.length || 0,
                activeTPAD: 0,
                pendingApprovals: 0
            });
        } catch (err: any) {
            if (!silent) setError(`Connection Error: ${err.message}`);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updated = await JacClient.spawnWalker('manage_user', {
                action: 'create',
                userData: { id: `user_${Date.now()}`, ...userForm }
            });
            if (Array.isArray(updated)) setUsers(updated);
            setShowUserModal(false);
            setUserForm({ role: 'teacher' });
            setSuccess('✓ Staff member registered successfully!');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updated = await JacClient.spawnWalker('manage_student', {
                action: 'add',
                studentData: { id: `student_${Date.now()}`, ...studentForm }
            });
            if (Array.isArray(updated)) setStudents(updated);
            setShowStudentModal(false);
            setStudentForm({ grade: 'Grade', subjects: [], overallPerformance: 0, attendanceRate: 100 });
            setSuccess('✓ Student enrolled successfully!');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure?")) return;
        setLoading(true);
        try {
            const updated = await JacClient.spawnWalker('manage_user', { action: 'delete', userId });
            if (Array.isArray(updated)) setUsers(updated);
            setSuccess('✓ Staff deleted successfully!');
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    const handleDeleteStudent = async (studentId: string) => {
        if (!confirm("Are you sure?")) return;
        setLoading(true);
        try {
            const updated = await JacClient.spawnWalker('manage_student', { action: 'delete', studentId });
            if (Array.isArray(updated)) setStudents(updated);
            setSuccess('✓ Student removed successfully!');
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    const handleSaveConfig = async () => {
        setLoading(true);
        try {
            await JacClient.spawnWalker('update_config', { config });
            setSuccess('✓ System settings updated globally');
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    const toggleSubject = (subject: string) => {
        const current = studentForm.subjects || [];
        setStudentForm({
            ...studentForm,
            subjects: current.includes(subject) ? current.filter(s => s !== subject) : [...current, subject]
        });
    };

    const availableSubjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'Kiswahili', 'Geography', 'Business Studies', 'Agriculture', 'Integrated Science'];

    return (
        <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100">
            <div className="max-w-7xl mx-auto p-6 space-y-6 pb-20">

                {/* Status Alerts */}
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg border-2 border-emerald-200 w-fit">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-black text-slate-700 uppercase">Live • Auto-sync every 10 sec</span>
                </div>

                {success && (
                    <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 px-6 py-5 rounded-3xl flex items-center justify-between shadow-lg">
                        <span className="font-bold">{success}</span>
                        <button onClick={() => setSuccess(null)}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                )}

                {/* Header */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 rounded-[40px] p-10 text-white shadow-2xl">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="flex-1">
                            <div className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur rounded-full text-xs font-black uppercase tracking-wider mb-4">System Administration</div>
                            <h1 className="text-5xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">Administrative Control Panel</h1>
                            <p className="text-indigo-200 text-lg font-medium">{config.schoolName} Solutions</p>
                        </div>
                        <button onClick={() => loadData()} disabled={loading} className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-2xl font-bold transition-all flex items-center gap-2">
                            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-3xl p-8 border-2 border-indigo-200">
                        <p className="text-xs font-black text-indigo-600 uppercase mb-2">Total Staff</p>
                        <p className="text-5xl font-black text-indigo-900">{systemStats.totalStaff}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-3xl p-8 border-2 border-emerald-200">
                        <p className="text-xs font-black text-emerald-600 uppercase mb-2">Total Students</p>
                        <p className="text-5xl font-black text-emerald-900">{systemStats.totalStudents}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-3xl p-8 border-2 border-amber-200">
                        <p className="text-xs font-black text-amber-600 uppercase mb-2">Active TPAD</p>
                        <p className="text-5xl font-black text-amber-900">{systemStats.activeTPAD}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-3xl p-8 border-2 border-purple-200">
                        <p className="text-xs font-black text-purple-600 uppercase mb-2">Pending</p>
                        <p className="text-5xl font-black text-purple-900">{systemStats.pendingApprovals}</p>
                    </div>
                </div>

                {/* Tabs and Main Content */}
                <div className="bg-white rounded-[40px] shadow-xl border-2 border-slate-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b-2 border-slate-200 p-6">
                        <div className="flex gap-3 overflow-x-auto">
                            {[{ key: 'staff', icon: '👥', label: 'Staff Registry' }, { key: 'students', icon: '🎓', label: 'Student Registry' }, { key: 'system', icon: '⚙️', label: 'System Settings' }].map((tab) => (
                                <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all ${activeTab === tab.key ? 'bg-indigo-600 text-white shadow-xl transform scale-105' : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-indigo-300'}`}>
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-10 max-h-[600px] overflow-y-auto">
                        {activeTab === 'staff' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-black text-slate-900">Staff Registry</h2>
                                    <button onClick={() => setShowUserModal(true)} className="px-8 py-4 bg-emerald-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl shadow-emerald-600/30 transition-all">+ Register Staff</button>
                                </div>
                                <div className="border-2 border-slate-200 rounded-3xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-900 text-white text-xs uppercase font-black">
                                            <tr><th className="px-8 py-5">Staff Member</th><th className="px-8 py-5">Email</th><th className="px-8 py-5">Role</th><th className="px-8 py-5 text-right">Actions</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {users.map(u => (
                                                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-8 py-6 font-bold">{u.name}</td>
                                                    <td className="px-8 py-6 text-slate-600">{u.email}</td>
                                                    <td className="px-8 py-6 uppercase text-xs font-black">{u.role}</td>
                                                    <td className="px-8 py-6 text-right"><button onClick={() => handleDeleteUser(u.id)} disabled={u.id === 'admin_default'} className="text-rose-600 font-bold text-sm">Delete</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'students' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-black text-slate-900">Student Registry</h2>
                                    <button onClick={() => setShowStudentModal(true)} className="px-8 py-4 bg-emerald-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl transition-all">+ Enroll Student</button>
                                </div>
                                <div className="border-2 border-slate-200 rounded-3xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-900 text-white text-xs uppercase font-black">
                                            <tr><th className="px-8 py-5">Student Name</th><th className="px-8 py-5">Adm No.</th><th className="px-8 py-5">Grade</th><th className="px-8 py-5 text-right">Actions</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {students.map(s => (
                                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-8 py-6 font-bold">{s.name}</td>
                                                    <td className="px-8 py-6 font-mono">{s.admissionNumber}</td>
                                                    <td className="px-8 py-6 font-bold text-indigo-600">{s.grade}</td>
                                                    <td className="px-8 py-6 text-right"><button onClick={() => handleDeleteStudent(s.id)} className="text-rose-600 font-bold text-sm">Remove</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'system' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-black text-slate-900">System Configuration</h2>
                                    <button onClick={handleSaveConfig} disabled={loading} className="px-8 py-4 bg-indigo-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl transition-all">Save All Changes</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-slate-50 border-2 border-slate-200 rounded-[32px] p-8 space-y-5">
                                        <h3 className="text-lg font-black text-slate-800">🏫 Institution Identity</h3>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase text-slate-500">Official School Name</label>
                                            <input type="text" className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold" value={config.schoolName} onChange={e => setConfig({ ...config, schoolName: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 border-2 border-slate-200 rounded-[32px] p-8 space-y-5">
                                        <h3 className="text-lg font-black text-slate-800">📅 Academic Calendar</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-black uppercase text-slate-500">Current Term</label>
                                                <select className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold" value={config.currentTerm} onChange={e => setConfig({ ...config, currentTerm: e.target.value })}>
                                                    <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-black uppercase text-slate-500">Year</label>
                                                <input type="text" className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold" value={config.academicYear} onChange={e => setConfig({ ...config, academicYear: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals (User and Student) */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="bg-slate-900 p-8 text-white flex justify-between">
                            <h3 className="text-2xl font-black">Register Staff</h3>
                            <button onClick={() => setShowUserModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleAddUser} className="p-8 space-y-5">
                            <input type="text" placeholder="Name" className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl" value={userForm.name || ''} onChange={e => setUserForm({ ...userForm, name: e.target.value })} required />
                            <input type="email" placeholder="Email" className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl" value={userForm.email || ''} onChange={e => setUserForm({ ...userForm, email: e.target.value })} required />
                            <select className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value as any })}>
                                <option value="teacher">Teacher</option><option value="supervisor">Supervisor</option><option value="admin">Admin</option>
                            </select>
                            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase">Register</button>
                        </form>
                    </div>
                </div>
            )}

            {showStudentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl">
                        <div className="bg-slate-900 p-8 text-white flex justify-between">
                            <h3 className="text-2xl font-black">Enroll Student</h3>
                            <button onClick={() => setShowStudentModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleAddStudent} className="p-8 space-y-6">
                            <input type="text" placeholder="Student Name" className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl" value={studentForm.name || ''} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} required />
                            <input type="text" placeholder="Admission Number" className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl" value={studentForm.admissionNumber || ''} onChange={e => setStudentForm({ ...studentForm, admissionNumber: e.target.value })} required />
                            <select className="w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl" value={studentForm.grade} onChange={e => setStudentForm({ ...studentForm, grade: e.target.value })}>
                                <option value="Grade 7">Grade 7</option><option value="Grade 8">Grade 8</option><option value="Grade 9">Grade 9</option><option value="Grade 10">Grade 10</option><option value="Grade 11">Grade 11</option><option value="Grade 12">Grade 12</option>
                            </select>
                            <div className="grid grid-cols-3 gap-2 p-4 bg-slate-50 rounded-2xl max-h-40 overflow-y-auto">
                                {availableSubjects.map(sub => (
                                    <button key={sub} type="button" onClick={() => toggleSubject(sub)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border-2 ${studentForm.subjects?.includes(sub) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>
                                        {sub}
                                    </button>
                                ))}
                            </div>
                            <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase">Enroll</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;