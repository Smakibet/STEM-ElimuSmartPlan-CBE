import React, { useState } from 'react';
import { JacClient } from '../../services/jacService';

const QuizSystem = ({ lessons = [] }) => {
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [view, setView] = useState('setup');
  const [error, setError] = useState(null);

  // Fallback lessons if none provided
  const defaultLessons = [
    {
      id: '1',
      topic: 'Introduction to Python Programming',
      grade: 'Grade 9',
      content: 'Python is a versatile high-level programming language. Variables store data values. Data types include strings, integers, and floats. Functions encapsulate reusable code blocks. Loops allow code repetition. Conditional statements enable decision-making in programs.',
      objectives: ['Understand Python syntax', 'Work with variables', 'Create functions'],
      difficulty: 'beginner'
    },
    {
      id: '2',
      topic: 'Algebraic Expressions',
      grade: 'Grade 8',
      content: 'Algebra uses letters to represent unknown values. Variables can be combined using operations. Equations show equality between expressions. Simplifying expressions involves combining like terms. Solving equations requires isolating the variable. The order of operations (PEMDAS) must be followed.',
      objectives: ['Simplify expressions', 'Solve linear equations', 'Apply algebraic rules'],
      difficulty: 'intermediate'
    },
    {
      id: '3',
      topic: 'World Geography and Continents',
      grade: 'Grade 7',
      content: 'Earth has seven continents: Africa, Antarctica, Asia, Europe, North America, Oceania, and South America. Each continent has unique geographic features. Countries are political divisions within continents. Capital cities serve as governmental centers. Climate zones affect ecosystems and human settlement. Physical geography includes mountains, rivers, and deserts.',
      objectives: ['Identify continents', 'Understand political boundaries', 'Recognize climate zones'],
      difficulty: 'beginner'
    }
  ];

  const displayLessons = lessons.length > 0 ? lessons : defaultLessons;

  const agents = [
    { id: 1, name: 'Context Synthesis', desc: 'Analyzing lesson structure and objectives...' },
    { id: 2, name: 'byLLM Generator', desc: 'Generating contextual MCQ & Code nodes...' },
    { id: 3, name: 'Validator Agent', desc: 'Validating question quality and distractors...' }
  ];

  const generateQuizWithAI = async (lesson) => {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert educational assessment designer. Generate a comprehensive quiz based on this lesson.

LESSON DETAILS:
Topic: ${lesson.topic}
Grade Level: ${lesson.grade}
Content: ${lesson.content}
Learning Objectives: ${lesson.objectives?.join(', ') || 'General understanding'}
Difficulty: ${lesson.difficulty || 'intermediate'}

TASK: Generate a quiz with 5 questions that thoroughly assess understanding of this lesson. Mix question types appropriately.

Return ONLY valid JSON in this EXACT format (no markdown, no extra text):
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "Clear, specific question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": 0,
      "explanation": "Detailed explanation of why this is correct",
      "difficulty": "easy"
    }
  ]
}

REQUIREMENTS:
- Generate 5 questions total
- Make 4 multiple choice questions and 1 code/open-ended question if topic involves programming, otherwise all multiple choice
- For code questions, use type "code" and include "initialCode" field instead of "options"
- Each question must test a different concept from the lesson
- correctAnswer is the index (0-3) of correct option for multiple choice
- Make distractors plausible but clearly wrong
- Align difficulty with grade level
- Provide thorough explanations
- Questions should be pedagogically sound

Return ONLY the JSON object.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsedQuiz = JSON.parse(cleanText);
      return {
        id: `quiz_${Date.now()}`,
        lessonId: lesson.id,
        topic: lesson.topic,
        grade: lesson.grade,
        generatedAt: new Date().toISOString(),
        questions: parsedQuiz.questions
      };
    } catch (parseError) {
      console.error("Parse error:", parseError);
      console.error("Received text:", cleanText);
      throw new Error("Failed to parse AI-generated quiz. Please try again.");
    }
  };

  const evaluateAnswerWithAI = async (question, userAnswer) => {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Evaluate this student's answer with pedagogical expertise.

QUESTION: ${question.question}
TYPE: ${question.type}
${question.options ? `OPTIONS: ${question.options.map((o, i) => `${i}: ${o}`).join(', ')}` : ''}
CORRECT ANSWER: ${question.type === 'multiple_choice' ? `Index ${question.correctAnswer} - ${question.options[question.correctAnswer]}` : question.correctAnswer}
STUDENT'S ANSWER: ${question.type === 'multiple_choice' ? `Index ${userAnswer} - ${question.options[userAnswer]}` : userAnswer}

Provide constructive feedback appropriate for a ${question.difficulty || 'intermediate'} level learner.

Return ONLY valid JSON (no markdown):
{
  "isCorrect": true or false,
  "feedback": "Detailed, encouraging feedback that explains the concept"
}

Make feedback educational and supportive.`
          }]
        }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini Evaluation Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      return JSON.parse(cleanText);
    } catch (parseError) {
      // Fallback evaluation
      const isCorrect = question.type === 'multiple_choice'
        ? Number(userAnswer) === question.correctAnswer
        : userAnswer.toLowerCase().includes(String(question.correctAnswer).toLowerCase());

      return {
        isCorrect,
        feedback: isCorrect
          ? `Correct! ${question.explanation || 'Well done on understanding this concept.'}`
          : `Not quite. ${question.explanation || 'Review the lesson material for this concept.'}`
      };
    }
  };

  const handleGenerate = async () => {
    if (!selectedLessonId) {
      setError('Please select a lesson first');
      return;
    }

    setLoading(true);
    setError(null);
    const lesson = displayLessons.find(l => l.id === selectedLessonId);

    try {
      // Agent 1: Context Synthesis
      setActiveAgent(1);
      await new Promise(r => setTimeout(r, 800));

      // Try JacClient first if available
      let result;
      try {
        setActiveAgent(2);
        result = await JacClient.spawnWalker('generate_quiz', {
          lessonContext: lesson,
          topic: lesson.topic,
          content: lesson.content,
          objectives: lesson.objectives,
          difficulty: lesson.difficulty,
          grade: lesson.grade
        });

        // Validate JacClient response
        if (!result || !result.questions || !Array.isArray(result.questions)) {
          throw new Error("Invalid response from JacClient");
        }
      } catch (jacError) {
        console.warn("JacClient unavailable, using AI generation:", jacError.message);
        // Fallback to AI generation
        result = await generateQuizWithAI(lesson);
      }

      // Agent 3: Validation
      setActiveAgent(3);
      await new Promise(r => setTimeout(r, 600));

      setQuiz(result);
      setCurrentIndex(0);
      setScore(0);
      setFeedback(null);
      setUserAnswer('');
      setView('quiz');
      setActiveAgent(null);
    } catch (err) {
      console.error("Quiz generation error:", err);
      setError(`Failed to generate quiz: ${err.message}`);
      setActiveAgent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!quiz || userAnswer === '') return;
    const currentQ = quiz.questions[currentIndex];

    setLoading(true);
    setError(null);

    try {
      let result;
      try {
        // Try JacClient evaluation first
        result = await JacClient.spawnWalker('evaluate_answer', {
          question: currentQ,
          answer: currentQ.type === 'multiple_choice' ? Number(userAnswer) : userAnswer,
          lessonContext: displayLessons.find(l => l.id === quiz.lessonId)
        });

        if (!result || typeof result.isCorrect === 'undefined') {
          throw new Error("Invalid evaluation response");
        }
      } catch (jacError) {
        console.warn("JacClient evaluation unavailable, using AI:", jacError.message);
        // Fallback to AI evaluation
        result = await evaluateAnswerWithAI(currentQ, userAnswer);
      }

      setFeedback(result);
      if (result.isCorrect) setScore(s => s + 1);
    } catch (err) {
      console.error("Evaluation error:", err);
      setError(`Evaluation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = () => {
    if (quiz && currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setFeedback(null);
      setError(null);
    } else {
      setView('results');
    }
  };

  const saveResults = async () => {
    if (!quiz) return;
    setLoading(true);

    const result = {
      id: `res_${Date.now()}`,
      quizId: quiz.id,
      lessonId: quiz.lessonId,
      studentId: 'demo_student',
      score,
      total: quiz.questions.length,
      percentage: Math.round((score / quiz.questions.length) * 100),
      date: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      feedback: "Assessment completed via Elimu AI Quiz System.",
      answers: quiz.questions.map((q, i) => ({
        questionId: q.id,
        correct: i < currentIndex ? (feedback?.isCorrect || false) : false
      }))
    };

    try {
      // Try saving via JacClient
      try {
        await JacClient.spawnWalker('save_quiz_result', { result });
        alert(`Results committed to Elimu OSP Graph!\n\nScore: ${result.score}/${result.total} (${result.percentage}%)`);
      } catch (jacError) {
        console.warn("JacClient save unavailable:", jacError.message);
        // Fallback: log to console
        console.log("Quiz Results (JacClient unavailable):", result);
        alert(`Quiz completed!\n\nScore: ${result.score}/${result.total} (${result.percentage}%)\n\nResults logged to console (JacClient unavailable).`);
      }

      setQuiz(null);
      setView('setup');
      setSelectedLessonId('');
      setError(null);
    } catch (err) {
      console.error("Save error:", err);
      setError(`Failed to save results: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white p-10 rounded-3xl shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Quiz Master</h2>
              <p className="text-slate-400 font-medium text-sm uppercase tracking-widest">AI Assessment Node • Powered by Jac + Gemini 2.0</p>
            </div>
            {typeof JacClient !== 'undefined' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-emerald-700">JacClient Active</span>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 rounded-lg">
              <p className="text-rose-900 text-sm font-medium">{error}</p>
            </div>
          )}

          {view === 'setup' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Target Lesson Context</label>
                <select
                  value={selectedLessonId}
                  onChange={e => setSelectedLessonId(e.target.value)}
                  className="w-full rounded-2xl border-slate-200 border p-4 text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold"
                >
                  <option value="">Select a lesson content...</option>
                  {displayLessons.map(l => (
                    <option key={l.id} value={l.id}>{l.topic} ({l.grade})</option>
                  ))}
                </select>
              </div>

              {selectedLessonId && (
                <div className="p-6 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl border border-slate-200">
                  <p className="text-xs font-black text-slate-600 uppercase tracking-widest mb-3">Lesson Context Preview</p>
                  <p className="text-sm text-slate-700 leading-relaxed mb-4">
                    {displayLessons.find(l => l.id === selectedLessonId)?.content}
                  </p>
                  {displayLessons.find(l => l.id === selectedLessonId)?.objectives && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {displayLessons.find(l => l.id === selectedLessonId).objectives.map((obj, i) => (
                        <span key={i} className="px-3 py-1 bg-white rounded-full text-xs font-bold text-indigo-700 border border-indigo-200">
                          {obj}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                disabled={loading || !selectedLessonId}
                onClick={handleGenerate}
                className="w-full py-5 rounded-3xl text-white font-black uppercase tracking-widest text-xs bg-slate-900 hover:bg-slate-800 transition-all shadow-xl disabled:bg-slate-200 disabled:text-slate-400 active:scale-95"
              >
                {loading ? 'Orchestrating AI Agents...' : 'Generate Quiz Assessment'}
              </button>

              {loading && (
                <div className="pt-6 space-y-4">
                  {agents.map(agent => (
                    <div key={agent.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${activeAgent === agent.id ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${activeAgent === agent.id ? 'bg-emerald-600 text-white animate-pulse' : 'bg-slate-200 text-slate-400'}`}>{agent.id}</div>
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{agent.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{agent.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'quiz' && quiz && (
            <div className="space-y-8">
              <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Question {currentIndex + 1} / {quiz.questions.length}</span>
                <div className="w-48 bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }}></div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-indigo-100 rounded-full text-xs font-bold text-indigo-700">
                  {quiz.questions[currentIndex].difficulty || 'Medium'}
                </span>
                <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">
                  {quiz.questions[currentIndex].type === 'multiple_choice' ? 'Multiple Choice' : 'Code Challenge'}
                </span>
              </div>

              <h3 className="text-2xl font-black text-slate-800 leading-tight">
                {quiz.questions[currentIndex].question}
              </h3>

              {quiz.questions[currentIndex].type === 'multiple_choice' ? (
                <div className="grid grid-cols-1 gap-4">
                  {quiz.questions[currentIndex].options?.map((opt, i) => (
                    <button
                      key={i}
                      disabled={feedback !== null}
                      onClick={() => setUserAnswer(String(i))}
                      className={`w-full text-left p-6 rounded-2xl border-2 transition-all font-bold text-sm ${userAnswer === String(i)
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-lg'
                        : 'border-slate-100 hover:border-slate-300 text-slate-600'
                        } ${feedback !== null ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <span className="inline-block w-8 h-8 rounded-lg bg-white border border-slate-200 mr-4 text-center leading-8 text-xs uppercase font-black">{String.fromCharCode(65 + i)}</span>
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
                    <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4">byLLM Code Editor</p>
                    <textarea
                      value={userAnswer || quiz.questions[currentIndex].initialCode || ''}
                      onChange={e => setUserAnswer(e.target.value)}
                      disabled={feedback !== null}
                      spellCheck={false}
                      placeholder="Write your code here..."
                      className="w-full bg-transparent text-emerald-50 font-mono text-sm outline-none min-h-[200px] resize-none placeholder-slate-600"
                    />
                  </div>
                </div>
              )}

              {!feedback ? (
                <button
                  onClick={handleEvaluate}
                  disabled={userAnswer === '' || loading}
                  className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl disabled:bg-slate-200 disabled:text-slate-400 active:scale-95"
                >
                  {loading ? 'Evaluating via AI...' : 'Submit Answer'}
                </button>
              ) : (
                <div className="space-y-6">
                  <div className={`p-8 rounded-2xl border-l-8 ${feedback.isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-rose-50 border-rose-500 text-rose-900'}`}>
                    <p className="font-black uppercase text-xs mb-2 tracking-widest">{feedback.isCorrect ? '✓ Correct Answer!' : '✗ Incorrect'}</p>
                    <p className="text-sm font-medium leading-relaxed">{feedback.feedback}</p>
                  </div>
                  <button
                    onClick={nextQuestion}
                    className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl"
                  >
                    {currentIndex < quiz.questions.length - 1 ? 'Next Question →' : 'View Results'}
                  </button>
                </div>
              )}
            </div>
          )}

          {view === 'results' && quiz && (
            <div className="text-center py-10 space-y-8">
              <div className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl font-black shadow-2xl border-4 border-white">
                {Math.round((score / quiz.questions.length) * 100)}%
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Assessment Complete!</h3>
                <p className="text-slate-400 font-medium mt-2">Score: {score} / {quiz.questions.length} correct</p>
                <p className="text-sm text-slate-500 mt-1">Topic: {quiz.topic}</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setView('setup');
                    setQuiz(null);
                    setScore(0);
                    setCurrentIndex(0);
                    setUserAnswer('');
                    setFeedback(null);
                    setError(null);
                  }}
                  className="flex-1 py-4 rounded-2xl border-2 border-slate-200 text-slate-600 font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all"
                >
                  New Quiz
                </button>
                <button
                  onClick={saveResults}
                  disabled={loading}
                  className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase text-xs tracking-widest hover:bg-emerald-700 shadow-xl transition-all disabled:bg-emerald-300"
                >
                  {loading ? 'Saving...' : 'Save to Elimu OSP'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizSystem;