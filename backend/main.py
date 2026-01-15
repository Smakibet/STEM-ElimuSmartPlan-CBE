from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import os
from datetime import datetime
from dotenv import load_dotenv
import google.generativeai as genai
import json
from typing import List, Optional
import uuid
from typing import List, Optional, Dict, Any
import uuid
# Load environment variables
load_dotenv()

# Configuring Google Generative AI
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    print(f"Google API Key configured")
else:
    print("ARNING: GOOGLE_API_KEY not found in .env")

# Initialize FastAPI app
app = FastAPI(title="STEM ElimuSmartPlan API")

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Vite default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simulated OSP Graph Storage (replaces jac_import in real when i fully complete it)

class LessonGraphRoot:
    def __init__(self, name: str, initialized_at: str):
        self.name = name
        self.initialized_at = initialized_at
        self.lessons = {}
        self.students = {}
        self.competencies = {}
        # Timetable
        self.timetable_entries = {}
        # Student Tracker
        self.attendance_records = {}
        self.participation_records = {}
        self.daily_summaries = []
        self.class_insights = {
            "totalStudents": 0,
            "averageAttendance": 0,
            "averagePerformance": 0,
            "weakCompetencies": [],
            "topPerformers": []
        }
# ============================================
# STUDENT TRACKER DATA STRUCTURES
# ============================================

class Student:
    def __init__(self, id: str, name: str, admissionNumber: str, grade: str, 
                 attendanceRate: float, overallPerformance: float):
        self.id = id
        self.name = name
        self.admissionNumber = admissionNumber
        self.grade = grade
        self.attendanceRate = attendanceRate
        self.overallPerformance = overallPerformance
        self.weakCompetencies = []
        self.strengths = []
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "admissionNumber": self.admissionNumber,
            "grade": self.grade,
            "attendanceRate": self.attendanceRate,
            "overallPerformance": self.overallPerformance,
            "weakCompetencies": self.weakCompetencies,
            "strengths": self.strengths
        }

class AttendanceRecord:
    def __init__(self, data: Dict[str, Any]):
        self.id = data.get("id")
        self.studentId = data.get("studentId")
        self.date = data.get("date")
        self.time = data.get("time")
        self.lessonPeriod = data.get("lessonPeriod")
        self.class_name = data.get("class")
        self.stream = data.get("stream")
        self.pathway = data.get("pathway")
        self.subject = data.get("subject")
        self.teacher = data.get("teacher")
        self.strand = data.get("strand")
        self.subStrand = data.get("subStrand")
        self.objectives = data.get("objectives", [])
        self.loginMethod = data.get("loginMethod", "manual")
        self.status = data.get("status", "present")
    
    def to_dict(self):
        return {
            "id": self.id,
            "studentId": self.studentId,
            "date": self.date,
            "time": self.time,
            "lessonPeriod": self.lessonPeriod,
            "class": self.class_name,
            "stream": self.stream,
            "pathway": self.pathway,
            "subject": self.subject,
            "teacher": self.teacher,
            "strand": self.strand,
            "subStrand": self.subStrand,
            "objectives": self.objectives,
            "loginMethod": self.loginMethod,
            "status": self.status
        }

class ParticipationRecord:
    def __init__(self, data: Dict[str, Any]):
        self.id = data.get("id")
        self.studentId = data.get("studentId")
        self.attendanceId = data.get("attendanceId")
        self.lessonDate = data.get("lessonDate")
        self.questionAnswered = data.get("questionAnswered", 0)
        self.contributions = data.get("contributions", 0)
        self.engagement = data.get("engagement", "low")
        self.individualizedQuestions = data.get("individualizedQuestions", [])
        self.lessonScore = data.get("lessonScore", 0)
        self.clockOutTime = data.get("clockOutTime")
    
    def to_dict(self):
        return {
            "id": self.id,
            "studentId": self.studentId,
            "attendanceId": self.attendanceId,
            "lessonDate": self.lessonDate,
            "questionAnswered": self.questionAnswered,
            "contributions": self.contributions,
            "engagement": self.engagement,
            "individualizedQuestions": self.individualizedQuestions,
            "lessonScore": self.lessonScore,
            "clockOutTime": self.clockOutTime
        }

