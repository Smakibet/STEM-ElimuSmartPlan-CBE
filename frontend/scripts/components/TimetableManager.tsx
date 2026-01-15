// frontend/src/scripts/components/TimetableManager.tsx
import React, { useState, useEffect } from 'react';

interface Period {
    id: string;
    number: number;
    startTime: string;
    endTime: string;
    duration: number;
}

interface TimetableEntry {
    id: string;
    dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
    periodNumber: number;
    class: string;
    stream: string;
    pathway: 'STEM' | 'Arts' | 'Sports' | 'Technical';
    subject: string;
    strand: string;
    subStrand: string;
    teacherId: string;
    teacherName: string;
    room: string;
    objectives: string[];
}

interface User {
    id: string;
    email: string;
    name: string;
    role: 'teacher' | 'admin' | 'supervisor' | 'student';
}

interface TimetableManagerProps {
    user: User;
    apiBaseUrl?: string;
}

const TimetableManager: React.FC<TimetableManagerProps> = ({
    user,
    apiBaseUrl = 'http://localhost:8000/api'
}) => {
    const [selectedClass, setSelectedClass] = useState<string>('All');
    const [selectedStream, setSelectedStream] = useState<string>('All');
    const [showAddModal, setShowAddModal] = useState(false);
    const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const periods: Period[] = [
        { id: 'p1', number: 1, startTime: '08:00', endTime: '08:40', duration: 40 },
        { id: 'p2', number: 2, startTime: '08:40', endTime: '09:20', duration: 40 },
        { id: 'p3', number: 3, startTime: '09:20', endTime: '10:00', duration: 40 },
        { id: 'break1', number: 0, startTime: '10:00', endTime: '10:20', duration: 20 },
        { id: 'p4', number: 4, startTime: '10:20', endTime: '11:00', duration: 40 },
        { id: 'p5', number: 5, startTime: '11:00', endTime: '11:40', duration: 40 },
        { id: 'p6', number: 6, startTime: '11:40', endTime: '12:20', duration: 40 },
        { id: 'lunch', number: 0, startTime: '12:20', endTime: '13:20', duration: 60 },
        { id: 'p7', number: 7, startTime: '13:20', endTime: '14:00', duration: 40 },
        { id: 'p8', number: 8, startTime: '14:00', endTime: '14:40', duration: 40 },
        { id: 'p9', number: 9, startTime: '14:40', endTime: '15:20', duration: 40 }
    ];

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const classes = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    const streams = ['A', 'B', 'C', 'D'];
    const pathways = ['STEM', 'Arts', 'Sports', 'Technical'];
    const stemSubjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Agricultural Science', 'Integrated Science'];

    const [entryForm, setEntryForm] = useState({
        dayOfWeek: 'Monday' as any,
        periodNumber: 1,
        class: 'Grade 8',
        stream: 'A',
        pathway: 'STEM' as any,
        subject: 'Mathematics',
        strand: '',
        subStrand: '',
        room: '',
        objectives: ''
    });

    useEffect(() => {
        loadTimetable();
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const loadTimetable = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${apiBaseUrl}/timetable/entries`);
            const data = await response.json();

            if (data.success) {
                setTimetableEntries(data.entries || []);
            } else {
                throw new Error(data.error || 'Failed to load timetable');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load timetable';
            setError(errorMessage);
            console.error('Timetable load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEntry = async () => {
        setLoading(true);
        setError(null);

        const entryData = {
            dayOfWeek: entryForm.dayOfWeek,
            periodNumber: entryForm.periodNumber,
            class: entryForm.class,
            stream: entryForm.stream,
            pathway: entryForm.pathway,
            subject: entryForm.subject,
            strand: entryForm.strand,
            subStrand: entryForm.subStrand,
            teacherId: user.id,
            teacherName: user.name,
            room: entryForm.room,
            objectives: entryForm.objectives.split(',').map(o => o.trim()).filter(o => o)
        };

        try {
            const url = editingEntry
                ? `${apiBaseUrl}/timetable/entries/${editingEntry.id}`
                : `${apiBaseUrl}/timetable/entries`;

            const method = editingEntry ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entryData)
            });

            const result = await response.json();

            if (result.success) {
                await loadTimetable();
                setShowAddModal(false);
                setEditingEntry(null);
                setEntryForm({
                    dayOfWeek: 'Monday',
                    periodNumber: 1,
                    class: 'Grade 8',
                    stream: 'A',
                    pathway: 'STEM',
                    subject: 'Mathematics',
                    strand: '',
                    subStrand: '',
                    room: '',
                    objectives: ''
                });
            } else {
                throw new Error(result.error || 'Failed to save entry');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save entry';
            setError(errorMessage);
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEntry = async (id: string) => {
        if (!confirm('Are you sure you want to delete this timetable entry?')) return;

        setLoading(true);
        try {
            const response = await fetch(`${apiBaseUrl}/timetable/entries/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (result.success) {
                await loadTimetable();
            } else {
                throw new Error(result.error || 'Failed to delete entry');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete entry';
            setError(errorMessage);
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleEditEntry = (entry: TimetableEntry) => {
        setEditingEntry(entry);
        setEntryForm({
            dayOfWeek: entry.dayOfWeek,
            periodNumber: entry.periodNumber,
            class: entry.class,
            stream: entry.stream,
            pathway: entry.pathway,
            subject: entry.subject,
            strand: entry.strand,
            subStrand: entry.subStrand,
            room: entry.room,
            objectives: entry.objectives.join(', ')
        });
        setShowAddModal(true);
    };

    const getCurrentPeriod = (): Period | null => {
        const now = currentTime;
        const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        return periods.find(p => currentTimeStr >= p.startTime && currentTimeStr < p.endTime) || null;
    };

    const isCurrentPeriod = (period: Period): boolean => {
        const current = getCurrentPeriod();
        return current?.id === period.id;
    };

    const getEntryForPeriod = (day: string, periodNum: number): TimetableEntry | null => {
        let entries = timetableEntries.filter(e => e.dayOfWeek === day && e.periodNumber === periodNum);
        if (selectedClass !== 'All') entries = entries.filter(e => e.class === selectedClass);
        if (selectedStream !== 'All') entries = entries.filter(e => e.stream === selectedStream);
        return entries[0] || null;
    };

    return (
        <div className="h-full flex flex-col space-y-6 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-700 to-purple-700 rounded-3xl p-8 text-white flex-shrink-0">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">STEM Timetable Manager</h2>
                        <p className="text-indigo-100 text-sm font-bold">
                            Current Time: {currentTime.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })} •
                            {getCurrentPeriod() ? ` Period ${getCurrentPeriod()?.number} in session` : ' No active period'}
                        </p>
                    </div>
                    <button
                        onClick={() => { setEditingEntry(null); setShowAddModal(true); }}
                        disabled={loading}
                        className="bg-white/20 hover:bg-white/30 border-2 border-white/30 rounded-xl px-6 py-3 font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Lesson
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 flex items-center justify-between">
                    <span className="font-bold">{error}</span>
                    <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex-shrink-0">
                <div className="flex gap-4">
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm">
                        <option value="All">All Classes</option>
                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={selectedStream} onChange={e => setSelectedStream(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm">
                        <option value="All">All Streams</option>
                        {streams.map(s => <option key={s} value={s}>Stream {s}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                {loading ? <div className="text-center py-8 font-bold text-slate-500">Loading...</div> : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[1200px]">
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    <th className="p-4 text-left font-black uppercase text-xs tracking-wider border border-slate-700">Period</th>
                                    <th className="p-4 text-left font-black uppercase text-xs tracking-wider border border-slate-700">Time</th>
                                    {daysOfWeek.map(day => <th key={day} className="p-4 text-left font-black uppercase text-xs tracking-wider border border-slate-700">{day}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {periods.filter(p => p.number > 0).map(period => (
                                    <tr key={period.id} className={isCurrentPeriod(period) ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''}>
                                        <td className="p-4 border border-slate-200 font-bold text-slate-800">
                                            Period {period.number}
                                            {isCurrentPeriod(period) && <span className="ml-2 px-2 py-1 bg-emerald-500 text-white text-xs rounded-full font-bold animate-pulse">LIVE</span>}
                                        </td>
                                        <td className="p-4 border border-slate-200 text-sm text-slate-600 font-medium">{period.startTime} - {period.endTime}</td>
                                        {daysOfWeek.map(day => {
                                            const entry = getEntryForPeriod(day, period.number);
                                            return (
                                                <td key={`${day}-${period.id}`} className="p-2 border border-slate-200">
                                                    {entry ? (
                                                        <div className={`p-3 rounded-xl border-l-4 transition-all hover:shadow-lg ${entry.pathway === 'STEM' ? 'bg-indigo-50 border-indigo-500' :
                                                                entry.pathway === 'Arts' ? 'bg-purple-50 border-purple-500' :
                                                                    entry.pathway === 'Sports' ? 'bg-emerald-50 border-emerald-500' : 'bg-amber-50 border-amber-500'
                                                            }`}>
                                                            <p className="font-black text-sm text-slate-800 mb-1">{entry.subject}</p>
                                                            <p className="text-xs text-slate-600 mb-1">{entry.class} {entry.stream}</p>
                                                            <p className="text-xs text-slate-500 truncate">{entry.strand}</p>
                                                            <div className="flex justify-between items-center mt-2">
                                                                <span className="text-xs bg-white px-2 py-0.5 rounded border font-bold text-slate-600">{entry.room}</span>
                                                                <div className="flex gap-1">
                                                                    <button onClick={() => handleEditEntry(entry)} className="text-blue-600 hover:text-blue-800 p-1">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                        </svg>
                                                                    </button>
                                                                    <button onClick={() => handleDeleteEntry(entry.id)} className="text-rose-600 hover:text-rose-800 p-1">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 text-center text-slate-300 text-xs font-bold">Free Period</div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-8 border-b border-slate-200">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{editingEntry ? 'Edit Entry' : 'Add New Lesson'}</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-600 uppercase mb-2">Day</label>
                                    <select value={entryForm.dayOfWeek} onChange={e => setEntryForm({ ...entryForm, dayOfWeek: e.target.value as any })} className="w-full px-4 py-3 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                        {daysOfWeek.map(day => <option key={day} value={day}>{day}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-600 uppercase mb-2">Period</label>
                                    <select value={entryForm.periodNumber} onChange={e => setEntryForm({ ...entryForm, periodNumber: Number(e.target.value) })} className="w-full px-4 py-3 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                        {periods.filter(p => p.number > 0).map(p => <option key={p.id} value={p.number}>Period {p.number} ({p.startTime} - {p.endTime})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-600 uppercase mb-2">Class</label>
                                    <select value={entryForm.class} onChange={e => setEntryForm({ ...entryForm, class: e.target.value })} className="w-full px-4 py-3 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-600 uppercase mb-2">Stream</label>
                                    <select value={entryForm.stream} onChange={e => setEntryForm({ ...entryForm, stream: e.target.value })} className="w-full px-4 py-3 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                        {streams.map(s => <option key={s} value={s}>Stream {s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-600 uppercase mb-2">Pathway</label>
                                    <select value={entryForm.pathway} onChange={e => setEntryForm({ ...entryForm, pathway: e.target.value as any })} className="w-full px-4 py-3 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                        {pathways.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-600 uppercase mb-2">Subject</label>
                                    <select value={entryForm.subject} onChange={e => setEntryForm({ ...entryForm, subject: e.target.value })} className="w-full px-4 py-3 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                        {stemSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-600 uppercase mb-2">Strand</label>
                                    <input type="text" value={entryForm.strand} onChange={e => setEntryForm({ ...entryForm, strand: e.target.value })} placeholder="e.g., Algebra" className="w-full px-4 py-3 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-600 uppercase mb-2">Sub-Strand</label>
                                    <input type="text" value={entryForm.subStrand} onChange={e => setEntryForm({ ...entryForm, subStrand: e.target.value })} placeholder="e.g., Linear Equations" className="w-full px-4 py-3 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-slate-600 uppercase mb-2">Room</label>
                                    <input type="text" value={entryForm.room} onChange={e => setEntryForm({ ...entryForm, room: e.target.value })} placeholder="e.g., Math Lab 1" className="w-full px-4 py-3 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-600 uppercase mb-2">Objectives (comma separated)</label>
                                <textarea value={entryForm.objectives} onChange={e => setEntryForm({ ...entryForm, objectives: e.target.value })} placeholder="Objective 1, Objective 2..." className="w-full px-4 py-3 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" rows={3} />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button onClick={handleSaveEntry} disabled={loading} className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50">
                                    {loading ? 'Saving...' : editingEntry ? 'Update Lesson' : 'Save Lesson'}
                                </button>
                                <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-200 transition-all">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimetableManager;