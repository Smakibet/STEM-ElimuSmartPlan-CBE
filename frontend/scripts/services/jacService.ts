import { User, Student, ClassInsights, AppraisalSession, Quiz, QuizQuestion, QuizResult } from '../../types';

/**
 * Jac Client Service - OSP Graph Orchestrator
 */

interface JacContext {
  [key: string]: any;
}

// Initial Institutional State for simulation
const INITIAL_STAFF = [
  { id: '1', name: "Jane Doe", email: "jane@school.edu.ke", role: 'teacher' as const, tscNumber: "TSC-10023", department: "Science", planned: 45, taught: 42, rating: 4.8, appraisalScore: 88, status: "Promotable", gaps: 0 },
  { id: '2', name: "John Smith", email: "john@school.edu.ke", role: 'teacher' as const, tscNumber: "TSC-29910", department: "Mathematics", planned: 50, taught: 40, rating: 4.2, appraisalScore: 72, status: "Good Standing", gaps: 2 },
  { id: '3', name: "Sarah Connor", email: "sarah@school.edu.ke", role: 'teacher' as const, tscNumber: "TSC-44002", department: "Computer Sci", planned: 30, taught: 30, rating: 5.0, appraisalScore: 95, status: "Promotable", gaps: 0 },
];

const INITIAL_STANDARDS = [
  { id: 1, name: "Professional Knowledge", description: "Demonstrates mastery of subject content.", selfRating: 0, evidence: [], gapsIdentified: "", supervisorRating: 0 },
  { id: 2, name: "Lesson Planning", description: "Prepares comprehensive lesson plans.", selfRating: 0, evidence: [], gapsIdentified: "", supervisorRating: 0 },
  { id: 3, name: "Assessment", description: "Uses valid assessment methods.", selfRating: 0, evidence: [], gapsIdentified: "", supervisorRating: 0 },
  { id: 4, name: "Professionalism", description: "Upholds ethical standards.", selfRating: 0, evidence: [], gapsIdentified: "", supervisorRating: 0 },
  { id: 5, name: "Time Management", description: "Manages class time effectively.", selfRating: 0, evidence: [], gapsIdentified: "", supervisorRating: 0 }
];

