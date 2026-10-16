import os
import uuid
import urllib.parse
import dotenv
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models.user import User, UserRole
from models.content import LessonProgress
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/videos", tags=["Videos"])

VIDEO_STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "videos")
os.makedirs(VIDEO_STORAGE_DIR, exist_ok=True)


def get_s3_config():
    dotenv.load_dotenv(override=True)
    bucket = os.getenv("S3_BUCKET_NAME", "edusphere-course-assets")
    region = os.getenv("S3_REGION", "us-east-1")
    cdn_url = os.getenv("S3_CDN_BASE_URL", f"https://{bucket}.s3.{region}.amazonaws.com")
    return bucket, region, cdn_url


class ProgressRecordSchema(BaseModel):
    lesson_id: str
    completed: bool = True


def get_video_path(category: str, course: str, filename: str) -> str:
    """Safely construct the path to a video file, preventing directory traversal."""
    if ".." in category or ".." in course or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid path components.")

    file_path = os.path.join(VIDEO_STORAGE_DIR, category, course, filename)
    if not os.path.abspath(file_path).startswith(os.path.abspath(VIDEO_STORAGE_DIR)):
        raise HTTPException(status_code=400, detail="Invalid path.")
    return file_path


def get_mime_type(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext == '.mp4':
        return 'video/mp4'
    elif ext == '.mkv':
        return 'video/x-matroska'
    elif ext == '.webm':
        return 'video/webm'
    return 'video/mp4'


@router.get("/cloud-status")
def get_cloud_status(current_user: User = Depends(get_current_user)):
    total_files = 0
    total_bytes = 0
    supported_extensions = ('.mp4', '.mkv', '.webm')

    if os.path.exists(VIDEO_STORAGE_DIR):
        for root, _, files in os.walk(VIDEO_STORAGE_DIR):
            for file in files:
                if file.lower().endswith(supported_extensions):
                    total_files += 1
                    total_bytes += os.path.getsize(os.path.join(root, file))

    bucket_name, region, cdn_base_url = get_s3_config()
    is_cloud_configured = bool(os.getenv("AWS_ACCESS_KEY_ID") or os.getenv("S3_CDN_BASE_URL") or os.getenv("S3_BUCKET_NAME"))

    return {
        "cloud_provider": "AWS S3 / Cloudflare R2",
        "bucket_name": bucket_name,
        "region": region,
        "cdn_url": cdn_base_url,
        "is_cloud_active": is_cloud_configured,
        "local_video_count": total_files,
        "local_storage_mb": round(total_bytes / (1024 * 1024), 2),
        "sync_script": "python upload_to_s3.py --bucket " + bucket_name
    }


@router.get("/stream/{category}/{course}/{filename}")
async def stream_video(
    category: str,
    course: str,
    filename: str,
    request: Request,
    quality: Optional[str] = None,
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Direct FileResponse video streaming. Redirects seamlessly to Cloudinary Cloud CDN if local file is absent.
    """
    file_path = get_video_path(category, course, filename)

    if os.path.isfile(file_path):
        return FileResponse(
            file_path,
            media_type=get_mime_type(filename),
            filename=filename,
            content_disposition_type="inline"
        )

    # Stream from Cloudinary Cloud CDN
    from services.cloudinary_service import get_cloudinary_video_url
    cloud_url = get_cloudinary_video_url(category, filename)
    return RedirectResponse(url=cloud_url, status_code=307)


@router.get("/progress")
def get_lesson_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    records = db.query(LessonProgress).filter(
        LessonProgress.user_id == current_user.id,
        LessonProgress.completed == True
    ).all()
    return {"completed_lesson_ids": [r.lesson_id for r in records]}


@router.post("/progress")
def record_lesson_progress(
    payload: ProgressRecordSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rec = db.query(LessonProgress).filter(
        LessonProgress.user_id == current_user.id,
        LessonProgress.lesson_id == payload.lesson_id
    ).first()

    if not rec:
        rec = LessonProgress(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            lesson_id=payload.lesson_id,
            completed=payload.completed,
            completed_at=datetime.utcnow(),
            org_id=current_user.org_id
        )
        db.add(rec)
    else:
        rec.completed = payload.completed
        rec.completed_at = datetime.utcnow()

    db.commit()
    return {"message": "Progress recorded successfully", "lesson_id": payload.lesson_id, "completed": rec.completed}


@router.get("/journey")
def get_video_journey(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns structured course tree for video assets in storage/videos or Cloudinary CDN streams,
    mapping completion progress for the current student.
    """
    completed_ids = set(
        r.lesson_id for r in db.query(LessonProgress).filter(
            LessonProgress.user_id == current_user.id,
            LessonProgress.completed == True
        ).all()
    )

    journey = []
    if os.path.exists(VIDEO_STORAGE_DIR):
        try:
            categories = [d for d in os.listdir(VIDEO_STORAGE_DIR) if os.path.isdir(os.path.join(VIDEO_STORAGE_DIR, d))]
        except Exception:
            categories = []

        for category in categories:
            cat_path = os.path.join(VIDEO_STORAGE_DIR, category)
            try:
                courses = [d for d in os.listdir(cat_path) if os.path.isdir(os.path.join(cat_path, d))]
            except Exception:
                continue

            category_data = {
                "id": category,
                "title": category,
                "courses": []
            }

            for course in courses:
                course_path = os.path.join(cat_path, course)
                try:
                    video_files = [f for f in os.listdir(course_path) if f.lower().endswith(('.mp4', '.mkv', '.webm'))]
                except Exception:
                    continue

                lessons = []
                for vf in video_files:
                    c_enc = urllib.parse.quote(category)
                    co_enc = urllib.parse.quote(course)
                    f_enc = urllib.parse.quote(vf)

                    content_url = f"/api/videos/stream/{c_enc}/{co_enc}/{f_enc}"
                    lesson_id = f"{category}-{course}-{vf}"

                    lessons.append({
                        "id": lesson_id,
                        "title": vf.replace('.mp4', '').replace('.mkv', '').replace('.webm', '').replace('vidssave.com', '').strip(),
                        "type": "video",
                        "duration": "Video Lesson",
                        "isCompleted": lesson_id in completed_ids,
                        "contentUrl": content_url
                    })

                category_data["courses"].append({
                    "id": f"{category}-{course}",
                    "title": course,
                    "lessons": lessons
                })

            if category_data["courses"]:
                journey.append(category_data)
    return journey
