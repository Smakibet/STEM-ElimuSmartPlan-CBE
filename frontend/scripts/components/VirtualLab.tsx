import React, { useState, useRef, useEffect } from 'react';
import {
  generateLabExperiment,
  generateLabImage,
  generateCustomSimulation,
  getLabResources,
  getSimulationLibrary,
  loadSimulation
} from '../../services/geminiService';
import { ChatMessage } from '../../types';

interface Simulation {
  id: string;
  title: string;
  subject: string;
  topics: string[];
  grade_range?: string[];
  description: string;
}

interface SimulationCode {
  html: string;
  css?: string;
  javascript?: string;
  controls?: Array<{
    type: string;
    label: string;
    min: number;
    max: number;
    default: number;
    unit: string;
  }>;
  instructions?: string;
}

const VirtualLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'assistant' | 'simulation' | 'library'>('assistant');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Welcome to the STEM Virtual Lab! Enter your lesson topic above, then I can help you with simulations, visualizations, or find learning resources.' }
  ]);
  const [input, setInput] = useState('');
  const [lessonTopic, setLessonTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulationLibrary, setSimulationLibrary] = useState<Simulation[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<SimulationCode | null>(null);
  const [resources, setResources] = useState<any>(null);
  const [phetSimulations, setPhetSimulations] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    loadSimulationLibrary();
  }, []);

  // Search PhET simulations based on lesson topic
  useEffect(() => {
    if (lessonTopic) {
      searchPhetSimulations(lessonTopic);
    }
  }, [lessonTopic]);

  const searchPhetSimulations = async (topic: string) => {
    // Map common topics to PhET simulation categories
    const topicKeywords = topic.toLowerCase();
    const phetSims = [
      {
        title: 'Circuit Construction Kit: DC',
        url: 'https://phet.colorado.edu/en/simulations/circuit-construction-kit-dc',
        keywords: ['circuit', 'electricity', 'current', 'voltage', 'resistance'],
        thumbnail: '🔌'
      },
      {
        title: 'Energy Forms and Changes',
        url: 'https://phet.colorado.edu/en/simulations/energy-forms-and-changes',
        keywords: ['energy', 'heat', 'temperature', 'thermal'],
        thumbnail: '⚡'
      },
      {
        title: 'Molecule Shapes',
        url: 'https://phet.colorado.edu/en/simulations/molecule-shapes',
        keywords: ['molecule', 'chemistry', 'atoms', 'bonds', 'chemical'],
        thumbnail: '🧪'
      },
      {
        title: 'Forces and Motion',
        url: 'https://phet.colorado.edu/en/simulations/forces-and-motion-basics',
        keywords: ['force', 'motion', 'friction', 'newton', 'mechanics'],
        thumbnail: '🏃'
      },
      {
        title: 'Wave Interference',
        url: 'https://phet.colorado.edu/en/simulations/wave-interference',
        keywords: ['wave', 'sound', 'light', 'interference', 'frequency'],
        thumbnail: '🌊'
      },
      {
        title: 'pH Scale',
        url: 'https://phet.colorado.edu/en/simulations/ph-scale',
        keywords: ['acid', 'base', 'ph', 'chemistry', 'alkaline'],
        thumbnail: '🧫'
      },
      {
        title: 'Projectile Motion',
        url: 'https://phet.colorado.edu/en/simulations/projectile-motion',
        keywords: ['projectile', 'motion', 'gravity', 'trajectory', 'physics'],
        thumbnail: '🎯'
      },
      {
        title: 'States of Matter',
        url: 'https://phet.colorado.edu/en/simulations/states-of-matter',
        keywords: ['states', 'matter', 'solid', 'liquid', 'gas', 'phase'],
        thumbnail: '🧊'
      },
      {
        title: 'Photosynthesis',
        url: 'https://phet.colorado.edu/en/simulations/natural-selection',
        keywords: ['plant', 'photosynthesis', 'biology', 'cell', 'chloroplast'],
        thumbnail: '🌱'
      },
      {
        title: 'Density',
        url: 'https://phet.colorado.edu/en/simulations/density',
        keywords: ['density', 'mass', 'volume', 'buoyancy', 'float'],
        thumbnail: '⚖️'
      }
    ];

    const matches = phetSims.filter(sim =>
      sim.keywords.some(keyword => topicKeywords.includes(keyword))
    );

    setPhetSimulations(matches.length > 0 ? matches : [
      {
        title: 'Browse All PhET Simulations',
        url: 'https://phet.colorado.edu/en/simulations/filter?type=html',
        keywords: [],
        thumbnail: '🔬'
      }
    ]);
  };

  const loadSimulationLibrary = async () => {
    try {
      const result = await getSimulationLibrary();
      setSimulationLibrary(result.simulations);
    } catch (error) {
      console.error('Error loading simulation library:', error);
      setSimulationLibrary([]);
    }
  };

  const handleSend = async (e: React.FormEvent, interactionType: string = 'chat') => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      if (interactionType === 'visualize') {
        setMessages(prev => [...prev, {
          role: 'model',
          text: 'Generating visualization...'
        }]);

        const imageUrl = await generateLabImage(currentInput, lessonTopic);
        const textResponse = await generateLabExperiment(
          `Explain this concept briefly: ${currentInput}`,
          lessonTopic
        );

        // Update the last message with both text and image
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'model',
            text: textResponse.text,
            image: imageUrl || undefined
          };
          return newMessages;
        });

      } else if (interactionType === 'resources') {
        const resourceResult = await getLabResources(currentInput, lessonTopic);

        if (resourceResult && resourceResult.resources) {
          setResources(resourceResult.resources);
          setMessages(prev => [...prev, {
            role: 'model',
            text: `I found learning resources for "${lessonTopic || currentInput}"! Check the Library tab to view them all.`
          }]);
          setTimeout(() => setActiveTab('library'), 500);
        } else {
          setMessages(prev => [...prev, {
            role: 'model',
            text: 'I encountered an issue finding resources. Please try rephrasing your request.'
          }]);
        }

      } else if (interactionType === 'simulate') {
        const simResult = await generateCustomSimulation(currentInput, lessonTopic);

        if (simResult && simResult.simulationData) {
          setActiveSimulation(simResult.simulationData);
          setMessages(prev => [...prev, {
            role: 'model',
            text: `I've created a custom simulation for "${currentInput}"! Switching to the Simulation tab now.`
          }]);
          setTimeout(() => setActiveTab('simulation'), 500);
        } else {
          setMessages(prev => [...prev, {
            role: 'model',
            text: 'I encountered an issue creating the simulation. Please try describing what you want to simulate more specifically.'
          }]);
        }

      } else {
        const textResponse = await generateLabExperiment(currentInput, lessonTopic);
        setMessages(prev => [...prev, {
          role: 'model',
          text: textResponse.text
        }]);
      }
    } catch (error) {
      console.error('Error in handleSend:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: 'Sorry, I encountered an error. Please try again or rephrase your request.'
      }]);
    }

    setLoading(false);
  };

  const loadPrebuiltSimulation = async (simId: string) => {
    setLoading(true);
    try {
      const result = await loadSimulation(simId);

      if (result && result.code) {
        setActiveSimulation(result.code);
        setActiveTab('simulation');
      }
    } catch (error) {
      console.error('Error loading simulation:', error);
    }
    setLoading(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tighter text-white">STEM Virtual Lab</h2>
            <p className="text-[10px] sm:text-xs text-indigo-200 font-bold tracking-widest uppercase mt-1">Interactive Learning Platform</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-white/10 p-1.5 rounded-2xl backdrop-blur-md w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('assistant')}
              className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'assistant' ? 'bg-white text-indigo-600 shadow-lg' : 'text-white/70 hover:text-white'}`}
            >
              Assistant
            </button>
            <button
              onClick={() => setActiveTab('simulation')}
              className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'simulation' ? 'bg-white text-indigo-600 shadow-lg' : 'text-white/70 hover:text-white'}`}
            >
              Simulation
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'library' ? 'bg-white text-indigo-600 shadow-lg' : 'text-white/70 hover:text-white'}`}
            >
              Library
            </button>
          </div>
        </div>

        {/* Lesson Topic Input */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4">
          <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block mb-2">Current Lesson Topic</label>
          <input
            type="text"
            value={lessonTopic}
            onChange={(e) => setLessonTopic(e.target.value)}
            placeholder="e.g., Photosynthesis, Electric Circuits, Newton's Laws..."
            className="w-full bg-white/20 text-white placeholder-white/50 rounded-xl px-4 py-2 sm:py-3 text-sm focus:ring-2 focus:ring-white/30 outline-none"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6">
        {activeTab === 'assistant' ? (
          <div className="h-full flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] sm:max-w-[85%] rounded-3xl p-4 sm:p-6 shadow-sm ${msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none'
                    }`}>
                    <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed font-medium">{msg.text}</p>
                    {msg.image && (
                      <div className="mt-4 rounded-2xl overflow-hidden border-2 border-white shadow-lg">
                        <img src={msg.image} alt="Visualization" className="w-full h-auto" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 px-6 py-4 rounded-full shadow-sm flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 p-4 sm:p-6 lg:p-8 bg-slate-50 border-t border-slate-200">
              <form onSubmit={(e) => handleSend(e, 'chat')} className="space-y-3 sm:space-y-4">
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question or request help..."
                    className="flex-1 rounded-3xl border-slate-200 border px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="bg-indigo-600 text-white rounded-full p-3 sm:p-4 hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-xl active:scale-95 flex-shrink-0"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => handleSend(e, 'visualize')}
                    disabled={loading || !input.trim()}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-100 text-purple-700 rounded-xl text-[10px] sm:text-xs font-bold uppercase hover:bg-purple-200 disabled:opacity-50 transition-all"
                  >
                    📊 Visualize
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSend(e, 'simulate')}
                    disabled={loading || !input.trim()}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] sm:text-xs font-bold uppercase hover:bg-emerald-200 disabled:opacity-50 transition-all"
                  >
                    🔬 Simulate
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSend(e, 'resources')}
                    disabled={loading || !input.trim()}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-100 text-amber-700 rounded-xl text-[10px] sm:text-xs font-bold uppercase hover:bg-amber-200 disabled:opacity-50 transition-all"
                  >
                    📚 Resources
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : activeTab === 'simulation' ? (
          <div className="h-full bg-white rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 overflow-auto">
            {activeSimulation ? (
              <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-4">Interactive Simulation</h3>
                  <div className="bg-slate-900 rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6 min-h-[250px] sm:min-h-[400px]">
                    <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: activeSimulation.html }} />
                  </div>

                  {activeSimulation.controls && activeSimulation.controls.length > 0 && (
                    <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controls</p>
                      {activeSimulation.controls.map((control, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                          <label className="text-xs sm:text-sm font-bold text-slate-700 sm:w-32">{control.label}</label>
                          <input type="range" min={control.min} max={control.max} defaultValue={control.default} step="0.1" className="flex-1 w-full" />
                          <span className="text-xs sm:text-sm text-slate-500">{control.default} {control.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeSimulation.instructions && (
                    <div className="p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-xs sm:text-sm text-blue-900 font-medium">{activeSimulation.instructions}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <div className="text-4xl sm:text-6xl mb-4">🔬</div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-400 mb-2">No Simulation Loaded</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">Select one from the Library or create via Assistant</p>
                  <button onClick={() => setActiveTab('library')} className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-700 transition-all">
                    Browse Library
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full bg-white rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto">
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-4 sm:mb-8">Simulation & Resource Library</h3>

              {/* PhET Simulations for Current Topic */}
              {lessonTopic && phetSimulations.length > 0 && (
                <div className="mb-8 sm:mb-12">
                  <h4 className="text-base sm:text-lg font-black text-indigo-600 mb-4 flex items-center gap-2">
                    <span>🎯</span> PhET Simulations for "{lessonTopic}"
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {phetSimulations.map((sim, idx) => (
                      <a
                        key={idx}
                        href={sim.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 p-4 sm:p-6 hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
                      >
                        <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{sim.thumbnail}</div>
                        <h5 className="font-black text-slate-800 mb-2 text-sm sm:text-base">{sim.title}</h5>
                        <span className="inline-block px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] sm:text-[10px] font-bold uppercase">
                          Open PhET →
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Built-in Simulations */}
              {simulationLibrary.length > 0 && (
                <div className="mb-8 sm:mb-12">
                  <h4 className="text-base sm:text-lg font-black text-slate-700 mb-4">Built-in Simulations</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {simulationLibrary.map((sim) => (
                      <div
                        key={sim.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer hover:scale-105"
                        onClick={() => loadPrebuiltSimulation(sim.id)}
                      >
                        <div className="text-2xl sm:text-3xl mb-3 sm:mb-4">🧪</div>
                        <h5 className="font-black text-slate-800 mb-2 text-sm sm:text-base">{sim.title}</h5>
                        <p className="text-[10px] sm:text-xs text-slate-500 mb-3 sm:mb-4">{sim.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {sim.topics.map((topic, idx) => (
                            <span key={idx} className="px-2 sm:px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[9px] sm:text-[10px] font-bold uppercase">{topic}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Resources */}
              {resources && (
                <div className="bg-slate-50 rounded-3xl border border-slate-200 p-4 sm:p-6 lg:p-8">
                  <h3 className="text-base sm:text-xl font-black text-slate-800 mb-4 sm:mb-6">Additional Learning Resources</h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {resources.video_resources && resources.video_resources.length > 0 && (
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-widest mb-3">📺 Video Resources</h4>
                        <ul className="space-y-2">
                          {resources.video_resources.map((video: string, idx: number) => (
                            <li key={idx} className="text-xs sm:text-sm text-slate-600 flex items-start gap-2">
                              <span className="w-2 h-2 bg-indigo-400 rounded-full mt-1.5 flex-shrink-0"></span>
                              <span>{video}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {resources.interactive_sites && resources.interactive_sites.length > 0 && (
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-widest mb-3">🌐 Interactive Sites</h4>
                        <ul className="space-y-2">
                          {resources.interactive_sites.map((site: string, idx: number) => (
                            <li key={idx} className="text-xs sm:text-sm text-slate-600 flex items-start gap-2">
                              <span className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 flex-shrink-0"></span>
                              <span>{site}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {resources.hands_on_activities && resources.hands_on_activities.length > 0 && (
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-widest mb-3">🔨 Hands-on Activities</h4>
                        <ul className="space-y-2">
                          {resources.hands_on_activities.map((activity: string, idx: number) => (
                            <li key={idx} className="text-xs sm:text-sm text-slate-600 flex items-start gap-2">
                              <span className="w-2 h-2 bg-amber-400 rounded-full mt-1.5 flex-shrink-0"></span>
                              <span>{activity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualLab;