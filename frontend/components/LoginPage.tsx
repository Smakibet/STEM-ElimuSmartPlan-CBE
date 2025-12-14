import React, { useState } from 'react';
import { UserRole } from '../scripts/types';

interface LoginPageProps {
  onLogin: (role: UserRole, name: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login
    if (email && name) {
      onLogin(role, name);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-12 z-10">

        {/* Left Side: Information & Value Prop */}
        <div className="flex flex-col justify-center text-white space-y-8">
          <div>
            <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              STEM ElimuSmartPlan
            </h1>
            <p className="text-xl text-slate-300 font-light">
              Empowering Kenya's CBE Framework
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
              <h3 className="font-semibold text-emerald-400 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Standardized Excellence
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                AI lesson generation standardizes content across Kenyan schools, ensuring consistent instructional quality and uniform delivery for every grade level nationwide.
              </p>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
              <h3 className="font-semibold text-blue-400 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                Real-Time Appraisal Tracking
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Unlike other platforms, SmartPlan allows supervisors to track lesson delivery and maintain real-time data essential for identifying merit-based promotion and appraisals.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Sign In to Your Account</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Role</label>
              <div className="grid grid-cols-3 gap-2">
                {(['teacher', 'supervisor', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-1 text-sm font-medium rounded-lg capitalize transition-colors ${role === r
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.edu.ke"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold text-lg hover:bg-slate-800 transition-colors shadow-lg mt-4"
            >
              Access Dashboard
            </button>

            <p className="text-center text-xs text-slate-400 mt-4">
              Secure System • Offline Capable • CBE Compliant
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;