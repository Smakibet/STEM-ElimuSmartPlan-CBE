import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlan, Student, ClassInsights } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// JAC API Configuration
const JAC_API_BASE_URL = process.env.REACT_APP_JAC_API_URL || 'http://localhost:8000';

const lessonSchema = {
  type: Type.OBJECT,
  properties: {
    strand: { type: Type.STRING },
    subStrand: { type: Type.STRING },
    topic: { type: Type.STRING, description: "A concise title derived from the sub-strand." },
    subject: { type: Type.STRING },
    grade: { type: Type.STRING },
    duration: { type: Type.STRING },
    keyInquiryQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of Key Inquiry Questions (KIQs) that drive the learning and provoke critical thinking."
    },
    coreCompetencies: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    values: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    materials: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          duration: { type: Type.STRING },
          content: { type: Type.STRING },
          teacherActivity: { type: Type.STRING },
          studentActivity: { type: Type.STRING },
        },
        required: ["title", "duration", "content", "teacherActivity", "studentActivity"]
      }
    },
    picratAnalysis: {
      type: Type.OBJECT,
      properties: {
        level: { type: Type.STRING },
        explanation: { type: Type.STRING }
      },
      required: ["level", "explanation"]
    }
  },
  required: ["strand", "subStrand", "topic", "subject", "grade", "duration", "keyInquiryQuestions", "coreCompetencies", "values", "materials", "sections", "picratAnalysis"]
};

/**
 * Generates a targeted pedagogical strategy based on class-wide data from the Jaseci graph.
 */
export const generatePedagogicalStrategy = async (
  insights: ClassInsights,
  students: Student[]
): Promise<string> => {
  const prompt = `
    Analyze the following Kenyan CBE class performance data from our Jaseci learning graph:
    
    COMMON LEARNING GAPS:
    ${insights.commonGaps.map(g => `- ${g.gap}: affecting ${g.percentage}% of the class`).join('\n')}
    
    DECLINING SKILLS (Requires Urgent Attention):
    ${insights.decliningSkills.map(s => `- ${s.skill}: affecting ${s.studentCount} students (${s.students.join(', ')})`).join('\n')}
    
    STUDENT SAMPLE (Recent Performance):
    ${students.slice(0, 5).map(s => `- ${s.name}: ${s.overallPerformance}% avg, Main Gap: ${s.learningGaps[0] || 'None'}`).join('\n')}
    
    TASK:
    Provide a concise, expert 3-step pedagogical strategy for the teacher to implement next week. 
    1. Focus on practical classroom activities.
    2. Suggest a specific peer-mentorship pairing based on the data.
    3. Recommend a digital or lab-based intervention based on PICRAT MODEL.
    
    Tone: Professional, supportive, and strictly aligned with Kenyan CBE standards.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an AI Pedagogical Advisor specialized in the Kenyan Competency-Based Education (CBE). Your advice helps STEM teachers improve student mastery through data-driven instruction.",
        temperature: 0.7,
        topP: 0.95
      }
    });

    return response.text || "Unable to generate a strategy at this time. Please check graph connectivity.";
  } catch (error) {
    console.error("Elimu SmartPlan Insight Error:", error);
    return "The Pedagogical AI is currently offline. Please try again in a few moments.";
  }
};

export const generateCBELesson = async (
  grade: string,
  subject: string,
  strand: string,
  subStrand: string,
  duration: string,
  lessonType: string,
  additionalContext: string,
  resources: string,
  schoolLevel: 'Junior School' | 'Senior School',
  coreCompetencies: string,
  values: string,
  kiqs: string
): Promise<LessonPlan> => {
  const prompt = `
    Create a comprehensive Kenyan Competency-Based Education (CBE) lesson plan.
    
    Level: ${schoolLevel} School
    Grade: ${grade}
    Subject: ${subject}
    Strand: ${strand}
    Sub-Strand: ${subStrand}
    Duration: ${duration} (${lessonType})
    Available Resources: ${resources}
    Additional Context: ${additionalContext}

    CBE PARAMETERS (Incorporate these specific elements if provided, otherwise generate appropriate ones):
    - User Specified Core Competencies: ${coreCompetencies || 'Determine based on strand'}
    - User Specified Values: ${values || 'Determine based on content'}
    - User Specified Key Inquiry Questions: ${kiqs || 'Generate 1-3 probing questions'}

    STRICT STANDARDIZATION RULES:
    1. Content Depth: Ensure the content is strictly appropriate for ${schoolLevel} School, specifically ${grade}. 
    2. Teaching Methodology: Select the best pedagogical approach based on the Available Resources provided.
    3. PICRAT Model: Explicitly analyze the lesson design using the PICRAT model.
    4. Structure: Ensure JSON response adheres to the required schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: lessonSchema,
        systemInstruction: "You are an expert curriculum developer for the Kenyan Ministry of Education, specializing in STEM and Competency-Based Education (CBE). Ensure strict adherence to KICD syllabus standards.",
        temperature: 0.3
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);
    return {
      ...data,
      id: crypto.randomUUID(),
      schoolLevel,
      lessonType,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error generating lesson:", error);
    throw error;
  }
};

// ============================================
// ENHANCED VIRTUAL LAB FUNCTIONS
// These now call JAC walkers for better functionality
// ============================================

/**
 * Virtual Lab Assistant - Chat Mode
 * Calls the virtual_lab_assistant walker with interaction_type='chat'
 */
export const generateLabExperiment = async (
  query: string,
  lessonTopic: string = ''
): Promise<{ text: string; lessonContext?: any }> => {
  try {
    const response = await fetch(`${JAC_API_BASE_URL}/walker/virtual_lab_assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        lesson_topic: lessonTopic,
        interaction_type: 'chat'
      })
    });

    if (!response.ok) {
      throw new Error(`JAC API error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      text: data.text || data.data?.text || 'No response generated',
      lessonContext: data.lesson_context
    };
  } catch (error) {
    console.error('Error calling JAC lab assistant:', error);

    // Fallback to direct Gemini API if JAC is unavailable
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${lessonTopic ? `[Lesson: ${lessonTopic}] ` : ''}${query}`,
        config: {
          systemInstruction: "You are a friendly Virtual Lab Assistant for Kenyan CBE students. Explain scientific concepts simply and suggest safe, digital-first experiments. Keep answers concise and engaging.",
          temperature: 0.7
        }
      });
      return { text: response.text || "I couldn't generate a response right now." };
    } catch (fallbackError) {
      console.error("Fallback error:", fallbackError);
      return { text: "Error connecting to the lab assistant. Please try again." };
    }
  }
};

/**
 * Virtual Lab Assistant - Visualization Mode
 * Calls the virtual_lab_assistant walker with interaction_type='visualize'
 */
export const generateLabImage = async (
  query: string,
  lessonTopic: string = ''
): Promise<string | null> => {
  try {
    const response = await fetch(`${JAC_API_BASE_URL}/walker/virtual_lab_assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        lesson_topic: lessonTopic,
        interaction_type: 'visualize'
      })
    });

    if (!response.ok) {
      throw new Error(`JAC API error! status: ${response.status}`);
    }

    const data = await response.json();

    // If JAC returns an image URL directly
    if (data.image_url) {
      return data.image_url;
    }

    // If JAC returns an image prompt, use it to generate via Gemini
    if (data.image_prompt) {
      try {
        const imageResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: data.image_prompt }]
          }
        });

        for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      } catch (imageError) {
        console.error("Error generating image from prompt:", imageError);
      }
    }

    return null;
  } catch (error) {
    console.error('Error generating lab visualization:', error);

    // Fallback to direct Gemini image generation
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{
            text: `Educational scientific diagram: ${query}. ${lessonTopic ? `Related to: ${lessonTopic}. ` : ''}Clean, labeled, colorful educational illustration with white background.`
          }]
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (fallbackError) {
      console.error("Fallback image generation error:", fallbackError);
      return null;
    }
  }
};

/**
 * Virtual Lab Assistant - Custom Simulation Mode
 * Calls the virtual_lab_assistant walker with interaction_type='simulate'
 */
