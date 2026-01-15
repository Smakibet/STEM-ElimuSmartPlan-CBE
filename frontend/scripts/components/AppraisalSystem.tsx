import React, { useState, useEffect } from 'react';
import { User, AppraisalSession } from '../../types';

const JAC_API_BASE_URL = process.env.REACT_APP_JAC_API_URL || 'http://localhost:8000';

interface AppraisalSystemProps {
  user: User;
  mode?: 'teacher' | 'supervisor';
}

interface Standard {
  id: number;
  name: string;
  description: string;
  selfRating: number;
  supervisorRating: number;
  gapsIdentified: string;
  evidence: string[];
}

const AppraisalSystem: React.FC<AppraisalSystemProps> = ({ user, mode = 'teacher' }) => {
  const [activeTab, setActiveTab] = useState<'standards' | 'deliverables' | 'tpd' | 'review'>('standards');
  const [session, setSession] = useState<AppraisalSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jacAvailable, setJacAvailable] = useState(false);

  const [currentStandardId, setCurrentStandardId] = useState<number>(1);
  const [rating, setRating] = useState(0);
  const [evidence, setEvidence] = useState('');
  const [gaps, setGaps] = useState('');

  const [supervisorRating, setSupervisorRating] = useState(0);
  const [supervisorComment, setSupervisorComment] = useState('');

  useEffect(() => {
    checkJacAvailability();
  }, []);

  useEffect(() => {
    if (jacAvailable) {
      initializeSession();
    }
  }, [user, jacAvailable]);

  // Sync state when standard ID changes or session data updates
  useEffect(() => {
    if (session) {
      const std = session.standards.find((s: Standard) => s.id === currentStandardId);
      if (std) {
        setRating(std.selfRating || 0);
        setSupervisorRating(std.supervisorRating || 0);
        setGaps(std.gapsIdentified || '');
        setEvidence(std.evidence?.[0] || '');
      }
    }
  }, [currentStandardId, session]);

  const checkJacAvailability = async () => {
    try {
      const response = await fetch(`${JAC_API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      setJacAvailable(response.ok);

      if (!response.ok) {
        setError('JAC server is not available. Please ensure the backend is running.');
      }
    } catch (error) {
      console.warn('JAC server not available:', error);
      setJacAvailable(false);
      setError('Cannot connect to JAC server. Please check your backend connection.');
    }
  };

  const initializeSession = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${JAC_API_BASE_URL}/walker/init_appraisal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          tsc_number: user.tscNumber,
          name: user.name,
          role: user.role
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize appraisal session: ${response.status}`);
      }

      const data = await response.json();

      // Validate response structure
      if (!data || !data.standards || !Array.isArray(data.standards)) {
        throw new Error('Invalid appraisal session data received');
      }

      setSession(data as AppraisalSession);
      setSupervisorComment(data.supervisorComments || '');

    } catch (err: any) {
      console.error('Failed to initialize appraisal:', err);
      setError(`Failed to load appraisal session: ${err.message}`);

      // Create a mock session for demonstration if JAC fails
      const mockSession: AppraisalSession = {
        id: `session_${Date.now()}`,
        userId: user.id,
        status: 'Draft',
        standards: Array.from({ length: 8 }, (_, i) => ({
          id: i + 1,
          name: `Professional Standard ${i + 1}`,
          description: `Description for standard ${i + 1}. This standard covers key competencies required for effective teaching.`,
          selfRating: 0,
          supervisorRating: 0,
          gapsIdentified: '',
          evidence: []
        })),
        classDeliverables: {
          lessonsTaught: 0,
          lessonsPlanned: 0,
          avgClassMastery: 0
        },
        supervisorComments: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setSession(mockSession);
      console.log('Using mock session for demonstration');

    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStandard = async () => {
    if (!session) {
      setError('No active session');
      return;
    }

    if (!rating) {
      setError('Please select a rating before saving');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!jacAvailable) {
        throw new Error('JAC server is not available');
      }

      const response = await fetch(`${JAC_API_BASE_URL}/walker/update_standard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session.id,
          standard_id: currentStandardId,
          rating: rating,
          gaps: gaps,
          evidence: evidence
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update standard: ${response.status}`);
      }

      const updatedSession = await response.json();
      setSession(updatedSession as AppraisalSession);

      alert("✓ Self-appraisal saved successfully!");

    } catch (err: any) {
      console.error('Failed to update standard:', err);
      setError(`Failed to save: ${err.message}`);

      // Local update fallback
      const updatedSession = { ...session };
      const standardIndex = updatedSession.standards.findIndex((s: Standard) => s.id === currentStandardId);

      if (standardIndex !== -1) {
        updatedSession.standards[standardIndex] = {
          ...updatedSession.standards[standardIndex],
          selfRating: rating,
          gapsIdentified: gaps,
          evidence: [evidence]
        };

        setSession(updatedSession);
        alert("⚠ Saved locally (JAC unavailable). Changes will be lost on refresh.");
      }

    } finally {
      setLoading(false);
    }
  };

  const handleSupervisorSubmit = async () => {
    if (!session) {
      setError('No active session');
      return;
    }

    if (!supervisorRating) {
      setError('Please select a supervisor rating');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!jacAvailable) {
        throw new Error('JAC server is not available');
      }

      const response = await fetch(`${JAC_API_BASE_URL}/walker/supervisor_review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session.id,
          comments: supervisorComment,
          reviews: [{
            standard_id: currentStandardId,
            rating: supervisorRating
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to submit review: ${response.status}`);
      }

      const updated = await response.json();
      setSession(updated as AppraisalSession);

      alert("✓ Supervisor review submitted successfully!");

    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setError(`Failed to submit review: ${err.message}`);

      // Local update fallback
      const updatedSession = { ...session };
      const standardIndex = updatedSession.standards.findIndex((s: Standard) => s.id === currentStandardId);

      if (standardIndex !== -1) {
        updatedSession.standards[standardIndex] = {
          ...updatedSession.standards[standardIndex],
          supervisorRating: supervisorRating
        };
        updatedSession.supervisorComments = supervisorComment;

        setSession(updatedSession);
        alert("⚠ Saved locally (JAC unavailable). Changes will be lost on refresh.");
      }

    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeAppraisal = async () => {
    if (!session) return;

    const confirmation = window.confirm(
      'Finalize this appraisal? This will submit it to TSC and cannot be undone.'
    );

    if (!confirmation) return;

    setLoading(true);
    setError(null);

    try {
      if (!jacAvailable) {
        throw new Error('JAC server is not available');
      }

      const response = await fetch(`${JAC_API_BASE_URL}/walker/finalize_appraisal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session.id
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to finalize appraisal: ${response.status}`);
      }

      const updated = await response.json();
      setSession(updated as AppraisalSession);

      alert("✓ Appraisal finalized and submitted to TSC!");

    } catch (err: any) {
      console.error('Failed to finalize:', err);
      setError(`Failed to finalize: ${err.message}`);

      // Local update fallback
      const updatedSession = { ...session };
      updatedSession.status = 'Finalized';
      setSession(updatedSession);
      alert("⚠ Status updated locally (JAC unavailable).");

    } finally {
      setLoading(false);
    }
  };

  if (loading && !session) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">
          {jacAvailable ? 'Connecting to OSP Data Node...' : 'Loading Appraisal System...'}
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-12 text-center">
        <div className="text-rose-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-slate-700 font-bold mb-2">Failed to Load Appraisal Session</p>
        <p className="text-slate-500 text-sm mb-4">{error || 'Unknown error occurred'}</p>
        <button
          onClick={initializeSession}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const currentStandard = session.standards.find((s: Standard) => s.id === currentStandardId);
  const isEditable = mode === 'teacher' && (session.status === 'Draft' || session.status === 'Submitted');

  return (
    <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto pb-10 px-2 overflow-y-auto custom-scrollbar">
      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-rose-900 font-bold text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-rose-600 text-xs underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 shrink-0">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-600 flex items-center justify-center text-white shadow-2xl shadow-emerald-600/30">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04M12 21.48l1.307-1.307a10.5 10.5 0 01-7.314-14.48L12 4.384l5.314 1.307a10.5 10.5 0 01-7.314 14.48L12 21.48z" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
              {mode === 'supervisor' ? `Review Node: ${user.name}` : 'TPAD Performance Appraisal'}
            </h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
              Status: <span className={`${session.status === 'Finalized' ? 'text-emerald-600' : session.status === 'Draft' ? 'text-amber-600' : 'text-indigo-600'}`}>{session.status}</span> • TSC-ID: {user.tscNumber || '---'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {mode === 'supervisor' && (
            <div className="bg-amber-100 text-amber-700 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-amber-200">
              Supervisory Logic Active
            </div>
          )}
          <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${jacAvailable ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className={`w-2 h-2 rounded-full ${jacAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
            <span className={`text-xs font-bold ${jacAvailable ? 'text-emerald-700' : 'text-rose-700'}`}>
              {jacAvailable ? 'JAC Connected' : 'Local Mode'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-0">
        {/* Sidebar Navigation */}
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 h-fit space-y-3 shrink-0">
          {[
            { id: 'standards', label: 'Standards' },
            { id: 'deliverables', label: 'Evidence' },
            { id: 'tpd', label: 'TPD Plan' },
            { id: 'review', label: 'TSC Return' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full text-left px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-xl translate-x-2'
                : 'text-slate-400 hover:bg-slate-50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col min-h-[550px]">
          {activeTab === 'standards' && currentStandard && (
            <div className="animate-fade-in space-y-10">
              {/* Standards Navigation */}
              <div className="flex space-x-3 overflow-x-auto pb-6 scrollbar-hide">
                {session.standards.map((s: Standard) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentStandardId(s.id)}
                    className={`whitespace-nowrap px-6 py-2 rounded-2xl text-[10px] font-black uppercase border transition-all relative ${currentStandardId === s.id
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-lg'
                      : 'bg-white text-slate-300 border-slate-100'
                      }`}
                  >
                    Std {s.id}
                    {s.supervisorRating > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></span>
                    )}
                  </button>
                ))}
              </div>

              {/* Standard Description */}
              <div className="border-l-8 border-indigo-600 pl-8">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">{currentStandard.name}</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-2xl">{currentStandard.description}</p>
              </div>

              {/* Rating Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Teacher Self-Rating */}
                <div className="space-y-8 p-8 rounded-[32px] bg-slate-50/50 border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-3">Teacher Self-Rating</h4>
                  <div className="flex gap-3">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button
                        key={r}
                        disabled={!isEditable || loading}
                        onClick={() => setRating(r)}
                        className={`w-12 h-12 rounded-2xl font-black text-lg transition-all ${rating === r
                          ? 'bg-slate-900 text-white shadow-2xl scale-110'
                          : 'bg-white text-slate-200 border border-slate-100 hover:border-slate-300'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Evidence / Artifacts</label>
                      <textarea
                        value={evidence}
                        onChange={e => setEvidence(e.target.value)}
                        disabled={!isEditable || loading}
                        className="w-full border border-slate-200 rounded-xl p-4 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 outline-none h-24 resize-none bg-white disabled:opacity-50"
                        placeholder="Paste a link to your lesson plan artifact or describe delivery evidence..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Identified Gaps / Challenges</label>
                      <textarea
                        value={gaps}
                        onChange={e => setGaps(e.target.value)}
                        disabled={!isEditable || loading}
                        className="w-full border border-slate-200 rounded-xl p-4 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 outline-none h-24 resize-none bg-white disabled:opacity-50"
                        placeholder="What challenges did you face in meeting this standard?"
                      />
                    </div>
                  </div>

                  {isEditable && (
                    <button
                      onClick={handleUpdateStandard}
                      disabled={loading}
                      className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : 'Save Self-Appraisal'}
                    </button>
                  )}
                </div>

                {/* Supervisor Rating */}
                <div className={`space-y-8 p-8 rounded-[32px] border ${mode === 'supervisor' ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50/30 border-indigo-100'
                  }`}>
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-200 pb-3">Supervisor Decision Node</h4>
                  {mode === 'supervisor' ? (
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Teacher's Evidence</p>
                          <p className="text-sm font-bold text-slate-700 bg-white/50 p-4 rounded-xl border border-slate-200/50 italic">
                            "{evidence || 'No evidence provided.'}"
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Teacher's Gaps</p>
                          <p className="text-sm font-bold text-slate-700 bg-white/50 p-4 rounded-xl border border-slate-200/50 italic">
                            "{gaps || 'No gaps identified.'}"
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        {[1, 2, 3, 4, 5].map(r => (
                          <button
                            key={r}
                            onClick={() => setSupervisorRating(r)}
                            disabled={loading}
                            className={`w-12 h-12 rounded-2xl font-black text-lg transition-all ${supervisorRating === r
                              ? 'bg-amber-600 text-white shadow-2xl scale-110'
                              : 'bg-white text-amber-200 border border-amber-100 hover:border-amber-300'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleSupervisorSubmit}
                        disabled={loading}
                        className="w-full bg-amber-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Saving...' : 'Commit Decision to Graph'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 opacity-30 grayscale">
                      {currentStandard.supervisorRating ? (
                        <div className="text-center">
                          <span className="text-4xl font-black text-indigo-900">{currentStandard.supervisorRating}</span>
                          <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-emerald-600">Validated Rating</p>
                        </div>
                      ) : (
                        <>
                          <svg className="w-12 h-12 text-indigo-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Validation</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'deliverables' && session.classDeliverables && (
            <div className="space-y-10 animate-fade-in h-full flex flex-col">
              <div>
                <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Evidence Nodes</h3>
                <p className="text-slate-400 text-sm font-medium italic">Performance Metrics from Teacher Interactions</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-emerald-50 p-10 rounded-[40px] border border-emerald-100 relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-100 rounded-full opacity-40"></div>
                  <span className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Completion Logic</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-7xl font-black text-emerald-900 tracking-tighter">{session.classDeliverables.lessonsTaught}</span>
                    <span className="text-emerald-600 font-black text-lg">/ {session.classDeliverables.lessonsPlanned}</span>
                  </div>
                </div>
                <div className="bg-indigo-50 p-10 rounded-[40px] border border-indigo-100 relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-100 rounded-full opacity-40"></div>
                  <span className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Mastery Traversal</span>
                  <span className="text-7xl font-black text-indigo-900 tracking-tighter">{session.classDeliverables.avgClassMastery}%</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tpd' && (
            <div className="space-y-8 animate-fade-in flex flex-col h-full">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Teacher Professional Development Plan</h3>
              <div className="flex-1 bg-slate-50 rounded-3xl p-8 border border-slate-200">
                <p className="text-slate-500 text-sm italic">
                  TPD planning features will be integrated with your appraisal results to recommend targeted professional development opportunities.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'review' && (
            <div className="space-y-8 animate-fade-in flex flex-col h-full">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">TSC Return Summary</h3>
                {mode === 'teacher' && session.status === 'Draft' && (
                  <button
                    onClick={handleFinalizeAppraisal}
                    disabled={loading}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 shadow-xl transition-all disabled:opacity-50"
                  >
                    {loading ? 'Finalizing...' : 'Finalize & Submit'}
                  </button>
                )}
              </div>

              <div className={`flex-1 p-10 rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col ${mode === 'supervisor' ? 'bg-indigo-900 text-indigo-50' : 'bg-slate-900 text-white'
                }`}>
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[100px] -mr-40 -mt-40"></div>
                <div className="relative z-10 space-y-8">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Supervisor Verdict Reasoning</span>
                  {mode === 'supervisor' ? (
                    <div className="space-y-8">
                      <textarea
                        value={supervisorComment}
                        onChange={e => setSupervisorComment(e.target.value)}
                        disabled={loading}
                        placeholder="Enter justifying reasoning for merit-based appraisal..."
                        className="w-full bg-white/10 border border-white/10 rounded-3xl p-8 text-white text-xl font-medium outline-none focus:ring-4 focus:ring-emerald-500/50 transition-all min-h-[250px] placeholder:text-white/20 disabled:opacity-50"
                      />
                      <button
                        onClick={handleSupervisorSubmit}
                        disabled={loading}
                        className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-12 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest transition-all shadow-2xl shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Saving...' : 'Commit TSC Return'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-2xl leading-relaxed italic font-medium opacity-90">
                      "{session.supervisorComments || 'Appraisal pending supervisory validation node.'}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

export default AppraisalSystem;
