from sqlalchemy.orm import Session
from database import SessionLocal
from models.user import User, UserRole
from models.academic import Enrollment, Course
from models.attendance import AttendanceLog, AttendanceStatus, AttendanceSession
from models.content import Submission, AssignmentStatus
from models.intelligence import LearningMetric
from datetime import datetime

def compute_learning_scores(db: Session, user_id: str):
    """Computes and updates the Learning Health Score for a student."""
    
    # 1. Attendance Score
    total_logs = db.query(AttendanceLog).filter(AttendanceLog.student_id == user_id).count()
    present_logs = db.query(AttendanceLog).filter(
        AttendanceLog.student_id == user_id, 
        AttendanceLog.status == AttendanceStatus.PRESENT
    ).count()
    
    attendance_score = (present_logs / total_logs * 100) if total_logs > 0 else 100.0
    
    # 2. Assessment Score
    submissions = db.query(Submission).filter(
        Submission.student_id == user_id,
        Submission.status == AssignmentStatus.GRADED
    ).all()
    
    if submissions:
        total_obtained = sum([s.marks_obtained for s in submissions if s.marks_obtained is not None])
        total_max = sum([s.assignment.max_marks for s in submissions if s.assignment and s.marks_obtained is not None])
        assessment_score = (total_obtained / total_max * 100) if total_max > 0 else 100.0
    else:
        assessment_score = 100.0
        
    # 3. Overall Score
    overall_score = (attendance_score * 0.4) + (assessment_score * 0.6)
    
    # Risk Assessment
    risk_level = "NORMAL"
    if overall_score < 60:
        risk_level = "CRITICAL"
    elif overall_score < 75:
        risk_level = "WARNING"
        
    # Update or Create Metric
    metric = db.query(LearningMetric).filter(LearningMetric.user_id == user_id).first()
    if not metric:
        metric = LearningMetric(user_id=user_id)
        db.add(metric)
        
    metric.attendance_score = attendance_score
    metric.assessment_score = assessment_score
    metric.overall_score = overall_score
    metric.risk_level = risk_level
    metric.prediction_summary = f"System computed health score: {overall_score:.1f}/100"
    metric.updated_at = datetime.utcnow()
    
    db.commit()

def run_analytics_job():
    """Background job that computes scores for all active students."""
    print(f"[{datetime.utcnow()}] Running background analytics job...")
    db = SessionLocal()
    try:
        students = db.query(User).filter(User.role == UserRole.STUDENT, User.is_active == True).all()
        for student in students:
            compute_learning_scores(db, student.id)
        print(f"[{datetime.utcnow()}] Analytics job completed successfully for {len(students)} students.")
    except Exception as e:
        print(f"[{datetime.utcnow()}] Analytics job failed: {e}")
    finally:
        db.close()
