from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.schemas import AIChatRequest, AIChatResponse
from middleware.auth import get_current_user
from config import settings

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])


@router.post("/chat", response_model=AIChatResponse)
async def ai_chat(
    request: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Server-side Gemini AI chat with user context injection.
    The API key is safely stored server-side, never exposed to the client.
    """
    if not settings.GEMINI_API_KEY:
        return AIChatResponse(
            response="⚠️ AI Assistant is not configured. Please set GEMINI_API_KEY in the server .env file."
        )

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        system_instruction = f"""You are the EduSphere AI Assistant — an intelligent helper for the Universal University LMS System.

Current User Context:
- Name: {current_user.name}
- Role: {current_user.role.value}
- Department: {current_user.department.name if current_user.department else 'Not assigned'}
- Email: {current_user.email}

Based on the user's role, provide targeted assistance:
- STUDENTS: Help with attendance status, upcoming exams, course summaries, study tips, and placement preparation.
- FACULTY: Help with grading summaries, timetable scheduling, curriculum planning, and student performance insights.
- ADMINS: Provide institutional insights, enrollment data summaries, financial reports, and administrative guidance.

Keep answers professional, concise, and helpful. Use Markdown for formatting when appropriate."""

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=request.message,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
            ),
        )

        return AIChatResponse(response=response.text or "I couldn't generate a response. Please try again.")

    except Exception as e:
        print(f"Gemini API Error: {e}")
        return AIChatResponse(
            response="I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again shortly."
        )
