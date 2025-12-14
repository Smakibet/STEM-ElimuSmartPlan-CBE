import:py from datetime import datetime;
import:py import json;
import:jac from lesson_graph;

# ============================================
# AGENT 1: LESSON PLANNER AGENT
# creates lesson structure
# ============================================

walker lesson_planner_agent {
    has grade: str;
    has subject: str;
    has strand: str;
    has sub_strand: str;
    has duration: str;
    has lesson_type: str;
    has school_level: str;
    has additional_context: str;
    has resources: str;
    
    can plan with LessonGraphRoot entry {
        # Create lesson node structure
        lesson_id = f"{self.subject}_{self.grade}_{datetime.now().timestamp()}";
        
        # Create new lesson node
        lesson_node = Lesson(
            id=lesson_id,
            topic=self.sub_strand,
            subject=self.subject,
            grade=self.grade,
            strand=self.strand,
            sub_strand=self.sub_strand,
            duration=self.duration,
            lesson_type=self.lesson_type,
            school_level=self.school_level,
            generated_at=datetime.now().isoformat()
        );
        
        here ++> lesson_node;
        
        # Spawn content generator agent
        visit lesson_node spawn content_generator_agent(
            grade=self.grade,
            subject=self.subject,
            strand=self.strand,
            sub_strand=self.sub_strand,
            duration=self.duration,
            lesson_type=self.lesson_type,
            school_level=self.school_level,
            additional_context=self.additional_context,
            resources=self.resources
        );
        
        report {"status": "planned", "lesson_id": lesson_id};
    }
}

# ============================================
# AGENT 2: CONTENT GENERATOR AGENT
# Uses byLLM to generate lesson content
# ============================================

walker content_generator_agent {
    has grade: str;
    has subject: str;
    has strand: str;
    has sub_strand: str;
    has duration: str;
    has lesson_type: str;
    has school_level: str;
    has additional_context: str;
    has resources: str;
    
    can generate with Lesson entry {
        # byLLM GENERATIVE USE - Content Creation
        prompt = f"""Create a comprehensive Kenyan Competency-Based Curriculum (CBC/CBE) lesson plan.

Level: {self.school_level} School
Grade: {self.grade}
Subject: {self.subject}
Strand: {self.strand}
Sub-Strand: {self.sub_strand}
Duration: {self.duration} ({self.lesson_type})
Available Resources: {self.resources}
Context/Focus: {self.additional_context}

Generate a detailed lesson plan with:
1. Topic title (concise, derived from sub-strand)
2. 2-3 Key Inquiry Questions (KIQs) that drive critical thinking
3. Core Competencies to develop (3-5)
4. Values to instill (2-4)
5. Materials needed (list)
6. Lesson sections with:
   - Title
   - Duration
   - Content description
   - Teacher activities
   - Student activities

Return as valid JSON with keys: topic, keyInquiryQuestions, coreCompetencies, values, materials, sections (array of objects with title, duration, content, teacherActivity, studentActivity)""";
        
        generated_content: dict by llm(
            model="gemini-1.5-pro",
            prompt=prompt,
            temperature=0.7,
            response_format={"type": "json_object"}
        );
        
        # Update lesson node with generated content
        here.content = generated_content;
        here.topic = generated_content.get('topic', self.sub_strand);
        here.key_inquiry_questions = generated_content.get('keyInquiryQuestions', []);
        here.core_competencies = generated_content.get('coreCompetencies', []);
        here.values = generated_content.get('values', []);
        here.materials = generated_content.get('materials', []);
        here.sections = generated_content.get('sections', []);
        
        # Spawn quality analyzer agent
        visit here spawn quality_analyzer_agent();
        
        report {"status": "generated", "content": generated_content};
    }
}

# ============================================
# AGENT 3: QUALITY ANALYZER AGENT
# Uses byLLM 
# ============================================

walker quality_analyzer_agent {
    can analyze with Lesson entry {
        # byLLM ANALYTICAL USE - Quality Assessment
        analysis_prompt = f"""Analyze this CBC lesson plan and provide quality scores:

Subject: {here.subject}
Grade: {here.grade}
Topic: {here.topic}
Strand: {here.strand}

Lesson Content:
{json.dumps(here.content, indent=2)}

Provide scores (0.0 to 1.0) for:
1. difficulty_score - Age-appropriateness for the grade level
2. cbc_compliance - Adherence to CBC framework principles
3. engagement_level - How engaging the activities are
4. picrat_level - PICRAT model classification (Passive/Interactive/Creative + Replacement/Amplification/Transformation)
5. recommendations - List of improvement suggestions

Return as JSON with keys: difficulty_score, cbc_compliance, engagement_level, picrat_level, recommendations""";
        
        quality_analysis: dict by llm(
            model="gemini-1.5-pro",
            prompt=analysis_prompt,
            temperature=0.3,
            response_format={"type": "json_object"}
        );
        
        # Update lesson node with quality scores
        here.difficulty_score = float(quality_analysis.get('difficulty_score', 0.5));
        here.cbc_compliance = float(quality_analysis.get('cbc_compliance', 0.5));
        here.quality_score = (here.difficulty_score + here.cbc_compliance) / 2.0;
        
        # Add PICRAT analysis to content
        if 'picrat_level' in quality_analysis:
            here.content['picratAnalysis'] = {
                'level': quality_analysis['picrat_level'],
                'explanation': quality_analysis.get('recommendations', ['No recommendations'])
            };
        
        report {
            "status": "analyzed",
            "quality_score": here.quality_score,
            "difficulty_score": here.difficulty_score,
            "cbc_compliance": here.cbc_compliance,
            "analysis": quality_analysis
        };
    }
}

