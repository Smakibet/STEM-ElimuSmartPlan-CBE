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
        prompt = f"""Create a comprehensive Kenyan Competency-Based Curriculum (CBE) lesson plan.

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
            model="gemini-2.0-flash",
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
            model="gemini-2.0-flash",
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
            report {"error": "Standardized Lesson Generation Failed"};
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
# ENHANCED VIRTUAL LAB ASSISTANT
# Interactive simulations linked to lesson topics
# ============================================

walker virtual_lab_assistant {
    has query: str;
    has lesson_topic: str = "";
    has interaction_type: str = "chat";  # chat, simulate, visualize, resources
    
    can assist with LessonGraphRoot entry {
        # Find related lesson if topic provided
        related_lesson = None;
        if self.lesson_topic:
            lessons = [n for n in here --> Lesson if self.lesson_topic.lower() in n.topic.lower()];
            if lessons:
                related_lesson = lessons[0];
        
        # Handle different interaction types
        if self.interaction_type == "simulate":
            simulation_response: dict by llm(
                model="gemini-2.0-flash",
                prompt=f"""Create an interactive simulation specification for this science topic.

Topic: {self.lesson_topic or self.query}
Context: {related_lesson.content if related_lesson else "General science"}

Generate a JSON response with:
1. simulation_type: (physics, chemistry, biology, math)
2. title: Clear simulation title
3. description: What the simulation demonstrates
4. variables: List of controllable parameters (name, min, max, default, unit)
5. visualization_type: (canvas, chart, 3d, diagram)
6. instructions: Step-by-step user instructions
7. learning_objectives: What students will learn
8. javascript_code: Simple simulation logic (use canvas/chart.js)

Return only valid JSON.""",
                temperature=0.7,
                response_format={"type": "json_object"}
            );
            
            report {
                "type": "simulation",
                "data": simulation_response,
                "lesson_context": {
                    "topic": related_lesson.topic if related_lesson else self.lesson_topic,
                    "grade": related_lesson.grade if related_lesson else "General"
                }
            };
            
        elif self.interaction_type == "visualize":
            # Generate image prompt
            image_prompt = f"""Educational diagram showing: {self.query}
Topic: {self.lesson_topic}
Style: Clear, labeled, colorful educational illustration
Include: Labels, arrows, key components highlighted""";
            
            visual_response: dict by llm(
                model="gemini-2.0-flash",
                prompt=f"""Create a detailed description for an educational visualization.

Topic: {self.lesson_topic or self.query}
Request: {self.query}

Provide:
1. diagram_description: Detailed description of what to show
2. key_components: List of main elements to highlight
3. labels_needed: Important labels and annotations
4. color_coding: Suggested color scheme for clarity
5. step_by_step: If process-based, show stages

Return as JSON.""",
                temperature=0.7,
                response_format={"type": "json_object"}
            );
            
            report {
                "type": "visualization",
                "data": visual_response,
                "image_prompt": image_prompt
            };
            
        elif self.interaction_type == "resources":
            resources_response: dict by llm(
                model="gemini-2.0-flash",
                prompt=f"""Find educational resources for this topic.

Topic: {self.lesson_topic or self.query}
Grade Level: {related_lesson.grade if related_lesson else "Secondary"}
Country: Kenya (CBE curriculum)

Provide:
1. video_resources: YouTube educational channels/videos (titles and search terms)
2. interactive_sites: Educational websites (PhET, Khan Academy, etc.)
3. local_resources: Kenya-specific educational platforms
4. hands_on_activities: Simple experiments with local materials
5. reading_materials: Suggested textbook chapters or online articles

Return as JSON with realistic, searchable resource names.""",
                temperature=0.7,
                response_format={"type": "json_object"}
            );
            
            report {
                "type": "resources",
                "data": resources_response,
                "lesson_context": {
                    "topic": related_lesson.topic if related_lesson else self.lesson_topic,
                    "subject": related_lesson.subject if related_lesson else "Science"
                }
            };
            
        else:  # chat
            chat_response: str by llm(
                model="gemini-2.0-flash",
                prompt=f"""You are a friendly Virtual Lab Assistant for Kenyan CBE students.