class DailySummary:
    def __init__(self, data: Dict[str, Any]):
        self.date = data.get("date")
        self.subject = data.get("subject")
        self.class_name = data.get("class")
        self.totalStudents = data.get("totalStudents")
        self.presentStudents = data.get("presentStudents")
        self.averageParticipation = data.get("averageParticipation")
        self.averageLessonScore = data.get("averageLessonScore")
        self.teacherId = data.get("teacherId")
        self.teacherName = data.get("teacherName")
    
    def to_dict(self):
        return {
            "date": self.date,
            "subject": self.subject,
            "class": self.class_name,
            "totalStudents": self.totalStudents,
            "presentStudents": self.presentStudents,
            "averageParticipation": self.averageParticipation,
            "averageLessonScore": self.averageLessonScore,
            "teacherId": self.teacherId,
            "teacherName": self.teacherName
        }
# ============================================
# TIMETABLE SYSTEM
# ============================================

class TimetableEntry:
    def __init__(self, id: str, dayOfWeek: str, periodNumber: int, 
                 class_name: str, stream: str, pathway: str, subject: str,
                 strand: str, subStrand: str, teacherId: str, teacherName: str,
                 room: str, objectives: List[str]):
        self.id = id
        self.dayOfWeek = dayOfWeek
        self.periodNumber = periodNumber
        self.class_name = class_name
        self.stream = stream
        self.pathway = pathway
        self.subject = subject
        self.strand = strand
        self.subStrand = subStrand
        self.teacherId = teacherId
        self.teacherName = teacherName
        self.room = room
        self.objectives = objectives
        self.created_at = datetime.now().isoformat()
        self.updated_at = datetime.now().isoformat()
    
    def to_dict(self):
        return {
            "id": self.id,
            "dayOfWeek": self.dayOfWeek,
            "periodNumber": self.periodNumber,
            "class": self.class_name,
            "stream": self.stream,
            "pathway": self.pathway,
            "subject": self.subject,
            "strand": self.strand,
            "subStrand": self.subStrand,
            "teacherId": self.teacherId,
            "teacherName": self.teacherName,
            "room": self.room,
            "objectives": self.objectives,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
# Multi-Agent Walker Implementations
class LessonMaster:
    """
    Multi-Agent System for Lesson Generation
    Implements the same walker pattern as Jac
    """
    
    @staticmethod
    def lesson_planner_agent(context: dict, graph_root) -> dict:
        """AGENT 1: Lesson Planner - Creates lesson structure"""
        lesson_id = f"{context['subject']}_{context['grade']}_{int(datetime.now().timestamp())}"
        
        lesson_node = {
            "id": lesson_id,
            "topic": context["sub_strand"],
            "subject": context["subject"],
            "grade": context["grade"],
            "strand": context["strand"],
            "sub_strand": context["sub_strand"],
            "duration": context["duration"],
            "lesson_type": context["lesson_type"],
            "school_level": context["school_level"],
            "generated_at": datetime.now().isoformat(),
            "content": {},
            "quality_score": 0.0
        }
        
        graph_root.lessons[lesson_id] = lesson_node
        print(f"Agent 1 (Planner): Created lesson structure for {lesson_id}")
        return {"lesson_id": lesson_id, "status": "planned"}
    
    @staticmethod
    def content_generator_agent(lesson_id: str, context: dict, graph_root) -> dict:
        """AGENT 2: Content Generator - byLLM GENERATIVE USE"""
        try:
           
            model = genai.GenerativeModel('gemini-2.0-flash')
            
            prompt = f"""Create a comprehensive Kenyan Competency-Based Curriculum (CBC/CBE) lesson plan.

Level: {context['school_level']} School
Grade: {context['grade']}
Subject: {context['subject']}
Strand: {context['strand']}
Sub-Strand: {context['sub_strand']}
Duration: {context['duration']} ({context['lesson_type']})
Available Resources: {context['resources']}
Context/Focus: {context['additional_context']}

STRICT REQUIREMENTS:
1. Content must be appropriate for {context['school_level']} School, Grade {context['grade']}
2. Follow CBC framework principles
3. Include PICRAT analysis

Generate a detailed lesson plan with:
1. Topic title (concise, derived from sub-strand)
2. 2-3 Key Inquiry Questions (KIQs) that drive critical thinking
3. Core Competencies to develop (3-5 items)
4. Values to instill (2-4 items)
5. Materials needed (list of 5-8 items)
6. Lesson sections (3-4 sections) with:
   - Title
   - Duration
   - Content description
   - Teacher activities
   - Student activities

Return ONLY valid JSON with this exact structure:
{{
  "topic": "string",
  "keyInquiryQuestions": ["string"],
  "coreCompetencies": ["string"],
  "values": ["string"],
  "materials": ["string"],
  "sections": [
    {{
      "title": "string",
      "duration": "string",
      "content": "string",
      "teacherActivity": "string",
      "studentActivity": "string"
    }}
  ]
}}"""

            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.7,
                    response_mime_type="application/json"
                )
            )
            
            generated_content = json.loads(response.text)
            
            # Update lesson in OSP graph
            if lesson_id in graph_root.lessons:
                graph_root.lessons[lesson_id]["content"] = generated_content
                graph_root.lessons[lesson_id]["topic"] = generated_content.get("topic", context["sub_strand"])
                graph_root.lessons[lesson_id]["key_inquiry_questions"] = generated_content.get("keyInquiryQuestions", [])
                graph_root.lessons[lesson_id]["core_competencies"] = generated_content.get("coreCompetencies", [])
                graph_root.lessons[lesson_id]["values"] = generated_content.get("values", [])
                graph_root.lessons[lesson_id]["materials"] = generated_content.get("materials", [])
                graph_root.lessons[lesson_id]["sections"] = generated_content.get("sections", [])
            
            print(f"Agent 2 (Generator): Generated content for {lesson_id}")
            return {"status": "generated", "content": generated_content}
            
        except Exception as e:
            print(f"Agent 2 Error: {str(e)}")
            return {"error": str(e)}
    
    @staticmethod
    def quality_analyzer_agent(lesson_id: str, graph_root) -> dict:
        """AGENT 3: Quality Analyzer - byLLM ANALYTICAL USE"""
        try:
            lesson = graph_root.lessons.get(lesson_id)
            if not lesson:
                return {"error": "Lesson not found"}
            
          
            model = genai.GenerativeModel('gemini-2.0-flash')
            
            prompt = f"""Analyze this CBC lesson plan and provide quality scores:

Subject: {lesson['subject']}
Grade: {lesson['grade']}
Topic: {lesson.get('topic', 'N/A')}
Strand: {lesson['strand']}

Lesson Content:
{json.dumps(lesson['content'], indent=2)}

Provide scores (0.0 to 1.0) for:
1. difficulty_score - Age-appropriateness for the grade level
2. cbc_compliance - Adherence to CBC framework principles
3. engagement_level - How engaging the activities are
4. picrat_level - PICRAT classification (e.g., "Interactive-Amplification")
5. recommendations - 2-3 improvement suggestions

Return ONLY valid JSON:
{{
  "difficulty_score": 0.0,
  "cbc_compliance": 0.0,
  "engagement_level": 0.0,
  "picrat_level": "string",
  "recommendations": ["string"]
}}"""

            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    response_mime_type="application/json"
                )
            )
            
            analysis = json.loads(response.text)
            
            # Update lesson with quality scores in OSP graph
            lesson["difficulty_score"] = float(analysis.get("difficulty_score", 0.5))
            lesson["cbc_compliance"] = float(analysis.get("cbc_compliance", 0.5))
            lesson["quality_score"] = (lesson["difficulty_score"] + lesson["cbc_compliance"]) / 2.0
            
            # Add PICRAT analysis(My initiative approach after Insructional designing MOdel completion)
            lesson["content"]["picratAnalysis"] = {
                "level": analysis.get("picrat_level", "Interactive-Amplification"),
                "explanation": " ".join(analysis.get("recommendations", ["Quality lesson plan"]))
            }
            
            print(f"Agent 3 (Analyzer): Analyzed {lesson_id} - Quality: {lesson['quality_score']:.2f}")
            return {"status": "analyzed", "analysis": analysis}
            
        except Exception as e:
            print(f"Agent 3 Error: {str(e)}")
            return {"error": str(e)}
    
    @staticmethod
    def generate_lesson(context: dict, graph_root):
        """
        Main Walker: Orchestrates multi-agent workflow
        Agent 1 (Planner) → Agent 2 (Generator) → Agent 3 (Analyzer)
        """
        print(f"\n{'='*60}")
        print(f"MULTI-AGENT WORKFLOW STARTED")
        print(f"Subject: {context['subject']} | Grade: {context['grade']}")
        print(f"{'='*60}\n")
        
        # AGENT 1: Plan
        planner_result = LessonMaster.lesson_planner_agent(context, graph_root)
        lesson_id = planner_result["lesson_id"]
        
        # AGENT 2: Generate Content (byLLM Generative)
        generator_result = LessonMaster.content_generator_agent(lesson_id, context, graph_root)
        if "error" in generator_result:
            return {"error": generator_result["error"]}
        
        # AGENT 3: Analyze Quality (byLLM Analytical)
        analyzer_result = LessonMaster.quality_analyzer_agent(lesson_id, graph_root)
        if "error" in analyzer_result:
            return {"error": analyzer_result["error"]}
        
        # Get final lesson from OSP graph
        lesson = graph_root.lessons[lesson_id]
        
        print(f"\n{'='*60}")
        print(f"MULTI-AGENT WORKFLOW COMPLETED")
        print(f"Quality Score: {lesson['quality_score']:.2f}")
        print(f"{'='*60}\n")
        
        return {
            "id": lesson["id"],
            "topic": lesson.get("topic"),
            "subject": lesson["subject"],
            "grade": lesson["grade"],
            "strand": lesson["strand"],
            "subStrand": lesson["sub_strand"],
            "duration": lesson["duration"],
            "lessonType": lesson["lesson_type"],
            "schoolLevel": lesson["school_level"],
            "keyInquiryQuestions": lesson.get("key_inquiry_questions", []),
            "coreCompetencies": lesson.get("core_competencies", []),
            "values": lesson.get("values", []),
            "materials": lesson.get("materials", []),
            "sections": lesson.get("sections", []),
            "picratAnalysis": lesson["content"].get("picratAnalysis", {}),
            "qualityScore": lesson["quality_score"],
            "difficultyScore": lesson["difficulty_score"],
            "cbcCompliance": lesson["cbc_compliance"],
            "generatedAt": lesson["generated_at"]
        }
    
    @staticmethod
    def track_student_progress(student_id: str, graph_root):
        """Walker: OSP Graph Reasoning - Track student progress"""
        student = graph_root.students.get(student_id, {
            "id": student_id,
            "name": "Demo Student",
            "completed_lessons": [],
            "weak_competencies": []
        })
        
        return {
            "student_id": student_id,
            "name": student.get("name"),
            "completed_lessons": student.get("completed_lessons", []),
            "overall_progress": 0.0
        }
    
    @staticmethod
    def recommend_lessons(student_id: str, subject: str, graph_root):
        """Walker: OSP Graph Reasoning - Recommend lessons"""
        recommendations = [
            {
                "lesson_id": lesson["id"],
                "topic": lesson.get("topic"),
                "quality": lesson.get("quality_score", 0.5)
            }
            for lesson in graph_root.lessons.values()
            if lesson["subject"] == subject
        ][:5]
        
        return {
            "student_id": student_id,
            "subject": subject,
            "recommendations": recommendations
        }
    
    @staticmethod
    def lab_assistant(query: str):
        """Walker: Virtual Lab Assistant using byLLM"""
        try:
           
            model = genai.GenerativeModel('gemini-2.0-flash')
            
            response = model.generate_content(
                f"""You are a friendly Virtual Lab Assistant for Kenyan students following the CBC curriculum.

Student Query: {query}

Provide a helpful, concise response (under 200 words) that:
1. Explains scientific concepts simply
2. Suggests safe, age-appropriate experiments
3. Relates to the Kenyan CBC curriculum
4. Encourages curiosity

Keep it conversational and encouraging.""",
                generation_config=genai.GenerationConfig(temperature=0.7)
            )
            
            return {"text": response.text}
            
        except Exception as e:
            print(f"Lab Assistant Error: {str(e)}")
            return {"text": "Error connecting to the lab assistant."}

