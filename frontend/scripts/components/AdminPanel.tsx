import React, { useState, useEffect } from 'react';
import { JacClient } from '../../services/jacService';
import { User, UserRole, Student } from '../../types';

const AdminPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'staff' | 'students'>('staff');
    const [users, setUsers] = useState<User[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showUserModal, setShowUserModal] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);

    const [userForm, setUserForm] = useState<Partial<User>>({ role: 'teacher' });
    const [studentForm, setStudentForm] = useState<Partial<Student>>({ grade: 'Grade 7', subjects: [] });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Load users from backend
            const userData = await JacClient.spawnWalker('get_all_users', {}, {
                id: 'admin',
                role: 'admin',
                name: 'Admin',
                email: 'admin@smacqx.ke'
            });

            if (userData && Array.isArray(userData)) {
                setUsers(userData as User[]);
            } else {
                console.warn('Unexpected user data format:', userData);
                setUsers([]);
            }

            // Load students from backend
            const studentData = await JacClient.spawnWalker('get_all_students', {}, {
                id: 'admin',
                role: 'admin',
                name: 'Admin',
                email: 'admin@smacqx.ke'
            });

            if (studentData && Array.isArray(studentData)) {
                setStudents(studentData as Student[]);
            } else {
                console.warn('Unexpected student data format:', studentData);
                setStudents([]);
            }
        } catch (error) {
            console.error("Failed to load data:", error);
            setError("Failed to load data from server. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!userForm.name || !userForm.email) {
            alert("Please fill in all required fields");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const updated = await JacClient.spawnWalker('manage_user', {
                action: 'create',
                userData: {
                    ...userForm,
                    id: `user_${Date.now()}`, // Generate temporary ID
                }
            }, {
                id: 'admin',
                role: 'admin',
                name: 'Admin',
                email: 'admin@smacqx.ke'
            });

            if (updated && Array.isArray(updated)) {
                setUsers(updated as User[]);
                setShowUserModal(false);
                setUserForm({ role: 'teacher' });
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error("Failed to add user:", error);
            setError("Failed to register staff member. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!studentForm.name || !studentForm.admissionNumber) {
            alert("Please fill in all required fields");
            return;
        }

        if (!studentForm.subjects || studentForm.subjects.length === 0) {
            alert("Please allocate at least one lesson/subject.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const updated = await JacClient.spawnWalker('manage_student', {
                action: 'add',
                studentData: {
                    ...studentForm,
                    id: `student_${Date.now()}`, // Generate temporary ID
                    overallPerformance: 0,
                    attendanceRate: 100,
                    skills: [],
                    recentActivity: []
                }
            }, {
                id: 'admin',
                role: 'admin',
                name: 'Admin',
                email: 'admin@smacqx.ke'
            });

            if (updated && Array.isArray(updated)) {
                setStudents(updated as Student[]);
                setShowStudentModal(false);
                setStudentForm({ grade: 'Grade 7', subjects: [] });
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error("Failed to add student:", error);
            setError("Failed to enroll student. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this staff member?")) {
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const updated = await JacClient.spawnWalker('manage_user', {
                action: 'delete',
                userId
            }, {
                id: 'admin',
                role: 'admin',
                name: 'Admin',
                email: 'admin@smacqx.ke'
            });

            if (updated && Array.isArray(updated)) {
                setUsers(updated as User[]);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error("Failed to delete user:", error);
            setError("Failed to delete staff member. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStudent = async (studentId: string) => {
        if (!confirm("Are you sure you want to delete this student?")) {
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const updated = await JacClient.spawnWalker('manage_student', {
                action: 'delete',
                studentId
            }, {
                id: 'admin',
                role: 'admin',
                name: 'Admin',
                email: 'admin@smacqx.ke'
            });

            if (updated && Array.isArray(updated)) {
                setStudents(updated as Student[]);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error("Failed to delete student:", error);
            setError("Failed to delete student. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const toggleSubject = (subject: string) => {
        const current = studentForm.subjects || [];
        if (current.includes(subject)) {
            setStudentForm({ ...studentForm, subjects: current.filter(s => s !== subject) });
        } else {
            setStudentForm({ ...studentForm, subjects: [...current, subject] });
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6 overflow-y-auto pb-10">
            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center justify-between">
                    <span className="text-sm font-medium">{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">System Administration</h2>
                    <p className="text-slate-500 font-medium font-sans">Institutional control & learner registry - SMACQX STEM ElimuSmartPlan</p>
                </div>
                <div className="flex p-1 bg-slate-100 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('staff')}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Staff
                    </button>
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'students' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Students
                    </button>
                </div>
            </div>

            {activeTab === 'staff' ? (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <div>
                            <h3 className="font-bold text-slate-800">Departmental Staff Registry</h3>
                            <p className="text-xs text-slate-500 mt-1">Total: {users.length} registered staff</p>
                        </div>
                        <button
                            onClick={() => setShowUserModal(true)}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold py-2 px-6 rounded-xl text-xs transition-all shadow-md active:scale-95"
                        >
                            + Register Staff
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                                <tr>
                                    <th className="px-8 py-5">Staff Identity</th>
                                    <th className="px-8 py-5">System Role</th>
                                    <th className="px-8 py-5">TSC Number</th>
                                    <th className="px-8 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                <p className="font-bold">No staff members registered yet</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50/80 transition-all">
                                            <td className="px-8 py-5">
                                                <span className="font-bold text-slate-800 block">{u.name}</span>
                                                <span className="text-xs text-slate-400 font-medium">{u.email}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-2 py-1 rounded-lg font-black text-[10px] uppercase tracking-tighter ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{u.role}</span>
                                            </td>
                                            <td className="px-8 py-5 text-slate-500 font-mono text-xs">{u.tscNumber || '---'}</td>
                                            <td className="px-8 py-5 text-right">
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    disabled={loading}
                                                    className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                                    title="Delete staff member"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                        <div>
                            <h3 className="font-bold text-slate-800 uppercase tracking-tighter">CBC Learner Registry</h3>
                            <p className="text-xs text-slate-500 mt-1">Total: {students.length} enrolled students</p>
                        </div>
                        <button
                            onClick={() => setShowStudentModal(true)}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold py-2 px-6 rounded-xl text-xs transition-all shadow-md active:scale-95"
                        >
                            + Enroll New Student
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                                <tr>
                                    <th className="px-8 py-5">Full Name & ADM</th>
                                    <th className="px-8 py-5">Grade Level</th>
                                    <th className="px-8 py-5">Allocated Lessons</th>
                                    <th className="px-8 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {students.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                                <p className="font-bold">No students enrolled yet</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    students.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50/80 transition-all">
                                            <td className="px-8 py-5">
                                                <span className="font-bold text-slate-800 block">{s.name}</span>
                                                <span className="text-xs text-indigo-500 font-black">{s.admissionNumber}</span>
                                            </td>
                                            <td className="px-8 py-5 font-bold text-slate-600 uppercase text-xs">{s.grade}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                    {s.subjects.map((sub, i) => (
                                                        <span key={i} className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter border border-slate-200">
                                                            {sub}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button
                                                    onClick={() => handleDeleteStudent(s.id)}
                                                    disabled={loading}
                                                    className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                                    title="Delete student"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Register Staff Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase tracking-widest">Register Staff</h3>
                            <button onClick={() => setShowUserModal(false)} type="button">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddUser} className="p-8 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">System Role</label>
                                <select
                                    value={userForm.role}
                                    onChange={e => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                                >
                                    <option value="teacher">Teacher</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Staff Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={userForm.name || ''}
                                    onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm"
                                    placeholder="e.g. Margaret Wanjiru"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Institutional Email</label>
                                <input
                                    type="email"
                                    required
                                    value={userForm.email || ''}
                                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono"
                                    placeholder="staff@school.edu.ke"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">TSC Number (Optional)</label>
                                <input
                                    type="text"
                                    value={userForm.tscNumber || ''}
                                    onChange={e => setUserForm({ ...userForm, tscNumber: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono"
                                    placeholder="TSC/123456"
                                />
                            </div>
                            <button
                                disabled={loading}
                                type="submit"
                                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs mt-4 shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing Registry...' : 'Register User'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Enroll Student Modal */}
            {showStudentModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase tracking-widest">Enroll New Learner</h3>
                            <button onClick={() => setShowStudentModal(false)} type="button">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddStudent} className="p-8 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Student Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={studentForm.name || ''}
                                        onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold"
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Admission No.</label>
                                    <input
                                        type="text"
                                        required
                                        value={studentForm.admissionNumber || ''}
                                        onChange={e => setStudentForm({ ...studentForm, admissionNumber: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono"
                                        placeholder="ADM-2024-XXX"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Grade Level Placement</label>
                                <select
                                    value={studentForm.grade}
                                    onChange={e => setStudentForm({ ...studentForm, grade: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                >
                                    {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Allocate STEM Subjects (CBC)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Integrated Science', 'Mathematics', 'Physics', 'Biology', 'Chemistry', 'Computer Science', 'Agriculture', 'Pre-Technical Studies'].map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => toggleSubject(s)}
                                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${studentForm.subjects?.includes(s) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                                {studentForm.subjects && studentForm.subjects.length > 0 && (
                                    <p className="text-xs text-emerald-600 mt-2 font-bold">
                                        {studentForm.subjects.length} subject(s) selected
                                    </p>
                                )}
                            </div>
                            <button
                                disabled={loading}
                                type="submit"
                                className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs mt-4 shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Recording Enrollment...' : 'Enroll Learner'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;


