import os
import sys
import dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
dotenv.load_dotenv(env_path)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.cloudinary_service import upload_file_to_cloudinary, get_cloudinary_video_url

VIDEO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage", "videos")

def run_batch_upload():
    print("=== EDUSPHERE CLOUDINARY BATCH VIDEO UPLOADER ===")
    
    if not os.path.exists(VIDEO_DIR):
        print(f"[CLOUDINARY] Storage directory {VIDEO_DIR} does not exist. Using Cloudinary CDN default streams.")
        return

    uploaded_urls = []
    for root, dirs, files in os.walk(VIDEO_DIR):
        for file in files:
            if file.endswith((".mp4", ".mkv", ".webm")):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, VIDEO_DIR)
                public_id = rel_path.replace("\\", "/").replace("/", "_").replace(".mp4", "")
                
                print(f"[UPLOADING TO CLOUDINARY] {rel_path} -> edusphere/{public_id}")
                cdn_url = upload_file_to_cloudinary(full_path, public_id)
                uploaded_urls.append((rel_path, cdn_url))

    print("\n==================================================")
    print(f"Batch upload process complete! Processed {len(uploaded_urls)} videos.")
    for rel, url in uploaded_urls:
        print(f"  • {rel}  ==>  {url}")
    print("==================================================")

if __name__ == "__main__":
    run_batch_upload()
