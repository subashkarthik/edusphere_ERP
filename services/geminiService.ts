import { GoogleGenAI } from "@google/genai";
import { UserRole } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey.trim() === '') return null;
  try {
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.warn("[AI Gateway Warning] Failed to initialize Gemini client:", e);
    return null;
  }
};

export const askCMSAssistant = async (prompt: string, userRole: UserRole) => {
  const ai = getAIClient();
  if (!ai) {
    return "The EduSphere AI Assistant is currently operating in offline mode. Configure the institutional GEMINI_API_KEY to activate live AI tutoring.";
  }

  try {
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

/**
 * AI Feature 2: Assignment Step-by-Step Breakdown
 */
export const explainAssignment = async (title: string, description: string) => {
  const ai = getAIClient();
  if (!ai) {
    return `### 📘 Step-by-Step Assignment Guidance: ${title}\n\n1. **Core Concept**: Read the prompt carefully and review lecture notes.\n2. **Structure**: Outline your solution into Problem Statement, Implementation, and Verification.\n3. **Key Deliverable**: Ensure code repository links and PDF reports are included before deadline.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Break down this university assignment into clear, step-by-step guidance for a student:
      Title: ${title}
      Description: ${description}`,
      config: {
        systemInstruction: "You are an expert university professor breaking down an assignment into actionable steps for a student. Use clear headings and bullet points."
      }
    });
    return response.text || "Guidance generated successfully.";
  } catch (e) {
    return `### 📘 Guidance for ${title}\n- Break the problem down into 3 sub-tasks.\n- Write clear documentation and test your solution.`;
  }
};

/**
 * AI Feature 3: Automatic Quiz Generator for Course Modules
 */
export const generateQuizForModule = async (topic: string) => {
  const ai = getAIClient();
  if (!ai) {
    return [
      {
        question: `What is the primary objective of ${topic}?`,
        options: ["Optimizing system efficiency", "Manual file processing", "Bypassing network security", "Static HTML generation"],
        answer: 0,
        explanation: `${topic} focuses on maximizing computational and institutional performance.`
      },
      {
        question: `Which fundamental principle governs ${topic}?`,
        options: ["Data abstraction and modularity", "Random memory allocation", "Unrestricted global state", "Sequential single-threaded loops"],
        answer: 0,
        explanation: "Modularity ensures scalability and maintainability in complex engineering systems."
      }
    ];
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Generate a 3-question multiple choice quiz on the topic: "${topic}". Return valid JSON array of objects with keys: question, options (array of 4 strings), answer (0-indexed integer), explanation.`,
    });
    
    const text = response.text || "";
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Quiz generation error:", e);
  }

  return [
    {
      question: `Key component of ${topic}?`,
      options: ["System Architecture", "Dummy Fallback", "Unindexed Query", "Manual Override"],
      answer: 0,
      explanation: "Architecture defines structural flow."
    }
  ];
};

/**
 * AI Feature 4: Lecture Notes & Chapter Summarizer
 */
export const summarizeLectureNotes = async (topic: string, textContent: string) => {
  const ai = getAIClient();
  if (!ai) {
    return `### 📝 Summary of ${topic}\n\n- **Key Insight 1**: Core concepts covered in this module establish foundational principles.\n- **Key Insight 2**: Practical implementation requires adherence to standards.\n- **Exam Tip**: Focus on architectural diagrams and algorithmic complexity.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Summarize these university lecture notes on "${topic}" into concise bullet points and key exam tips:\n\n${textContent}`,
    });
    return response.text || "Summary generated successfully.";
  } catch (e) {
    return `### 📝 Key Notes for ${topic}\n- Focus on core algorithms and definitions.`;
  }
};

/**
 * AI Feature 5: Natural Language Course Finder
 */
export const searchCoursesAI = async (query: string, availableCourses: string[]) => {
  const ai = getAIClient();
  if (!ai) {
    const qLower = query.toLowerCase();
    return availableCourses.filter(c => c.toLowerCase().includes(qLower));
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `User search query: "${query}".
      Available courses list: ${JSON.stringify(availableCourses)}.
      Return ONLY a JSON array of course titles from the list that match the user's intent.`,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("AI course search error:", e);
  }

  return availableCourses.filter(c => c.toLowerCase().includes(query.toLowerCase()));
};
