from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
from models.user import User, UserRole
from models.academic import Course, Enrollment, EnrollmentStatus
from models.exam import ExamSchedule, ExamResult, ExamType
from schemas.schemas import ExamScheduleCreate, ExamResultBulkCreate, TranscriptResponse
from middleware.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/exams", tags=["Exams & Results"])


@router.get("/schedules")
def list_exam_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List upcoming exam schedules, filtered by user role."""
    if current_user.role == UserRole.STUDENT:
        enrolled_course_ids = [
            e.course_id for e in db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.status == EnrollmentStatus.ACTIVE,
            ).all()
        ]
        schedules = db.query(ExamSchedule).filter(ExamSchedule.course_id.in_(enrolled_course_ids)).order_by(ExamSchedule.exam_date).all()
    elif current_user.role == UserRole.FACULTY:
        taught_ids = [c.id for c in db.query(Course).filter(Course.faculty_id == current_user.id).all()]
        schedules = db.query(ExamSchedule).filter(ExamSchedule.course_id.in_(taught_ids)).order_by(ExamSchedule.exam_date).all()
    else:
        schedules = db.query(ExamSchedule).order_by(ExamSchedule.exam_date).all()

    return [
        {
            "id": s.id,
            "course_code": s.course.code if s.course else None,
            "course_name": s.course.name if s.course else None,
            "exam_type": s.exam_type.value,
            "title": s.title,
            "exam_date": str(s.exam_date),
            "max_marks": s.max_marks,
            "duration_minutes": s.duration_minutes,
            "venue": s.venue,
        }
        for s in schedules
    ]


@router.post("/schedules")
def create_exam_schedule(
    request: ExamScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY])),
):
    """Create an exam schedule. Admin or Faculty only."""
    course = db.query(Course).filter(Course.id == request.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    try:
        exam_type = ExamType(request.exam_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid exam type: {request.exam_type}")

    schedule = ExamSchedule(
        course_id=request.course_id,
        exam_type=exam_type,
        title=request.title,
        exam_date=datetime.fromisoformat(request.exam_date),
        max_marks=request.max_marks,
        duration_minutes=request.duration_minutes,
        venue=request.venue,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    return {"id": schedule.id, "message": f"Exam '{schedule.title}' scheduled for {course.name}"}


@router.get("/results")
def get_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get exam results for the current student or all (faculty/admin)."""
    if current_user.role == UserRole.STUDENT:
        results = db.query(ExamResult).filter(
            ExamResult.student_id == current_user.id,
            ExamResult.is_published == True,
        ).all()
    else:
        results = db.query(ExamResult).filter(ExamResult.is_published == True).all()

    return [
        {
            "id": r.id,
            "exam_title": r.exam.title if r.exam else None,
            "course_code": r.exam.course.code if r.exam and r.exam.course else None,
            "course_name": r.exam.course.name if r.exam and r.exam.course else None,
            "exam_type": r.exam.exam_type.value if r.exam else None,
            "marks_obtained": r.marks_obtained,
            "max_marks": r.exam.max_marks if r.exam else None,
            "grade": r.grade,
            "remarks": r.remarks,
        }
        for r in results
    ]


