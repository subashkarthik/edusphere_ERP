import os
import uuid
import hmac
import hashlib
import time
from typing import Optional
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query, Request
from fastapi.responses import FileResponse
from config import settings
from middleware.auth import get_current_user, get_current_user_from_token
from models.user import User

router = APIRouter(prefix="/api/upload", tags=["Uploads"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Strict extension whitelist for college assignments and submissions
ALLOWED_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".csv", ".zip", ".mp4"
}

# Explicitly forbidden executable and active content extensions
FORBIDDEN_EXTENSIONS = {
    ".exe", ".html", ".htm", ".js", ".mjs", ".bat", ".cmd",
    ".sh", ".php", ".py", ".msi", ".dll", ".vbs", ".apk",
    ".bin", ".scr", ".com", ".pif", ".jar", ".ps1", ".svg"
}

# 25 MB max file upload size
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024


def generate_signed_file_url(filename: str, expires_in_seconds: int = 3600) -> str:
    """Generate a tamper-proof HMAC-SHA256 signed expiring URL for private file access."""
    expires_at = int(time.time()) + expires_in_seconds
    secret = (settings.JWT_SECRET_KEY or "edusphere-private-storage-key").encode()
    message = f"{filename}:{expires_at}".encode()
    sig = hmac.new(secret, message, hashlib.sha256).hexdigest()[:32]
    return f"/api/upload/files/{filename}?expires={expires_at}&sig={sig}"


def verify_signed_file_token(filename: str, expires: Optional[int], sig: Optional[str]) -> bool:
    """Validate that the expiring signature has not been tampered with and has not expired."""
    if not expires or not sig:
        return False
    if time.time() > expires:
        return False
    secret = (settings.JWT_SECRET_KEY or "edusphere-private-storage-key").encode()
    message = f"{filename}:{expires}".encode()
    expected_sig = hmac.new(secret, message, hashlib.sha256).hexdigest()[:32]
    return hmac.compare_digest(sig, expected_sig)


@router.post("")
@router.post("/")
@router.post("/file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Accepts multipart file upload with strict whitelist, path sanitization,
    size limits, and returns a signed expiring URL for private storage.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected for upload.")

    # Null byte check (C-poisoning attack prevention)
    if "\x00" in file.filename:
        raise HTTPException(status_code=400, detail="Malformed filename detected.")

    raw_filename = os.path.basename(file.filename.replace("\\", "/"))
    _, ext = os.path.splitext(raw_filename)
    clean_ext = ext.lower().strip()

    # Blocked extension rejection
    if clean_ext in FORBIDDEN_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Security violation: Executable or scripted files ({clean_ext}) are strictly prohibited."
        )

    # Whitelist check
    if clean_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format ({clean_ext}). Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # MIME-type check for active web content spoofing
    if file.content_type and any(bad in file.content_type.lower() for bad in ["text/html", "application/x-msdownload", "javascript"]):
        raise HTTPException(
            status_code=400,
            detail="Security violation: Active web script or executable content detected."
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
        )

    # Virus-safe UUID filename to prevent arbitrary file overwrites and path traversal
    safe_filename = f"{uuid.uuid4().hex}{clean_ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    # Generate signed, expiring URL (default 2 hours)
    signed_url = generate_signed_file_url(safe_filename, expires_in_seconds=7200)

    return {
        "original_filename": raw_filename,
        "filename": safe_filename,
        "size_bytes": len(contents),
        "url": signed_url,
        "file_url": signed_url,
        "download_url": signed_url,
        "expires_in": 7200,
        "message": "File verified and uploaded securely."
    }


@router.get("/files/{filename}")
async def get_uploaded_file(
    filename: str,
    request: Request,
    expires: Optional[int] = Query(None),
    sig: Optional[str] = Query(None),
):
    """
    Serve private storage file.
    Access strictly requires either:
    1. A valid, non-expired cryptographic HMAC signature (?expires=...&sig=...)
    2. An authenticated user Bearer token in the Authorization header.
    Public unauthenticated access is strictly rejected.
    """
    # Path traversal protection
    clean_filename = os.path.basename(filename.replace("\\", "/"))
    if clean_filename != filename or ".." in filename or "\x00" in filename:
        raise HTTPException(status_code=400, detail="Invalid file identifier.")

    file_path = os.path.join(UPLOAD_DIR, clean_filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Requested file does not exist.")

    # 1. Check signed expiring URL
    has_valid_signature = verify_signed_file_token(clean_filename, expires, sig)

    # 2. Check session token if signature is not present or expired
    is_authenticated_user = False
    auth_header = request.headers.get("Authorization")
    if not has_valid_signature and auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            from utils.jwt import decode_token
            payload = decode_token(token)
            if payload and payload.get("type") == "access":
                is_authenticated_user = True
        except Exception:
            pass

    if not has_valid_signature and not is_authenticated_user:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Access to private storage requires a valid signed expiring URL or active authentication token."
        )

    # Return file with security headers to prevent browser script execution
    return FileResponse(
        file_path,
        headers={
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": f'attachment; filename="{clean_filename}"',
            "Cache-Control": "private, max-age=3600"
        }
    )

