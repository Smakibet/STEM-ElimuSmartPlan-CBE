import React, { useState, useEffect } from 'react';
import { JacClient } from '../services/jacService';
import { Quiz, QuizQuestion, LessonPlan, QuizResult } from '../../types';

interface QuizSystemProps {
  lessons: LessonPlan[];
}

const QuizSystem: React.FC<QuizSystemProps> = ({ lessons }) => {
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<any>(null);
  const [score, setScore] = useState(0);
  const [view, setView] = useState<'setup' | 'quiz' | 'results'>('setup');

  const agents = [
    { id: 1, name: 'Context Walker', desc: 'Analyzing lesson nodes...' },
    { id: 2, name: 'byLLM Generator', desc: 'Synthesizing MCQ & Code nodes...' },
    { id: 3, name: 'Validator Agent', desc: 'Optimizing distractor logic...' }
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const lesson = lessons.find(l => l.id === selectedLessonId);

    try {
      setActiveAgent(1);
      await new Promise(r => setTimeout(r, 800));

      setActiveAgent(2);
      const result = await JacClient.spawnWalker('generate_quiz', {
        lessonContext: lesson,
        topic: lesson?.topic || "General Assessment"
      });

      setActiveAgent(3);
      await new Promise(r => setTimeout(r, 600));

      setQuiz(result);
      setCurrentIndex(0);
      setScore(0);
      setFeedback(null);
      setView('quiz');
      setActiveAgent(null);
    } catch (err) {
      alert("Failed to spawn Quiz Walker.");
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!quiz) return;
    const currentQ = quiz.questions[currentIndex];

    setLoading(true);
    try {
      const result = await JacClient.spawnWalker('evaluate_answer', {
        question: currentQ,
        answer: currentQ.type === 'multiple_choice' ? Number(userAnswer) : userAnswer
      });
      setFeedback(result);
      if (result.isCorrect) setScore(s => s + 1);
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = () => {
    if (quiz && currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setFeedback(null);
    } else {
      setView('results');
    }
  };

  const saveResults = async () => {
    if (!quiz) return;
    setLoading(true);
    try {
      const result: QuizResult = {
        id: `res_${Date.now()}`,
        quizId: quiz.id,
        studentId: 'demo_student',
        score,
        total: quiz.questions.length,
        date: new Date().toISOString(),
        feedback: "Assessment completed via Jac Orchestrator."
      };
      await JacClient.spawnWalker('save_quiz_result', { result });
      alert("Results committed to OSP Graph.");
      setQuiz(null);
      setView('setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col space-y-8 p-6 overflow-y-auto pb-20">
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-200">
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Quiz Master</h2>
        <p className="text-slate-400 font-medium text-sm mb-8 uppercase tracking-widest">AI Assessment Node • Powered by Jac</p>

        {view === 'setup' && (
          <form onSubmit={handleGenerate} className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Lesson Context</label>
              <select
                value={selectedLessonId}
                onChange={e => setSelectedLessonId(e.target.value)}
                className="w-full rounded-2xl border-slate-200 border p-4 text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold"
              >
                <option value="">Select a lesson node...</option>
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>{l.topic} ({l.grade})</option>
                ))}
              </select>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full py-5 rounded-[24px] text-white font-black uppercase tracking-widest text-xs bg-slate-900 hover:bg-slate-800 transition-all shadow-2xl disabled:bg-slate-200 active:scale-95"
            >
              {loading ? 'Orchestrating Agents...' : 'Spawn Quiz Walker'}
            </button>

            {loading && (
              <div className="pt-6 space-y-4">
                {agents.map(agent => (
                  <div key={agent.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${activeAgent === agent.id ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${activeAgent === agent.id ? 'bg-emerald-600 text-white animate-pulse' : 'bg-slate-200 text-slate-400'}`}>{agent.id}</div>
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{agent.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{agent.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </form>
        )}

        {view === 'quiz' && quiz && (
          <div className="space-y-8 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-50 pb-6">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Question {currentIndex + 1} / {quiz.questions.length}</span>
              <div className="w-48 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${((currentIndex) / quiz.questions.length) * 100}%` }}></div>
              </div>
            </div>

            <h3 className="text-2xl font-black text-slate-800 leading-tight uppercase tracking-tighter">
              {quiz.questions[currentIndex].question}
            </h3>

            {quiz.questions[currentIndex].type === 'multiple_choice' ? (
              <div className="grid grid-cols-1 gap-4">
                {quiz.questions[currentIndex].options?.map((opt, i) => (
                  <button
                    key={i}
                    disabled={feedback !== null}
                    onClick={() => setUserAnswer(String(i))}
                    className={`w-full text-left p-6 rounded-[24px] border-2 transition-all font-bold text-sm ${userAnswer === String(i)
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xl shadow-indigo-100'
                        : 'border-slate-100 hover:border-slate-300 text-slate-600'
                      }`}
                  >
                    <span className="inline-block w-8 h-8 rounded-lg bg-white border border-slate-100 mr-4 text-center leading-8 text-[10px] uppercase font-black">{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-[32px] p-8 border border-slate-800 shadow-2xl">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">byLLM Code Editor</p>
                  <textarea
                    value={userAnswer || quiz.questions[currentIndex].initialCode}
                    onChange={e => setUserAnswer(e.target.value)}
                    disabled={feedback !== null}
                    spellCheck={false}
                    className="w-full bg-transparent text-emerald-50 font-mono text-sm outline-none min-h-[150px] resize-none"
                  />
                </div>
              </div>
            )}

            {!feedback ? (
              <button
                onClick={handleEvaluate}
                disabled={!userAnswer || loading}
                className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl disabled:bg-slate-100 active:scale-95"
              >
                {loading ? 'Evaluating via byLLM...' : 'Commit Answer'}
              </button>
            ) : (
              <div className="space-y-6 animate-scale-in">
                <div className={`p-8 rounded-[32px] border-l-8 ${feedback.isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-rose-50 border-rose-500 text-rose-900'}`}>
                  <p className="font-black uppercase text-xs mb-2 tracking-widest">{feedback.isCorrect ? 'Node Validated' : 'Logic Mismatch'}</p>
                  <p className="text-sm font-medium leading-relaxed">{feedback.feedback}</p>
                </div>
                <button
                  onClick={nextQuestion}
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl"
                >
                  {currentIndex < quiz.questions.length - 1 ? 'Traverse Next Node' : 'Complete Assessment'}
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'results' && (
          <div className="text-center py-10 animate-fade-in space-y-8">
            <div className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl font-black shadow-2xl shadow-emerald-100 border-4 border-white">
              {Math.round((score / (quiz?.questions.length || 1)) * 100)}%
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Mastery Achieved</h3>
              <p className="text-slate-400 font-medium mt-2">Score: {score} / {quiz?.questions.length} nodes validated.</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setView('setup')}
                className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-slate-50"
              >
                Retake Quiz
              </button>
              <button
                onClick={saveResults}
                disabled={loading}
                className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase text-xs tracking-widest hover:bg-emerald-700 shadow-xl transition-all"
              >
                {loading ? 'Commiting...' : 'Commit to OSP Graph'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizSystem;
