const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface SpawnRequest {
    walker: string;
    data: any;
}

interface SpawnResponse {
    success: boolean;
    data?: any;
    error?: string;
}

/**
 * Generic spawn function to call Jac walkers
 */
async function spawn(request: SpawnRequest): Promise<any> {
    try {
        const response = await fetch(`${BACKEND_URL}/walker/${request.walker}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request.data),
        });

        const result: SpawnResponse = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Walker execution failed');
        }

        return result.data;
    } catch (error) {
        console.error(`Error spawning walker ${request.walker}:`, error);
        throw error;
    }
}

/**
 * Generate STEM CBC Lesson using Jac Client
 
 */
export const generateCBELesson = async (
    grade: string,
    subject: string,
    strand: string,
    subStrand: string,
    duration: string,
    lessonType: string,
    additionalContext: string,
    resources: string,
    schoolLevel: 'Junior' | 'Senior'
): Promise<any> => {
    try {
        const result = await spawn({
            walker: 'generate_lesson',
            data: {
                grade,
                subject,
                strand,
                sub_strand: subStrand,
                duration,
                lesson_type: lessonType,
                school_level: schoolLevel,
                additional_context: additionalContext,
                resources,
            },
        });

        // Agent 1 (Planner) → Agent 2 (Generator) → Agent 3 (Analyzer)
        return result;
    } catch (error) {
        console.error('Error generating lesson via Jac Client:', error);
        throw error;
    }
};


//Track Student Progress using OSP Graph
export const trackStudentProgress = async (studentId: string): Promise<any> => {
    try {
        const result = await spawn({
            walker: 'track_progress',
            data: {
                student_id: studentId,
            },
        });

        return result;
    } catch (error) {
        console.error('Error tracking progress:', error);
        throw error;
    }
};

/**
 * Get Lesson using OSP Graph
 * graph-based reasoning
 */
export const recommendLessons = async (
    studentId: string,
    subject: string
): Promise<any> => {
    try {
        const result = await spawn({
            walker: 'recommend_lessons',
            data: {
                student_id: studentId,
                subject,
            },
        });

        return result;
    } catch (error) {
        console.error('Error getting recommendations:', error);
        throw error;
    }
};


//Virtual Lab Assistant using byLLM
export const generateLabExperiment = async (
    query: string
): Promise<{ text: string }> => {
    try {
        const result = await spawn({
            walker: 'lab_assistant',
            data: {
                query,
            },
        });

        return { text: result.text || result };
    } catch (error) {
        console.error('Error in lab assistant:', error);
        return { text: 'Error connecting to the lab assistant.' };
    }
};
/**
 * Generate Lab Image 
 * Returns null for now
 */
export const generateLabImage = async (
    prompt: string
): Promise<string | null> => {
    console.log('generateLabImage called with:', prompt);
    // Image generation not implemented in current backend
    return null;
};
// Export for backward compatibility
export default {
    generateCBELesson,
    trackStudentProgress,
    recommendLessons,
    generateLabExperiment,
};