export const generateCustomSimulation = async (
  query: string,
  lessonTopic: string = ''
): Promise<{ type: string; simulationData: any; lessonContext?: any } | null> => {
  try {
    const response = await fetch(`${JAC_API_BASE_URL}/walker/virtual_lab_assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        lesson_topic: lessonTopic,
        interaction_type: 'simulate'
      })
    });

    if (!response.ok) {
      throw new Error(`JAC API error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      type: data.type || 'simulation',
      simulationData: data.data,
      lessonContext: data.lesson_context
    };
  } catch (error) {
    console.error('Error generating custom simulation:', error);
    return null;
  }
};

/**
 * Virtual Lab Assistant - Resources Mode
 * Calls the virtual_lab_assistant walker with interaction_type='resources'
 */
export const getLabResources = async (
  query: string,
  lessonTopic: string = ''
): Promise<{ type: string; resources: any; lessonContext?: any } | null> => {
  try {
    const response = await fetch(`${JAC_API_BASE_URL}/walker/virtual_lab_assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        lesson_topic: lessonTopic,
        interaction_type: 'resources'
      })
    });

    if (!response.ok) {
      throw new Error(`JAC API error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      type: data.type || 'resources',
      resources: data.data,
      lessonContext: data.lesson_context
    };
  } catch (error) {
    console.error('Error fetching lab resources:', error);
    return null;
  }
};

/**
 * Get Simulation Library
 * Calls the get_simulation_library walker
 */
export const getSimulationLibrary = async (
  subject: string = 'all',
  gradeLevel: string = 'all'
): Promise<{ simulations: any[]; totalCount: number }> => {
  try {
    const response = await fetch(`${JAC_API_BASE_URL}/walker/get_simulation_library`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: subject,
        grade_level: gradeLevel
      })
    });

    if (!response.ok) {
      throw new Error(`JAC API error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      simulations: data.simulations || [],
      totalCount: data.total_count || 0
    };
  } catch (error) {
    console.error('Error fetching simulation library:', error);

    // Return empty library on error
    return {
      simulations: [],
      totalCount: 0
    };
  }
};

/**
 * Load Specific Simulation
 * Calls the load_simulation walker
 */
export const loadSimulation = async (
  simulationId: string,
  customParams: Record<string, any> = {}
): Promise<{ simulationId: string; code: any; ready: boolean } | null> => {
  try {
    const response = await fetch(`${JAC_API_BASE_URL}/walker/load_simulation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        simulation_id: simulationId,
        custom_params: customParams
      })
    });

    if (!response.ok) {
      throw new Error(`JAC API error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      simulationId: data.simulation_id,
      code: data.code,
      ready: data.ready
    };
  } catch (error) {
    console.error('Error loading simulation:', error);
    return null;
  }
};

// ============================================
// EXISTING JAC WALKER FUNCTIONS
// (If you're using JAC for lesson generation too)
// ============================================

/**
 * Generate Lesson via JAC Walker (Alternative to generateCBELesson)
 * Uncomment and use this if you want to use JAC for lesson generation
 */
/*
export const generateLessonViaJAC = async (lessonParams: {
  grade: string;
  subject: string;
  strand: string;
  sub_strand: string;
  duration: string;
  lesson_type: string;
  school_level: string;
  additional_context?: string;
  resources?: string;
}): Promise<LessonPlan> => {
  try {
    const response = await fetch(`${JAC_API_BASE_URL}/walker/generate_lesson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lessonParams)
    });

    if (!response.ok) {
      throw new Error(`JAC API error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating lesson via JAC:', error);
    throw error;
  }
};
*/

/**
 * Track Student Progress via JAC Walker
 */
export const trackStudentProgress = async (studentId: string) => {
  try {
    const response = await fetch(`${JAC_API_BASE_URL}/walker/track_student_progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_id: studentId
      })
    });

    if (!response.ok) {
      throw new Error(`JAC API error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error tracking student progress:', error);
    throw error;
  }
};

/**
 * Get Lesson Recommendations via JAC Walker
 */
export const recommendLessons = async (studentId: string, subject: string) => {
  try {
    const response = await fetch(`${JAC_API_BASE_URL}/walker/recommend_lessons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_id: studentId,
        subject: subject
      })
    });

    if (!response.ok) {
      throw new Error(`JAC API error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting lesson recommendations:', error);
    throw error;
  }
};