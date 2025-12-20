export interface LessonPlan {
  id: string;
  topic: string; // derived from Sub-strand
  strand?: string;
  subStrand?: string;
  subject: string;
  grade: string;
  schoolLevel?: 'Junior' | 'Senior';
  lessonType?: 'Single' | 'Double';
  duration: string;
  keyInquiryQuestions: string[];
  coreCompetencies: string[];
  values: string[];
  materials: string[];
  sections: {
    title: string;
    duration: string;
    content: string;
    teacherActivity: string;
    studentActivity: string;
  }[];
  picratAnalysis: {
    level: string;
    explanation: string;
  };
  generatedAt: string;
  author?: string;
  shared?: boolean;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'code_challenge' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  initialCode?: string; // For code challenges
}

export interface Quiz {
  id: string;
  topic: string;
  lessonId?: string;
  questions: QuizQuestion[];
}

export interface QuizResult {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  total: number;
  date: string;
  feedback: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string;
}

export type UserRole = 'teacher' | 'supervisor' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  school?: string;
  department?: string;
  tscNumber?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  duration?: string;
}

export type ViewState = 
  | 'dashboard' 
  | 'lesson-planner' 
  | 'whiteboard' 
  | 'virtual-lab' 
  | 'saved-lessons'
  | 'collaboration'
  | 'attendance'
  | 'appraisal'
  | 'admin-panel'
  | 'student-tracker'
  | 'quiz-master';

export enum DrawingTool {
  PEN = 'PEN',
  ERASER = 'ERASER',
}

export interface TeachingStandard {
  id: number;
  name: string;
  description: string;
  selfRating: number;
  supervisorRating?: number;
  evidence?: string[];
  gapsIdentified?: string;
}

export interface TPDIntervention {
  id: string;
  gap: string;
  recommendedAction: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

export interface AppraisalSession {
  id: string;
  teacherId: string;
  teacherName?: string;
  term: string;
  year: number;
  status: 'Draft' | 'Submitted' | 'Reviewed' | 'Completed';
  standards: TeachingStandard[];
  attendanceScore: number;
  learnerProgressRecords: string[];
  supervisorComments?: string;
  tpdPlan: TPDIntervention[];
  classDeliverables?: {
    lessonsPlanned: number;
    lessonsTaught: number;
    avgClassMastery: number;
    syllabusCoverage: number;
  };
}

export interface CoTeachingSession {
  id: string;
  date: string;
  time: string;
  topic: string;
  partnerTeacher: string;
  strategy: 'Team Teaching' | 'Station Teaching' | 'One Teach, One Assist';
  status: 'Planned' | 'Completed' | 'Pending';
}

export interface ResourceBooking {
  id: string;
  resource: string;
  date: string;
  timeSlot: string;
  bookedBy: string;
}

export interface PeerObservation {
  id: string;
  observer: string;
  observee: string;
  date: string;
  focusArea: string;
  feedback?: string;
  status: 'Scheduled' | 'Completed';
}

export interface StudentActivity {
  id: string;
  lessonId: string;
  lessonTopic: string;
  date: string;
  type: 'Lesson' | 'Quiz' | 'Lab' | 'Project';
  status: 'Planned' | 'Completed';
  performance: 'Exceeding' | 'Meeting' | 'Approaching' | 'Below';
  skillsAddressed: string[];
  durationMinutes?: number;
  score?: number;
  completionDate?: string;
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  subjects: string[]; 
  admissionNumber: string;
  attendanceRate: number;
  overallPerformance: number;
  completionRate: number;
  skills: SkillMetric[];
  recentActivity: StudentActivity[];
  learningGaps: string[];
}

export interface ClassInsights {
  commonGaps: { gap: string; count: number; percentage: number }[];
  decliningSkills: { skill: string; studentCount: number; students: string[] }[];
  recommendedInterventions: string[];
}

export interface SkillMetric {
  id: string;
  name: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}
