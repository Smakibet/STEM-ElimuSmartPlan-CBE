
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
import { ViewState, LessonPlan, User, UserRole } from './scripts/types';

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

  const handleLogin = (role: UserRole, name: string) => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email: `${name.toLowerCase().replace(/\s/g, '.')}@school.edu.ke`,
      role,
      tscNumber: 'TSC-' + Math.floor(10000 + Math.random() * 90000),
      department: role === 'teacher' ? 'Science' : undefined
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
        <div className="p-8 bg-white h-full overflow-y-auto rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => setSelectedLesson(null)}
            className="mb-4 text-emerald-600 font-medium hover:underline flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Library
          </button>
          <h1 className="text-3xl font-bold mb-1 text-slate-800">{selectedLesson.topic}</h1>
          <div className="text-sm text-slate-500 mb-6 flex gap-2">
            <span className="bg-slate-100 px-2 py-0.5 rounded">{selectedLesson.subject}</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded">{selectedLesson.grade}</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded">{selectedLesson.duration}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-bold text-slate-700 mb-2">Core Competencies</h3>
              <ul className="list-disc list-inside text-sm text-slate-600">
                {selectedLesson.coreCompetencies.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-bold text-slate-700 mb-2">Values</h3>
              <ul className="list-disc list-inside text-sm text-slate-600">
                {selectedLesson.values.map((v, i) => <li key={i}>{v}</li>)}
              </ul>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
              <h3 className="font-bold text-emerald-800 mb-2">Key Inquiry Questions</h3>
              <ul className="list-disc list-inside text-sm text-emerald-700 italic">
                {selectedLesson.keyInquiryQuestions && selectedLesson.keyInquiryQuestions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Lesson Procedure</h2>
            {selectedLesson.sections.map((section, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-emerald-700">{section.title}</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{section.duration}</span>
                </div>
                <p className="text-slate-700 mb-3 text-sm leading-relaxed">{section.content}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded">
                  <div>
                    <span className="font-bold text-slate-600 block text-xs uppercase mb-1">Teacher Activity</span>
                    <p className="text-slate-600">{section.teacherActivity}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block text-xs uppercase mb-1">Student Activity</span>
                    <p className="text-slate-600">{section.studentActivity}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 className="font-bold text-blue-800 mb-2">PICRAT Analysis</h3>
            <div className="flex items-center mb-2">
              <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded mr-2">{selectedLesson.picratAnalysis.level}</span>
            </div>
            <p className="text-sm text-blue-700">{selectedLesson.picratAnalysis.explanation}</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <div className="p-8">
            <h1 className="text-3xl font-bold text-emerald-700 mb-2">Karibu, {user?.name}</h1>
            <p className="text-slate-600 mb-8">Access the tools from the sidebar to manage your CBE workflow.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-500 transition-colors" onClick={() => setCurrentView('lesson-planner')}>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h3 className="font-bold text-lg mb-1">Plan Lesson</h3>
                <p className="text-sm text-slate-500">Create standardized CBE lesson plans powered by AI.</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-500 transition-colors" onClick={() => setCurrentView('whiteboard')}>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </div>
                <h3 className="font-bold text-lg mb-1">Whiteboard</h3>
                <p className="text-sm text-slate-500">Interactive teaching aid with shapes and download.</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-500 transition-colors" onClick={() => setCurrentView('collaboration')}>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <h3 className="font-bold text-lg mb-1">Collaboration</h3>
                <p className="text-sm text-slate-500">Shared resources and co-teaching schedules.</p>
              </div>
            </div>
          </div>
        );
      case 'lesson-planner': return <LessonGenerator onSave={saveLesson} />;
      case 'whiteboard': return <Whiteboard />;
      case 'virtual-lab': return <VirtualLab />;
      case 'saved-lessons': return <OfflineLibrary lessons={savedLessons} onView={setSelectedLesson} onDelete={deleteLesson} />;
      case 'attendance': return user ? <AttendanceTracker user={user} /> : null;
      case 'appraisal':
        return user?.role === 'supervisor' || user?.role === 'admin'
          ? <SupervisorDashboard />
          : user ? <AppraisalSystem user={user} mode="teacher" /> : null;
      case 'collaboration': return <CollaborationHub savedLessons={savedLessons} user={user} />;
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
      <main className="ml-64 flex-1 p-8 h-screen overflow-hidden flex flex-col relative">
        {!isOnline && (
          <div className="bg-amber-500 text-white text-xs font-bold text-center py-1 absolute top-0 left-0 right-0 z-50 shadow-md">
            Offline Mode Active - Saved lessons available
          </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
