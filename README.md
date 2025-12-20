# STEM ElimuSmartPlan
AI Driven STEM Lesson Planning Platform for Kenya’s Competency Based Education (CBE)

STEM ElimuSmartPlan is a multi agent AI platform designed to help Kenyan STEM educators/Teachers generate standardized, CBC aligned STEM lesson plans, analyze lesson quality, and support learners through virtual lab assistance and graph based academic insights.

________________________________________
# Problem Statement
Kenyan STEM teachers face heavy workloads, inconsistent lesson quality, and limited access to digital STEM resources aligned with the CBC framework. Lesson planning and appraisal (TPAD) are time consuming, and personalized learner support is difficult at scale.

________________________________________
# Solution Overview
STEM ElimuSmartPlan(SMACQX) uses a multi agent AI workflow to automatically:
•	Plan CBC compliant lessons
•	Generate structured lesson content
•	Analyze lesson quality and engagement
•       Integrates AI Pedagogical Advisor to helps STEM teachers improve student mastery through data-driven 
        instruction
•	Provide virtual lab assistance
•	Track and recommend learning progress using graph reasoning

The platform is built with modern web technologies and designed for demonstration and future scalability.

________________________________________
# Key Features
1. AI Lesson Generation (Multi Agent System)
•	Agent 1 – Planner: Creates structured lesson metadata (Grade, Subject, Strand, Sub-strand & Duration)
•	Agent 2 – Generator: Generates detailed CBC lesson content using generative AI
•	Agent 3 – Analyzer: Scores lesson quality, CBE STEM compliance, difficulty, and PICRAT level
2. CBC / CBE Alignment
•	Key Inquiry Questions (KIQs)
•	Core Competencies & Values
•	Strand & Sub Strand mapping
•	PICRAT instructional model analysis
3. Virtual Lab Assistant
•	Conversational AI for STEM experiments
•	Safe, age appropriate, CBE aligned explanations
•	Supports Biology, Chemistry, Physics, and General Science
4. OSP Graph Based Reasoning
•	Lesson graph storage (nodes & relationships)
•	Student progress tracking
•	Competency weakness detection
•	Intelligent lesson recommendations (Pedagogical Advisor)
5. Teacher Focused Design
•	Standardized lesson outputs in all learing levels country wide
•	Reduces planning time
•	Improves lesson quality consistency

________________________________________
# System Architecture
React (Vite + TypeScript)
        ↓ REST API
FastAPI Backend (Python)
        ↓
Multi Agent Orchestration (Planner → Generator → Analyzer)
        ↓
Gemini LLM (Lesson Content & Analysis)
        ↓
OSP Graph (Lessons, Students, Competencies)

________________________________________
# Tech Stack
Frontend
•	React + TypeScript
•	Vite
•	Tailwind CSS
Backend
•	FastAPI (Python)
•	Multi Agent Orchestration Logic 
•	Google Gemini (byLLM)
AI / Intelligence
•	Large Language Models (LLM)
•	Prompt engineered CBE lesson generation
•	Quality scoring & educational analytics

________________________________________
#  Setup Instructions
1. Clone Repository
git clone 
cd stem-elimusmartplan
2. Backend Setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
Create a .env file:
GOOGLE_API_KEY=your_gemini_api_key_here
Run backend:
uvicorn main:app --reload
3. Frontend Setup
cd frontend
npm install
npm run dev

Developer Kibet Solomon @ Smacqx Technologies.  @smacqxgrade@gmail.com 