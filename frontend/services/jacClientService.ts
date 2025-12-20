import axios from "axios";

// Environment-aware backend URL for Jac Service
const BASE_URL = process.env.VITE_BACKEND_URL || "http://localhost:8000";

/**
 * Jac Client Interface
 * Standardizes communication with the Jac multi-agent backend.
 * Uses the 'spawnWalker' logic where each request triggers a graph traversal.
 */
export const JacClientService = {
    /**
     * Spawns a walker to generate lesson nodes.
     * Maps to: walker planner, generator, and analyzer sequentially.
     */
    spawnGenerationWalker: async (context: {
        grade: string;
        subject: string;
        strand: string;
        sub_strand: string;
        duration: string;
        lesson_type: string;
        school_level: string;
    }) => {
        try {
            const response = await axios.post(`${BASE_URL}/walker/generate_lesson`, context);
            return response.data;
        } catch (error: any) {
            console.error("Jac Client: Walker spawning failed", error);
            throw error;
        }
    },

    /**
     * Spawns a walker to track learner progress on the OSP graph.
     */
    spawnTrackerWalker: async (studentId: string, activityData: any) => {
        try {
            const response = await axios.post(`${BASE_URL}/walker/track_student`, {
                student_id: studentId,
                ...activityData
            });
            return response.data;
        } catch (error: any) {
            console.error("Jac Client: Tracking traversal failed", error);
            throw error;
        }
    },

    /**
     * Virtual Lab Assistant interaction node.
     */
    spawnLabWalker: async (query: string) => {
        try {
            const response = await axios.post(`${BASE_URL}/walker/lab_assistant`, { query });
            return response.data;
        } catch (error: any) {
            console.error("Jac Client: Lab node reached but logic failed", error);
            throw error;
        }
    }
};

// Compatibility export
export const generateCBELesson = async (lessonContext: any) => {
    return JacClientService.spawnGenerationWalker({
        ...lessonContext,
        additional_context: "Focus on Competency-Based Education (CBE) principles."
    });
};