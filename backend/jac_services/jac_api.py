from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import os

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Gemini setup
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY missing")

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-pro")

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
JAC_FILE = os.path.join(BASE_DIR, "jaseci", "lesson_master.jac")


class LessonRequest(BaseModel):
    schoolLevel: str
    gradeLevel: str
    lessonType: str
    subject: str
    strand: str
    subStrand: str
    resources: str


@app.post("/generate-lesson")
def generate_lesson(data: LessonRequest):
    try:
        # Gemini lesson generation
        prompt = f"""
You are a Kenyan CBC STEM teacher.

Generate a {data.lessonType} lesson plan for:
School Level: {data.schoolLevel}
Grade: {data.gradeLevel}
Subject: {data.subject}
Strand: {data.strand}
Sub-Strand: {data.subStrand}
Available Resources: {data.resources}

Follow CBC format:
- Learning Outcomes
- Introduction
- Learner Activities
- Assessment
- Core Competencies
- Values
"""

        ai_response = model.generate_content(prompt).text

        # Jaseci CBC structuring
        jac_cmd = [
            "jac",
            "run",
            JAC_FILE,
            "-walk=generate_lesson",
            f"-ctx={{"
            f"\"subject\":\"{data.subject}\","
            f"\"grade\":\"{data.gradeLevel}\","
            f"\"strand\":\"{data.strand}\","
            f"\"sub_strand\":\"{data.subStrand}\""
            f"}}",
        ]

        jac_result = subprocess.run(
            jac_cmd,
            capture_output=True,
            text=True,
            cwd=BASE_DIR
        )

        return {
            "aiLesson": ai_response,
            "cbcMeta": jac_result.stdout
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
