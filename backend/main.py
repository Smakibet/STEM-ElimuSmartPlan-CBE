import uuid
import os
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Float, JSON, Integer, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Import Google Generative AI
import google.generativeai as genai

# ============================================
# GEMINI AI CONFIGURATION
# ============================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")  # Seting API key in environment variable
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-2.0-flash')
else:
    print("⚠️  WARNING: GEMINI_API_KEY not set. AI features will be disabled.")
    gemini_model = None

# ============================================
# DATABASE SETUP
# ============================================
DATABASE_URL = "sqlite:///./school_data.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ============================================
# DATABASE MODELS
# ============================================

class UserTable(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    name = Column(String)
    email = Column(String, unique=True)
    role = Column(String)
    tscNumber = Column(String, nullable=True)
    department = Column(String, nullable=True)

class StudentTable(Base):
    __tablename__ = "students"
    id = Column(String, primary_key=True)
    name = Column(String)
    admissionNumber = Column(String, unique=True)
    grade = Column(String)
    subjects = Column(JSON)
    attendanceRate = Column(Float, default=100.0)
    overallPerformance = Column(Float, default=0.0)

class ConfigTable(Base):
    __tablename__ = "system_settings"
    id = Column(String, primary_key=True, default="global_config")
    schoolName = Column(String)
    currentTerm = Column(String)
    academicYear = Column(String)
    gradingScale = Column(String, default="A-F")

class ObservationTable(Base):
    __tablename__ = "observations"
    id = Column(String, primary_key=True)
    teacherId = Column(String)
    supervisorId = Column(String)
    supervisorName = Column(String)
    observer = Column(String, nullable=True)
    notes = Column(Text)
    type = Column(String)
    date = Column(String)
    timestamp = Column(String)

class AppraisalTable(Base):
    __tablename__ = "appraisals"
    id = Column(String, primary_key=True)
    teacherId = Column(String)
    teacherName = Column(String)
    tscNumber = Column(String)
    period = Column(String)
    status = Column(String)
    submittedDate = Column(String, nullable=True)
    supervisorId = Column(String, nullable=True)
    standards = Column(JSON)

class AttendanceTable(Base):
    __tablename__ = "attendance"
    id = Column(String, primary_key=True)
    teacherId = Column(String)
    date = Column(String)
    lessonCount = Column(Integer, default=0)
    completionRate = Column(Float, default=0.0)
    avgDuration = Column(Integer, default=0)

class AttendanceSessionTable(Base):
    __tablename__ = "attendance_sessions"
    id = Column(String, primary_key=True)
    userId = Column(String)
    teacherId = Column(String)
    teacherName = Column(String)
    date = Column(String)
    clockIn = Column(String)
    clockInTime = Column(String)
    clockOut = Column(String, nullable=True)
    clockOutTime = Column(String, nullable=True)
    subject = Column(String)
    class_ = Column(String, name="class")
    period = Column(String)
    topic = Column(String, nullable=True)
    duration = Column(String, nullable=True)
    durationMinutes = Column(Integer, nullable=True)
    active = Column(Integer, default=1)

class SharedLessonTable(Base):
    __tablename__ = "shared_lessons"
    id = Column(String, primary_key=True)
    topic = Column(String)
    subject = Column(String)
    grade = Column(String)
    author = Column(String)
    authorId = Column(String)
    levelFilter = Column(String)
    downloads = Column(Integer, default=0)
    content = Column(JSON)
    createdAt = Column(String)

class CoTeachingTable(Base):
    __tablename__ = "co_teaching_sessions"
    id = Column(String, primary_key=True)
    teacherId = Column(String)
    teacherName = Column(String)
    partnerTeacher = Column(String)
    topic = Column(String)
    date = Column(String)
    strategy = Column(String)
    status = Column(String, default="Planned")

class ResourceBookingTable(Base):
    __tablename__ = "resource_bookings"
    id = Column(String, primary_key=True)
    resource = Column(String)
    date = Column(String)
    timeSlot = Column(String)
    bookedBy = Column(String)
    bookedById = Column(String)

class DailySummaryTable(Base):
    __tablename__ = "daily_summaries"
    id = Column(String, primary_key=True)
    date = Column(String)
    subject = Column(String)
    period = Column(String)
    class_ = Column(String, name="class")
    stream = Column(String, nullable=True)
    strand = Column(String, nullable=True)
    objectives = Column(String, nullable=True)
    totalStudents = Column(Integer)
    presentStudents = Column(Integer)
    absentStudents = Column(Integer)
    attendanceRate = Column(Float)
    averageLessonScore = Column(Float)
    averageParticipation = Column(Float)
    teacherId = Column(String)
    teacherName = Column(String)
    lessonId = Column(String)
    startTime = Column(String)
    endTime = Column(String)
    attendanceRecords = Column(JSON)

# Create all tables
Base.metadata.create_all(bind=engine)

# ============================================
# AI HELPER FUNCTIONS
# ============================================

async def generate_pedagogical_insights(teacher_data: Dict, summaries: List, students: List) -> str:
    """Use Gemini AI to generate personalized pedagogical strategies"""
    
    if not gemini_model:
        return "AI features are currently unavailable. Please set GEMINI_API_KEY environment variable."
    
    try:
        # Prepare data for AI analysis
        total_lessons = len(summaries)
        avg_attendance = sum(s.attendanceRate for s in summaries) / total_lessons if summaries else 0
        avg_performance = sum(s.averageLessonScore for s in summaries) / total_lessons if summaries else 0
        total_students = len(students)
        struggling = [s for s in students if (s.overallPerformance or 0) < 50]
        excellent = [s for s in students if (s.overallPerformance or 0) >= 80]
        
        # Create detailed prompt for Gemini
        prompt = f"""You are an expert educational consultant analyzing classroom data for a teacher in Kenya using the Competency-Based Curriculum (CBC).

TEACHER PROFILE:
- Name: {teacher_data.get('name', 'Teacher')}
- Department: {teacher_data.get('department', 'General')}
- Total Lessons Delivered: {total_lessons}

CLASSROOM METRICS:
- Average Class Attendance: {avg_attendance:.1f}%
- Average Lesson Performance: {avg_performance:.1f}%
- Total Students: {total_students}
- High Performers (≥80%): {len(excellent)} students ({len(excellent)/max(total_students, 1)*100:.1f}%)
- Students Needing Support (<50%): {len(struggling)} students ({len(struggling)/max(total_students, 1)*100:.1f}%)

RECENT LESSON TOPICS:
{', '.join([s.objectives or 'N/A' for s in summaries[:5]])}

Please provide:
1. A comprehensive analysis of the classroom performance
2. Specific, actionable pedagogical strategies aligned with CBC principles
3. Differentiated instruction recommendations
4. Intervention strategies for struggling students
5. How to leverage high performers
6. Assessment and feedback strategies
7. Immediate action items (3-5 items)
8. How this data aligns with TPAD (Teacher Performance Appraisal and Development) standards

Format your response in a clear, professional manner suitable for a teacher's reference. Use emojis strategically to enhance readability."""

        # Generate response using Gemini
        response = gemini_model.generate_content(prompt)
        
        return response.text
        
    except Exception as e:
        print(f"Error generating AI insights: {e}")
        return f"Unable to generate AI insights at this time. Error: {str(e)}"


async def analyze_classroom_with_ai(teacher_data: Dict, sessions: List, observations: List) -> Dict:
    """Use Gemini AI to analyze classroom performance and provide scores"""
    
    if not gemini_model:
        return {
            "overallScore": 75,
            "engagementScore": 7,
            "atRiskCount": 2,
            "recommendations": ["AI features unavailable - set GEMINI_API_KEY"],
            "strengths": ["Regular attendance tracking"]
        }
    
    try:
        total_lessons = len(sessions)
        completed = len([s for s in sessions if s.clockOut])
        completion_rate = (completed / max(total_lessons, 1)) * 100
        
        # Preparing observation summaries
        obs_summary = "\n".join([
            f"- {o.type} on {o.date}: {o.notes[:100]}..."
            for o in observations[:5]
        ])
        
        prompt = f"""Analyze this teacher's performance data and provide specific metrics:

TEACHER: {teacher_data.get('name', 'Teacher')}
DEPARTMENT: {teacher_data.get('department', 'General')}

LESSON DELIVERY:
- Total Lessons: {total_lessons}
- Completed: {completed}
- Completion Rate: {completion_rate:.1f}%

RECENT OBSERVATIONS:
{obs_summary if obs_summary else "No observations recorded"}

Please provide a JSON response with:
1. overallScore (0-100): Overall teaching effectiveness
2. engagementScore (0-10): Student engagement level
3. atRiskCount (number): Estimated students needing intervention
4. recommendations (array of 3-5 strings): Specific actionable recommendations
5. strengths (array of 3-5 strings): Key teaching strengths identified

Respond ONLY with valid JSON, no other text."""

        response = gemini_model.generate_content(prompt)
        
        # Parse JSON response
        import json
        result = json.loads(response.text.strip())
        
        return result
        
    except Exception as e:
        print(f"Error in AI analysis: {e}")
        return {
            "overallScore": int(completion_rate),
            "engagementScore": min(10, int((completed / max(total_lessons, 1)) * 10)),
            "atRiskCount": max(0, int((100 - completion_rate) / 10)),
            "recommendations": [
                "Maintain consistent lesson delivery",
                "Focus on learner engagement strategies",
                "Document learning outcomes regularly"
            ],
            "strengths": [
                "Regular attendance tracking",
                "Consistent clock in/out patterns"
            ]
        }


async def generate_weekly_appraisal_with_ai(teacher_data: Dict, attendance_records: List) -> Dict:
    """Use Gemini AI to generate comprehensive weekly appraisals"""
    
    if not gemini_model:
        return {
            "teacherId": teacher_data.get('id'),
            "teacherName": teacher_data.get('name'),
            "week": "Current Week",
            "totalLessons": len(attendance_records),
            "averageAttendance": 85.0,
            "rating": "Good",
            "recommendations": ["AI features unavailable"]
        }
    
    try:
        total_lessons = sum(a.lessonCount for a in attendance_records)
        avg_completion = sum(a.completionRate for a in attendance_records) / max(len(attendance_records), 1)
        avg_duration = sum(a.avgDuration for a in attendance_records) / max(len(attendance_records), 1)
        
        prompt = f"""Generate a comprehensive weekly appraisal for this teacher:

TEACHER: {teacher_data.get('name')}
DEPARTMENT: {teacher_data.get('department')}
TSC NUMBER: {teacher_data.get('tscNumber')}

WEEKLY STATISTICS:
- Total Lessons Taught: {total_lessons}
- Average Completion Rate: {avg_completion:.1f}%
- Average Lesson Duration: {avg_duration:.0f} minutes
- Days Active: {len(attendance_records)}

Provide a JSON response with:
1. rating (string): "Excellent", "Good", "Average", or "Needs Improvement"
2. averageParticipation (0-100): Student participation estimate
3. averageLessonScore (0-100): Overall lesson quality score
4. totalStudentsEngaged (number): Estimated total students taught
5. subjectsTaught (array): Subjects covered
6. recommendations (array of 3-5 strings): Specific improvement suggestions aligned with CBC and TPAD

Respond ONLY with valid JSON."""

        response = gemini_model.generate_content(prompt)
        
        import json
        ai_result = json.loads(response.text.strip())
        
        return {
            "teacherId": teacher_data.get('id'),
            "teacherName": teacher_data.get('name'),
            "week": "Current Week",
            "totalLessons": total_lessons,
            "averageAttendance": avg_completion,
            "averageParticipation": ai_result.get('averageParticipation', 85),
            "averageLessonScore": ai_result.get('averageLessonScore', 75),
            "totalStudentsEngaged": ai_result.get('totalStudentsEngaged', total_lessons * 30),
            "subjectsTaught": ai_result.get('subjectsTaught', [teacher_data.get('department', 'General')]),
            "rating": ai_result.get('rating', 'Good'),
            "recommendations": ai_result.get('recommendations', [
                "Continue maintaining high engagement levels",
                "Consider integrating more CBC competencies"
            ])
        }
        
    except Exception as e:
        print(f"Error generating weekly appraisal: {e}")
        return {
            "teacherId": teacher_data.get('id'),
            "teacherName": teacher_data.get('name'),
            "week": "Current Week",
            "totalLessons": total_lessons,
            "averageAttendance": avg_completion,
            "rating": "Good",
            "recommendations": ["Error generating AI appraisal"]
        }

# ============================================
# FASTAPI APP
# ============================================
app = FastAPI(title="SMACQX School Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================
# STARTUP - INITIALIZE DATA
# ============================================
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        # Initialize config
        if not db.query(ConfigTable).first():
            db.add(ConfigTable(
                id="global_config",
                schoolName="SMACQX STEM Academy",
                currentTerm="Term 1",
                academicYear="2026",
                gradingScale="A-F"
            ))
            db.commit()

        # Initialize admin user
        if not db.query(UserTable).filter(UserTable.id == "admin_default").first():
            db.add(UserTable(
                id="admin_default",
                name="Admin",
                email="admin@smacqx.com",
                role="admin"
            ))
            db.commit()

        # Initialize supervisor
        if not db.query(UserTable).filter(UserTable.id == "supervisor_001").first():
            db.add(UserTable(
                id="supervisor_001",
                name="Dr. Sarah Kamau",
                email="sarah.kamau@school.edu",
                role="supervisor",
                tscNumber="TSC-SUP-001",
                department="Administration"
            ))
            db.commit()

        # Initialize sample teachers
        if db.query(UserTable).filter(UserTable.role == "teacher").count() == 0:
            teachers = [
                {
                    "id": "teacher_001",
                    "name": "John Kamau",
                    "email": "jkamau@school.edu",
                    "role": "teacher",
                    "tscNumber": "TSC-123456",
                    "department": "Mathematics"
                },
                {
                    "id": "teacher_002",
                    "name": "Mary Wanjiku",
                    "email": "mwanjiku@school.edu",
                    "role": "teacher",
                    "tscNumber": "TSC-123457",
                    "department": "Science"
                },
                {
                    "id": "teacher_003",
                    "name": "David Omondi",
                    "email": "domondi@school.edu",
                    "role": "teacher",
                    "tscNumber": "TSC-123458",
                    "department": "English"
                },
                {
                    "id": "teacher_004",
                    "name": "Grace Akinyi",
                    "email": "gakinyi@school.edu",
                    "role": "teacher",
                    "tscNumber": "TSC-123459",
                    "department": "Kiswahili"
                }
            ]
            for teacher in teachers:
                db.add(UserTable(**teacher))
            db.commit()

        print("✓ Database initialized successfully")
        if gemini_model:
            print("✓ Gemini AI enabled")
        else:
            print("⚠️  Gemini AI disabled - set GEMINI_API_KEY to enable")
            
    except Exception as e:
        print(f"Error during startup: {e}")
        db.rollback()
    finally:
        db.close()

# ============================================
# BASIC ENDPOINTS
# ============================================

@app.get("/")
async def root():
    return {
        "message": "SMACQX School Management API",
        "version": "1.0.0",
        "status": "running",
        "ai_enabled": gemini_model is not None
    }

@app.post("/walker/get_config")
async def get_config(db: Session = Depends(get_db)):
    config = db.query(ConfigTable).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    return {
        "id": config.id,
        "schoolName": config.schoolName,
        "currentTerm": config.currentTerm,
        "academicYear": config.academicYear,
        "gradingScale": config.gradingScale
    }

@app.post("/walker/update_config")
async def update_config(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    config = db.query(ConfigTable).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    incoming = data.get("config", {})
    for key, value in incoming.items():
        if hasattr(config, key):
            setattr(config, key, value)
    
    db.commit()
    db.refresh(config)
    
    return {
        "id": config.id,
        "schoolName": config.schoolName,
        "currentTerm": config.currentTerm,
        "academicYear": config.academicYear,
        "gradingScale": config.gradingScale
    }

@app.post("/walker/get_all_users")
async def get_all_users(db: Session = Depends(get_db)):
    users = db.query(UserTable).all()
    return [{
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "tscNumber": u.tscNumber,
        "department": u.department
    } for u in users]

@app.post("/walker/manage_user")
async def manage_user(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    action = data.get("action")
    
    if action == "create":
        ud = data.get("userData", {})
        new_user = UserTable(
            id=str(uuid.uuid4()),
            name=ud.get("name"),
            email=ud.get("email"),
            role=ud.get("role"),
            tscNumber=ud.get("tscNumber"),
            department=ud.get("department")
        )
        db.add(new_user)
    elif action == "delete":
        user_id = data.get("userId")
        db.query(UserTable).filter(UserTable.id == user_id).delete()
    
    db.commit()
    users = db.query(UserTable).all()
    return [{
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "tscNumber": u.tscNumber,
        "department": u.department
    } for u in users]

@app.post("/walker/get_all_students")
async def get_all_students(db: Session = Depends(get_db)):
    students = db.query(StudentTable).all()
    return [{
        "id": s.id,
        "name": s.name,
        "admissionNumber": s.admissionNumber,
        "grade": s.grade,
        "subjects": s.subjects,
        "attendanceRate": s.attendanceRate,
        "overallPerformance": s.overallPerformance
    } for s in students]

@app.post("/walker/manage_student")
async def manage_student(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    action = data.get("action")
    
    if action == "add":
        sd = data.get("studentData", {})
        new_student = StudentTable(
            id=str(uuid.uuid4()),
            name=sd.get("name"),
            admissionNumber=sd.get("admissionNumber"),
            grade=sd.get("grade"),
            subjects=sd.get("subjects", [])
        )
        db.add(new_student)
    elif action == "delete":
        student_id = data.get("studentId")
        db.query(StudentTable).filter(StudentTable.id == student_id).delete()
    
    db.commit()
    students = db.query(StudentTable).all()
    return [{
        "id": s.id,
        "name": s.name,
        "admissionNumber": s.admissionNumber,
        "grade": s.grade,
        "subjects": s.subjects,
        "attendanceRate": s.attendanceRate,
        "overallPerformance": s.overallPerformance
    } for s in students]

# ============================================
# SUPERVISOR ENDPOINTS
# ============================================

@app.post("/walker/get_staff_list")
async def get_staff_list(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    
    teachers = db.query(UserTable).filter(UserTable.role == "teacher").all()
    result = []
    
    for teacher in teachers:
        attendance_records = db.query(AttendanceTable).filter(
            AttendanceTable.teacherId == teacher.id
        ).all()
        
        total_lessons = sum(a.lessonCount for a in attendance_records) if attendance_records else 0
        avg_attendance = (
            sum(a.completionRate for a in attendance_records) / len(attendance_records)
            if attendance_records else 0
        )
        
        appraisals = db.query(AppraisalTable).filter(
            AppraisalTable.teacherId == teacher.id
        ).all()
        
        appraisal_score = 0
        if appraisals:
            latest = appraisals[-1]
            if latest.standards and isinstance(latest.standards, list):
                total_rating = sum(s.get("supervisorRating", 0) for s in latest.standards)
                max_rating = len(latest.standards) * 5
                appraisal_score = round((total_rating / max_rating) * 100) if max_rating > 0 else 0
        
        status = "Good Standing"
        if appraisal_score >= 80 and avg_attendance >= 90:
            status = "Promotable"
        elif appraisal_score < 60 or avg_attendance < 70:
            status = "Intervention Needed"
        
        result.append({
            "id": teacher.id,
            "name": teacher.name,
            "tscNumber": teacher.tscNumber or "N/A",
            "department": teacher.department or "General",
            "lessonsTaught": total_lessons,
            "attendanceRate": round(avg_attendance, 1),
            "appraisalScore": appraisal_score,
            "status": status
        })
    
    return result

@app.post("/walker/record_observation")
async def record_observation(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    
    observation = ObservationTable(
        id=str(uuid.uuid4()),
        teacherId=data.get("teacherId"),
        supervisorId=data.get("supervisorId"),
        supervisorName=data.get("supervisorName"),
        observer=data.get("supervisorName"),
        notes=data.get("notes"),
        type=data.get("type", "Regular Walkthrough"),
        date=data.get("date", datetime.now().strftime("%Y-%m-%d")),
        timestamp=data.get("timestamp", datetime.now().isoformat())
    )
    
    db.add(observation)
    db.commit()
    
    return {"success": True, "id": observation.id}

@app.post("/walker/get_supervisor_observations")
async def get_supervisor_observations(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    supervisor_id = data.get("supervisorId")
    
    observations = db.query(ObservationTable).filter(
        ObservationTable.supervisorId == supervisor_id
    ).order_by(ObservationTable.timestamp.desc()).all()
    
    return [{
        "id": o.id,
        "teacherId": o.teacherId,
        "supervisorId": o.supervisorId,
        "supervisorName": o.supervisorName,
        "observer": o.observer,
        "notes": o.notes,
        "type": o.type,
        "date": o.date,
        "timestamp": o.timestamp
    } for o in observations]

@app.post("/walker/get_attendance_statistics")
async def get_attendance_statistics(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    
    teachers = db.query(UserTable).filter(UserTable.role == "teacher").all()
    result = []
    
    for teacher in teachers:
        attendance_records = db.query(AttendanceTable).filter(
            AttendanceTable.teacherId == teacher.id
        ).all()
        
        lesson_count = sum(a.lessonCount for a in attendance_records) if attendance_records else 0
        completion_rate = (
            sum(a.completionRate for a in attendance_records) / len(attendance_records)
            if attendance_records else 0
        )
        avg_duration = (
            sum(a.avgDuration for a in attendance_records) / len(attendance_records)
            if attendance_records else 0
        )
        
        result.append({
            "id": teacher.id,
            "name": teacher.name,
            "department": teacher.department or "General",
            "lessonCount": lesson_count,
            "planned": lesson_count + 10,
            "completionRate": round(completion_rate, 1),
            "avgDuration": round(avg_duration)
        })
    
    return result

@app.post("/walker/get_pending_appraisals")
async def get_pending_appraisals(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    status = data.get("status", "Submitted to Supervisor")
    
    appraisals = db.query(AppraisalTable).filter(
        AppraisalTable.status == status
    ).all()
    
    return [{
        "id": a.id,
        "teacherId": a.teacherId,
        "teacherName": a.teacherName,
        "tscNumber": a.tscNumber,
        "period": a.period,
        "status": a.status,
        "submittedDate": a.submittedDate,
        "standards": a.standards or []
    } for a in appraisals]

@app.post("/walker/submit_supervisor_appraisal")
async def submit_supervisor_appraisal(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    appraisal_id = data.get("appraisalId")
    ratings = data.get("ratings", {})
    
    appraisal = db.query(AppraisalTable).filter(AppraisalTable.id == appraisal_id).first()
    if not appraisal:
        raise HTTPException(status_code=404, detail="Appraisal not found")
    
    updated_standards = []
    if appraisal.standards:
        for standard in appraisal.standards:
            standard["supervisorRating"] = ratings.get(standard["id"], 0)
            updated_standards.append(standard)
    
    appraisal.standards = updated_standards
    appraisal.status = "Submitted to Principal"
    appraisal.supervisorId = data.get("supervisorId")
    
    db.commit()
    
    return {"success": True, "id": appraisal.id}

@app.post("/walker/generate_tsc_compliance_report")
async def generate_tsc_compliance_report(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    
    teachers = db.query(UserTable).filter(UserTable.role == "teacher").all()
    result = []
    
    for teacher in teachers:
        attendance_records = db.query(AttendanceTable).filter(
            AttendanceTable.teacherId == teacher.id
        ).all()
        total_lessons = sum(a.lessonCount for a in attendance_records) if attendance_records else 0
        avg_attendance = (
            sum(a.completionRate for a in attendance_records) / len(attendance_records)
            if attendance_records else 0
        )
        
        appraisals = db.query(AppraisalTable).filter(
            AppraisalTable.teacherId == teacher.id
        ).all()
        appraisal_score = 0
        if appraisals:
            latest = appraisals[-1]
            if latest.standards and isinstance(latest.standards, list):
                total_rating = sum(s.get("supervisorRating", 0) for s in latest.standards)
                max_rating = len(latest.standards) * 5
                appraisal_score = round((total_rating / max_rating) * 100) if max_rating > 0 else 0
        
        status = "Good Standing"
        if appraisal_score >= 80 and avg_attendance >= 90:
            status = "Promotable"
        elif appraisal_score < 60 or avg_attendance < 70:
            status = "Intervention Needed"
        
        result.append({
            "id": teacher.id,
            "name": teacher.name,
            "tscNumber": teacher.tscNumber or "N/A",
            "department": teacher.department or "General",
            "lessonsTaught": total_lessons,
            "attendanceRate": round(avg_attendance, 1),
            "appraisalScore": appraisal_score,
            "status": status
        })
    
    return result

# ============================================
# COLLABORATION HUB ENDPOINTS
# ============================================

@app.post("/walker/get_shared_lessons")
async def get_shared_lessons(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    level_filter = data.get("levelFilter", "All")
    
    query = db.query(SharedLessonTable)
    if level_filter != "All":
        query = query.filter(SharedLessonTable.levelFilter == level_filter)
    
    lessons = query.order_by(SharedLessonTable.createdAt.desc()).all()
    
    return [{
        "id": l.id,
        "topic": l.topic,
        "subject": l.subject,
        "grade": l.grade,
        "author": l.author,
        "authorId": l.authorId,
        "downloads": l.downloads
    } for l in lessons]

@app.post("/walker/share_lesson")
async def share_lesson(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    lesson = data.get("lesson", {})
    
    new_lesson = SharedLessonTable(
        id=str(uuid.uuid4()),
        topic=lesson.get("topic"),
        subject=lesson.get("subject"),
        grade=lesson.get("grade"),
        author=lesson.get("author"),
        authorId=lesson.get("authorId"),
        levelFilter="Junior" if "7" in lesson.get("grade", "") or "8" in lesson.get("grade", "") else "Senior",
        downloads=0,
        content=lesson,
        createdAt=datetime.now().isoformat()
    )
    
    db.add(new_lesson)
    db.commit()
    db.refresh(new_lesson)
    
    return {
        "id": new_lesson.id,
        "topic": new_lesson.topic,
        "subject": new_lesson.subject,
        "grade": new_lesson.grade,
        "author": new_lesson.author,
        "downloads": new_lesson.downloads
    }

@app.post("/walker/get_co_teaching_sessions")
async def get_co_teaching_sessions(request: Request, db: Session = Depends(get_db)):
    sessions = db.query(CoTeachingTable).order_by(CoTeachingTable.date.desc()).all()
    
    return [{
        "id": s.id,
        "topic": s.topic,
        "partnerTeacher": s.partnerTeacher,
        "date": s.date,
        "strategy": s.strategy,
        "status": s.status
    } for s in sessions]

@app.post("/walker/create_co_teaching_session")
async def create_co_teaching_session(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    
    new_session = CoTeachingTable(
        id=str(uuid.uuid4()),
        teacherId=data.get("teacherId"),
        teacherName=data.get("teacherName"),
        partnerTeacher=data.get("partner"),
        topic=data.get("topic"),
        date=data.get("date"),
        strategy=data.get("strategy"),
        status="Planned"
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return {
        "id": new_session.id,
        "topic": new_session.topic,
        "partnerTeacher": new_session.partnerTeacher,
        "date": new_session.date,
        "strategy": new_session.strategy,
        "status": new_session.status
    }

@app.post("/walker/get_resource_bookings")
async def get_resource_bookings(request: Request, db: Session = Depends(get_db)):
    bookings = db.query(ResourceBookingTable).order_by(ResourceBookingTable.date.desc()).all()
    
    return [{
        "id": b.id,
        "resource": b.resource,
        "date": b.date,
        "timeSlot": b.timeSlot,
        "bookedBy": b.bookedBy
    } for b in bookings]

@app.post("/walker/create_resource_booking")
async def create_resource_booking(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    
    new_booking = ResourceBookingTable(
        id=str(uuid.uuid4()),
        resource=data.get("resource"),
        date=data.get("date"),
        timeSlot=data.get("time"),
        bookedBy=data.get("bookedBy"),
        bookedById=data.get("bookedById")
    )
    
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    
    return {
        "id": new_booking.id,
        "resource": new_booking.resource,
        "date": new_booking.date,
        "timeSlot": new_booking.timeSlot,
        "bookedBy": new_booking.bookedBy
    }

# ============================================
# ATTENDANCE TRACKING ENDPOINTS
# ============================================

@app.post("/walker/get_teacher_attendance_logs")
async def get_teacher_attendance_logs(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    teacher_id = data.get("teacherId")
    limit = data.get("limit", 20)
    
    sessions = db.query(AttendanceSessionTable).filter(
        AttendanceSessionTable.teacherId == teacher_id
    ).order_by(AttendanceSessionTable.clockIn.desc()).limit(limit).all()
    
    return [{
        "id": s.id,
        "teacherId": s.teacherId,
        "teacherName": s.teacherName,
        "date": s.date,
        "clockIn": s.clockIn,
        "clockInTime": s.clockInTime,
        "clockOut": s.clockOut,
        "clockOutTime": s.clockOutTime,
        "subject": s.subject,
        "class": s.class_,
        "period": s.period,
        "topic": s.topic,
        "duration": s.duration,
        "durationMinutes": s.durationMinutes,
        "active": s.active
    } for s in sessions]

@app.post("/walker/get_active_session")
async def get_active_session(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    teacher_id = data.get("teacherId")
    
    session = db.query(AttendanceSessionTable).filter(
        AttendanceSessionTable.teacherId == teacher_id,
        AttendanceSessionTable.active == 1
    ).first()
    
    if session:
        return {
            "active": True,
            "session": {
                "id": session.id,
                "teacherId": session.teacherId,
                "teacherName": session.teacherName,
                "date": session.date,
                "clockIn": session.clockIn,
                "clockInTime": session.clockInTime,
                "subject": session.subject,
                "class": session.class_,
                "period": session.period,
                "topic": session.topic
            }
        }
    
    return {"active": False, "session": None}

@app.post("/walker/clock_in_teacher")
async def clock_in_teacher(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    
    existing = db.query(AttendanceSessionTable).filter(
        AttendanceSessionTable.teacherId == data.get("teacherId"),
        AttendanceSessionTable.active == 1
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Teacher already has an active session")
    
    session = AttendanceSessionTable(
        id=data.get("id", str(uuid.uuid4())),
        userId=data.get("userId"),
        teacherId=data.get("teacherId"),
        teacherName=data.get("teacherName"),
        date=data.get("date"),
        clockIn=data.get("clockIn"),
        clockInTime=data.get("clockInTime"),
        subject=data.get("subject"),
        class_=data.get("class"),
        period=data.get("period"),
        topic=data.get("topic"),
        active=1
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {
        "id": session.id,
        "teacherId": session.teacherId,
        "teacherName": session.teacherName,
        "date": session.date,
        "clockIn": session.clockIn,
        "clockInTime": session.clockInTime,
        "subject": session.subject,
        "class": session.class_,
        "period": session.period,
        "topic": session.topic
    }

@app.post("/walker/clock_out_teacher")
async def clock_out_teacher(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    session_id = data.get("sessionId")
    
    session = db.query(AttendanceSessionTable).filter(
        AttendanceSessionTable.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.clockOut = data.get("clockOut")
    session.clockOutTime = data.get("clockOutTime")
    session.duration = data.get("duration")
    session.durationMinutes = data.get("durationMinutes")
    session.active = 0
    
    db.commit()
    db.refresh(session)
    
    attendance_stat = db.query(AttendanceTable).filter(
        AttendanceTable.teacherId == session.teacherId,
        AttendanceTable.date == session.date
    ).first()
    
    if attendance_stat:
        attendance_stat.lessonCount += 1
        attendance_stat.avgDuration = (
            (attendance_stat.avgDuration * (attendance_stat.lessonCount - 1) + session.durationMinutes) 
            / attendance_stat.lessonCount
        )
    else:
        db.add(AttendanceTable(
            id=str(uuid.uuid4()),
            teacherId=session.teacherId,
            date=session.date,
            lessonCount=1,
            completionRate=100.0,
            avgDuration=session.durationMinutes
        ))
    
    db.commit()
    
    return {
        "id": session.id,
        "teacherId": session.teacherId,
        "clockOut": session.clockOut,
        "clockOutTime": session.clockOutTime,
        "duration": session.duration,
        "durationMinutes": session.durationMinutes
    }

# ============================================
# TPAD & DASHBOARD ENDPOINTS
# ============================================

@app.post("/walker/get_daily_summaries")
async def get_daily_summaries_list(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    teacher_id = data.get("teacherId") or data.get("userId")
    
    summaries = db.query(DailySummaryTable).filter(
        DailySummaryTable.teacherId == teacher_id
    ).order_by(DailySummaryTable.date.desc()).limit(20).all()
    
    return [{
        "id": s.id,
        "date": s.date,
        "subject": s.subject,
        "period": s.period,
        "class": s.class_,
        "stream": s.stream,
        "strand": s.strand,
        "objectives": s.objectives,
        "totalStudents": s.totalStudents,
        "presentStudents": s.presentStudents,
        "absentStudents": s.absentStudents,
        "attendanceRate": s.attendanceRate,
        "averageLessonScore": s.averageLessonScore,
        "averageParticipation": s.averageParticipation,
        "teacherId": s.teacherId,
        "teacherName": s.teacherName,
        "lessonId": s.lessonId,
        "startTime": s.startTime,
        "endTime": s.endTime,
        "attendanceRecords": s.attendanceRecords
    } for s in summaries]

@app.post("/walker/save_daily_summary")
async def save_daily_summary(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    
    summary = DailySummaryTable(
        id=data.get("id", str(uuid.uuid4())),
        date=data.get("date"),
        subject=data.get("subject"),
        period=data.get("period"),
        class_=data.get("class"),
        stream=data.get("stream"),
        strand=data.get("strand"),
        objectives=data.get("objectives"),
        totalStudents=data.get("totalStudents"),
        presentStudents=data.get("presentStudents"),
        absentStudents=data.get("absentStudents"),
        attendanceRate=data.get("attendanceRate"),
        averageLessonScore=data.get("averageLessonScore"),
        averageParticipation=data.get("averageParticipation"),
        teacherId=data.get("teacherId"),
        teacherName=data.get("teacherName"),
        lessonId=data.get("lessonId"),
        startTime=data.get("startTime"),
        endTime=data.get("endTime"),
        attendanceRecords=data.get("attendanceRecords", [])
    )
    
    db.add(summary)
    
    attendance_records = data.get("attendanceRecords", [])
    for record in attendance_records:
        student = db.query(StudentTable).filter(
            StudentTable.id == record.get("studentId")
        ).first()
        
        if student:
            current_rate = student.attendanceRate or 100.0
            new_rate = (current_rate + 100) / 2
            student.attendanceRate = round(new_rate, 1)
    
    for student in db.query(StudentTable).all():
        was_present = any(r.get("studentId") == student.id for r in attendance_records)
        if was_present:
            lesson_score = data.get("averageLessonScore", 0)
            current_perf = student.overallPerformance or 0
            new_perf = (current_perf * 0.7) + (lesson_score * 0.3)
            student.overallPerformance = round(new_perf, 1)
    
    teacher_id = data.get("teacherId")
    date = data.get("date")
    
    attendance_stat = db.query(AttendanceTable).filter(
        AttendanceTable.teacherId == teacher_id,
        AttendanceTable.date == date
    ).first()
    
    if attendance_stat:
        attendance_stat.lessonCount += 1
        attendance_stat.completionRate = data.get("attendanceRate", 0)
    else:
        db.add(AttendanceTable(
            id=str(uuid.uuid4()),
            teacherId=teacher_id,
            date=date,
            lessonCount=1,
            completionRate=data.get("attendanceRate", 0),
            avgDuration=40
        ))
    
    db.commit()
    
    return {
        "success": True,
        "id": summary.id,
        "message": "Lesson saved and synced to TPAD"
    }

@app.post("/walker/init_tpad_appraisal")
async def init_tpad_appraisal(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    user_id = data.get("userId") or data.get("teacherId")
    teacher_name = data.get("teacherName")
    tsc_number = data.get("tscNumber")
    appraisal_period = data.get("appraisalPeriod", "2026 - Term One")
    
    teacher = db.query(UserTable).filter(UserTable.id == user_id).first()
    if not teacher:
        teacher = UserTable(
            id=user_id,
            name=teacher_name,
            email=f"{user_id}@school.edu",
            role="teacher",
            tscNumber=tsc_number,
            department="General"
        )
        db.add(teacher)
        db.commit()
        db.refresh(teacher)
    
    existing = db.query(AppraisalTable).filter(
        AppraisalTable.teacherId == user_id,
        AppraisalTable.status.in_(["Draft", "In-Progress"])
    ).first()
    
    if existing:
        return {
            "id": existing.id,
            "teacherId": existing.teacherId,
            "teacherName": existing.teacherName,
            "tscNumber": existing.tscNumber,
            "appraisalPeriod": existing.period,
            "status": existing.status,
            "standards": existing.standards or [],
            "message": "Active appraisal session loaded"
        }
    
    standards = [
        {
            "id": f"std_{uuid.uuid4().hex[:8]}",
            "name": "Professional Knowledge and Understanding",
            "description": "Demonstrates mastery of subject content and pedagogical knowledge",
            "selfRating": 0,
            "supervisorRating": 0,
            "evidence": []
        },
        {
            "id": f"std_{uuid.uuid4().hex[:8]}",
            "name": "Professional Practice",
            "description": "Plans and delivers effective learning experiences",
            "selfRating": 0,
            "supervisorRating": 0,
            "evidence": []
        },
        {
            "id": f"std_{uuid.uuid4().hex[:8]}",
            "name": "Professional Values and Personal Commitment",
            "description": "Demonstrates professional ethics and commitment to learner welfare",
            "selfRating": 0,
            "supervisorRating": 0,
            "evidence": []
        },
        {
            "id": f"std_{uuid.uuid4().hex[:8]}",
            "name": "Professional Development",
            "description": "Engages in continuous professional growth and learning",
            "selfRating": 0,
            "supervisorRating": 0,
            "evidence": []
        },
        {
            "id": f"std_{uuid.uuid4().hex[:8]}",
            "name": "Collaboration and Teamwork",
            "description": "Works effectively with colleagues, parents, and community",
            "selfRating": 0,
            "supervisorRating": 0,
            "evidence": []
        }
    ]
    
    appraisal = AppraisalTable(
        id=str(uuid.uuid4()),
        teacherId=user_id,
        teacherName=teacher.name,
        tscNumber=teacher.tscNumber or tsc_number or "N/A",
        period=appraisal_period,
        status="In-Progress",
        submittedDate=None,
        standards=standards
    )
    
    db.add(appraisal)
    db.commit()
    db.refresh(appraisal)
    
    return {
        "id": appraisal.id,
        "teacherId": appraisal.teacherId,
        "teacherName": appraisal.teacherName,
        "tscNumber": appraisal.tscNumber,
        "appraisalPeriod": appraisal.period,
        "status": appraisal.status,
        "standards": appraisal.standards
    }

@app.post("/walker/fetch_teacher_activities")
async def fetch_teacher_activities(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    user_id = data.get("userId")
    
    sessions = db.query(AttendanceSessionTable).filter(
        AttendanceSessionTable.teacherId == user_id
    ).order_by(AttendanceSessionTable.date.desc()).limit(10).all()
    
    observations = db.query(ObservationTable).filter(
        ObservationTable.teacherId == user_id
    ).order_by(ObservationTable.timestamp.desc()).limit(5).all()
    
    total_lessons = len(sessions)
    completed_lessons = len([s for s in sessions if s.clockOut])
    
    return {
        "totalLessons": total_lessons,
        "completedLessons": completed_lessons,
        "recentSessions": [{
            "subject": s.subject,
            "class": s.class_,
            "date": s.date,
            "duration": s.duration
        } for s in sessions[:5]],
        "observationCount": len(observations),
        "recentObservations": [{
            "type": o.type,
            "date": o.date,
            "supervisor": o.supervisorName
        } for o in observations]
    }

@app.post("/walker/update_tpad_standard")
async def update_tpad_standard(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    session_id = data.get("sessionId")
    standard_id = data.get("standardId")
    rating = data.get("rating")
    evidence = data.get("evidence", "")
    
    appraisal = db.query(AppraisalTable).filter(AppraisalTable.id == session_id).first()
    if not appraisal:
        raise HTTPException(status_code=404, detail="Appraisal session not found")
    
    updated_standards = []
    for std in appraisal.standards:
        if std["id"] == standard_id:
            std["selfRating"] = rating
            std["evidence"] = [evidence] if evidence else []
        updated_standards.append(std)
    
    appraisal.standards = updated_standards
    db.commit()
    db.refresh(appraisal)
    
    return {
        "id": appraisal.id,
        "teacherId": appraisal.teacherId,
        "teacherName": appraisal.teacherName,
        "tscNumber": appraisal.tscNumber,
        "appraisalPeriod": appraisal.period,
        "status": appraisal.status,
        "standards": appraisal.standards
    }

@app.post("/walker/submit_tpad_to_supervisor")
async def submit_tpad_to_supervisor(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    session_id = data.get("sessionId")
    
    appraisal = db.query(AppraisalTable).filter(AppraisalTable.id == session_id).first()
    if not appraisal:
        raise HTTPException(status_code=404, detail="Appraisal not found")
    
    incomplete = [s for s in appraisal.standards if not s.get("selfRating") or s.get("selfRating") == 0]
    if incomplete:
        raise HTTPException(
            status_code=400, 
            detail=f"Please complete ratings for all {len(incomplete)} remaining standards"
        )
    
    appraisal.status = "Submitted to Supervisor"
    appraisal.submittedDate = datetime.now().strftime("%Y-%m-%d")
    
    db.commit()
    db.refresh(appraisal)
    
    return {
        "id": appraisal.id,
        "teacherId": appraisal.teacherId,
        "teacherName": appraisal.teacherName,
        "tscNumber": appraisal.tscNumber,
        "appraisalPeriod": appraisal.period,
        "status": appraisal.status,
        "standards": appraisal.standards,
        "submittedDate": appraisal.submittedDate
    }

@app.post("/walker/get_class_insights")
async def get_class_insights(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    teacher_id = data.get("teacherId") or data.get("userId")
    
    students = db.query(StudentTable).all()
    total_students = len(students)
    
    avg_performance = (
        sum(s.overallPerformance for s in students) / total_students
        if total_students > 0 else 0
    )
    
    avg_attendance = (
        sum(s.attendanceRate for s in students) / total_students
        if total_students > 0 else 0
    )
    
    return {
        "totalStudents": total_students,
        "averagePerformance": round(avg_performance, 1),
        "averageAttendance": round(avg_attendance, 1),
        "activeStudents": total_students
    }

# ============================================
# UTILITY ENDPOINT -  SAMPLE DATA
# ============================================

@app.post("/walker/add_sample_data")
async def add_sample_data(db: Session = Depends(get_db)):
    """Populate database with sample data for testing"""
    
    teachers = db.query(UserTable).filter(UserTable.role == "teacher").all()
    
    # sample students if none exist
    if db.query(StudentTable).count() == 0:
        sample_students = [
            {"id": "student_001", "name": "Alice Mwangi", "admissionNumber": "ADM-2024-001", "grade": "Grade 8", "subjects": ["Mathematics", "Science", "English"], "attendanceRate": 95.0, "overallPerformance": 85.0},
            {"id": "student_002", "name": "Brian Kamau", "admissionNumber": "ADM-2024-002", "grade": "Grade 8", "subjects": ["Mathematics", "Science", "English"], "attendanceRate": 88.0, "overallPerformance": 72.0},
            {"id": "student_003", "name": "Catherine Njeri", "admissionNumber": "ADM-2024-003", "grade": "Grade 8", "subjects": ["Mathematics", "Science", "English"], "attendanceRate": 92.0, "overallPerformance": 78.0},
            {"id": "student_004", "name": "David Ochieng", "admissionNumber": "ADM-2024-004", "grade": "Grade 8", "subjects": ["Mathematics", "Science", "English"], "attendanceRate": 85.0, "overallPerformance": 65.0},
            {"id": "student_005", "name": "Emma Wanjiku", "admissionNumber": "ADM-2024-005", "grade": "Grade 8", "subjects": ["Mathematics", "Science", "English"], "attendanceRate": 90.0, "overallPerformance": 88.0},
            {"id": "student_006", "name": "Felix Otieno", "admissionNumber": "ADM-2024-006", "grade": "Grade 8", "subjects": ["Mathematics", "Science", "English"], "attendanceRate": 78.0, "overallPerformance": 55.0},
            {"id": "student_007", "name": "Grace Akinyi", "admissionNumber": "ADM-2024-007", "grade": "Grade 8", "subjects": ["Mathematics", "Science", "English"], "attendanceRate": 94.0, "overallPerformance": 82.0},
            {"id": "student_008", "name": "Henry Kipchoge", "admissionNumber": "ADM-2024-008", "grade": "Grade 8", "subjects": ["Mathematics", "Science", "English"], "attendanceRate": 87.0, "overallPerformance": 70.0},
        ]
        for s in sample_students:
            db.add(StudentTable(**s))
        db.commit()
    
    # sample attendance
    for teacher in teachers:
        existing = db.query(AttendanceTable).filter(
            AttendanceTable.teacherId == teacher.id
        ).count()
        
        if existing == 0:
            for i in range(5):
                db.add(AttendanceTable(
                    id=str(uuid.uuid4()),
                    teacherId=teacher.id,
                    date=f"2026-01-{15 + i:02d}",
                    lessonCount=4 + (i % 2),
                    completionRate=85.0 + (i * 3),
                    avgDuration=40 + (i * 2)
                ))
    
    # sample attendance sessions
    for teacher in teachers:
        existing = db.query(AttendanceSessionTable).filter(
            AttendanceSessionTable.teacherId == teacher.id
        ).count()
        
        if existing == 0:
            subjects = ["Mathematics", "Science", "English", "Kiswahili"]
            classes = ["Grade 7A", "Grade 8B", "Grade 9C"]
            
            for i in range(3):
                date = f"2026-01-{20 + i:02d}"
                clock_in = f"{date}T08:00:00"
                clock_out = f"{date}T08:40:00"
                
                db.add(AttendanceSessionTable(
                    id=str(uuid.uuid4()),
                    userId=teacher.id,
                    teacherId=teacher.id,
                    teacherName=teacher.name,
                    date=date,
                    clockIn=clock_in,
                    clockInTime="08:00 AM",
                    clockOut=clock_out,
                    clockOutTime="08:40 AM",
                    subject=subjects[i % len(subjects)],
                    class_=classes[i % len(classes)],
                    period=f"Period {i + 1}",
                    topic=f"Sample topic {i + 1}",
                    duration="0h 40m",
                    durationMinutes=40,
                    active=0
                ))
    
    # Sample daily summaries
    for teacher in teachers:
        existing = db.query(DailySummaryTable).filter(
            DailySummaryTable.teacherId == teacher.id
        ).count()
        
        if existing == 0:
            for i in range(3):
                date = f"2026-01-{20 + i:02d}"
                db.add(DailySummaryTable(
                    id=str(uuid.uuid4()),
                    date=date,
                    subject="Mathematics",
                    period=f"Period {i + 1}",
                    class_="Grade 8",
                    stream="A",
                    strand="Algebra",
                    objectives="Solve linear equations",
                    totalStudents=8,
                    presentStudents=7 - (i % 2),
                    absentStudents=1 + (i % 2),
                    attendanceRate=87.5,
                    averageLessonScore=75.0 + (i * 5),
                    averageParticipation=85.0,
                    teacherId=teacher.id,
                    teacherName=teacher.name,
                    lessonId=f"lesson_{uuid.uuid4().hex[:8]}",
                    startTime=f"{date}T08:00:00",
                    endTime=f"{date}T08:40:00",
                    attendanceRecords=[]
                ))
    
    # Add sample appraisals
    for idx, teacher in enumerate(teachers):
        existing = db.query(AppraisalTable).filter(
            AppraisalTable.teacherId == teacher.id
        ).count()
        
        if existing == 0:
            standards = [
                {
                    "id": f"std_{teacher.id}_{i}",
                    "name": f"Standard {i + 1}: Professional Knowledge",
                    "description": f"Demonstrates mastery in {teacher.department}",
                    "selfRating": 3 + (i % 3),
                    "supervisorRating": 0,
                    "evidence": [f"Lesson plans and student performance data for {teacher.department}"]
                }
                for i in range(5)
            ]
            
            db.add(AppraisalTable(
                id=str(uuid.uuid4()),
                teacherId=teacher.id,
                teacherName=teacher.name,
                tscNumber=teacher.tscNumber,
                period="Term 1 2026",
                status="Submitted to Supervisor",
                submittedDate="2026-01-20",
                standards=standards
            ))
    
    db.commit()
    return {
        "success": True,
        "message": "Sample data added successfully",
        "teachers_count": len(teachers),
        "students_count": db.query(StudentTable).count(),
        "attendance_records": db.query(AttendanceTable).count(),
        "attendance_sessions": db.query(AttendanceSessionTable).count(),
        "daily_summaries": db.query(DailySummaryTable).count(),
        "appraisals": db.query(AppraisalTable).count()
    }

# ============================================
# AI-ENHANCED ENDPOINTS
# ============================================

@app.post("/walker/generate_pedagogical_strategy")
async def generate_pedagogical_strategy(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    teacher_id = data.get("teacherId") or data.get("userId")
    
    # Get teacher data
    teacher = db.query(UserTable).filter(UserTable.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    teacher_data = {
        "id": teacher.id,
        "name": teacher.name,
        "department": teacher.department,
        "tscNumber": teacher.tscNumber
    }
    
    # Get summaries and students
    summaries = db.query(DailySummaryTable).filter(
        DailySummaryTable.teacherId == teacher_id
    ).all()
    
    students = db.query(StudentTable).all()
    
    # Generate AI insights
    strategy = await generate_pedagogical_insights(teacher_data, summaries, students)
    
    # Calculate metrics
    total_lessons = len(summaries)
    avg_attendance = sum(s.attendanceRate for s in summaries) / total_lessons if summaries else 0
    avg_performance = sum(s.averageLessonScore for s in summaries) / total_lessons if summaries else 0
    struggling = [s for s in students if (s.overallPerformance or 0) < 50]
    excellent = [s for s in students if (s.overallPerformance or 0) >= 80]
    
    return {
        "strategy": strategy,
        "metrics": {
            "totalLessons": total_lessons,
            "avgAttendance": round(avg_attendance, 1),
            "avgPerformance": round(avg_performance, 1),
            "strugglingCount": len(struggling),
            "excellentCount": len(excellent)
        }
    }


@app.post("/walker/analyze_classroom_performance")
async def analyze_classroom_performance(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    user_id = data.get("userId")
    
    # Get teacher data
    teacher = db.query(UserTable).filter(UserTable.id == user_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    teacher_data = {
        "id": teacher.id,
        "name": teacher.name,
        "department": teacher.department
    }
    
    # Get sessions and observations
    sessions = db.query(AttendanceSessionTable).filter(
        AttendanceSessionTable.teacherId == user_id
    ).all()
    
    observations = db.query(ObservationTable).filter(
        ObservationTable.teacherId == user_id
    ).all()
    
    # Get AI analysis
    analysis = await analyze_classroom_with_ai(teacher_data, sessions, observations)
    
    return analysis


@app.post("/walker/get_weekly_appraisals")
async def get_weekly_appraisals(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    
    teachers = db.query(UserTable).filter(UserTable.role == "teacher").all()
    
    appraisals = []
    for teacher in teachers:
        teacher_data = {
            "id": teacher.id,
            "name": teacher.name,
            "department": teacher.department,
            "tscNumber": teacher.tscNumber
        }
        
        attendance_records = db.query(AttendanceTable).filter(
            AttendanceTable.teacherId == teacher.id
        ).all()
        
        # Generate AI-powered appraisal
        appraisal = await generate_weekly_appraisal_with_ai(teacher_data, attendance_records)
        appraisals.append(appraisal)
    
    return appraisals




if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 50)
    print("🚀 SMACQX School Management API with Gemini AI")
    print("=" * 50)
    print(f"📍 Server: http://0.0.0.0:8000")
    print(f"📊 Database: {DATABASE_URL}")
    print(f"📝 Docs: http://0.0.0.0:8000/docs")
    print(f"🤖 AI Status: {'Enabled' if gemini_model else 'Disabled (set GEMINI_API_KEY)'}")
    print("\n💡 To populate with sample data:")
    print("   curl -X POST http://localhost:8000/walker/add_sample_data")
    print("=" * 50 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)