Lesson Topic: {self.lesson_topic or "General Science"}
Student Question: {self.query}
{f"Lesson Context: Grade {related_lesson.grade}, {related_lesson.subject}" if related_lesson else ""}

Provide a helpful response that:
1. Explains concepts simply and clearly
2. Relates to real-world Kenyan examples
3. Suggests safe, age-appropriate experiments
4. Encourages hands-on learning (digital-first when possible)
5. Asks follow-up questions to deepen understanding

Keep response conversational, under 200 words.""",
                temperature=0.7
            );
            
            report {
                "type": "chat",
                "text": chat_response,
                "lesson_context": {
                    "topic": related_lesson.topic if related_lesson else self.lesson_topic,
                    "suggestions": ["Try a simulation", "See a diagram", "Find resources"]
                }
            };
    }
}

# ============================================
# SIMULATION LIBRARY WALKER
# Provides pre-built simulation templates
# ============================================

walker get_simulation_library {
    has subject: str = "all";
    has grade_level: str = "all";
    
    can get_simulations with LessonGraphRoot entry {
        # Define simulation library
        simulations_db = [
            {
                "id": "pendulum",
                "title": "Simple Pendulum",
                "subject": "Physics",
                "topics": ["motion", "energy", "oscillation"],
                "grade_range": ["7", "8", "9"],
                "description": "Explore how length and mass affect pendulum motion"
            },
            {
                "id": "circuit",
                "title": "Electric Circuits",
                "subject": "Physics",
                "topics": ["electricity", "current", "resistance"],
                "grade_range": ["8", "9", "10"],
                "description": "Build and test series and parallel circuits"
            },
            {
                "id": "photosynthesis",
                "title": "Photosynthesis Process",
                "subject": "Biology",
                "topics": ["plants", "energy", "chloroplast"],
                "grade_range": ["7", "8", "9"],
                "description": "See how plants convert light into energy"
            },
            {
                "id": "chemical_reactions",
                "title": "Chemical Reactions",
                "subject": "Chemistry",
                "topics": ["reactions", "acids", "bases"],
                "grade_range": ["8", "9", "10"],
                "description": "Mix virtual chemicals and observe reactions"
            },
            {
                "id": "water_cycle",
                "title": "Water Cycle",
                "subject": "Science",
                "topics": ["weather", "water", "climate"],
                "grade_range": ["5", "6", "7"],
                "description": "Interactive water cycle demonstration"
            },
            {
                "id": "fractions",
                "title": "Fraction Explorer",
                "subject": "Mathematics",
                "topics": ["fractions", "division", "parts"],
                "grade_range": ["4", "5", "6"],
                "description": "Visual fraction manipulation and comparison"
            }
        ];
        
        # Filter simulations
        filtered = simulations_db;
        if self.subject != "all":
            filtered = [s for s in filtered if s['subject'].lower() == self.subject.lower()];
        if self.grade_level != "all":
            filtered = [s for s in filtered if self.grade_level in s['grade_range']];
        
        report {
            "simulations": filtered,
            "total_count": len(filtered)
        };
    }
}

# ============================================
# LOAD SPECIFIC SIMULATION
# Returns full simulation code and config
# ============================================

walker load_simulation {
    has simulation_id: str;
    has custom_params: dict = {};
    
    can load with LessonGraphRoot entry {
        # Generate simulation code based on ID
        code_response: dict by llm(
            model="gemini-2.0-flash",
            prompt=f"""Generate complete JavaScript code for this educational simulation.

Simulation ID: {self.simulation_id}
Custom Parameters: {json.dumps(self.custom_params)}

Requirements:
1. Use HTML5 Canvas or Chart.js for visualization
2. Include interactive controls (sliders, buttons)
3. Real-time updates when parameters change
4. Clear labels and educational annotations
5. Responsive design
6. Comments explaining the physics/science

Return JSON with:
- html: Complete HTML structure
- css: Styling
- javascript: Full simulation logic
- controls: Array of control elements (type, label, min, max, default)
- instructions: User instructions

Make it work standalone when combined.""",
            temperature=0.5,
            response_format={"type": "json_object"}
        );
        
        report {
            "simulation_id": self.simulation_id,
            "code": code_response,
            "ready": True
        };
    }
}