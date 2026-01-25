import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const JacClient = {
  spawnWalker: async (walker, params) => {
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

      // Handle different response formats from backend
      if (Array.isArray(result)) return result;
      if (result.success && result.data !== undefined) return result.data;
      if (result.success) return result;
      return result;
    } catch (err) {
      console.error(`API Error (${walker}):`, err);
      throw err;
    }
  }
};

const TPADAppraisalSystem = ({ user, userRole = 'teacher' }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentRating, setCurrentRating] = useState(0);
  const [currentEvidence, setCurrentEvidence] = useState('');

  const defaultUser = user || {
    id: 'teacher_001',
    name: 'John Kamau',
    tscNumber: 'TSC-123456',
    email: 'jkamau@school.edu'
  };

  useEffect(() => {
    initializeTPAD();
    const interval = setInterval(() => {
      if (session && session.status === 'In-Progress') {
        initializeTPAD(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const initializeTPAD = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const data = await JacClient.spawnWalker('init_tpad_appraisal', {
        userId: defaultUser.id,
        tscNumber: defaultUser.tscNumber,
        teacherName: defaultUser.name,
        appraisalPeriod: '2026 - Term One',
        role: userRole
      });

      if (data) {
        setSession(data);
      }
    } catch (err) {
      console.error('TPAD initialization error:', err);
      if (!silent) {
        setError(err.message || 'Failed to initialize TPAD session');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSaveRating = async () => {
    if (!session || !selectedStandard) return;

    if (currentRating === 0) {
      setError('Please select a rating (1-5)');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!currentEvidence.trim()) {
      setError('Please provide evidence for this rating');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await JacClient.spawnWalker('update_tpad_standard', {
        sessionId: session.id,
        standardId: selectedStandard.id,
        rating: currentRating,
        evidence: currentEvidence,
        role: userRole
      });

      if (data) {
        setSession(data);
        setSuccess('✓ Rating saved successfully!');
        setShowRatingModal(false);
        setSelectedStandard(null);
        setCurrentRating(0);
        setCurrentEvidence('');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save rating:', err);
      setError('Failed to save rating: ' + err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAI = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const data = await JacClient.spawnWalker('analyze_classroom_performance', {
        sessionId: session.id,
        userId: defaultUser.id
      });

      if (data) {
        setAiAnalysis(data);
        setSuccess('✓ AI analysis completed!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
      setError('AI Analysis: ' + (err.message || 'Analysis unavailable'));
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmitToSupervisor = async () => {
    if (!session) return;

    const incompleteStandards = session.standards.filter(s => !s.selfRating || s.selfRating === 0);
    if (incompleteStandards.length > 0) {
      setError(`Please complete ratings for all ${incompleteStandards.length} remaining standards`);
      setTimeout(() => setError(null), 5000);
      return;
    }

    const confirmation = window.confirm(
      'Are you sure you want to submit this appraisal to your supervisor? You cannot edit it after submission.'
    );
    if (!confirmation) return;

    setLoading(true);
    setError(null);

    try {
      const data = await JacClient.spawnWalker('submit_tpad_to_supervisor', {
        sessionId: session.id,
        userId: defaultUser.id,
        teacherName: defaultUser.name
      });

      if (data) {
        setSession(data);
        setSuccess('✓ TPAD submitted to supervisor for review!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Submission failed:', err);
      setError('Submission failed: ' + err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'In-Progress') return 'bg-amber-100 text-amber-700 border-amber-300';
    if (status === 'Submitted to Supervisor') return 'bg-blue-100 text-blue-700 border-blue-300';
    if (status === 'Completed') return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  if (loading && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="font-black text-slate-800 text-xl mb-2">Initializing TPAD Session</p>
          <p className="text-slate-500">Connecting to {API_BASE}</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[40px] shadow-xl text-center max-w-md">
          <svg className="w-20 h-20 text-rose-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-black text-rose-600 mb-4">Connection Error</h2>
          <p className="text-slate-600 mb-2 text-sm">{error}</p>
          <p className="text-xs text-slate-400 mb-6 font-mono bg-slate-50 p-3 rounded-xl break-all">
            {API_BASE}
          </p>
          <button
            onClick={() => initializeTPAD()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold transition-all w-full"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const completed = session.standards?.filter(s => s.selfRating > 0).length || 0;
  const total = session.standards?.length || 0;
  const progress = Math.round((completed / (total || 1)) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6 pb-20">

        {success && (
          <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 px-6 py-5 rounded-3xl flex items-center justify-between shadow-lg animate-slideDown">
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
          <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 px-6 py-5 rounded-3xl flex items-center justify-between shadow-lg animate-slideDown">
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

        <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 rounded-[40px] p-10 text-white shadow-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <div className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur rounded-full text-xs font-black uppercase mb-4">
                TPAD System Live
              </div>
              <h1 className="text-5xl font-black mb-2">Teacher Performance Appraisal</h1>
              <p className="text-indigo-200 text-lg font-medium">{session.teacherName} • {session.appraisalPeriod}</p>
              <p className="text-indigo-300 text-sm mt-2">TSC: {session.tscNumber}</p>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-xs font-black text-indigo-300 uppercase mb-2">Status</p>
                <div className={`px-6 py-2 rounded-full border-2 font-black text-sm ${getStatusColor(session.status)}`}>
                  {session.status}
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-indigo-300 uppercase mb-2">Progress</p>
                <p className="text-5xl font-black">{progress}%</p>
                <p className="text-sm text-indigo-300 mt-1">{completed}/{total} Standards</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-950 rounded-[40px] border-2 border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-black text-white mb-2">AI Classroom Analytics</h3>
              <p className="text-slate-400">Real-time pedagogical insights powered by Google Gemini</p>
            </div>
            <button
              onClick={handleRunAI}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-8 py-4 rounded-2xl font-black uppercase text-sm shadow-xl transition-all transform hover:scale-105 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </span>
              ) : (
                '🚀 Generate AI Insights'
              )}
            </button>
          </div>

          {aiAnalysis && (
            <div className="px-10 pb-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 backdrop-blur p-8 rounded-3xl border-2 border-white/10">
                <p className="text-emerald-400 text-xs font-black uppercase mb-3">Class Score</p>
                <p className="text-5xl font-black text-white mb-2">{aiAnalysis.overallScore}%</p>
                <p className="text-slate-400 text-sm">Average Performance</p>
              </div>
              <div className="bg-white/5 backdrop-blur p-8 rounded-3xl border-2 border-white/10">
                <p className="text-blue-400 text-xs font-black uppercase mb-3">Engagement</p>
                <p className="text-5xl font-black text-white mb-2">{aiAnalysis.engagementScore}/10</p>
                <p className="text-slate-400 text-sm">Student Participation</p>
              </div>
              <div className="bg-white/5 backdrop-blur p-8 rounded-3xl border-2 border-white/10">
                <p className="text-rose-400 text-xs font-black uppercase mb-3">At Risk</p>
                <p className="text-5xl font-black text-white mb-2">{aiAnalysis.atRiskCount}</p>
                <p className="text-slate-400 text-sm">Learners Need Support</p>
              </div>
            </div>
          )}

          {!aiAnalysis && (
            <div className="px-10 pb-10">
              <div className="bg-white/5 backdrop-blur p-8 rounded-3xl border-2 border-white/10 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-white font-bold mb-2">No AI Analysis Yet</p>
                <p className="text-slate-400 text-sm">Click "Generate AI Insights" to analyze your teaching performance</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {session.standards && session.standards.map((std, index) => (
            <div key={std.id} className="bg-white p-8 rounded-[32px] shadow-lg border-2 border-slate-200 hover:border-indigo-300 transition-all">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-start gap-6 flex-1">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-black text-slate-900 mb-2">{std.name}</h4>
                    <p className="text-slate-600 leading-relaxed mb-3">{std.description}</p>
                    {std.evidence && std.evidence.length > 0 && (
                      <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4">
                        <p className="text-xs font-black text-indigo-600 uppercase mb-2">Evidence:</p>
                        <p className="text-sm text-slate-700 italic">"{std.evidence[0]}"</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-400 uppercase mb-2">Self Rating</p>
                    <p className="text-5xl font-black text-indigo-600">
                      {std.selfRating || 0}
                      <span className="text-xl text-slate-300">/5</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedStandard(std);
                      setCurrentRating(std.selfRating || 0);
                      setCurrentEvidence(std.evidence?.[0] || '');
                      setShowRatingModal(true);
                    }}
                    disabled={session.status === 'Submitted to Supervisor'}
                    className="bg-gradient-to-r from-slate-100 to-slate-200 hover:from-indigo-600 hover:to-indigo-700 hover:text-white text-slate-700 px-8 py-4 rounded-2xl font-black uppercase text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {std.selfRating > 0 ? 'Update' : 'Rate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {session.status === 'In-Progress' && completed === total && (
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-300 rounded-[40px] p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-emerald-900 mb-1">All Standards Completed!</h3>
                  <p className="text-emerald-700 font-medium">Ready to submit for supervisor review</p>
                </div>
              </div>
              <button
                onClick={handleSubmitToSupervisor}
                disabled={loading}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-12 py-5 rounded-2xl font-black uppercase text-sm shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit to Supervisor'}
              </button>
            </div>
          </div>
        )}

        {showRatingModal && selectedStandard && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-y-auto">
            <div className="bg-white rounded-[40px] p-10 max-w-3xl w-full shadow-2xl my-6">
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                    {session.standards.indexOf(selectedStandard) + 1}
                  </div>
                  <h2 className="text-3xl font-black text-slate-900">{selectedStandard.name}</h2>
                </div>
                <p className="text-slate-600 leading-relaxed">{selectedStandard.description}</p>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-black text-slate-700 uppercase mb-4">
                  Select Your Self-Assessment Rating
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCurrentRating(num)}
                      className={`py-6 rounded-2xl font-black text-3xl transition-all transform hover:scale-105 ${currentRating === num
                          ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-2xl'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                    >
                      {num}
                      <span className="block text-xs font-bold uppercase mt-2">
                        {num === 1 ? 'Poor' : num === 2 ? 'Fair' : num === 3 ? 'Good' : num === 4 ? 'V.Good' : 'Excellent'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-black text-slate-700 uppercase mb-4">
                  Provide Evidence (Required)
                </label>
                <textarea
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                  placeholder="Describe specific examples, achievements, or activities that demonstrate your competency in this standard..."
                  rows="6"
                  value={currentEvidence}
                  onChange={(e) => setCurrentEvidence(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRatingModal(false);
                    setSelectedStandard(null);
                    setCurrentRating(0);
                    setCurrentEvidence('');
                  }}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRating}
                  disabled={loading || currentRating === 0 || !currentEvidence.trim()}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-4 rounded-2xl font-black shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Rating'}
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
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
    id: 'teacher_001',
    name: 'John Kamau',
    tscNumber: 'TSC-123456',
    email: 'jkamau@school.edu'
  };

  return <TPADAppraisalSystem user={mockUser} userRole="teacher" />;
};

export default App;