import React, { useState } from 'react';
import { UserRole } from '../../types';
import { JacClient } from '../../services/jacService';

interface LoginPageProps {
  onLogin: (role: UserRole, name: string, id: string, tscNumber?: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [name, setName] = useState('');
  const [tscNumber, setTscNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        const newUser = await JacClient.spawnWalker('register_user', {
          name, email, role, tscNumber: role === 'teacher' ? tscNumber : undefined
        });
        onLogin(newUser.role, newUser.name, newUser.id, newUser.tscNumber);
      } else {
        const user = await JacClient.spawnWalker('auth_user', { email, password });
        onLogin(user.role, user.name, user.id, user.tscNumber);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 z-10">

        {/* Left: Value Proposition */}
        <div className="flex flex-col justify-center text-white space-y-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">SmacqxTech • v2.4</span>
            </div>
            <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent tracking-tighter leading-none">
              STEM-ElimuSmartPlan
            </h1>
            <p className="text-xl text-slate-400 font-medium tracking-tight">
              Kenyan Intelligent CBE Framework for STEM Mastery.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800/40 p-8 rounded-[32px] border border-white/5 backdrop-blur-xl group hover:border-emerald-500/20 transition-all">
              <h3 className="font-black text-emerald-400 uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Standardized Excellence
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                Multi-agent Lesson planner that standardizes content across kenyan Schools, ensuring consistent Instructional quality and uniform delivery for every same Grade/Class level nationwide.
              </p>
            </div>

            <div className="bg-slate-800/40 p-8 rounded-[32px] border border-white/5 backdrop-blur-xl group hover:border-indigo-500/20 transition-all">
              <h3 className="font-black text-indigo-400 uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04M12 21.48l1.307-1.307a10.5 10.5 0 01-7.314-14.48L12 4.384l5.314 1.307a10.5 10.5 0 01-7.314 14.48L12 21.48z" /></svg>
                Real-Time Appraisal Tracking & Merit Validation
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                Unlike other platforms, ElimuSmartPlan allow supervisors to track Lesson delivery and maintain rea-time data essential for identifying merit-based promotion and appraisals.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Real Auth Form */}
        <div className="bg-white rounded-[48px] shadow-2xl p-10 lg:p-14 flex flex-col justify-center border border-slate-100">
          <div className="mb-10">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit mb-8">
              <button onClick={() => setIsRegistering(false)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isRegistering ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400'}`}>Sign In</button>
              <button onClick={() => setIsRegistering(true)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isRegistering ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400'}`}>Register</button>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
              {isRegistering ? 'Initialize Identity' : 'Resume Session'}
            </h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Accessing ElimuSmartPlan Gateway</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold uppercase tracking-widest animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegistering && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" placeholder="e.g. David Otieno" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">System Role</label>
                  <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black uppercase focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none">
                    <option value="teacher">Teacher</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" placeholder="user@school.edu.ke" />
            </div>

            {isRegistering && role === 'teacher' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">TSC Registry Number</label>
                <input type="text" required value={tscNumber} onChange={e => setTscNumber(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-mono font-black focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" placeholder="TSC-XXXXX" />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Authentication Key</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" placeholder="••••••••" />
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-2xl active:scale-95 disabled:bg-slate-200"
            >
              {loading ? 'Validating Traversal...' : isRegistering ? 'Initialize Identity' : 'Sync Session'}
            </button>

            <p className="text-center text-[9px] text-slate-400 font-black lowercase tracking-[0.2em] mt-4">
              Secure Institutional Link • End-to-End Encryption
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;