# ============================================
# PUBLIC API WALKER: Generate Complete Lesson
# Entry point from Jac Client
# ============================================

walker generate_lesson {
    has grade: str;
    has subject: str;
    has strand: str;
    has sub_strand: str;
    has duration: str;
    has lesson_type: str;
    has school_level: str;
    has additional_context: str = "";
    has resources: str = "Basic classroom materials";
    
    can generate with LessonGraphRoot entry {
        # Start the multi-agent workflow
        planner_result = visit here spawn lesson_planner_agent(
            grade=self.grade,
            subject=self.subject,
            strand=self.strand,
            sub_strand=self.sub_strand,
            duration=self.duration,
            lesson_type=self.lesson_type,
            school_level=self.school_level,
            additional_context=self.additional_context,
            resources=self.resources
        );
        
        # Find the created lesson
        lesson_id = planner_result[0]['lesson_id'];
        lessons = [n for n in here -->  if n.id == lesson_id];
        
        if lessons:
            lesson = lessons[0];
            
            # Return complete lesson data
            report {
                "id": lesson.id,
                "topic": lesson.topic,
                "subject": lesson.subject,
                "grade": lesson.grade,
                "strand": lesson.strand,
                "subStrand": lesson.sub_strand,
                "duration": lesson.duration,
                "lessonType": lesson.lesson_type,
                "schoolLevel": lesson.school_level,
                "keyInquiryQuestions": lesson.key_inquiry_questions,
                "coreCompetencies": lesson.core_competencies,
                "values": lesson.values,
                "materials": lesson.materials,
                "sections": lesson.sections,
                "picratAnalysis": lesson.content.get('picratAnalysis', {}),
                "qualityScore": lesson.quality_score,
                "difficultyScore": lesson.difficulty_score,
                "cbcCompliance": lesson.cbc_compliance,
                "generatedAt": lesson.generated_at
            };
        else:
            report {"error": "Lesson generation failed"};
    }
}

# ============================================
# OSP GRAPH REASONING: Student Progress Tracking
# shows graph traversal and scoring
# ============================================

walker track_student_progress {
    has student_id: str;
    
    can track with LessonGraphRoot entry {
        # Find student in graph
        students = [n for n in here --> if isinstance(n, Student) and n.id == self.student_id];
        
        if students:
            student = students[0];
            
            # Traverse graph to find lessons and competencies
            completed_lessons = [];
            weak_competencies = [];
            
            # Get all lessons connected to student
            for lesson in student --> knows --> Lesson:
                edge_data = student-[knows]->lesson;
                if edge_data and edge_data.confidence > 0.6:
                    completed_lessons.append({
                        "lesson_id": lesson.id,
                        "topic": lesson.topic,
                        "confidence": edge_data.confidence
                    });
            
            # Get competencies that need work
            for comp in student --> develops --> Competency:
                edge_data = student-[develops]->comp;
                if edge_data and edge_data.proficiency_level < 0.5:
                    weak_competencies.append({
                        "competency": comp.name,
                        "proficiency": edge_data.proficiency_level
                    });
            
            report {
                "student_id": student.id,
                "name": student.name,
                "completed_lessons": completed_lessons,
                "weak_competencies": weak_competencies,
                "overall_progress": len(completed_lessons) / 10.0  # Simplified metric
            };
        else:
            report {"error": "Student not found"};
    }
}

# ============================================
# OSP GRAPH REASONING: Lesson Recommendations
# Uses graph structure to recommend next lessons
# ============================================

walker recommend_lessons {
    has student_id: str;
    has subject: str;
    
    can recommend with LessonGraphRoot entry {
        # Find student
        students = [n for n in here --> if isinstance(n, Student) and n.id == self.student_id];
        
        if students:
            student = students[0];
            
            # Get mastery levels
            mastery = student.mastery_levels;
            
            # Find suitable lessons based on graph traversal
            recommendations = [];
            
            for lesson in here --> Lesson:
                if lesson.subject == self.subject:
                    # Check if lesson difficulty matches student level
                    if 0.3 <= lesson.difficulty_score <= 0.7:
                        # Check if student has prerequisites
                        prereq_met = true;
                        for req in lesson <-- requires:
                            if req.prerequisite:
                                prereq_met = false;
                        
                        if prereq_met:
                            recommendations.append({
                                "lesson_id": lesson.id,
                                "topic": lesson.topic,
                                "difficulty": lesson.difficulty_score,
                                "quality": lesson.quality_score
                            });
            
            # Sort by quality and difficulty
            recommendations.sort(key=lambda x: x['quality'], reverse=true);
            
            report {
                "student_id": student.id,
                "subject": self.subject,
                "recommendations": recommendations[:5]  # Top 5
            };
        else:
            report {"error": "Student not found"};
    }
}

# ============================================
# VIRTUAL LAB ASSISTANT
# Conversational AI for science experiments
# ============================================

walker lab_assistant {
    has query: str;
    
    can assist with LessonGraphRoot entry {
        response_text: str by llm(
            model="gemini-1.5-pro",
            prompt=f"""You are a friendly Virtual Lab Assistant for Kenyan students. 
            
Student Query: {self.query}

Provide a helpful, concise response that:
1. Explains scientific concepts simply
2. Suggests safe, age-appropriate experiments (digital-first when possible)
3. Relates to the Kenyan CBC curriculum
4. Encourages curiosity and exploration

Keep the response under 200 words.""",
            temperature=0.7
        );
        
        report {"text": response_text};
    }
}