
export interface LessonPlan {
  id: string;
  topic: string; // The specific lesson title or sub-strand derived title
  strand?: string; // for CBC structure
  subStrand?: string; // for CBC structure
  subject: string;
  grade: string;
  schoolLevel?: 'Junior School' | 'Senior School';
  duration: string;
  lessonType?: string;
  keyInquiryQuestions?: string[];
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
  author?: string; // For collaboration
  shared?: boolean;
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
  tscNumber?: string; // Added for TPAD
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
  | 'student-tracker'; // for Student Progress Features

export enum DrawingTool {
  PEN = 'PEN',
  ERASER = 'ERASER',
}

// Appraisal / TPAD Types
export interface TeachingStandard {
  id: number;
  name: string;
  description: string;
  selfRating: number; // 1-5
  supervisorRating?: number;
  evidence?: string[]; // URLs or file names
  gapsIdentified?: string;
}

export interface TPDIntervention {
  id: string;
  gap: string;
  recommendedAction: string; // Course, Workshop, Peer Teaching
  status: 'Pending' | 'In Progress' | 'Completed';
}

export interface AppraisalSession {
  id: string;
  teacherId: string;
  term: string;
  year: number;
  status: 'Draft' | 'Submitted' | 'Reviewed' | 'Completed';
  standards: TeachingStandard[];
  attendanceScore: number; // Calculated from Attendance records
  learnerProgressRecords: string[];
  supervisorComments?: string;
  tpdPlan: TPDIntervention[];
}

// Collaboration Types
export interface CoTeachingSession {
  id: string;
  date: string;
  time: string; // Added time
  topic: string;
  partnerTeacher: string;
  strategy: 'Team Teaching' | 'Station Teaching' | 'One Teach, One Assist';
  status: 'Planned' | 'Completed' | 'Pending'; // Added Pending
}

export interface ResourceBooking {
  id: string;
  resource: string; // e.g., 'Makerspace', 'Physics Lab'
  date: string;
  timeSlot: string;
  bookedBy: string;
}

export interface PeerObservation {
  id: string;
  observer: string;
  observee: string;
  date: string;
  focusArea: string; // e.g., "Classroom Management", "CBE Integration"
  feedback?: string;
  status: 'Scheduled' | 'Completed';
}

// Student Tracking Types
export interface SkillMetric {
  id: string;
  name: string; // e.g., "Critical Thinking", "Digital Literacy"
  score: number; // 0-100
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export interface StudentActivity {
  id: string;
  lessonId: string;
  lessonTopic: string;
  date: string;
  performance: 'Exceeding' | 'Meeting' | 'Approaching' | 'Below';
  skillsAddressed: string[];
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  admissionNumber: string;
  attendanceRate: number;
  overallPerformance: number;
  skills: SkillMetric[];
  recentActivity: StudentActivity[];
  learningGaps: string[];
}

export interface ClassInsights {
  commonGaps: { gap: string; count: number; percentage: number }[];
  decliningSkills: { skill: string; studentCount: number; students: string[] }[];
  recommendedInterventions: string[];
}
