import { GoogleGenAI } from "@google/genai";
import { UserRole } from "../types";

export const askCMSAssistant = async (prompt: string, userRole: UserRole) => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey.trim() === '') {
    return "The EduSphere AI is currently in offline mode. Please contact your system administrator to configure the institutional AI gateway (API Key missing).";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ 
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are the EduSphere AI Assistant. 
        Your goal is to assist users based on their role: ${userRole}.
        - For STUDENTS: Help with attendance status, upcoming exams, course summaries, and placement tips.
        - For FACULTY: Help with grading summaries, timetable scheduling, and curriculum planning.
        - For ADMINS: Provide institutional insights, enrollment data summaries, and administrative help.
        Keep answers professional, concise, and helpful. Use Markdown for formatting.`,
      }
    });

    return response.text || "No response received from AI model.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again shortly.";
  }
};