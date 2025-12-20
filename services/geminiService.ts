

import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlan, Student, ClassInsights } from '../frontend/types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    3. Recommend a digital or lab-based intervention.
    
    Tone: Professional, supportive, and strictly aligned with Kenyan CBE/CBC standards.
  `;

  try {
    // Complex reasoning tasks use gemini-3-flash-preview
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an AI Pedagogical Advisor specialized in the Kenyan Competency-Based Curriculum (CBC). Your advice helps STEM teachers improve student mastery through data-driven instruction.",
        temperature: 0.7,
        topP: 0.95
      }
    });

    return response.text || "Unable to generate a strategy at this time. Please check graph connectivity.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "The Pedagogical AI is currently offline. Please try again in a few moments.";
  }
};

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
      description: "List of Key Inquiry Questions (KIQs)."
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
): Promise<LessonPlan> => {
  const prompt = `
    Create a comprehensive Kenyan Competency-Based Curriculum (CBC/CBE) lesson plan.
    Level: ${schoolLevel} School
    Grade: ${grade}
    Subject: ${subject}
    Strand: ${strand}
    Sub-Strand: ${subStrand}
    Duration: ${duration} (${lessonType})
    Available Resources: ${resources}
    Context/Focus: ${additionalContext}
  `;

  try {
    // Upgraded complex curriculum planning to gemini-3-flash-preview
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: lessonSchema,
        systemInstruction: "You are an expert curriculum developer for the Kenyan Ministry of Education.",
        temperature: 0.3
      }
    });

    const data = JSON.parse(response.text || '{}');
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

export const generateLabExperiment = async (query: string): Promise<{ text: string }> => {
  try {
    // Basic text tasks use gemini-3-flash-preview
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction: "You are a friendly Virtual Lab Assistant.",
      }
    });
    return { text: response.text || "I couldn't generate an experiment right now." };
  } catch (error) {
    console.error("Error in lab chat:", error);
    return { text: "Error connecting to the lab assistant." };
  }
};

export const generateLabImage = async (prompt: string): Promise<string | null> => {
  try {
    // Image generation tasks use gemini-2.5-flash-image
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A scientific diagram of: ${prompt}. Clean style.` }]
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating lab image:", error);
    return null;
  }
};
