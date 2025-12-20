import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlan, Student, ClassInsights } from '../../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      model: 'gemini-3-pro-preview',
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
      model: 'gemini-3-pro-preview',
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

export const generateLabExperiment = async (query: string): Promise<{ text: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction: "You are a friendly Virtual Lab Assistant. Explain scientific concepts simply and suggest safe, digital-first experiments or thought experiments. Keep answers concise.",
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A scientific diagram or illustration of: ${prompt}. Clean, educational style, white background.` }]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
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