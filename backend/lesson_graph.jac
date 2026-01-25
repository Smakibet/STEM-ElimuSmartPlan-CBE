node LessonGraphRoot {
    has name;
}

node Teacher {
    has id, name, email, role, tscNumber;
}

node Student {
    has id, name, admissionNumber, grade, subjects, school_level;
}

node Lesson {
    has id;
    has topic;
    has subject;
    has grade;
    has strand;
    has sub_strand;
    has duration;
    has lesson_type;
    has school_level;
    has generated_at;
    
    # Content Fields
    has content: dict = {};
    has key_inquiry_questions: list = [];
    has core_competencies: list = [];
    has values: list = [];
    has materials: list = [];
    has sections: list = [];
    
    # Analysis Fields
    has quality_score: float = 0.0;
    has difficulty_score: float = 0.0;
    has cbc_compliance: float = 0.0;
}

edge knows { has confidence: float = 0.0; }
edge develops { has proficiency_level: float = 0.0; }

# Root node for the graph
 node LessonGraphRoot {
    has name: str = "STEM ElimuSmartPlan Root";
    has initialized_at: str;
}
