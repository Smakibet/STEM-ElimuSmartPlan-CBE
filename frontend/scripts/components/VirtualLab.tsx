
import React, { useState, useRef, useEffect } from 'react';
import { generateLabExperiment, generateLabImage } from '../../services/geminiService';
import { ChatMessage } from '../../types';

const VirtualLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'assistant' | 'simulation'>('assistant');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Welcome to the STEM Virtual Lab! I can help you visualize experiments or understand scientific concepts. What would you like to explore today?' }
  ]);
  const [input, setInput] = useState('');
  const [code, setCode] = useState(`// STEM Simulation Code\nfunction simulate() {\n  const gravity = 9.8;\n  console.log("Simulating with g =", gravity);\n}\nsimulate();`);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const textResponse = await generateLabExperiment(userMsg.text);
    let imageUrl = null;
    const visualKeywords = ['show', 'diagram', 'draw', 'setup', 'visualize'];
    if (visualKeywords.some(k => userMsg.text.toLowerCase().includes(k))) {
      imageUrl = await generateLabImage(userMsg.text);
    }

    setMessages(prev => [...prev, { role: 'model', text: textResponse.text, image: imageUrl || undefined }]);
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
      {/* Header with Tab Navigation */}
      <div className="bg-slate-900 p-8 text-white">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">STEM Virtual Lab</h2>
            <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mt-1">Institutional Experiment Practical</p>
          </div>
          <div className="flex bg-white/10 p-1.5 rounded-2xl backdrop-blur-md">
            <button
              onClick={() => setActiveTab('assistant')}
              className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'assistant' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab('simulation')}
              className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'simulation' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Code Simulation
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'assistant' ? (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-[32px] p-6 shadow-sm ${msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-600/20'
                  : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                  }`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium">{msg.text}</p>
                  {msg.image && (
                    <div className="mt-4 rounded-2xl overflow-hidden border border-slate-100 bg-white">
                      <img src={msg.image} alt="Simulation" className="w-full h-auto" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white px-6 py-4 rounded-full border border-slate-100 shadow-sm flex items-center space-x-2 animate-pulse">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 bg-white border-t border-slate-100">
            <form onSubmit={handleSend} className="flex gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Request experiment visualization or explanation..."
                className="flex-1 rounded-[24px] border-slate-200 border px-6 py-4 text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-slate-900 text-white rounded-full p-4 hover:bg-slate-800 disabled:opacity-30 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-8 bg-slate-50 gap-8 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Simulation Editor</label>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                className="flex-1 rounded-[32px] border-slate-200 border p-8 font-mono text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none resize-none bg-slate-900 text-emerald-400 shadow-2xl"
                spellCheck={false}
              />
              <button className="bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
                Execute Model
              </button>
            </div>
            <div className="bg-white rounded-[32px] border border-slate-200 p-8 flex flex-col shadow-sm">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Execution Results</label>
              <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 p-6 font-mono text-xs text-slate-500">
                {'> '} Initializing OSP code node...<br />
                {'> '} Model validated for Junior Grade STEM.<br />
                {'> '} Ready to run.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualLab;
