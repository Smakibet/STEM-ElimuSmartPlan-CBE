import React, { useState } from 'react';
import { ViewState, UserRole } from '../../types';

interface NavigationProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  userRole: UserRole;
  userName: string;
  onLogout: () => void;
}

interface NavItem {
  id: ViewState;
  label: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate, userRole, userName, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (view: ViewState) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  const getNavGroups = (): NavGroup[] => {
    const groups: NavGroup[] = [
      {
        label: 'Smacqx Home',
        items: [{ id: 'dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' }]
      }
    ];

    if (userRole === 'teacher') {
      groups.push({
        label: 'STEM TOOLS',
        items: [
          { id: 'lesson-planner', label: 'AI Lesson Master', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
          { id: 'attendance', label: 'Clock In/Out', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          { id: 'timetable-manager', label: 'Timetable Manager', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
          { id: 'quiz-master', label: 'Quiz Master', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
          { id: 'virtual-lab', label: 'Virtual Lab', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
          { id: 'whiteboard', label: 'Interactive Board', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
          { id: 'saved-lessons', label: 'Offline Library', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
        ]
      });
      groups.push({
        label: 'Analytics',
        items: [
          { id: 'student-tracker', label: 'Learner Progress', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          { id: 'appraisal', label: 'TPAD Performance', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04M12 21.48l1.307-1.307a10.5 10.5 0 01-7.314-14.48L12 4.384l5.314 1.307a10.5 10.5 0 01-7.314 14.48L12 21.48z' },
        ]
      });
    }

    if (userRole === 'supervisor' || userRole === 'admin') {
      groups.push({
        label: 'Institutional Tools',
        items: [
          { id: 'appraisal', label: 'Staff Review', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z' },
          { id: 'collaboration', label: 'Collaboration', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' }
        ]
      });
    }

    if (userRole === 'admin') {
      groups.push({
        label: 'Smacqx System',
        items: [{ id: 'admin-panel', label: 'Admin Panel', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }]
      });
    }

    return groups;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 active:scale-95"
      >
        {isMobileMenuOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30 animate-fadeIn"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Navigation Sidebar */}
      <nav className={`
        fixed left-0 top-0 h-screen flex flex-col 
        bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
        text-white shadow-2xl z-40 w-80
        transition-all duration-500 ease-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 
        border-r border-white/10
        before:absolute before:inset-0 before:bg-gradient-to-b before:from-blue-500/5 before:via-transparent before:to-purple-500/5 before:pointer-events-none
      `}>

        {/* Logo Header */}
        <div className="relative p-6 border-b border-white/10 mt-10 md:mt-0 bg-gradient-to-br from-slate-800/50 to-transparent">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30 transform hover:rotate-6 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-tight">
                ElimuSmartPlan
              </h1>
              <p className="text-[10px] text-blue-300/80 font-bold uppercase tracking-[0.2em] mt-0.5">Kenyan STEM Master</p>
            </div>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          {getNavGroups().map((group, gIdx) => (
            <div key={gIdx} className="mb-6">
              <h3 className="px-4 mb-3 text-[10px] font-black text-blue-400/60 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-400/60"></div>
                {group.label}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`
                      w-full flex items-center px-4 py-3.5 rounded-2xl 
                      transition-all duration-300 group relative overflow-hidden
                      ${currentView === item.id
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    {/* Animated Background for Active Item */}
                    {currentView === item.id && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse"></div>
                    )}

                    {/* Icon Container */}
                    <div className={`
                      relative p-2 rounded-xl mr-3 transition-all duration-300
                      ${currentView === item.id
                        ? 'bg-white/20 text-white shadow-inner'
                        : 'bg-slate-700/50 text-slate-400 group-hover:bg-slate-600/50 group-hover:text-blue-400'
                      }
                    `}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={item.icon} />
                      </svg>
                    </div>

                    {/* Label */}
                    <span className="relative font-bold text-xs uppercase tracking-wide">
                      {item.label}
                    </span>

                    {/* Active Indicator */}
                    {currentView === item.id && (
                      <div className="ml-auto flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse"></div>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}

                    {/* Hover Arrow */}
                    {currentView !== item.id && (
                      <svg className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* User Profile Footer */}
        <div className="relative p-6 border-t border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl">
          {/* Decorative Gradient */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

          <div className="flex items-center gap-4 mb-5">
            <div className="relative group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-xl shadow-blue-500/30 border-2 border-white/20 transform group-hover:scale-110 transition-transform duration-300">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-3 border-slate-900 shadow-lg shadow-emerald-400/50">
                <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping"></div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate mb-1">{userName}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg inline-block">
                {userRole}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-3.5 text-xs font-black uppercase tracking-wider
              text-rose-400 hover:text-white
              bg-gradient-to-r from-rose-500/10 to-pink-500/10 
              hover:from-rose-500 hover:to-pink-600
              border border-rose-500/30 hover:border-transparent
              rounded-2xl transition-all duration-300
              flex items-center justify-center gap-3 group
              shadow-lg hover:shadow-rose-500/30
              active:scale-95"
          >
            <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </nav>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #6366f1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #4f46e5);
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default Navigation;
