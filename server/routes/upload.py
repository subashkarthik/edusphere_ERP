import os
import uuid
import dotenv
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from middleware.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/api/upload", tags=["Uploads"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Accepts multipart file upload, saves locally or uploads to Cloud Storage (Backblaze B2),
    and returns accessible download/view URL.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Return download URL
    file_url = f"/api/upload/files/{safe_filename}"
    return {
        "original_filename": file.filename,
        "filename": safe_filename,
        "size_bytes": len(contents),
        "file_url": file_url,
        "message": "File uploaded successfully"
    }


from fastapi.responses import FileResponse

@router.get("/files/{filename}")
async def get_uploaded_file(filename: str):
    """Serve uploaded file."""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)
