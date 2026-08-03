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

    if not journey:
        default_journey = [
            {
                "id": "cat1",
                "title": "Semester 1: C Programming Masterclass",
                "courses": [
                    {
                        "id": "c1",
                        "title": "C Programming Fundamentals",
                        "lessons": [
                            { "id": "c-l1", "title": "1. Getting Started with C Programming", "type": "video", "duration": "12:45", "isCompleted": "c-l1" in completed_ids, "contentUrl": "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711172/vidssave.com_1__Getting_Started_with_C_Programming_2025___C_Programming_for_Beginners_1080P_p4zh7l.mp4" },
                            { "id": "c-l2", "title": "2. C Variables and Print Output", "type": "video", "duration": "15:30", "isCompleted": "c-l2" in completed_ids, "contentUrl": "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711662/vidssave.com_2__C_Variables_and_Print_Output___2025_C_Programming_for_Beginners_1080P_zvbax2.mp4" },
                            { "id": "c-l3", "title": "3. Get User Input in C Programming", "type": "video", "duration": "10:15", "isCompleted": "c-l3" in completed_ids, "contentUrl": "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711316/vidssave.com_4__Get_User_Input_in_C_Programming_1080P_k3ca6n.mp4" },
                            { "id": "c-l4", "title": "4. Type Conversion in C (Implicit & Explicit)", "type": "video", "duration": "14:20", "isCompleted": "c-l4" in completed_ids, "contentUrl": "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711479/vidssave.com_7__Type_Conversion_in_C___Implicit_and_Explicit_Type_Conversion_1080P_d9tobz.mp4" }
                        ]
                    }
                ]
            },
            {
                "id": "cat2",
                "title": "Semester 2: Java Programming & OOP Architecture",
                "courses": [
                    {
                        "id": "c2",
                        "title": "Java Core & Object Oriented Programming",
                        "lessons": [
                            { "id": "java-l1", "title": "1. Java Development Kit (JDK) Setup", "type": "video", "duration": "08:50", "isCompleted": "java-l1" in completed_ids, "contentUrl": "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711546/vidssave.com_2_Java_Development_Kit_JDK_Setup_1080P_lzfrg0.mp4" },
                            { "id": "java-l2", "title": "2. First Code in Java", "type": "video", "duration": "11:10", "isCompleted": "java-l2" in completed_ids, "contentUrl": "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711745/vidssave.com_3_First_Code_in_Java_1080P_u6v7fr.mp4" },
                            { "id": "java-l3", "title": "3. How Java Works (JVM, JRE & Bytecode)", "type": "video", "duration": "13:40", "isCompleted": "java-l3" in completed_ids, "contentUrl": "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711883/vidssave.com_4_How_Java_Works_1080P_eril9s.mp4" },
                            { "id": "java-l4", "title": "4. Variables & Data Types in Java", "type": "video", "duration": "16:05", "isCompleted": "java-l4" in completed_ids, "contentUrl": "https://res.cloudinary.com/ducisa7vu/video/upload/v1785712079/vidssave.com_5_Variables_in_Java_1080P_ugfhwt.mp4" }
                        ]
                    }
                ]
            }
        ]
        return default_journey

    return journey
