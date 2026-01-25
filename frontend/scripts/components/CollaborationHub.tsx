import { useState, useEffect } from 'react';



const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';



const JacClient = {

  spawnWalker: async (walker, payload = {}) => {

    const res = await fetch(`${API_BASE}/walker/${walker}`, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(payload),

    });



    if (!res.ok) {

      const err = await res.json();

      throw new Error(err.detail || 'API error');

    }

    return res.json();

  },

};



const CollaborationHub = ({ user }) => {

  const [activeTab, setActiveTab] = useState('appraisal');

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);



  const [appraisalData, setAppraisalData] = useState([]);

  const [sharedLessons, setSharedLessons] = useState([]);

  const [bookings, setBookings] = useState([]);

  const [observations, setObservations] = useState([]);



  const currentUser = user || {

    id: 'teacher_001',

    name: 'John Kamau',

  };



  useEffect(() => {

    if (activeTab === 'appraisal') loadAppraisals();

    if (activeTab === 'lessons') loadLessons();

    if (activeTab === 'resources') loadBookings();

    if (activeTab === 'observations') loadObservations();

  }, [activeTab]);



  /* -------------------- LOADERS -------------------- */



  const loadAppraisals = async () => {

    setLoading(true);

    setError(null);

    try {

      setAppraisalData(

        await JacClient.spawnWalker('generate_tsc_compliance_report')

      );

    } catch (e) {

      setError(e.message);

    } finally {

      setLoading(false);

    }

  };



  const loadLessons = async () => {

    setLoading(true);

    try {

      setSharedLessons(

        await JacClient.spawnWalker('get_shared_lessons')

      );

    } finally {

      setLoading(false);

    }

  };



  const loadBookings = async () => {

    setLoading(true);

    try {

      setBookings(

        await JacClient.spawnWalker('get_resource_bookings', {

          userId: currentUser.id,

        })

      );

    } finally {

      setLoading(false);

    }

  };



  const loadObservations = async () => {

    setLoading(true);

    try {

      setObservations(

        await JacClient.spawnWalker('get_supervisor_observations', {

          supervisorId: currentUser.id,

        })

      );

    } finally {

      setLoading(false);

    }

  };



  /* -------------------- PDF EXPORT -------------------- */



  const exportPDF = async (teacherId) => {

    const res = await fetch(`${API_BASE}/walker/export_appraisal_pdf`, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ teacherId }),

    });



    const blob = await res.blob();

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = `appraisal_${teacherId}.pdf`;

    a.click();

    URL.revokeObjectURL(url);

  };



  const ratingColor = (score) => {

    if (score >= 80) return 'bg-emerald-100 text-emerald-800';

    if (score >= 60) return 'bg-amber-100 text-amber-800';

    return 'bg-rose-100 text-rose-800';

  };



  return (

    <div className="h-screen overflow-y-auto bg-slate-50 p-6">

      <div className="max-w-7xl mx-auto space-y-6">



        {/* HEADER */}

        <div className="bg-indigo-700 rounded-3xl p-8 text-white shadow-xl">

          <h1 className="text-3xl font-black mb-2">Collaboration Hub</h1>

          <p className="opacity-90">

            Teacher collaboration, supervision & compliance

          </p>



          <div className="mt-6 flex flex-wrap gap-4">

            {[

              ['appraisal', '⭐ Appraisals'],

              ['lessons', '📚 Shared Lessons'],

              ['resources', '🏫 Resource Booking'],

              ['observations', '👁️ Observations'],

            ].map(([key, label]) => (

              <button

                key={key}

                onClick={() => setActiveTab(key)}

                className={`px-6 py-3 rounded-xl font-black ${activeTab === key

                  ? 'bg-white text-indigo-900'

                  : 'bg-white/20'

                  }`}

              >

                {label}

              </button>

            ))}

          </div>

        </div>



        {loading && (

          <div className="bg-white p-12 rounded-3xl text-center shadow">

            <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>

            <p className="font-bold text-slate-600">Loading…</p>

          </div>

        )}



        {error && (

          <div className="bg-rose-100 border-2 border-rose-300 text-rose-800 p-6 rounded-2xl font-bold">

            {error}

          </div>

        )}



        {/* APPRAISALS */}

        {activeTab === 'appraisal' &&

          appraisalData.map((t) => (

            <div

              key={t.id}

              className="bg-white rounded-3xl shadow-xl border-2 border-slate-200"

            >

              <div className="p-6 bg-slate-900 text-white flex justify-between">

                <div>

                  <h3 className="text-2xl font-black">{t.name}</h3>

                  <p className="text-sm opacity-80">

                    {t.department} • TSC {t.tscNumber}

                  </p>

                </div>

                <span className={`px-5 py-2 rounded-2xl font-black ${ratingColor(t.appraisalScore)}`}>

                  {t.status}

                </span>

              </div>



              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">

                <Stat label="Lessons" value={t.lessonsTaught} />

                <Stat label="Attendance" value={`${t.attendanceRate}%`} />

                <Stat label="Score" value={`${t.appraisalScore}%`} />

                <Stat label="Status" value={t.status} />

              </div>



              <div className="p-6 border-t bg-slate-50 text-right">

                <button

                  onClick={() => exportPDF(t.id)}

                  className="px-5 py-3 rounded-xl font-black bg-indigo-600 text-white"

                >

                  📄 Export PDF

                </button>

              </div>

            </div>

          ))}



        {/* LESSON SHARING */}

        {activeTab === 'lessons' &&

          sharedLessons.map((l) => (

            <div key={l.id} className="bg-white p-6 rounded-3xl shadow">

              <h3 className="font-black text-lg">{l.topic}</h3>

              <p className="text-sm text-slate-500">

                {l.subject} • Grade {l.grade} • by {l.author}

              </p>

            </div>

          ))}



        {/* RESOURCE BOOKINGS */}

        {activeTab === 'resources' &&

          bookings.map((b, i) => (

            <div key={i} className="bg-white p-6 rounded-3xl shadow">

              <p className="font-black">{b.resource}</p>

              <p className="text-sm text-slate-500">

                {b.date} • {b.timeSlot}

              </p>

            </div>

          ))}



        {/* OBSERVATIONS */}

        {activeTab === 'observations' &&

          observations.map((o, i) => (

            <div key={i} className="bg-white p-6 rounded-3xl shadow">

              <p className="font-black">{o.supervisorName}</p>

              <p className="text-sm text-slate-500">{o.type}</p>

              <p className="mt-2">{o.notes}</p>

            </div>

          ))}

      </div>

    </div>

  );

};



const Stat = ({ label, value }) => (

  <div className="bg-slate-50 rounded-2xl p-6 text-center border-2 border-slate-200">

    <p className="text-3xl font-black text-indigo-700 mb-2">{value}</p>

    <p className="text-xs font-black uppercase tracking-widest text-slate-500">

      {label}

    </p>

  </div>

);



export default CollaborationHub;