@router.post("/results/bulk")
def upload_bulk_results(
    request: ExamResultBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY, UserRole.ADMIN])),
):
    """Upload exam results in batch. Faculty/Admin only."""
    exam = db.query(ExamSchedule).filter(ExamSchedule.id == request.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam schedule not found")

    count = 0
    for r in request.results:
        result = ExamResult(
            exam_id=request.exam_id,
            student_id=r.student_id,
            enrollment_id=r.enrollment_id,
            marks_obtained=r.marks_obtained,
            grade=r.grade or _compute_grade(r.marks_obtained, exam.max_marks),
            remarks=r.remarks,
            is_published=True,
        )
        db.add(result)
        count += 1

    db.commit()
    return {"message": f"Uploaded {count} results for {exam.title}"}


@router.get("/transcripts", response_model=List[TranscriptResponse])
def get_transcripts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get semester-wise transcripts for the current student."""
    student_id = current_user.id
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="Transcripts are only for students")

    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student_id).all()

    # Group by semester
    semester_map = {}
    for e in enrollments:
        sem = e.semester_label
        if sem not in semester_map:
            semester_map[sem] = []
        semester_map[sem].append({
            "course_code": e.course.code if e.course else "",
            "course_name": e.course.name if e.course else "",
            "credits": e.course.credits if e.course else 0,
            "grade": e.grade or "In Progress",
            "gpa_points": e.gpa_points or 0,
        })

    transcripts = []
    for sem, courses in semester_map.items():
        total_credits = sum(c["credits"] for c in courses)
        weighted_sum = sum(c["gpa_points"] * c["credits"] for c in courses if c["gpa_points"])
        sgpa = round(weighted_sum / total_credits, 2) if total_credits > 0 else 0

        transcripts.append(TranscriptResponse(semester=sem, courses=courses, sgpa=sgpa))

    return transcripts


def _compute_grade(marks: float, max_marks: int) -> str:
    """Compute grade based on percentage."""
    pct = (marks / max_marks * 100) if max_marks > 0 else 0
    if pct >= 90:
        return "S"
    elif pct >= 80:
        return "A+"
    elif pct >= 70:
        return "A"
    elif pct >= 60:
        return "B+"
    elif pct >= 50:
        return "B"
    elif pct >= 40:
        return "C"
    else:
        return "F"


# ─── ONLINE QUIZZES & ASSESSMENTS ───
from models.exam import Quiz, QuizQuestion, QuizAttempt
from pydantic import BaseModel, Field

class QuizQuestionCreate(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    explanation: str | None = None
    marks: int = 10

class QuizCreate(BaseModel):
    course_id: str
    title: str
    description: str | None = None
    time_limit_minutes: int = 15
    passing_percentage: float = 60.0
    questions: List[QuizQuestionCreate]

class QuizSubmitSchema(BaseModel):
    answers: dict  # { question_id: "A" | "B" | "C" | "D" }
    tab_switch_violations: int = 0


@router.get("/quizzes")
def list_quizzes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List available online quizzes for user."""
    quizzes = db.query(Quiz).filter(Quiz.is_active == True).all()

    # Get attempts by user
    user_attempts = {
        a.quiz_id: a for a in db.query(QuizAttempt).filter(QuizAttempt.student_id == current_user.id).all()
    }

    result = []
    for q in quizzes:
        attempt = user_attempts.get(q.id)
        result.append({
            "id": q.id,
            "course_id": q.course_id,
            "title": q.title,
            "description": q.description,
            "time_limit_minutes": q.time_limit_minutes,
            "passing_percentage": q.passing_percentage,
            "total_questions": len(q.questions),
            "total_marks": sum(qn.marks for qn in q.questions) or q.total_marks,
            "attempted": attempt is not None,
            "best_score": attempt.score if attempt else None,
            "passed": attempt.passed if attempt else None,
            "created_at": str(q.created_at),
        })

    return result


@router.get("/quizzes/{quiz_id}")
def get_quiz_details(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch quiz details and questions for taking the test."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).order_by(QuizQuestion.order_num).all()

    return {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "time_limit_minutes": quiz.time_limit_minutes,
        "passing_percentage": quiz.passing_percentage,
        "questions": [
            {
                "id": qn.id,
                "question_text": qn.question_text,
                "option_a": qn.option_a,
                "option_b": qn.option_b,
                "option_c": qn.option_c,
                "option_d": qn.option_d,
                "marks": qn.marks,
            }
            for qn in questions
        ]
    }


@router.post("/quizzes")
def create_quiz(
    payload: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY, UserRole.ADMIN])),
):
    """Create a new online quiz with questions. Faculty/Admin only."""
    total_marks = sum(q.marks for q in payload.questions)
    quiz = Quiz(
        course_id=payload.course_id,
        title=payload.title,
        description=payload.description,
        time_limit_minutes=payload.time_limit_minutes,
        passing_percentage=payload.passing_percentage,
        total_marks=total_marks,
        created_by=current_user.id,
        org_id=current_user.org_id
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    for idx, qn in enumerate(payload.questions, start=1):
        question = QuizQuestion(
            quiz_id=quiz.id,
            question_text=qn.question_text,
            option_a=qn.option_a,
            option_b=qn.option_b,
            option_c=qn.option_c,
            option_d=qn.option_d,
            correct_option=qn.correct_option.upper(),
            explanation=qn.explanation,
            marks=qn.marks,
            order_num=idx
        )
        db.add(question)

    db.commit()

    # WebSocket broadcast alert
    try:
        from utils.websocket_manager import manager
        import asyncio
        asyncio.create_task(manager.broadcast_to_institution({
            "type": "NOTIFICATION",
            "title": "New Quiz Published",
            "message": f"Quiz '{quiz.title}' is now live!",
            "category": "QUIZ",
            "target_role": "STUDENT"
        }, current_user.org_id))
    except Exception:
        pass

    return {"message": "Quiz created successfully", "quiz_id": quiz.id}


@router.post("/quizzes/{quiz_id}/submit")
def submit_quiz(
    quiz_id: str,
    payload: QuizSubmitSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit quiz answers, auto-grade, record violations, and return result summary."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
    if not questions:
        raise HTTPException(status_code=400, detail="Quiz has no questions")

    total_questions = len(questions)
    correct_answers = 0
    score = 0.0
    total_marks = sum(q.marks for q in questions) or 100

    review_details = []
    for qn in questions:
        user_choice = payload.answers.get(qn.id, "")
        is_correct = (user_choice.upper() == qn.correct_option.upper())
        if is_correct:
            correct_answers += 1
            score += qn.marks

        review_details.append({
            "question_id": qn.id,
            "question_text": qn.question_text,
            "user_choice": user_choice,
            "correct_option": qn.correct_option,
            "is_correct": is_correct,
            "explanation": qn.explanation
        })

    percentage = round((score / total_marks) * 100, 2) if total_marks > 0 else 0
    passed = percentage >= quiz.passing_percentage

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        student_id=current_user.id,
        score=score,
        percentage=percentage,
        passed=passed,
        total_questions=total_questions,
        correct_answers=correct_answers,
        tab_switch_violations=payload.tab_switch_violations,
        org_id=current_user.org_id
    )
    db.add(attempt)
    db.commit()

    return {
        "message": "Quiz submitted successfully",
        "quiz_title": quiz.title,
        "score": score,
        "total_marks": total_marks,
        "percentage": percentage,
        "passed": passed,
        "correct_answers": correct_answers,
        "total_questions": total_questions,
        "tab_switch_violations": payload.tab_switch_violations,
        "review": review_details
    }

