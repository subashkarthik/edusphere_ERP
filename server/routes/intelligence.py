from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.intelligence import LearningMetric, Recommendation, UserNotification
from models.user import User
from middleware.auth import get_current_user
from utils.intelligence_engine import update_student_intelligence

router = APIRouter(prefix="/api/intelligence", tags=["Intelligence"])

@router.get("/metrics")
def get_metrics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get learning health metrics and risk predictions."""
    # Force an update for demo purposes
    update_student_intelligence(db, current_user.id)
    
    metric = db.query(LearningMetric).filter(LearningMetric.user_id == current_user.id).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metrics not found")
    
    return metric

@router.get("/recommendations")
def get_recommendations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get personalized learning recommendations."""
    return db.query(Recommendation).filter(Recommendation.user_id == current_user.id, Recommendation.is_active == True).all()

@router.get("/notifications")
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get intelligence alerts."""
    return db.query(UserNotification).filter(UserNotification.user_id == current_user.id).order_by(UserNotification.created_at.desc()).limit(10).all()

@router.post("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(UserNotification).filter(UserNotification.id == notif_id, UserNotification.user_id == current_user.id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "success"}

@router.get("/tasks")
def get_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get AI Study Planner tasks."""
    from models.intelligence import StudyTask
    return db.query(StudyTask).filter(StudyTask.user_id == current_user.id).order_by(StudyTask.created_at.asc()).all()

@router.post("/tasks/{task_id}/toggle")
def toggle_task(task_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Toggle a study task completion status."""
    from models.intelligence import StudyTask
    task = db.query(StudyTask).filter(StudyTask.id == task_id, StudyTask.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.completed = not task.completed
    db.commit()
    return task
