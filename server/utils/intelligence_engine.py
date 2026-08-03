from sqlalchemy.orm import Session
from models.user import User
from models.academic import Enrollment
from models.attendance import AttendanceLog, AttendanceSession
from models.exam import ExamResult
from models.intelligence import LearningMetric, Recommendation, UserNotification
from datetime import datetime, timedelta

def update_student_intelligence(db: Session, student_id: str):
    """
    Recalculates the Learning Health Score, predicts risks, 
    and generates recommendations for a student.
    """
    # 1. Calculate Attendance Score (30%)
    # Simple logic: average attendance % across all enrolled courses
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student_id).all()
    course_ids = [e.course_id for e in enrollments]
    
    total_percentage = 0
    count = 0
    risk_summary = []

    for course_id in course_ids:
        sessions = db.query(AttendanceSession).filter(AttendanceSession.course_id == course_id).all()
        if not sessions: continue
        
        session_ids = [s.id for s in sessions]
        attended = db.query(AttendanceLog).filter(
            AttendanceLog.student_id == student_id,
            AttendanceLog.session_id.in_(session_ids),
            AttendanceLog.status == "PRESENT"
        ).count()
        
        perc = (attended / len(sessions)) * 100
        total_percentage += perc
        count += 1
        
        # Predictive Logic: Risk if near 75%
        if perc < 75:
            risk_summary.append(f"Low attendance in {course_id} ({perc:.1f}%)")
        elif perc < 80:
            risk_summary.append(f"Attendance warning in {course_id}: {perc:.1f}%")

    attendance_score = (total_percentage / count) if count > 0 else 0

    # 2. Calculate Assessment Score (50%)
    results = db.query(ExamResult).filter(ExamResult.student_id == student_id).all()
    if results:
        avg_marks_perc = sum([(r.marks_obtained / r.exam.max_marks) * 100 for r in results]) / len(results)
    else:
        avg_marks_perc = 0
    
    assessment_score = avg_marks_perc

    # 3. Calculate Activity Score (20%)
    # Placeholder: based on total logs or library activity (simulated here)
    activity_score = 85.0  # Default for demo

    # 4. Unified Learning Health Score
    overall_score = (attendance_score * 0.3) + (assessment_score * 0.5) + (activity_score * 0.2)

    # 5. Determine Risk Level
    risk_level = "NORMAL"
    if overall_score < 60 or any("Low" in r for r in risk_summary):
        risk_level = "CRITICAL"
    elif overall_score < 75 or risk_summary:
        risk_level = "WARNING"

    # 6. Update or Create LearningMetric
    user = db.query(User).filter(User.id == student_id).first()
    if not user: return None
    org_id = user.org_id

    metric = db.query(LearningMetric).filter(LearningMetric.user_id == student_id).first()
    if not metric:
        metric = LearningMetric(user_id=student_id, org_id=org_id)
        db.add(metric)
    
    import json
    # Mock some historical velocity data based on current overall score
    velocity = [
        {"name": "Week 1", "score": max(overall_score - 10, 0)},
        {"name": "Week 2", "score": max(overall_score - 5, 0)},
        {"name": "Week 3", "score": max(overall_score - 8, 0)},
        {"name": "Week 4", "score": max(overall_score - 2, 0)},
        {"name": "Current", "score": overall_score},
    ]

    metric.overall_score = overall_score
    metric.attendance_score = attendance_score
    metric.assessment_score = assessment_score
    metric.activity_score = activity_score
    metric.gpa_proxy = min(9.5, (overall_score / 10) + 0.5) # Simulated GPA
    metric.velocity_json = json.dumps(velocity)
    metric.risk_level = risk_level
    metric.prediction_summary = "; ".join(risk_summary) if risk_summary else "Learning trajectory is stable."
    
    # 7. Generate Recommendations
    db.query(Recommendation).filter(Recommendation.user_id == student_id).delete()
    
    if assessment_score < 70:
        db.add(Recommendation(
            user_id=student_id,
            org_id=org_id,
            type="REVISE",
            priority="HIGH",
            title="Strengthen Foundations",
            message="Your average assessment score is below 70%. We recommend revisiting Module 2 of your weak subjects.",
            link="/courses"
        ))
    
    if attendance_score < 80:
        db.add(Recommendation(
            user_id=student_id,
            org_id=org_id,
            type="ATTEND",
            priority="URGENT",
            title="Attendance Recovery",
            message=f"Your attendance is at {attendance_score:.1f}%. Avoid missing any more classes to stay above the 75% threshold.",
            link="/attendance"
        ))

    # 8. Manage Study Tasks (Planner)
    from models.intelligence import StudyTask
    task_count = db.query(StudyTask).filter(StudyTask.user_id == student_id).count()
    if task_count == 0:
        # Seed initial tasks if none exist
        db.add_all([
            StudyTask(user_id=student_id, org_id=org_id, title="Revise Microservices Patterns", duration="30 min", priority="HIGH", type="REVISION", completed=True),
            StudyTask(user_id=student_id, org_id=org_id, title="Complete Cloud VPC Assignment", duration="1.5 hrs", priority="URGENT", type="PROJECT"),
            StudyTask(user_id=student_id, org_id=org_id, title="Watch Module 4: Distributed DB", duration="45 min", priority="MEDIUM", type="VIDEO"),
        ])

    db.commit()
    return metric
