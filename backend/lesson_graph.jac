# Node Definitions
 node Lesson {
    has id: str;
    has topic: str;
    has subject: str;
    has grade: str;
    has strand: str;
    has sub_strand: str;
    has duration: str;
    has lesson_type: str;
    has school_level: str;
    has content: dict = {};
    has difficulty_score: float = 0.5;
    has quality_score: float = 0.0;
    has cbc_compliance: float = 0.0;
    has generated_at: str;
    has key_inquiry_questions: list = [];
    has core_competencies: list = [];
    has values: list = [];
    has materials: list = [];
    has sections: list = [];
}


node Student {
    has id: str;
    has name: str;
    has grade: str;
    has school_level: str;
    has mastery_levels: dict = {};
    has enrolled_at: str;
}


node Competency {
    has id: str;
    has name: str;
    has category: str;
    has description: str;
}


node Strand {
    has id: str;
    has name: str;
    has subject: str;
    has description: str;
}


node SubStrand {
    has id: str;
    has name: str;
    has description: str;
}


node Teacher {
    has id: str;
    has name: str;
    has subjects: list = [];
    has school_level: str;
}


# Edge Definitions
 edge teaches {
    has effectiveness: float = 0.5;
    has last_taught: str;
}


edge requires {
    has importance: float = 0.5;
    has prerequisite: bool = false;
}


edge develops {
    has proficiency_level: float = 0.0;
}


edge knows {
    has confidence: float = 0.5;
    has last_assessed: str;
}


edge belongs_to {
    has order: int = 0;
}


edge created_by {
    has created_at: str;
}


# Root node for the graph
 node LessonGraphRoot {
    has name: str = "STEM ElimuSmartPlan Root";
    has initialized_at: str;
}
