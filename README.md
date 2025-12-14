STEM ElimuSmartPlan
AI Driven STEM Lesson Planning Platform for Kenya’s Competency Based Education (CBE/CBC)
STEM ElimuSmartPlan is a multi agent AI platform designed to help Kenyan educators generate standardized, CBC aligned STEM lesson plans, analyze lesson quality, and support learners through virtual lab assistance and graph based academic insights.
________________________________________
🚀 Problem Statement
Kenyan teachers face heavy workloads, inconsistent lesson quality, and limited access to digital STEM resources aligned with the CBC framework. Lesson planning and appraisal (TPAD) are time consuming, and personalized learner support is difficult at scale.
________________________________________
💡 Solution Overview
STEM ElimuSmartPlan uses a multi agent AI workflow to automatically:
•	Plan CBC compliant lessons
•	Generate structured lesson content
•	Analyze lesson quality and engagement
•	Provide virtual lab assistance
•	Track and recommend learning progress using graph reasoning
The platform is built with modern web technologies and designed for hackathon demonstration and future scalability.
________________________________________
🧠 Key Features
1. AI Lesson Generation (Multi Agent System)
•	Agent 1 – Planner: Creates structured lesson metadata (grade, subject, strand, duration)
•	Agent 2 – Generator: Generates detailed CBC lesson content using generative AI
•	Agent 3 – Analyzer: Scores lesson quality, CBC compliance, difficulty, and PICRAT level
2. CBC / CBE Alignment
•	Key Inquiry Questions (KIQs)
•	Core Competencies & Values
•	Strand & Sub Strand mapping
•	PICRAT instructional model analysis
3. Virtual Lab Assistant
•	Conversational AI for STEM experiments
•	Safe, age appropriate, CBC aligned explanations
•	Supports Biology, Chemistry, Physics, and General Science
4. OSP Graph Based Reasoning
•	Lesson graph storage (nodes & relationships)
•	Student progress tracking
•	Competency weakness detection
•	Intelligent lesson recommendations
5. Teacher Focused Design
•	Standardized lesson outputs
•	Reduces planning time
•	Improves lesson quality consistency
•	Hackathon friendly demo flow
________________________________________
🏗️ System Architecture
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
🛠️ Tech Stack
Frontend
•	React + TypeScript
•	Vite
•	Tailwind CSS
Backend
•	FastAPI (Python)
•	Multi Agent Orchestration Logic
•	Google Gemini (LLM)
AI / Intelligence
•	Large Language Models (LLM)
•	Prompt engineered CBC lesson generation
•	Quality scoring & educational analytics
________________________________________
⚙️ Setup Instructions
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
uvicorn main:app --reload/python.main.py
3. Frontend Setup
cd frontend
npm install
npm run dev
