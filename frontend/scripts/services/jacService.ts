
import { useState, useEffect } from 'react';
import { User, Student, SkillMetric, ClassInsights } from '../types';

/**
 * Graph Processing Service Client
 * Connects to the Jaseci graph service for advanced learning analytics
 * REFACTORED: Fully simulates Jaseci Object-Spatial Programming (OSP) Graph logic locally
 */

export interface ModuleAnalysisRequest {
    content: string;
    targetAudience?: string;
    analysisType?: string;
}

export interface LearningPathRequest {
    studentProfile: {
        studentId?: string;
        name?: string;
        currentLevel?: string;
        interests?: string[];
    };
    targetSubject: string;
    durationWeeks?: number;
}

export interface SkillAssessmentRequest {
    studentId: string;
    completedModules: string[];
}

export interface GraphServiceResponse<T = any> {
    status: 'success' | 'partial' | 'simulated' | 'error';
    data?: T;
    message?: string;
    metadata?: Record<string, any>;
}

interface JacContext {
  [key: string]: any;
}

// --- MOCK GRAPH DATABASE (OSP SIMULATION) ---
interface GraphNode {
    id: string;
    type: string;
    context: any;
}

interface GraphEdge {
    sourceId: string;
    targetId: string;
    type: string;
    context: any;
}

const getGraphDB = () => {
    const stored = localStorage.getItem('mock_jac_graph_db');
    return stored ? JSON.parse(stored) : { nodes: [], edges: [] };
};

const saveGraphDB = (db: any) => {
    localStorage.setItem('mock_jac_graph_db', JSON.stringify(db));
};

const spawnNode = (type: string, context: any) => {
    const db = getGraphDB();
    const newNode: GraphNode = {
        id: `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type,
        context
    };
    db.nodes.push(newNode);
    saveGraphDB(db);
    return newNode;
};

const spawnEdge = (sourceId: string, targetId: string, type: string, context: any = {}) => {
    const db = getGraphDB();
    const newEdge: GraphEdge = { sourceId, targetId, type, context };
    db.edges.push(newEdge);
    saveGraphDB(db);
    return newEdge;
};

// Initial Seed Data for Appraisal (Legacy Mock)
const DEFAULT_SESSION = {
  id: "session_mock_1",
  teacherId: "user-1",
  term: "Term 1",
  year: 2024,
  status: "Draft",
  standards: [
    { id: 1, name: "Professional Knowledge", description: "Demonstrates mastery of subject content.", selfRating: 0, evidence: [], gapsIdentified: "", supervisorRating: 0 },
    { id: 2, name: "Lesson Planning", description: "Prepares comprehensive lesson plans.", selfRating: 0, evidence: [], gapsIdentified: "", supervisorRating: 0 },
    { id: 3, name: "Assessment", description: "Uses valid assessment methods.", selfRating: 0, evidence: [], gapsIdentified: "", supervisorRating: 0 },
    { id: 4, name: "Professionalism", description: "Upholds ethical standards.", selfRating: 0, evidence: [], gapsIdentified: "", supervisorRating: 0 },
    { id: 5, name: "Time Management", description: "Manages class time effectively.", selfRating: 0, evidence: [], gapsIdentified: "", supervisorRating: 0 }
  ],
  attendanceScore: 88,
  learnerProgressRecords: [],
  tpdPlan: [
      { id: "tpd-1", gap: "ICT Integration", recommendedAction: "Digital Literacy Course", status: "Pending" }
  ],
  supervisorComments: "Good progress so far."
};

// Initial Seed Data for Students
const MOCK_STUDENTS: Student[] = [
    {
        id: "STU001",
        name: "Kevin Mwangi",
        grade: "Grade 7",
        admissionNumber: "ADM-2023-045",
        attendanceRate: 92,
        overallPerformance: 78,
        skills: [
            { id: "sk1", name: "Critical Thinking", score: 75, trend: "up", lastUpdated: "2024-03-10" },
            { id: "sk2", name: "Digital Literacy", score: 85, trend: "stable", lastUpdated: "2024-03-12" },
            { id: "sk3", name: "Communication", score: 65, trend: "up", lastUpdated: "2024-03-08" },
            { id: "sk4", name: "Collaboration", score: 80, trend: "down", lastUpdated: "2024-03-11" }
        ],
        recentActivity: [
            { 
                id: "act1", lessonId: "L001", lessonTopic: "Photosynthesis Virtual Lab", date: "2024-03-12", 
                type: "Lab", performance: "Meeting", skillsAddressed: ["Critical Thinking"], 
                durationMinutes: 45, interactionData: { experimentsCompleted: 2, toolsUsed: ["Microscope", "Light Source"] } 
            },
            { 
                id: "act2", lessonId: "L002", lessonTopic: "Basic Python Syntax", date: "2024-03-10", 
                type: "Quiz", performance: "Exceeding", skillsAddressed: ["Digital Literacy"],
                durationMinutes: 20, score: 92
            }
        ],
        learningGaps: ["Public Speaking", "Algebraic Expressions"]
    },
    {
        id: "STU002",
        name: "Amina Juma",
        grade: "Grade 7",
        admissionNumber: "ADM-2023-048",
        attendanceRate: 98,
        overallPerformance: 88,
        skills: [
            { id: "sk1", name: "Critical Thinking", score: 88, trend: "up", lastUpdated: "2024-03-10" },
            { id: "sk2", name: "Digital Literacy", score: 70, trend: "down", lastUpdated: "2024-03-12" },
            { id: "sk3", name: "Communication", score: 90, trend: "stable", lastUpdated: "2024-03-08" },
            { id: "sk4", name: "Collaboration", score: 95, trend: "up", lastUpdated: "2024-03-11" }
        ],
        recentActivity: [
            { 
                id: "act3", lessonId: "L001", lessonTopic: "Ecosystems Project", date: "2024-03-12", 
                type: "Project", performance: "Exceeding", skillsAddressed: ["Critical Thinking", "Collaboration"],
                durationMinutes: 120, score: 95
            },
            { 
                id: "act4", lessonId: "L005", lessonTopic: "Intro to spreadsheets", date: "2024-03-11", 
                type: "Lesson", performance: "Approaching", skillsAddressed: ["Digital Literacy"],
                durationMinutes: 15
            }
        ],
        learningGaps: ["Spreadsheet software", "Algebraic Expressions"]
    },
    {
        id: "STU003",
        name: "Brian Otieno",
        grade: "Grade 7",
        admissionNumber: "ADM-2023-055",
        attendanceRate: 85,
        overallPerformance: 62,
        skills: [
            { id: "sk1", name: "Critical Thinking", score: 55, trend: "stable", lastUpdated: "2024-03-10" },
            { id: "sk2", name: "Digital Literacy", score: 60, trend: "up", lastUpdated: "2024-03-12" },
            { id: "sk3", name: "Communication", score: 58, trend: "down", lastUpdated: "2024-03-08" },
            { id: "sk4", name: "Collaboration", score: 68, trend: "down", lastUpdated: "2024-03-11" }
        ],
        recentActivity: [
             { 
                id: "act5", lessonId: "L003", lessonTopic: "Variables in Math", date: "2024-03-12", 
                type: "Quiz", performance: "Below", skillsAddressed: ["Critical Thinking"],
                durationMinutes: 10, score: 45, interactionData: { attempts: 2 }
            }
        ],
        learningGaps: ["Reading comprehension", "Scientific method", "Algebraic Expressions"]
    }
];

const getStoredSession = () => {
  const stored = localStorage.getItem('mock_jac_session');
  return stored ? JSON.parse(stored) : DEFAULT_SESSION;
};

const saveStoredSession = (session: any) => {
  localStorage.setItem('mock_jac_session', JSON.stringify(session));
};

const getStoredStudents = (): Student[] => {
    const stored = localStorage.getItem('mock_jac_students');
    return stored ? JSON.parse(stored) : MOCK_STUDENTS;
}

const saveStoredStudents = (students: Student[]) => {
    localStorage.setItem('mock_jac_students', JSON.stringify(students));
}

// --- JAC CLIENT WALKER SIMULATION ---

export const JacClient = {
  spawnWalker: async (walkerName: string, context: JacContext, user: User) => {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      console.log(`[JacClient] Spawning Walker: ${walkerName}`, context);
      const currentSession = getStoredSession();
      const students = getStoredStudents();

      switch (walkerName) {
        case 'init_appraisal':
          return currentSession;

        case 'update_standard': {
           const updatedStandards = currentSession.standards.map((s: any) => 
               s.id === context.standardId ? { 
                 ...s, 
                 selfRating: context.rating, 
                 evidence: context.evidence,
                 gapsIdentified: context.gaps
               } : s
           );
           
           let updatedTPD = [...currentSession.tpdPlan];
           if (context.rating > 0 && context.rating < 3 && context.gaps) {
              const exists = updatedTPD.find((t: any) => t.gap === context.gaps);
              if (!exists) {
                 updatedTPD.push({
                   id: `tpd-${Date.now()}`,
                   gap: context.gaps,
                   recommendedAction: "Peer Mentorship & Coaching",
                   status: "Pending"
                 });
              }
           }

           const updatedSession = { ...currentSession, standards: updatedStandards, tpdPlan: updatedTPD };
           saveStoredSession(updatedSession);
           return updatedSession;
        }

        case 'manage_tpd': {
          let updatedTPD = [...currentSession.tpdPlan];
          if (context.action === 'add') {
             updatedTPD.push({ id: `tpd-${Date.now()}`, gap: context.gap, recommendedAction: context.recommendedAction, status: 'Pending' });
          } else if (context.action === 'update_status') {
             updatedTPD = updatedTPD.map((t: any) => t.id === context.tpdId ? { ...t, status: context.status } : t);
          } else if (context.action === 'delete') {
             updatedTPD = updatedTPD.filter((t: any) => t.id !== context.tpdId);
          }
          const updatedSession = { ...currentSession, tpdPlan: updatedTPD };
          saveStoredSession(updatedSession);
          return updatedSession;
        }

        case 'submit_appraisal': {
          const updatedSession = { ...currentSession, status: 'Submitted' };
          saveStoredSession(updatedSession);
          return updatedSession;
        }

        case 'supervisor_review': {
          let updatedStandards = [...currentSession.standards];
          if (context.reviews && Array.isArray(context.reviews)) {
              context.reviews.forEach((rev: any) => {
                  updatedStandards = updatedStandards.map(s => s.id === rev.standardId ? { ...s, supervisorRating: rev.rating } : s);
              });
          }
          const updatedSession = { 
              ...currentSession, 
              standards: updatedStandards,
              supervisorComments: context.comments || currentSession.supervisorComments,
              status: 'Reviewed' 
          };
          saveStoredSession(updatedSession);
          return updatedSession;
        }

        // --- Student Progress Walkers ---
        case 'get_all_students': {
            return students;
        }

        case 'get_class_insights': {
            const totalStudents = students.length;
            
            // 1. Analyze Common Gaps
            const gapCounts: Record<string, number> = {};
            students.forEach(s => {
                s.learningGaps.forEach(gap => {
                    gapCounts[gap] = (gapCounts[gap] || 0) + 1;
                });
            });
            
            const commonGaps = Object.entries(gapCounts)
                .map(([gap, count]) => ({ gap, count, percentage: Math.round((count / totalStudents) * 100) }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3); // Top 3

            // 2. Analyze Declining Skills
            const decliningStats: Record<string, string[]> = {};
            students.forEach(s => {
                s.skills.filter(sk => sk.trend === 'down').forEach(sk => {
                    if (!decliningStats[sk.name]) decliningStats[sk.name] = [];
                    decliningStats[sk.name].push(s.name);
                });
            });

            const decliningSkills = Object.entries(decliningStats)
                .map(([skill, studentNames]) => ({ 
                    skill, 
                    studentCount: studentNames.length, 
                    students: studentNames 
                }))
                .filter(d => d.studentCount > 0)
                .sort((a, b) => b.studentCount - a.studentCount);

            // 3. Generate Interventions
            const interventions = [];
            if (commonGaps.length > 0) {
                interventions.push(`Schedule a remedial session focusing on "${commonGaps[0].gap}" which affects ${commonGaps[0].percentage}% of the class.`);
            }
            if (decliningSkills.length > 0) {
                interventions.push(`Review teaching methods for "${decliningSkills[0].skill}" as ${decliningSkills[0].studentCount} students show declining proficiency.`);
            }
            interventions.push("Encourage peer-to-peer learning groups mixing high and low performers.");

            const insights: ClassInsights = {
                commonGaps,
                decliningSkills,
                recommendedInterventions: interventions
            };
            return insights;
        }

        case 'record_student_progress': {
            // Context: { studentId, lessonId, lessonTopic, skills: [{name, score}], type, duration, score, interactionData }
            const { studentId, lessonId, lessonTopic, skills, type, duration, score, interactionData } = context;
            
            const updatedStudents = students.map(stu => {
                if (stu.id !== studentId) return stu;

                // Update Skills
                const newSkills = stu.skills.map(skill => {
                    const update = skills.find((s: any) => s.name === skill.name);
                    if (update) {
                        return {
                            ...skill,
                            score: Math.round((skill.score + update.score) / 2), // Simple averaging for mock
                            trend: (update.score > skill.score ? 'up' : 'down') as 'up' | 'down' | 'stable',
                            lastUpdated: new Date().toISOString()
                        };
                    }
                    return skill;
                });

                // Add Activity with extended logs
                const newActivity = {
                    id: `act_${Date.now()}`,
                    lessonId,
                    lessonTopic,
                    date: new Date().toISOString().split('T')[0],
                    type: type || 'Lesson',
                    durationMinutes: duration || 30,
                    score: score || undefined,
                    interactionData: interactionData || undefined,
                    performance: 'Meeting' as 'Exceeding' | 'Meeting' | 'Approaching' | 'Below', // Simplified calculation logic
                    skillsAddressed: skills.map((s: any) => s.name)
                };

                return {
                    ...stu,
                    skills: newSkills,
                    recentActivity: [newActivity, ...stu.recentActivity],
                    overallPerformance: Math.round(newSkills.reduce((a, b) => a + b.score, 0) / newSkills.length)
                };
            });

            saveStoredStudents(updatedStudents);
            return updatedStudents.find(s => s.id === studentId);
        }

        default:
          return currentSession;
      }
    } catch (error) {
      console.error("Jac Client Error:", error);
      throw error;
    }
  }
};

// --- GRAPH SERVICE (Using OSP Simulation) ---

class GraphService {
    async checkHealth(): Promise<GraphServiceResponse> {
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
            status: 'simulated',
            data: { status: 'operational', version: 'mock-osp-2.0' },
            metadata: { operational: true, graph_nodes: getGraphDB().nodes.length }
        };
    }

    async analyzeModule(request: ModuleAnalysisRequest): Promise<GraphServiceResponse> {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock AI analysis result
        const mockAnalysis = {
            analysis: {
                key_learning_objectives: [
                    "Understand fundamental principles relative to the strand",
                    "Apply core competencies in practical scenarios",
                    "Demonstrate critical thinking through inquiry"
                ],
                prerequisite_knowledge: [
                    "Basic literacy and numeracy",
                    "Prior grade level competency"
                ],
                real_world_applications: [
                    "Community problem solving",
                    "Industry standard practices",
                    "Daily life integration"
                ]
            }
        };

        return {
            status: 'simulated',
            data: mockAnalysis,
            metadata: { confidence: 0.95 }
        };
    }

    // Simulates: walker generate_learning_path
    async generateLearningPath(request: LearningPathRequest): Promise<GraphServiceResponse> {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { targetSubject, studentProfile } = request;
        
        // 1. Spawn Student Node in Graph
        const studentNode = spawnNode('student', {
            name: studentProfile.name,
            level: studentProfile.currentLevel
        });

        // 2. Spawn Module Nodes (Simulating graph traversal creation)
        const modules = [
            { title: `${targetSubject} Fundamentals`, type: 'Theory', duration: 8, desc: "Core concepts and definitions" },
            { title: `Applied ${targetSubject}`, type: 'Practical', duration: 12, desc: "Hands-on experiments" },
            { title: `${targetSubject} Capstone Project`, type: 'Project', duration: 16, desc: "Integration of concepts" }
        ];

        const pathNodes = [];
        let prevNode = null;

        for (const m of modules) {
            const modNode = spawnNode('learning_module', { ...m, subject: targetSubject });
            
            // Create Edges
            if (!prevNode) {
                spawnEdge(studentNode.id, modNode.id, 'enrolled_in', { date: new Date().toISOString() });
            } else {
                spawnEdge(prevNode.id, modNode.id, 'teaches', { effectiveness: 1.0 });
            }
            
            pathNodes.push({
                moduleId: modNode.id,
                title: m.title,
                module_type: m.type,
                duration_hours: m.duration,
                description: m.desc
            });
            prevNode = modNode;
        }

        return {
            status: 'simulated',
            data: {
                studentId: studentNode.id,
                path: pathNodes,
                totalDuration: '36 hours'
            },
            message: 'Generated OSP Learning Path',
            metadata: { graph_operations: { nodes_created: modules.length + 1, edges_created: modules.length } }
        };
    }

    // Simulates: walker assess_skills
    async assessSkills(request: SkillAssessmentRequest): Promise<GraphServiceResponse> {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Simulate skill nodes
        const skills = [
            { name: "Critical Thinking", score: 0.85, category: "Cognitive" },
            { name: "Digital Literacy", score: 0.72, category: "Technical" },
            { name: "Collaboration", score: 0.90, category: "Social" }
        ];

        // "Spawn" skill nodes if not exist (simulation)
        skills.forEach(s => spawnNode('skill', s));

        return {
            status: 'simulated',
            data: { 
                overall_proficiency: 0.82,
                level: 'Proficient',
                strong_areas: skills.filter(s => s.score > 0.8).map(s => s.name),
                improvement_areas: skills.filter(s => s.score < 0.8).map(s => s.name),
                recommendations: [
                    "Continue with advanced practical modules",
                    "Focus on Digital Literacy exercises"
                ]
            },
            metadata: { timestamp: new Date().toISOString() }
        };
    }
}

export const graphService = new GraphService();

export const useGraphService = () => {
    const [serviceStatus, setServiceStatus] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        checkService();
    }, []);

    const checkService = async () => {
        setIsLoading(true);
        try {
            const status = await graphService.checkHealth();
            setServiceStatus(status);
        } catch (error) {
            setServiceStatus({ status: 'error', message: 'Service check failed' });
        } finally {
            setIsLoading(false);
        }
    };

    return {
        serviceStatus,
        isLoading,
        checkService,
        analyzeModule: graphService.analyzeModule.bind(graphService),
        generateLearningPath: graphService.generateLearningPath.bind(graphService),
        assessSkills: graphService.assessSkills.bind(graphService)
    };
};