# Initialize graph root
graph_root = None
lesson_master = LessonMaster()

def initialize_graph():
    """Initialize the OSP graph structure"""
    global graph_root
    
    if graph_root is None:
        # Create root node
        graph_root = LessonGraphRoot(
            name="STEM ElimuSmartPlan Root",
            initialized_at=datetime.now().isoformat()
        )
        
        print("OSP Graph initialized successfully")
    
    return graph_root

@app.on_event("startup")
async def startup_event():
    """Initialize graph on server startup"""
    initialize_graph()
    print("STEM ElimuSmartPlan Backend is running")
    print("Multi-Agent System loaded")

@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "STEM ElimuSmartPlan Backend",
        "graph_initialized": graph_root is not None,
        "api_key_configured": bool(GOOGLE_API_KEY)
    }

@app.get("/health")
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "graph_root": "initialized" if graph_root else "not_initialized",
        "multi_agent_system": "loaded",
        "api_key": "configured" if GOOGLE_API_KEY else "missing"
    }
# ============================================
# TIMETABLE ENDPOINTS
# ============================================

@app.get("/api/timetable/entries")
async def get_timetable_entries(
    teacher_id: Optional[str] = None,
    day: Optional[str] = None,
    class_name: Optional[str] = None,
    stream: Optional[str] = None
):
    try:
        root = initialize_graph()
        entries = list(root.timetable_entries.values())
        
        if teacher_id:
            entries = [e for e in entries if e.teacherId == teacher_id]
        if day:
            entries = [e for e in entries if e.dayOfWeek == day]
        if class_name:
            entries = [e for e in entries if e.class_name == class_name]
        if stream:
            entries = [e for e in entries if e.stream == stream]
        
        return {
            "success": True,
            "entries": [e.to_dict() for e in entries],
            "total": len(entries)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/timetable/entries")
async def create_timetable_entry(request: Request):
    try:
        data = await request.json()
        root = initialize_graph()
        
        entry_id = str(uuid.uuid4())
        entry = TimetableEntry(
            id=entry_id,
            dayOfWeek=data["dayOfWeek"],
            periodNumber=data["periodNumber"],
            class_name=data.get("class"),
            stream=data["stream"],
            pathway=data["pathway"],
            subject=data["subject"],
            strand=data["strand"],
            subStrand=data["subStrand"],
            teacherId=data["teacherId"],
            teacherName=data["teacherName"],
            room=data["room"],
            objectives=data.get("objectives", [])
        )
        
        root.timetable_entries[entry_id] = entry
        return {"success": True, "data": entry.to_dict()}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.put("/api/timetable/entries/{entry_id}")
async def update_timetable_entry(entry_id: str, request: Request):
    try:
        root = initialize_graph()
        if entry_id not in root.timetable_entries:
            return {"success": False, "error": "Entry not found"}
        
        data = await request.json()
        entry = root.timetable_entries[entry_id]
        
        entry.dayOfWeek = data.get("dayOfWeek", entry.dayOfWeek)
        entry.periodNumber = data.get("periodNumber", entry.periodNumber)
        entry.class_name = data.get("class", entry.class_name)
        entry.stream = data.get("stream", entry.stream)
        entry.pathway = data.get("pathway", entry.pathway)
        entry.subject = data.get("subject", entry.subject)
        entry.strand = data.get("strand", entry.strand)
        entry.subStrand = data.get("subStrand", entry.subStrand)
        entry.room = data.get("room", entry.room)
        entry.objectives = data.get("objectives", entry.objectives)
        entry.updated_at = datetime.now().isoformat()
        
        return {"success": True, "data": entry.to_dict()}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.delete("/api/timetable/entries/{entry_id}")
async def delete_timetable_entry(entry_id: str):
    try:
        root = initialize_graph()
        if entry_id not in root.timetable_entries:
            return {"success": False, "error": "Entry not found"}
        
        del root.timetable_entries[entry_id]
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/timetable/stats")
async def get_timetable_stats(teacher_id: Optional[str] = None):
    try:
        root = initialize_graph()
        entries = list(root.timetable_entries.values())
        
        if teacher_id:
            entries = [e for e in entries if e.teacherId == teacher_id]
        
        stats = {
            "total_lessons": len(entries),
            "by_subject": {},
            "by_day": {},
            "by_pathway": {}
        }
        
        for entry in entries:
            stats["by_subject"][entry.subject] = stats["by_subject"].get(entry.subject, 0) + 1
            stats["by_day"][entry.dayOfWeek] = stats["by_day"].get(entry.dayOfWeek, 0) + 1
            stats["by_pathway"][entry.pathway] = stats["by_pathway"].get(entry.pathway, 0) + 1
        
        return {"success": True, "data": stats}
    except Exception as e:
        return {"success": False, "error": str(e)}
    # ============================================
# STUDENT TRACKER ENDPOINTS
# ============================================

@app.post("/walker/get_all_students")
async def get_all_students(request: Request):
    """Get all students from the graph"""
    try:
        root = initialize_graph()
        
        # If no students exist, create demo students
        if not root.students:
            demo_students = [
                Student("st_001", "John Kamau", "ADM001", "Grade 8", 95.0, 85.5),
                Student("st_002", "Mary Wanjiru", "ADM002", "Grade 8", 88.0, 78.2),
                Student("st_003", "Peter Ochieng", "ADM003", "Grade 8", 92.0, 88.7),
                Student("st_004", "Grace Akinyi", "ADM004", "Grade 8", 85.0, 76.5),
                Student("st_005", "David Kipchoge", "ADM005", "Grade 8", 90.0, 82.3),
            ]
            for student in demo_students:
                root.students[student.id] = student
        
        students_list = [s.to_dict() for s in root.students.values()]
        
        return {
            "success": True,
            "data": students_list
        }
    except Exception as e:
        print(f"Error getting students: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/walker/get_class_insights")
async def get_class_insights(request: Request):
    """Get class-level insights"""
    try:
        root = initialize_graph()
        
        if root.students:
            students_list = list(root.students.values())
            total_students = len(students_list)
            
            avg_attendance = sum(s.attendanceRate for s in students_list) / total_students
            avg_performance = sum(s.overallPerformance for s in students_list) / total_students
            
            # Top performers
            top_performers = sorted(
                students_list, 
                key=lambda s: s.overallPerformance, 
                reverse=True
            )[:3]
            
            root.class_insights = {
                "totalStudents": total_students,
                "averageAttendance": round(avg_attendance, 2),
                "averagePerformance": round(avg_performance, 2),
                "weakCompetencies": ["Algebraic Reasoning", "Data Interpretation"],
                "topPerformers": [
                    {
                        "name": s.name,
                        "performance": s.overallPerformance
                    } for s in top_performers
                ]
            }
        
        return {
            "success": True,
            "data": root.class_insights
        }
    except Exception as e:
        print(f"Error getting insights: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/walker/get_attendance_records")
async def get_attendance_records(request: Request):
    """Get all attendance records"""
    try:
        root = initialize_graph()
        records = [r.to_dict() for r in root.attendance_records.values()]
        
        return {
            "success": True,
            "data": records
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/walker/get_participation_records")
async def get_participation_records(request: Request):
    """Get all participation records"""
    try:
        root = initialize_graph()
        records = [r.to_dict() for r in root.participation_records.values()]
        
        return {
            "success": True,
            "data": records
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/walker/get_daily_summaries")
async def get_daily_summaries(request: Request):
    """Get all daily summaries"""
    try:
        root = initialize_graph()
        summaries = [s.to_dict() for s in root.daily_summaries]
        
        return {
            "success": True,
            "data": summaries
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/walker/record_attendance")
async def record_attendance(request: Request):
    """Record student attendance"""
    try:
        data = await request.json()
        root = initialize_graph()
        
        attendance = AttendanceRecord(data)
        root.attendance_records[attendance.id] = attendance
        
        return {
            "success": True,
            "data": attendance.to_dict()
        }
    except Exception as e:
        print(f"Error recording attendance: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/walker/save_daily_summary")
async def save_daily_summary(request: Request):
    """Save daily lesson summary for teacher appraisal"""
    try:
        data = await request.json()
        root = initialize_graph()
        
        summary = DailySummary(data)
        root.daily_summaries.append(summary)
        
        print(f"Daily summary saved: {summary.date} - {summary.subject}")
        
        return {
            "success": True,
            "data": summary.to_dict()
        }
    except Exception as e:
        print(f"Error saving summary: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/walker/update_participation_records")
async def update_participation_records(request: Request):
    """Update participation records with lesson scores"""
    try:
        data = await request.json()
        root = initialize_graph()
        
        updated_count = 0
        for record_data in data:
            record = ParticipationRecord(record_data)
            root.participation_records[record.id] = record
            updated_count += 1
        
        print(f"Updated {updated_count} participation records")
        
        return {
            "success": True,
            "data": {
                "updated": updated_count
            }
        }
    except Exception as e:
        print(f"Error updating participation: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

# ============================================
# PEDAGOGICAL STRATEGY ENDPOINT
# ============================================

@app.post("/walker/generate_pedagogical_strategy")
async def generate_pedagogical_strategy(request: Request):
    """
    Generate AI-powered pedagogical strategy using Gemini
    This mirrors the functionality in geminiService.ts
    """
    try:
        data = await request.json()
        insights = data.get("insights", {})
        students = data.get("students", [])
        
        # Use Gemini to generate strategy
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""You are an expert pedagogical advisor for Kenyan CBC/CBE education.

CLASS ANALYTICS:
- Total Students: {insights.get('totalStudents', 0)}
- Average Attendance: {insights.get('averageAttendance', 0)}%
- Average Performance: {insights.get('averagePerformance', 0)}%
- Weak Competencies: {', '.join(insights.get('weakCompetencies', []))}

STUDENT DATA:
{json.dumps(students, indent=2)}

Based on this data, provide:
1. Class-wide pedagogical recommendations
2. Individualized intervention strategies for struggling students
3. CBC-aligned teaching methods to address weak competencies
4. Engagement strategies to improve attendance and participation
5. Assessment approaches aligned with competency-based learning

Provide actionable, specific strategies that a teacher can implement immediately.
Keep recommendations practical and aligned with Kenyan CBC framework."""

        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(temperature=0.7)
        )
        
        return {
            "success": True,
            "data": {
                "strategy": response.text
            }
        }
    except Exception as e:
        print(f"Error generating strategy: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }
# ============================================
# JAC WALKER ENDPOINTS
#
# ============================================

@app.post("/walker/generate_lesson")
async def generate_lesson(request: Request):
    """
    Generate a complete CBC lesson using multi-agent system
    
    Expected request body:
    {
        "grade": "Grade 7",
        "subject": "Mathematics",
        "strand": "Numbers",
        "sub_strand": "Fractions",
        "duration": "40 minutes",
        "lesson_type": "Single Lesson",
        "school_level": "Junior",
        "additional_context": "Focus on real-world applications",
        "resources": "Fraction cards, manipulatives"
    }
    """
    try:
        data = await request.json()
        root = initialize_graph()
        
        context = {
            "grade": data.get("grade"),
            "subject": data.get("subject"),
            "strand": data.get("strand"),
            "sub_strand": data.get("sub_strand"),
            "duration": data.get("duration"),
            "lesson_type": data.get("lesson_type"),
            "school_level": data.get("school_level"),
            "additional_context": data.get("additional_context", ""),
            "resources": data.get("resources", "Basic classroom materials")
        }
        
        # Execute walker
        result = lesson_master.generate_lesson(context, root)
        
        if "error" in result:
            return {
                "success": False,
                "error": result["error"]
            }
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/walker/track_progress")
async def track_progress(request: Request):
    """
    Track student progress using OSP graph traversal
    
    Expected request body:
    {
        "student_id": "student_123"
    }
    """
    try:
        data = await request.json()
        root = initialize_graph()
        
        result = lesson_master.track_student_progress(
            data.get("student_id"),
            root
        )
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/walker/recommend_lessons")
async def recommend_lessons(request: Request):
    """
    Recommend lessons using OSP graph reasoning
    
    Expected request body:
    {
        "student_id": "student_123",
        "subject": "Mathematics"
    }
    """
    try:
        data = await request.json()
        root = initialize_graph()
        
        result = lesson_master.recommend_lessons(
            data.get("student_id"),
            data.get("subject"),
            root
        )
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/walker/lab_assistant")
async def lab_assistant(request: Request):
    """
    Virtual Lab Assistant using byLLM
    
    Expected request body:
    {
        "query": "How does photosynthesis work?"
    }
    """
    try:
        data = await request.json()
        
        result = lesson_master.lab_assistant(data.get("query"))
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    print(f"\n🌐 Starting server on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
