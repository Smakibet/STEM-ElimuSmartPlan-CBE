
import React, { useState, useEffect } from 'react';
import { User, AppraisalSession } from '../types';
import { JacClient } from '../services/jacService';

interface AppraisalSystemProps {
  user: User;
  mode?: 'teacher' | 'supervisor';
}

const AppraisalSystem: React.FC<AppraisalSystemProps> = ({ user, mode = 'teacher' }) => {
  const [activeTab, setActiveTab] = useState<'standards' | 'progress' | 'tpd' | 'review'>('standards');
  const [session, setSession] = useState<AppraisalSession | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [currentStandardId, setCurrentStandardId] = useState<number>(1);
  const [rating, setRating] = useState(0);
  const [evidence, setEvidence] = useState('');
  const [gaps, setGaps] = useState('');
  
  // Supervisor form states
  const [supervisorRating, setSupervisorRating] = useState(0);
  const [supervisorComment, setSupervisorComment] = useState('');
  
  // TPD states
  const [newTpdGap, setNewTpdGap] = useState('');
  const [newTpdAction, setNewTpdAction] = useState('');

  useEffect(() => {
    initializeSession();
  }, [user]);

  const initializeSession = async () => {
    setLoading(true);
    try {
      const data = await JacClient.spawnWalker('init_appraisal', { term: 'Term 1', year: 2024 }, user);
      setSession(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStandard = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const updatedSession = await JacClient.spawnWalker('update_standard', {
        sessionId: session.id,
        standardId: currentStandardId,
        rating,
        evidence: [evidence],
        gaps
      }, user);
      setSession(updatedSession);
      alert('Standard updated successfully!');
    } catch (e) {
      alert('Failed to update standard.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!session) return;
    setLoading(true);
    try {
        const reviews = session.standards.map(s => s.id === currentStandardId ? { standardId: s.id, rating: supervisorRating } : undefined).filter(Boolean);
        const updated = await JacClient.spawnWalker('supervisor_review', {
            sessionId: session.id,
            comments: supervisorComment,
            reviews: reviews
        }, user);
        setSession(updated);
        alert('Standard review updated.');
    } finally {
        setLoading(false);
    }
  };

  const submitAppraisal = async () => {
    if (!session) return;
    if (confirm("Are you sure you want to submit your appraisal to your supervisor?")) {
      setLoading(true);
      try {
        const updated = await JacClient.spawnWalker('submit_appraisal', { sessionId: session.id }, user);
        setSession(updated);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddTPD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !newTpdGap || !newTpdAction) return;
    setLoading(true);
    try {
        const updated = await JacClient.spawnWalker('manage_tpd', {
            sessionId: session.id,
            action: 'add',
            gap: newTpdGap,
            recommendedAction: newTpdAction
        }, user);
        setSession(updated);
        setNewTpdGap('');
        setNewTpdAction('');
    } finally {
        setLoading(false);
    }
  };

  const handleUpdateTPDStatus = async (tpdId: string, newStatus: string) => {
    if (!session) return;
    setLoading(true);
    try {
        const updated = await JacClient.spawnWalker('manage_tpd', {
            sessionId: session.id,
            action: 'update_status',
            tpdId: tpdId,
            status: newStatus
        }, user);
        setSession(updated);
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteTPD = async (tpdId: string) => {
      if (!session) return;
      if (!confirm("Remove this intervention plan?")) return;
      setLoading(true);
      try {
          const updated = await JacClient.spawnWalker('manage_tpd', {
              sessionId: session.id,
              action: 'delete',
              tpdId: tpdId
          }, user);
          setSession(updated);
      } finally {
          setLoading(false);
      }
  };

  if (!session) return <div className="p-8 text-center text-slate-500">Loading Appraisal Data...</div>;

  const currentStandard = session.standards.find(s => s.id === currentStandardId);
  const isEditable = mode === 'teacher' && session.status === 'Draft';
  const isReviewable = mode === 'supervisor' && (session.status === 'Submitted' || session.status === 'Reviewed');

  return (
    <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {mode === 'supervisor' ? `Reviewing: ${user.name}` : 'My Performance Appraisal'}
          </h2>
          <p className="text-slate-500 text-sm">
            {user.tscNumber} • Term 1 2024 • 
            <span className={`ml-2 font-bold ${session.status === 'Reviewed' ? 'text-green-600' : 'text-amber-600'}`}>
              {session.status}
            </span>
          </p>
        </div>
        <div>
           {mode === 'teacher' && session.status === 'Draft' && (
             <button 
               onClick={submitAppraisal}
               className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 shadow-sm transition-colors"
               disabled={loading}
             >
               Submit to Supervisor
             </button>
           )}
           {mode === 'supervisor' && (
             <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium border border-blue-100 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Supervisor Mode
             </div>
           )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-fit space-y-2">
          {['standards', 'progress', 'tpd', 'review'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {tab === 'tpd' ? 'TPD & Gaps' : tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
          
          {activeTab === 'standards' && (
            <div className="space-y-6">
              <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar">
                {session.standards.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { 
                        setCurrentStandardId(s.id); 
                        setRating(s.selfRating); 
                        setEvidence(s.evidence?.[0] || ''); 
                        setGaps(s.gapsIdentified || '');
                        setSupervisorRating(s.supervisorRating || 0);
                    }}
                    className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${currentStandardId === s.id ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                  >
                    Std {s.id}
                  </button>
                ))}
              </div>

              {currentStandard && (
                <div className="animate-fade-in">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">{currentStandard.name}</h3>
                  <p className="text-slate-600 mb-6 text-sm leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{currentStandard.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Teacher Section */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-700 border-b pb-2 text-sm uppercase tracking-wide">Teacher Self-Appraisal</h4>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">RATING (1-5)</label>
                          <div className="flex space-x-2">
                            {[1, 2, 3, 4, 5].map(r => (
                              <button
                                key={r}
                                onClick={() => isEditable && setRating(r)}
                                disabled={!isEditable}
                                className={`w-8 h-8 rounded font-bold text-sm transition-all ${rating === r ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 mb-2">EVIDENCE</label>
                           {isEditable ? (
                             <input type="text" value={evidence} onChange={e => setEvidence(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="Link to evidence..." />
                           ) : (
                             <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-100 break-all">
                                {evidence ? <a href="#" className="text-blue-600 hover:underline">{evidence}</a> : <span className="text-slate-400 italic">No evidence provided</span>}
                             </div>
                           )}
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 mb-2">IDENTIFIED GAPS</label>
                           {isEditable ? (
                               <textarea value={gaps} onChange={e => setGaps(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="Any challenges..." rows={2}></textarea>
                           ) : (
                               <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-100">
                                   {gaps || <span className="text-slate-400 italic">No gaps reported</span>}
                               </div>
                           )}
                        </div>
                        {isEditable && <button onClick={handleUpdateStandard} className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-emerald-700">Save Self-Appraisal</button>}
                      </div>

                      {/* Supervisor Section */}
                      <div className="space-y-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100 h-fit">
                        <h4 className="font-bold text-blue-800 border-b border-blue-200 pb-2 text-sm uppercase tracking-wide">Supervisor Review</h4>
                        <div>
                          <label className="block text-xs font-bold text-blue-600 mb-2">AGREED RATING (1-5)</label>
                          <div className="flex space-x-2">
                            {[1, 2, 3, 4, 5].map(r => (
                              <button
                                key={r}
                                onClick={() => isReviewable && setSupervisorRating(r)}
                                disabled={!isReviewable}
                                className={`w-8 h-8 rounded font-bold text-sm transition-all ${supervisorRating === r ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-300 border border-blue-200 hover:border-blue-300'}`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                        {isReviewable ? (
                             <>
                                <p className="text-xs text-blue-600 mt-2">
                                    Review the evidence and gaps provided by the teacher before assigning a rating.
                                </p>
                                <button onClick={handleSubmitReview} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 w-full mt-2 shadow-sm">
                                    Update Rating
                                </button>
                             </>
                        ) : (
                             <div className="mt-4 text-xs text-blue-400 italic">
                                Ratings can only be updated when the session is submitted for review.
                             </div>
                        )}
                      </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'tpd' && (
              <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">Professional Development Plan</h3>
                    <div className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                        {session.tpdPlan.length} Active Interventions
                    </div>
                  </div>

                  {/* Add Intervention Form (Supervisor Only) */}
                  {isReviewable && (
                      <form onSubmit={handleAddTPD} className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                          <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase">Add New Intervention</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              <input 
                                type="text" 
                                placeholder="Identified Gap (e.g. ICT Skills)" 
                                value={newTpdGap}
                                onChange={e => setNewTpdGap(e.target.value)}
                                className="border border-slate-300 rounded px-3 py-2 text-sm"
                                required
                              />
                              <input 
                                type="text" 
                                placeholder="Recommended Action (e.g. Attend Workshop)" 
                                value={newTpdAction}
                                onChange={e => setNewTpdAction(e.target.value)}
                                className="border border-slate-300 rounded px-3 py-2 text-sm"
                                required
                              />
                          </div>
                          <button type="submit" disabled={loading} className="text-xs bg-slate-800 text-white px-3 py-2 rounded font-medium hover:bg-slate-900">
                              + Add Intervention
                          </button>
                      </form>
                  )}

                  <div className="overflow-hidden border border-slate-200 rounded-lg">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                              <tr>
                                  <th className="p-3">Gap Identified</th>
                                  <th className="p-3">Recommended Action</th>
                                  <th className="p-3">Status</th>
                                  <th className="p-3 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {session.tpdPlan.length === 0 ? (
                                  <tr>
                                      <td colSpan={4} className="p-6 text-center text-slate-400 italic">No interventions recorded yet.</td>
                                  </tr>
                              ) : (
                                  session.tpdPlan.map((p, i) => (
                                      <tr key={i} className="hover:bg-slate-50">
                                          <td className="p-3 font-medium text-slate-700">{p.gap}</td>
                                          <td className="p-3 text-emerald-600">{p.recommendedAction}</td>
                                          <td className="p-3">
                                              <select 
                                                value={p.status}
                                                onChange={(e) => handleUpdateTPDStatus(p.id, e.target.value)}
                                                className={`text-xs border-0 bg-transparent font-bold cursor-pointer focus:ring-0 ${
                                                    p.status === 'Completed' ? 'text-green-600' :
                                                    p.status === 'In Progress' ? 'text-blue-600' : 'text-amber-600'
                                                }`}
                                              >
                                                  <option value="Pending">Pending</option>
                                                  <option value="In Progress">In Progress</option>
                                                  <option value="Completed">Completed</option>
                                              </select>
                                          </td>
                                          <td className="p-3 text-right">
                                              {isReviewable && (
                                                  <button onClick={() => handleDeleteTPD(p.id)} className="text-red-400 hover:text-red-600">
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                  </button>
                                              )}
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {activeTab === 'review' && (
              <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">Final Appraisal Comments</h3>
                  </div>
                  
                  {mode === 'supervisor' && isReviewable ? (
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                          <label className="block text-sm font-bold text-slate-700 mb-2">Overall Supervisor Comment</label>
                          <textarea 
                            className="w-full border border-slate-300 p-4 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-blue-500 outline-none" 
                            rows={6} 
                            placeholder="Provide a comprehensive summary of the teacher's performance, areas of strength, and areas for improvement..."
                            value={supervisorComment}
                            onChange={e => setSupervisorComment(e.target.value)}
                          ></textarea>
                          <div className="flex justify-end gap-3">
                             <button className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded">Save Draft</button>
                             <button onClick={handleSubmitReview} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-md">
                                 Finalize & Submit Appraisal
                             </button>
                          </div>
                      </div>
                  ) : (
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                          <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Supervisor Feedback</h4>
                          <p className="text-slate-800 leading-relaxed italic">
                              "{session.supervisorComments || "Pending supervisor review..."}"
                          </p>
                      </div>
                  )}

                  <div className="border-t border-slate-100 pt-6">
                      <h4 className="font-bold text-slate-800 mb-4">Summary of Agreed Ratings</h4>
                      <div className="grid grid-cols-5 gap-2 text-center text-sm">
                          {session.standards.map(s => (
                              <div key={s.id} className="bg-white border border-slate-100 p-3 rounded-lg shadow-sm">
                                  <span className="block text-xs text-slate-400 mb-1">Std {s.id}</span>
                                  <span className={`font-bold text-lg ${s.supervisorRating ? 'text-blue-600' : 'text-slate-300'}`}>
                                      {s.supervisorRating || '-'}
                                  </span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}
          
          {activeTab === 'progress' && (
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Learner Progress & Attendance</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <span className="block text-sm text-slate-500">Attendance Score</span>
                  <span className="text-2xl font-bold text-slate-800">{session.attendanceScore}%</span>
                  <p className="text-xs text-slate-400 mt-1">Calculated from Clock In/Out records</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <span className="block text-sm text-slate-500">Syllabus Coverage</span>
                  <span className="text-2xl font-bold text-slate-800">72%</span>
                </div>
              </div>
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Learner Scores (Excel/CSV)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 cursor-pointer">
                  <span className="text-slate-400 text-sm">Click to upload class list evidence</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AppraisalSystem;
