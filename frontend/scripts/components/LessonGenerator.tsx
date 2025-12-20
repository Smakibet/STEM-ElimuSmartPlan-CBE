import React, { useState, useEffect } from 'react';
import { generateCBELesson } from '../services/geminiService';
import { useGraphService } from '../services/jacService';
import { LessonPlan } from '../../types';

interface LessonGeneratorProps {
  onSave: (lesson: LessonPlan) => void;
}

const LessonGenerator: React.FC<LessonGeneratorProps> = ({ onSave }) => {
  const { analyzeModule } = useGraphService();
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<number | null>(null);
  const [lesson, setLesson] = useState<LessonPlan | null>(null);
  const [graphAnalysis, setGraphAnalysis] = useState<any>(null);
  const [schoolLevel, setSchoolLevel] = useState<'Junior' | 'Senior'>('Junior');

  const [formData, setFormData] = useState({
    grade: 'Grade 7',
    subject: 'Integrated Science',
    strand: '',
    subStrand: '',
    lessonType: 'Single Lesson',
    duration: '40 minutes',
    resources: '',
    context: '',
    coreCompetencies: '',
    values: '',
    kiqs: ''
  });

  useEffect(() => {
    const defaultGrade = schoolLevel === 'Junior' ? 'Grade 7' : 'Grade 10';
    const defaultSubject = schoolLevel === 'Junior' ? 'Integrated Science' : 'Physics';
    setFormData(prev => ({ ...prev, grade: defaultGrade, subject: defaultSubject }));
  }, [schoolLevel]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLesson(null);
    setGraphAnalysis(null);

    try {
      // -- MULTI-AGENT PIPELINE --

      // AGENT 1: PLANNER
      setActiveAgent(1);
      await new Promise(r => setTimeout(r, 1200));

      // AGENT 2: GENERATOR
      setActiveAgent(2);
      const result = await generateCBELesson(
        formData.grade,
        formData.subject,
        formData.strand,
        formData.subStrand,
        formData.duration,
        formData.lessonType,
        formData.context,
        formData.resources,
        schoolLevel,
        formData.coreCompetencies,
        formData.values,
        formData.kiqs
      );
      setLesson(result);

      // AGENT 3: ANALYZER
      setActiveAgent(3);
      const analysis = await analyzeModule({ content: JSON.stringify(result.sections) });
      setGraphAnalysis(analysis.data);

      setActiveAgent(null);
    } catch (error) {
      console.error(error);
      alert("Jac Client Orchestration failed. Check agent connectivity.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadText = () => {
    if (!lesson) return;
    let content = `STEM ELIMUSMARTPLAN: ${lesson.topic}\n`;
    content += `====================================\n`;
    content += `LEVEL: ${lesson.schoolLevel}\nGRADE: ${lesson.grade}\n`;
    content += `STRAND: ${lesson.strand}\nSUB-STRAND: ${lesson.subStrand}\n\n`;
    content += `CORE COMPETENCIES:\n${lesson.coreCompetencies.map(c => `- ${c}`).join('\n')}\n\n`;
    content += `VALUES:\n${lesson.values.map(v => `- ${v}`).join('\n')}\n\n`;
    content += `PROCEDURE:\n`;
    lesson.sections.forEach(s => {
      content += `[${s.title} - ${s.duration}]\n${s.content}\n`;
      content += `Teacher: ${s.teacherActivity}\nStudent: ${s.studentActivity}\n\n`;
    });
    content += `PICRAT: ${lesson.picratAnalysis.level} - ${lesson.picratAnalysis.explanation}\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lesson.topic.replace(/\s+/g, '_')}_Plan.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const agents = [
    { id: 1, name: 'Planner Agent', desc: 'Validating metadata & CBC alignment' },
    { id: 2, name: 'Generator Agent', desc: 'byLLM Content Synthesis' },
    { id: 3, name: 'Analyzer Agent', desc: 'OSP Graph Traversal & Scoring' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-y-auto pb-10 px-2">
      {/* Input Section */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 h-fit space-y-8">
        <div className="border-b border-slate-50 pb-6 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Jac Orchestrator</h2>
            <p className="text-sm text-slate-400 font-medium">Standardized Kenyan CBC Pipeline</p>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            {['Junior', 'Senior'].map(lvl => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSchoolLevel(lvl as any)}
                className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${schoolLevel === lvl ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Grade</label>
              <select value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} className="w-full rounded-2xl border-slate-200 border p-3.5 text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none">
                {(schoolLevel === 'Junior' ? ['Grade 7', 'Grade 8', 'Grade 9'] : ['Grade 10', 'Grade 11', 'Grade 12']).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Lesson Type</label>
              <select value={formData.lessonType} onChange={e => setFormData({ ...formData, lessonType: e.target.value as any })} className="w-full rounded-2xl border-slate-200 border p-3.5 text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none">
                <option value="Single Lesson">Single (40m)</option>
                <option value="Double Lesson">Double (80m)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Subject</label>
            <select value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className="w-full rounded-2xl border-slate-200 border p-3.5 text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none">
              {(schoolLevel === 'Junior'
                ? ['Integrated Science', 'Mathematics', 'Pre-Technical Studies', 'Computer Science', 'Agriculture']
                : ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Agricultural Science']
              ).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Strand</label>
              <input type="text" required value={formData.strand} onChange={e => setFormData({ ...formData, strand: e.target.value })} className="w-full rounded-2xl border-slate-200 border p-3.5 text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none" placeholder="e.g., Mechanics" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sub-Strand</label>
              <input type="text" required value={formData.subStrand} onChange={e => setFormData({ ...formData, subStrand: e.target.value })} className="w-full rounded-2xl border-slate-200 border p-3.5 text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none" placeholder="e.g., Linear Motion" />
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-50">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Core Competencies</label>
              <input type="text" value={formData.coreCompetencies} onChange={e => setFormData({ ...formData, coreCompetencies: e.target.value })} className="w-full rounded-2xl border-slate-200 border p-3.5 text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none" placeholder="e.g., Critical Thinking, Communication" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Values</label>
              <input type="text" value={formData.values} onChange={e => setFormData({ ...formData, values: e.target.value })} className="w-full rounded-2xl border-slate-200 border p-3.5 text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none" placeholder="e.g., Integrity, Respect" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Key Inquiry Questions</label>
              <input type="text" value={formData.kiqs} onChange={e => setFormData({ ...formData, kiqs: e.target.value })} className="w-full rounded-2xl border-slate-200 border p-3.5 text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none" placeholder="e.g., How does force affect motion?" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Available Resources</label>
              <textarea value={formData.resources} onChange={e => setFormData({ ...formData, resources: e.target.value })} className="w-full rounded-2xl border-slate-200 border p-3.5 text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none h-20 resize-none" placeholder="e.g., Projector, Chalkboard, Lab equipment..." />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Additional Context</label>
              <textarea value={formData.context} onChange={e => setFormData({ ...formData, context: e.target.value })} className="w-full rounded-2xl border-slate-200 border p-3.5 text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none h-20 resize-none" placeholder="e.g., Focus on practical demonstrations for rural settings..." />
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full py-5 rounded-[24px] text-white font-black uppercase tracking-widest text-xs bg-slate-900 hover:bg-slate-800 shadow-2xl transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-400">
            {loading ? 'Orchestrating Agent Logic...' : 'Spawn Generation Walker'}
          </button>
        </form>

        {loading && (
          <div className="pt-6 space-y-4 animate-fade-in">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Jac Agent Pipeline</p>
            {agents.map(agent => (
              <div key={agent.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${activeAgent === agent.id ? 'bg-indigo-50 border-indigo-200 translate-x-2' : 'bg-slate-50 border-slate-100 opacity-40 grayscale'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${activeAgent === agent.id ? 'bg-indigo-600 text-white animate-pulse shadow-lg shadow-indigo-200' : 'bg-slate-200 text-slate-400'}`}>{agent.id}</div>
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{agent.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{agent.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Output Section */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px] max-h-screen">
        {!lesson ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12 text-center">
            <div className="w-20 h-20 rounded-[32px] bg-slate-50 flex items-center justify-center mb-6 shadow-inner">
              <svg className="w-10 h-10 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            <p className="text-sm font-black uppercase tracking-[0.2em] opacity-40">Awaiting Graph Input</p>
          </div>
        ) : (
          <div className="flex flex-col h-full animate-scale-in">
            <div className="p-8 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-white">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">byLLM Reasoning Node</span>
                <h3 className="font-bold text-lg truncate max-w-[200px] leading-tight">{lesson.topic}</h3>
              </div>
              <div className="flex gap-3">
                <button onClick={handleDownloadText} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border border-white/10 tracking-widest">Download Txt</button>
                <button onClick={() => onSave(lesson)} className="bg-emerald-500 text-emerald-950 px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-xl shadow-emerald-500/20 active:scale-95 transition-all tracking-widest">Save to Library</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
              {graphAnalysis && (
                <div className="bg-indigo-50/50 p-8 rounded-[32px] border border-indigo-100/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-40 -mr-16 -mt-16"></div>
                  <h4 className="text-[10px] font-black text-indigo-600 uppercase mb-6 tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
                    Analyzer Insight Walker
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CBE Target Objectives</p>
                      {graphAnalysis.analysis?.key_learning_objectives.map((obj: string, i: number) => (
                        <div key={i} className="flex gap-4 text-xs text-slate-700 font-medium items-start">
                          <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-[10px] shrink-0">{i + 1}</span>
                          {obj}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instructional Score</p>
                      <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
                        <span className="text-xl font-black text-indigo-900 block mb-1">Creative / Transformed</span>
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">The Walker confirms high levels of inquiry and creative synthesis in student activities.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-10 pb-10">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-4">Institutional Instructional Path</h4>
                {lesson.sections.map((sec, i) => (
                  <div key={i} className="relative pl-10 group">
                    <div className="absolute left-0 top-0 w-1.5 h-full bg-slate-50 rounded-full group-hover:bg-emerald-500 transition-colors"></div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-black text-slate-900 uppercase text-sm tracking-tighter">{sec.title}</span>
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest border border-slate-200">{sec.duration}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium mb-6">{sec.content}</p>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100 shadow-inner">
                        <span className="block text-[9px] font-black text-emerald-600 uppercase mb-2 tracking-widest">Teacher Walker</span>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{sec.teacherActivity}</p>
                      </div>
                      <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100 shadow-inner">
                        <span className="block text-[9px] font-black text-indigo-600 uppercase mb-2 tracking-widest">Learner Walker</span>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{sec.studentActivity}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonGenerator;