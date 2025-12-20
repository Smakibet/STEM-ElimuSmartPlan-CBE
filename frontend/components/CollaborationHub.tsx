import React, { useState, useEffect } from 'react';
import { LessonPlan, CoTeachingSession, ResourceBooking, PeerObservation, User } from '../types';

interface CollaborationHubProps {
  savedLessons?: LessonPlan[];
  user?: User | null;
}

const CollaborationHub: React.FC<CollaborationHubProps> = ({ savedLessons = [], user }) => {
  const [activeTab, setActiveTab] = useState<'digital' | 'physical'>('digital');
  const [levelFilter, setLevelFilter] = useState<'All' | 'Junior' | 'Senior'>('All');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showCoTeachForm, setShowCoTeachForm] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Forms
  const [bookingForm, setBookingForm] = useState({ resource: 'Science Lab', date: '', time: '' });
  const [coTeachForm, setCoTeachForm] = useState({ partner: '', date: '', topic: '', strategy: 'Team Teaching' });

  // Initial Seed Data
  const initialSharedLessons: LessonPlan[] = [
    {
      id: 's1', topic: 'Intro to Robotics', subject: 'Computer Science', grade: 'Grade 8', schoolLevel: 'Junior',
      duration: '80m', author: 'Mr. Kamau', generatedAt: new Date().toISOString(),
      coreCompetencies: [], values: [], materials: [], sections: [], 
      keyInquiryQuestions: ["How can robots help us in daily life?", "What are the main components of a robot?"],
      picratAnalysis: { level: 'Creative', explanation: 'Robotics Sim' }
    },
    {
      id: 's2', topic: 'Calculus Applications', subject: 'Mathematics', grade: 'Grade 12', schoolLevel: 'Senior',
      duration: '40m', author: 'Mrs. Ochieng', generatedAt: new Date().toISOString(),
      coreCompetencies: [], values: [], materials: [], sections: [], 
      keyInquiryQuestions: ["How is calculus used to model change?", "What is the relationship between derivatives and integrals?"],
      picratAnalysis: { level: 'Interactive', explanation: 'Graphing tools' }
    }
  ];

  const [sharedLessons, setSharedLessons] = useState<LessonPlan[]>([]);
  const [coTeaching, setCoTeaching] = useState<CoTeachingSession[]>([
    { id: '1', date: '2024-03-15', time: '10:00', topic: 'Thermodynamics', partnerTeacher: 'John Smith', strategy: 'Team Teaching', status: 'Planned' },
    { id: '2', date: '2024-03-18', time: '08:00', topic: 'Titration', partnerTeacher: 'Sarah Connor', strategy: 'Station Teaching', status: 'Pending' }
  ]);

  const [bookings, setBookings] = useState<ResourceBooking[]>([
    { id: '1', resource: 'STEM Makerspace', date: '2024-03-15', timeSlot: '10:00 - 11:20', bookedBy: 'You' },
    { id: '2', resource: 'Physics Lab A', date: '2024-03-16', timeSlot: '08:40 - 09:20', bookedBy: 'Mr. Kamau' }
  ]);

  // Load shared lessons from LocalStorage on mount
  useEffect(() => {
    const storedShared = localStorage.getItem('elimu_shared_repository');
    if (storedShared) {
        setSharedLessons(JSON.parse(storedShared));
    } else {
        setSharedLessons(initialSharedLessons);
        localStorage.setItem('elimu_shared_repository', JSON.stringify(initialSharedLessons));
    }
  }, []);

  const handleBookResource = (e: React.FormEvent) => {
    e.preventDefault();
    const newBooking: ResourceBooking = {
      id: crypto.randomUUID(),
      resource: bookingForm.resource,
      date: bookingForm.date,
      timeSlot: bookingForm.time,
      bookedBy: 'You'
    };
    setBookings([...bookings, newBooking]);
    setShowBookingForm(false);
    setBookingForm({ resource: 'Science Lab', date: '', time: '' });
  };

  const handleRequestCoTeach = (e: React.FormEvent) => {
    e.preventDefault();
    const newSession: CoTeachingSession = {
      id: crypto.randomUUID(),
      date: coTeachForm.date,
      time: 'TBD',
      topic: coTeachForm.topic,
      partnerTeacher: coTeachForm.partner,
      strategy: coTeachForm.strategy as any,
      status: 'Pending'
    };
    setCoTeaching([...coTeaching, newSession]);
    setShowCoTeachForm(false);
  };

  const handleShareLesson = (lesson: LessonPlan) => {
    const newShared = {
        ...lesson,
        id: crypto.randomUUID(),
        author: user?.name || 'Anonymous Teacher',
        shared: true,
        generatedAt: new Date().toISOString()
    };
    
    const updatedShared = [newShared, ...sharedLessons];
    setSharedLessons(updatedShared);
    localStorage.setItem('elimu_shared_repository', JSON.stringify(updatedShared));
    
    setIsShareModalOpen(false);
    alert(`Success: "${lesson.topic}" has been published to the National Repository.`);
  };

  const handleClone = (lesson: LessonPlan) => {
    alert(`Success: "${lesson.topic}" has been cloned to your offline library.`);
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto pb-6 relative">
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 rounded-xl p-8 text-white relative overflow-hidden shrink-0 shadow-lg">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Collaboration Hub</h2>
          <p className="opacity-90 max-w-2xl mb-6">
            Connect with colleagues to standardize delivery and share resources.
          </p>
          <div className="flex p-1 bg-white/20 rounded-lg w-fit backdrop-blur-sm">
            <button 
              onClick={() => setActiveTab('digital')}
              className={`px-5 py-2 rounded-md font-medium transition-all ${activeTab === 'digital' ? 'bg-white text-indigo-900 shadow-md' : 'text-white hover:bg-white/10'}`}
            >
              Digital Repository
            </button>
            <button 
              onClick={() => setActiveTab('physical')}
              className={`px-5 py-2 rounded-md font-medium transition-all ${activeTab === 'physical' ? 'bg-white text-indigo-900 shadow-md' : 'text-white hover:bg-white/10'}`}
            >
              Physical Collaboration
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'digital' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
             <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800">Shared Lessons</h3>
               <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as any)} className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-sm outline-none">
                 <option value="All">All Levels</option>
                 <option value="Junior">Junior School</option>
                 <option value="Senior">Senior School</option>
               </select>
             </div>
             <div className="grid grid-cols-1 gap-4">
               {sharedLessons.filter(l => levelFilter === 'All' || l.schoolLevel === levelFilter).map(lesson => (
                 <div key={lesson.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded">{lesson.subject}</span>
                        <span className="text-slate-400 text-xs">•</span>
                        <span className="text-slate-500 text-xs font-medium">{lesson.grade}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-lg">{lesson.topic}</h4>
                      <p className="text-slate-500 text-sm mt-1">Shared by <span className="text-slate-700 font-medium">{lesson.author}</span></p>
                    </div>
                    <div className="flex flex-col gap-2 justify-center min-w-[120px]">
                      <button className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 px-4 rounded-lg text-sm font-medium transition-colors">Preview</button>
                      <button onClick={() => handleClone(lesson)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-2 px-4 rounded-lg text-sm font-medium transition-colors">Clone Plan</button>
                    </div>
                 </div>
               ))}
             </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-4">Department Members</h3>
               <div className="space-y-4">
                 {['Jane Doe (Head)', 'John Smith', 'Alice Wambui'].map((n, i) => (
                   <div key={i} className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{n.charAt(0)}</div>
                     <span className="text-sm text-slate-700">{n}</span>
                   </div>
                 ))}
               </div>
               <button className="mt-4 text-indigo-600 text-sm font-medium hover:underline">View All &rarr;</button>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-2">Share Your Work</h3>
               <p className="text-xs text-slate-500 mb-4">Contribute to the national CBE repository.</p>
               <button 
                onClick={() => setIsShareModalOpen(true)} 
                className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
               >
                  Share from Library
               </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Co-Teaching Section */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-slate-800 text-lg">Co-Teaching Schedule</h3>
                 <button onClick={() => setShowCoTeachForm(!showCoTeachForm)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700">Request Partner</button>
               </div>

               {showCoTeachForm && (
                 <form onSubmit={handleRequestCoTeach} className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input type="text" placeholder="Partner Name" required className="p-2 text-sm border rounded" value={coTeachForm.partner} onChange={e => setCoTeachForm({...coTeachForm, partner: e.target.value})} />
                      <input type="date" required className="p-2 text-sm border rounded" value={coTeachForm.date} onChange={e => setCoTeachForm({...coTeachForm, date: e.target.value})} />
                    </div>
                    <input type="text" placeholder="Lesson Topic" required className="w-full p-2 text-sm border rounded mb-3" value={coTeachForm.topic} onChange={e => setCoTeachForm({...coTeachForm, topic: e.target.value})} />
                    <select className="w-full p-2 text-sm border rounded mb-3" value={coTeachForm.strategy} onChange={e => setCoTeachForm({...coTeachForm, strategy: e.target.value})}>
                      <option>Team Teaching</option>
                      <option>Station Teaching</option>
                      <option>One Teach, One Assist</option>
                    </select>
                    <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded text-sm font-medium">Send Request</button>
                 </form>
               )}

               <div className="space-y-3">
                 {coTeaching.map(session => (
                   <div key={session.id} className="border-l-4 border-indigo-500 bg-white shadow-sm p-4 rounded-r-lg">
                      <div className="flex justify-between items-start">
                         <div>
                            <h4 className="font-bold text-slate-800">{session.topic}</h4>
                            <p className="text-sm text-slate-500">w/ {session.partnerTeacher}</p>
                         </div>
                         <span className={`text-xs px-2 py-1 rounded font-bold ${session.status === 'Planned' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{session.status}</span>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-slate-500">
                         <span className="flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{session.date}</span>
                         <span className="flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>{session.strategy}</span>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          {/* Resource Booking Section */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-slate-800 text-lg">Resource Booking</h3>
                 <button onClick={() => setShowBookingForm(!showBookingForm)} className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-700">Book Resource</button>
               </div>

               {showBookingForm && (
                 <form onSubmit={handleBookResource} className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <select className="w-full p-2 text-sm border rounded mb-3" value={bookingForm.resource} onChange={e => setBookingForm({...bookingForm, resource: e.target.value})}>
                      <option>Science Lab</option>
                      <option>Computer Lab</option>
                      <option>Makerspace</option>
                      <option>Projector A</option>
                    </select>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input type="date" required className="p-2 text-sm border rounded" value={bookingForm.date} onChange={e => setBookingForm({...bookingForm, date: e.target.value})} />
                      <input type="text" placeholder="10:00 - 11:00" required className="p-2 text-sm border rounded" value={bookingForm.time} onChange={e => setBookingForm({...bookingForm, time: e.target.value})} />
                    </div>
                    <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded text-sm font-medium">Confirm Booking</button>
                 </form>
               )}

               <div className="space-y-3">
                 {bookings.map(booking => (
                   <div key={booking.id} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-bold text-slate-700 text-sm">{booking.resource}</p>
                        <p className="text-xs text-slate-500">{booking.date} • {booking.timeSlot}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${booking.bookedBy === 'You' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {booking.bookedBy}
                      </span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl animate-fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Select Lesson to Share</h3>
                        <p className="text-xs text-slate-500">Publish your work to the National Repository</p>
                    </div>
                    <button onClick={() => setIsShareModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                    {savedLessons.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p className="text-slate-500 font-medium">No saved lessons found.</p>
                            <p className="text-sm text-slate-400 mt-1">Generate and save a lesson plan first.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {savedLessons.map(l => (
                                <div key={l.id} className="border border-slate-200 p-4 rounded-lg hover:bg-slate-50 hover:border-indigo-200 transition-all flex justify-between items-center group">
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-800 group-hover:text-indigo-700 transition-colors">{l.topic}</h4>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{l.subject}</span>
                                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{l.grade}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleShareLesson(l)}
                                        className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-colors"
                                    >
                                        Share
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-xl text-center">
                    <p className="text-xs text-slate-400">By sharing, you agree to the CBE Open Educational Resources policy.</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationHub;