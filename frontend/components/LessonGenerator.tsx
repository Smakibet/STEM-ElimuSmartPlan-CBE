import React, { useState, useEffect } from 'react';
import { generateCBELesson } from '../services/geminiService';
import { useGraphService } from '../services/jacService';
import { LessonPlan } from '../types';

interface LessonGeneratorProps {
  onSave: (lesson: LessonPlan) => void;
}

const LessonGenerator: React.FC<LessonGeneratorProps> = ({ onSave }) => {
  const { serviceStatus, analyzeModule, generateLearningPath } = useGraphService();
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<LessonPlan | null>(null);

  // Graph Service Data
  const [graphAnalysis, setGraphAnalysis] = useState<any>(null);
  const [learningPath, setLearningPath] = useState<any>(null);
  const [isGraphProcessing, setIsGraphProcessing] = useState(false);
  const [graphStatusMessage, setGraphStatusMessage] = useState('');

  const [schoolLevel, setSchoolLevel] = useState<'Junior' | 'Senior'>('Junior');

  const [formData, setFormData] = useState({
    grade: 'Grade 7',
    subject: 'Integrated Science',
    strand: '',
    subStrand: '',
    lessonType: 'Single Lesson',
    duration: '40 minutes',
    resources: '',
    context: ''
  });

  // Update grades and subjects based on level
  useEffect(() => {
    if (schoolLevel === 'Junior') {
      setFormData(prev => ({ ...prev, grade: 'Grade 7', subject: 'Integrated Science' }));
    } else {
      setFormData(prev => ({ ...prev, grade: 'Grade 10', subject: 'Physics' }));
    }
  }, [schoolLevel]);

  const handleDurationChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      lessonType: type,
      duration: type === 'Single Lesson' ? '40 minutes' : '80 minutes'
    }));
  };

  const handleDownloadText = () => {
    if (!lesson) return;

    let content = `LESSON PLAN: ${lesson.topic}\n`;
    content += `Subject: ${lesson.subject} | Grade: ${lesson.grade}\n`;
    content += `Strand: ${lesson.strand} | Sub-Strand: ${lesson.subStrand}\n`;
    content += `Duration: ${lesson.duration}\n\n`;

    content += `CORE COMPETENCIES:\n${lesson.coreCompetencies.map(c => `- ${c}`).join('\n')}\n\n`;
    content += `VALUES:\n${lesson.values.map(v => `- ${v}`).join('\n')}\n\n`;

    content += `LESSON FLOW:\n`;
    lesson.sections.forEach(sec => {
      content += `[${sec.title} - ${sec.duration}]\n`;
      content += `${sec.content}\n`;
      content += `Teacher: ${sec.teacherActivity}\n`;
      content += `Student: ${sec.studentActivity}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lesson.topic.replace(/\s+/g, '_')}_LessonPlan.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.strand || !formData.subStrand) return;

    setLoading(true);
    setLesson(null);
    setGraphAnalysis(null);
    setLearningPath(null);
    setGraphStatusMessage('');

    try {
      // 1. Generate core content with Gemini
      const result = await generateCBELesson(
        formData.grade,
        formData.subject,
        formData.strand,
        formData.subStrand,
        formData.duration,
        formData.lessonType,
        formData.context,
        formData.resources || 'Standard classroom materials (textbook, chalkboard)',
        schoolLevel
      );
      setLesson(result);

      // 2. Enhance with Graph Service
      if (result) {
        setIsGraphProcessing(true);
        setGraphStatusMessage('Analyzing content structure...');

        // Analyze content
        const analysis = await analyzeModule({
          content: JSON.stringify(result.sections),
          targetAudience: schoolLevel === 'Junior' ? 'junior_high' : 'senior_high'
        });

        if (analysis.status === 'success' || analysis.status === 'simulated') {
          setGraphAnalysis(analysis.data);
          setGraphStatusMessage('Generating OSP personalized path...');
        } else {
          setGraphStatusMessage('Analysis service unavailable');
        }

        // Generate Path
        const path = await generateLearningPath({
          studentProfile: { currentLevel: formData.grade, name: "Student", interests: [formData.subject] },
          targetSubject: formData.subject,
          durationWeeks: 4
        });

        if (path.status === 'success' || path.status === 'simulated') {
          setLearningPath(path.data);
        }

        setGraphStatusMessage('Analysis Complete');
        setIsGraphProcessing(false);
      }

    } catch (error) {
      console.error(error);
      alert("Failed to Generate Standardized Lesson. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const juniorGrades = ['Grade 7', 'Grade 8', 'Grade 9'];
  const seniorGrades = ['Grade 10', 'Grade 11', 'Grade 12'];

  const juniorSubjects = ['Integrated Science', 'Mathematics', 'Pre-Technical Studies', 'Computer Science', 'Agriculture'];
  const seniorSubjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Agricultural Science'];

  const renderAnalysis = (data: any) => {
    const analysis = data.analysis || data;
    if (!analysis) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-2">
        {analysis.key_learning_objectives && (
          <div className="bg-white/60 p-3 rounded border border-purple-100/50">
            <strong className="block text-purple-900 mb-2 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Key Objectives
            </strong>
            <ul className="list-disc list-inside text-purple-800 space-y-1">
              {analysis.key_learning_objectives.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {analysis.prerequisite_knowledge && (
          <div className="bg-white/60 p-3 rounded border border-purple-100/50">
            <strong className="block text-purple-900 mb-2 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              Prerequisites
            </strong>
            <div className="flex flex-wrap gap-1.5">
              {analysis.prerequisite_knowledge.map((item: string, i: number) => (
                <span key={i} className="bg-purple-100 px-2 py-0.5 rounded text-purple-700 font-medium">{item}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-y-auto pb-20 lg:pb-8">
      {/* Input Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Standardized Lesson Creator</h2>
            <p className="text-sm text-slate-500">AI-powered CBE STEM compliant planner</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setSchoolLevel('Junior')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${schoolLevel === 'Junior School'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Junior
              </button>
              <button
                onClick={() => setSchoolLevel('Senior')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${schoolLevel === 'Senior School'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Senior
              </button>
            </div>
            {serviceStatus && (
              <div className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${serviceStatus.status === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                serviceStatus.status === 'simulated' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-red-50 text-red-700 border-red-200'
                }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${serviceStatus.status === 'success' ? 'bg-green-500' :
                  serviceStatus.status === 'simulated' ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}></div>
                Graph: {
                  serviceStatus.status === 'success' ? 'Online' :
                    serviceStatus.status === 'simulated' ? 'OSP Simulation' :
                      'Offline'
                }
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Grade Level</label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full rounded-lg border-slate-300 border p-2 text-sm outline-none"
              >
                {(schoolLevel === 'Junior' ? juniorGrades : seniorGrades).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lesson Type</label>
              <select
                value={formData.lessonType}
                onChange={(e) => handleDurationChange(e.target.value)}
                className="w-full rounded-lg border-slate-300 border p-2 text-sm outline-none"
              >
                <option value="Single Lesson">Single (40 min)</option>
                <option value="Double Lesson">Double (80 min)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <select
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full rounded-lg border-slate-300 border p-2 text-sm outline-none"
            >
              {(schoolLevel === 'Junior' ? juniorSubjects : seniorSubjects).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Strand</label>
            <input
              type="text"
              required
              placeholder={schoolLevel === 'Junior' ? "e.g., Living Things" : "e.g., Mechanics"}
              value={formData.strand}
              onChange={(e) => setFormData({ ...formData, strand: e.target.value })}
              className="w-full rounded-lg border-slate-300 border p-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sub-Strand</label>
            <input
              type="text"
              required
              placeholder={schoolLevel === 'Junior' ? "e.g., Plants" : "e.g., Linear Motion"}
              value={formData.subStrand}
              onChange={(e) => setFormData({ ...formData, subStrand: e.target.value })}
              className="w-full rounded-lg border-slate-300 border p-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Available Resources</label>
            <textarea
              rows={2}
              placeholder="e.g., Projector, Tablets, Manilla paper..."
              value={formData.resources}
              onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
              className="w-full rounded-lg border-slate-300 border p-2 text-sm outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-medium shadow-lg transition-all ${loading
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-500/30'
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Standardized lesson Plan...
              </span>
            ) : (
              'Generate Lesson Plan'
            )}
          </button>
        </form>
      </div>

      {/* Output Display */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px] lg:h-[calc(100vh-140px)]">
        {!lesson ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <svg className="w-16 h-16 mb-4 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Select <span className="font-bold text-slate-500">School Level</span>, Strand & Sub-Strand to generate.</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm md:text-base">{lesson.topic}</h3>
                <div className="flex flex-wrap gap-2 items-center mt-1">
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">{schoolLevel}</span>
                  <span className="text-xs text-slate-500">{lesson.subject} • {lesson.grade}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadText}
                  className="text-xs bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors flex items-center"
                  title="Download as Text"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Txt
                </button>
                <button
                  onClick={() => onSave(lesson)}
                  className="text-xs bg-emerald-600 border border-emerald-600 text-white px-3 py-1.5 rounded-full hover:bg-emerald-700 transition-colors flex items-center shadow-sm"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  Save
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-6">
              {/* Graph Service: AI Analysis */}
              {(isGraphProcessing || graphAnalysis) && (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-purple-900 flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      OSP Graph Analysis
                    </h4>
                    {isGraphProcessing ? (
                      <span className="text-xs text-purple-600 animate-pulse flex items-center gap-1">
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {graphStatusMessage}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-600 font-medium">Completed</span>
                    )}
                  </div>
                  {graphAnalysis ? renderAnalysis(graphAnalysis) : <div className="h-10 bg-purple-100/50 rounded animate-pulse"></div>}
                </div>
              )}

              {/* Core Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <span className="font-semibold block text-slate-700 mb-1">Competencies</span>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    {lesson.coreCompetencies.map((c, i) => <li key={i} className="truncate">{c}</li>)}
                  </ul>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <span className="font-semibold block text-slate-700 mb-1">Values</span>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    {lesson.values.map((v, i) => <li key={i}>{v}</li>)}
                  </ul>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <span className="font-semibold block text-emerald-800 mb-1">KI Questions</span>
                  <ul className="list-disc list-inside text-slate-600 space-y-1 italic">
                    {lesson.keyInquiryQuestions && lesson.keyInquiryQuestions.map((q, i) => <li key={i} className="truncate">{q}</li>)}
                  </ul>
                </div>
              </div>

              {/* Graph Service: Learning Path */}
              {learningPath && (
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <h4 className="font-bold text-indigo-900 mb-3 text-sm">Personalized Learning Path (Graph Generated)</h4>
                  <div className="space-y-3">
                    {learningPath.path?.map((step: any, index: number) => (
                      <div key={index} className="flex gap-3 items-start bg-white p-3 rounded border border-indigo-100">
                        <span className="bg-indigo-100 text-indigo-700 font-bold w-6 h-6 flex items-center justify-center rounded-full text-xs shrink-0">{index + 1}</span>
                        <div>
                          <h5 className="font-bold text-slate-800 text-sm">{step.title}</h5>
                          <p className="text-xs text-slate-500 mt-0.5">{step.module_type || 'Theory'} • {step.duration_hours || 10} hours</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps */}
              <div>
                <h4 className="font-bold text-slate-800 mb-3 border-b pb-2 text-sm">Lesson Flow</h4>
                <div className="space-y-4">
                  {lesson.sections.map((section, idx) => (
                    <div key={idx} className="border border-slate-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between mb-2">
                        <span className="font-semibold text-emerald-700 text-sm">{section.title}</span>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">{section.duration}</span>
                      </div>
                      <p className="text-sm text-slate-700 mb-3">{section.content}</p>
                      <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-2 rounded">
                        <div>
                          <span className="font-bold text-slate-500 block">Teacher</span>
                          {section.teacherActivity}
                        </div>
                        <div>
                          <span className="font-bold text-slate-500 block">Student</span>
                          {section.studentActivity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonGenerator;