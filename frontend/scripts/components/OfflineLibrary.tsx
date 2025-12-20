
import React from 'react';
import { LessonPlan } from '../../types';

interface OfflineLibraryProps {
  lessons: LessonPlan[];
  onView: (lesson: LessonPlan) => void;
  onDelete: (id: string) => void;
}

const OfflineLibrary: React.FC<OfflineLibraryProps> = ({ lessons, onView, onDelete }) => {
  const handleDownload = (lesson: LessonPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    let content = `LESSON PLAN: ${lesson.topic}\nSubject: ${lesson.subject}\n\n`;
    lesson.sections.forEach(s => content += `[${s.title}]\n${s.content}\n\n`);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lesson.topic}.txt`;
    link.click();
  };

  return (
    <div className="h-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-y-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Offline Library</h2>
          <p className="text-slate-500 text-sm">Access your lesson plans without internet</p>
        </div>
        <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold">
          {lessons.length} Saved Plans
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
          <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          <p>No offline lessons yet.</p>
          <p className="text-sm">Generate and save lessons to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all group bg-white cursor-pointer" onClick={() => onView(lesson)}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase tracking-wide">{lesson.subject}</span>
                <span className="text-xs text-slate-400">{new Date(lesson.generatedAt).toLocaleDateString()}</span>
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-1 truncate">{lesson.topic}</h3>
              {lesson.subStrand && (
                <p className="text-xs text-slate-500 italic mb-2">Strand: {lesson.subStrand}</p>
              )}
              <p className="text-sm text-slate-500 mb-4">{lesson.grade} • {lesson.duration}</p>

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={(e) => handleDownload(lesson, e)}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center bg-slate-100 px-2 py-1 rounded"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(lesson.id); }}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OfflineLibrary;
