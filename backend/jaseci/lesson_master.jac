walker generate_lesson {
    has subject;
    has grade;
    has strand;
    has sub_strand;

    can start {
        report {
            "cbc_structure": {
                "subject": subject,
                "grade": grade,
                "strand": strand,
                "sub_strand": sub_strand,
                "core_competencies": [
                    "Critical Thinking",
                    "Communication",
                    "Collaboration"
                ],
                "values": [
                    "Responsibility",
                    "Respect"
                ]
            }
        };
    }
}
