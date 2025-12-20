import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import LessonGenerator from './components/LessonGenerator';
import Whiteboard from './components/Whiteboard';
import VirtualLab from './components/VirtualLab';
import OfflineLibrary from './components/OfflineLibrary';
import LoginPage from './components/LoginPage';
import AttendanceTracker from './components/AttendanceTracker';
import SupervisorDashboard from './components/SupervisorDashboard';
import CollaborationHub from './components/CollaborationHub';
import AppraisalSystem from './components/AppraisalSystem';
import StudentTracker from './components/StudentTracker';
import AdminPanel from './components/AdminPanel';
import QuizSystem from './components/QuizSystem';
import { ViewState, LessonPlan, User, UserRole } from '../types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [savedLessons, setSavedLessons] = useState<LessonPlan[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonPlan | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const storedLessons = localStorage.getItem('elimu_lessons');
    if (storedLessons) setSavedLessons(JSON.parse(storedLessons));

    const storedUser = localStorage.getItem('elimu_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }

    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    return () => {
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
    }
  }, []);

  const handleLogin = (role: UserRole, name: string, id: string, tscNumber?: string) => {
    const newUser: User = {
      id,
      name,
      email: `${name.toLowerCase().replace(/\s/g, '.')}@school.edu.ke`,
      role,
      tscNumber,
      department: role === 'teacher' || role === 'supervisor' ? 'Science' : undefined
    };
    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem('elimu_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('elimu_user');
    setCurrentView('dashboard');
  };

  const saveLesson = (lesson: LessonPlan) => {
    const updated = [lesson, ...savedLessons];
    setSavedLessons(updated);
    localStorage.setItem('elimu_lessons', JSON.stringify(updated));
  };

  const deleteLesson = (id: string) => {
    const updated = savedLessons.filter(l => l.id !== id);
    setSavedLessons(updated);
    localStorage.setItem('elimu_lessons', JSON.stringify(updated));
  };

  const renderContent = () => {
    if (selectedLesson && currentView === 'saved-lessons') {
      return (
        <div className="p-12 bg-white h-full overflow-y-auto rounded-[40px] shadow-sm border border-slate-200">
          <button onClick={() => setSelectedLesson(null)} className="mb-8 text-emerald-600 font-black uppercase text-[10px] tracking-widest hover:underline flex items-center gap-2">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Library
          </button>
          <h1 className="text-4xl font-black mb-2 text-slate-900 uppercase tracking-tighter">{selectedLesson.topic}</h1>
          <div className="text-xs font-black text-slate-400 mb-10 flex gap-3 uppercase tracking-widest">
            <span className="bg-slate-100 px-3 py-1 rounded-full">{selectedLesson.subject}</span>
            <span className="bg-slate-100 px-3 py-1 rounded-full">{selectedLesson.grade}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100">
              <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4">Competencies</h3>
              <ul className="space-y-2">
                {selectedLesson.coreCompetencies.map((c, i) => <li key={i} className="text-sm font-bold text-slate-700 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>{c}</li>)}
              </ul>
            </div>
            <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100">
              <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4">Values</h3>
              <ul className="space-y-2">
                {selectedLesson.values.map((v, i) => <li key={i} className="text-sm font-bold text-slate-700 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>{v}</li>)}
              </ul>
            </div>
            <div className="bg-emerald-50 p-8 rounded-[32px] border border-emerald-100">
              <h3 className="font-black text-[10px] text-emerald-600 uppercase tracking-widest mb-4">Inquiry Questions</h3>
              <ul className="space-y-2 italic">
                {selectedLesson.keyInquiryQuestions && selectedLesson.keyInquiryQuestions.map((q, i) => <li key={i} className="text-sm font-bold text-emerald-800 leading-tight">"{q}"</li>)}
              </ul>
            </div>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <div className="p-10">
            <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Command Center</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mb-12">Institutional OSP Node Active: {user?.name}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 cursor-pointer hover:border-emerald-500 transition-all group" onClick={() => setCurrentView('lesson-planner')}>
                <div className="w-16 h-16 bg-emerald-100 rounded-[24px] flex items-center justify-center text-emerald-600 mb-8 transition-transform group-hover:scale-110 shadow-lg shadow-emerald-500/10"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                <h3 className="font-black text-xl mb-1 uppercase tracking-tighter">AI Orchestrator</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Multi-Agent Planner</p>
              </div>
              <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 cursor-pointer hover:border-indigo-500 transition-all group" onClick={() => setCurrentView('quiz-master')}>
                <div className="w-16 h-16 bg-indigo-100 rounded-[24px] flex items-center justify-center text-indigo-600 mb-8 transition-transform group-hover:scale-110 shadow-lg shadow-indigo-500/10"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>
                <h3 className="font-black text-xl mb-1 uppercase tracking-tighter">Quiz Master</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">AI Assessment Engine</p>
              </div>
              <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 cursor-pointer hover:border-teal-500 transition-all group" onClick={() => setCurrentView('student-tracker')}>
                <div className="w-16 h-16 bg-teal-100 rounded-[24px] flex items-center justify-center text-teal-600 mb-8 transition-transform group-hover:scale-110 shadow-lg shadow-teal-500/10"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>
                <h3 className="font-black text-xl mb-1 uppercase tracking-tighter">Learner Registry</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Skill Mastery Index</p>
              </div>
            </div>
          </div>
        );
      case 'lesson-planner': return <LessonGenerator onSave={saveLesson} />;
      case 'whiteboard': return <Whiteboard />;
      case 'virtual-lab': return <VirtualLab />;
      case 'quiz-master': return <QuizSystem lessons={savedLessons} />;
      case 'saved-lessons': return <OfflineLibrary lessons={savedLessons} onView={setSelectedLesson} onDelete={deleteLesson} />;
      case 'attendance': return user ? <AttendanceTracker user={user} /> : null;
      case 'appraisal':
        return user?.role === 'supervisor' || user?.role === 'admin'
          ? <SupervisorDashboard />
          : user ? <AppraisalSystem user={user} mode="teacher" /> : null;
      case 'collaboration': return <CollaborationHub savedLessons={savedLessons} user={user} />;
      case 'student-tracker': return user ? <StudentTracker user={user} /> : null;
      case 'admin-panel': return <AdminPanel />;
      default: return <div>Not Found</div>;
    }
  };

  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Navigation
        currentView={currentView}
        onNavigate={(v) => { setCurrentView(v); setSelectedLesson(null); }}
        userRole={user?.role || 'teacher'}
        userName={user?.name || ''}
        onLogout={handleLogout}
      />
      <main className="md:ml-72 flex-1 p-8 h-screen overflow-hidden flex flex-col relative transition-all duration-300">
        {!isOnline && (
          <div className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest text-center py-2 absolute top-0 left-0 right-0 z-50 shadow-md">
            Offline Logic Active • Local Registry Synced
          </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
};

export default App;