export const JacClient = {
  /**
   * Spawns a walker on the OSP graph to perform reasoning or data retrieval.
   */
  spawnWalker: async (walkerName: string, context: JacContext, user?: User) => {
    await new Promise(resolve => setTimeout(resolve, 800));

    // Lazy init of institutional data
    if (!localStorage.getItem('inst_staff_nodes')) {
      localStorage.setItem('inst_staff_nodes', JSON.stringify(INITIAL_STAFF));
    }
    if (!localStorage.getItem('inst_student_registry')) {
      localStorage.setItem('inst_student_registry', JSON.stringify([]));
    }
    if (!localStorage.getItem('inst_appraisal_nodes')) {
      localStorage.setItem('inst_appraisal_nodes', JSON.stringify({}));
    }

    const getStaff = () => JSON.parse(localStorage.getItem('inst_staff_nodes') || '[]');
    const saveStaff = (data: any) => localStorage.setItem('inst_staff_nodes', JSON.stringify(data));
    const getStudents = () => JSON.parse(localStorage.getItem('inst_student_registry') || '[]');
    const saveStudents = (data: any) => localStorage.setItem('inst_student_registry', JSON.stringify(data));
    const getAppraisals = () => JSON.parse(localStorage.getItem('inst_appraisal_nodes') || '{}');
    const saveAppraisals = (data: any) => localStorage.setItem('inst_appraisal_nodes', JSON.stringify(data));

    try {
      switch (walkerName) {
        case 'auth_user': {
          const { email, password } = context;
          const staff = getStaff();
          const found = staff.find((u: any) => u.email === email);
          if (found) return found;
          throw new Error("Identity node not found in registry.");
        }

        case 'register_user': {
          const { name, email, role, tscNumber } = context;
          const staff = getStaff();
          if (staff.find((u: any) => u.email === email)) throw new Error("Email already exists.");
          const newUser = {
            id: crypto.randomUUID(),
            name, email, role, tscNumber,
            department: "General",
            planned: 0, taught: 0, rating: 0, appraisalScore: 0, status: "New Entry", gaps: 0
          };
          staff.push(newUser);
          saveStaff(staff);
          return newUser;
        }

        case 'get_staff_list':
          return getStaff();

        case 'get_all_users':
          return getStaff();

        case 'manage_user': {
          const { action, userId, userData } = context;
          let staff = getStaff();
          if (action === 'create') {
            const newUser = { id: crypto.randomUUID(), ...userData, planned: 0, taught: 0, rating: 0, appraisalScore: 0, status: "Active", gaps: 0 };
            staff.push(newUser);
          } else if (action === 'delete') {
            staff = staff.filter((u: any) => u.id !== userId);
          }
          saveStaff(staff);
          return staff;
        }

        case 'get_all_students':
          return getStudents();

        case 'manage_student': {
          const { action, studentId, studentData } = context;
          let students = getStudents();
          if (action === 'add') {
            const newStudent: Student = {
              id: crypto.randomUUID(),
              ...studentData,
              attendanceRate: 100,
              overallPerformance: 0,
              completionRate: 0,
              skills: [
                { id: 's1', name: 'Critical Thinking', score: 50, trend: 'stable', lastUpdated: new Date().toISOString() },
                { id: 's2', name: 'Digital Literacy', score: 50, trend: 'stable', lastUpdated: new Date().toISOString() }
              ],
              recentActivity: [],
              learningGaps: []
            };
            students.push(newStudent);
          } else if (action === 'delete') {
            students = students.filter((s: any) => s.id !== studentId);
          }
          saveStudents(students);
          return students;
        }

        case 'init_appraisal': {
          const userId = user?.id;
          if (!userId) return null;
          const appraisals = getAppraisals();
          if (!appraisals[userId]) {
            appraisals[userId] = {
              id: `appr_${userId}_2024`,
              teacherId: userId,
              term: 'Term 1',
              year: 2024,
              status: 'Draft',
              standards: INITIAL_STANDARDS,
              attendanceScore: 85,
              learnerProgressRecords: [],
              tpdPlan: [],
              classDeliverables: { lessonsPlanned: 40, lessonsTaught: 38, avgClassMastery: 72, syllabusCoverage: 90 }
            };
            saveAppraisals(appraisals);
          }
          return appraisals[userId];
        }

        case 'update_standard': {
          const { sessionId, standardId, rating, gaps, evidence } = context;
          const appraisals = getAppraisals();
          const teacherId = Object.keys(appraisals).find(k => appraisals[k].id === sessionId);
          if (teacherId) {
            appraisals[teacherId].standards = appraisals[teacherId].standards.map((s: any) =>
              s.id === standardId ? { ...s, selfRating: rating, gapsIdentified: gaps, evidence: evidence ? [evidence] : s.evidence } : s
            );
            saveAppraisals(appraisals);
            return appraisals[teacherId];
          }
          return null;
        }

        case 'supervisor_review': {
          const { sessionId, comments, reviews } = context;
          const appraisals = getAppraisals();
          const teacherId = Object.keys(appraisals).find(k => appraisals[k].id === sessionId);
          if (teacherId) {
            const app = appraisals[teacherId];
            app.supervisorComments = comments;
            if (reviews && Array.isArray(reviews)) {
              reviews.forEach((r: any) => {
                app.standards = app.standards.map((s: any) =>
                  s.id === r.standardId ? { ...s, supervisorRating: r.rating } : s
                );
              });
            }
            app.status = 'Reviewed';
            saveAppraisals(appraisals);

            const staff = getStaff();
            const idx = staff.findIndex((s: any) => s.id === teacherId);
            if (idx !== -1) {
              const avg = app.standards.reduce((acc: number, s: any) => acc + (s.supervisorRating || s.selfRating || 0), 0) / 5;
              staff[idx].appraisalScore = Math.round((avg / 5) * 100);
              staff[idx].status = staff[idx].appraisalScore >= 80 ? "Promotable" : "Good Standing";
              saveStaff(staff);
            }
            return app;
          }
          return null;
        }

        case 'record_observation': {
          const { teacherId, notes, type } = context;
          const observations = JSON.parse(localStorage.getItem('inst_observations') || '[]');
          const newObs = { id: Date.now(), teacherId, notes, type, date: new Date().toLocaleDateString(), observer: user?.name };
          observations.push(newObs);
          localStorage.setItem('inst_observations', JSON.stringify(observations));
          return observations.filter((o: any) => o.teacherId === teacherId);
        }

        case 'get_class_insights': {
          const students = getStudents();
          const commonGaps = [{ gap: "Digital Literacy", count: 2, percentage: 40 }];
          const decliningSkills = [{ skill: "Algebra", studentCount: 1, students: ["Demo"] }];
          return { commonGaps, decliningSkills, recommendedInterventions: ["Focus on Practical STEM"] };
        }

        case 'generate_quiz': {
          const { topic } = context;
          return {
            id: `quiz_${Date.now()}`,
            topic: topic || "General STEM",
            questions: [
              { id: "q1", type: 'multiple_choice', question: `Primary competency in ${topic || 'STEM'}?`, options: ["Critical Thinking", "Memorization"], correctAnswer: 0, explanation: "CBE priority." }
            ]
          };
        }

        default:
          return {};
      }
    } catch (error) {
      console.error("Jac Walker Error:", error);
      throw error;
    }
  }
};

export const useGraphService = () => {
  return {
    serviceStatus: { status: 'simulated', version: 'byLLM-v2' },
    analyzeModule: async (params: any) => {
      await new Promise(r => setTimeout(r, 1200));
      return { status: 'simulated', data: { analysis: { key_learning_objectives: ["CBE strand goals"], prerequisite_knowledge: ["Literacy"] } } };
    }
  };
};
