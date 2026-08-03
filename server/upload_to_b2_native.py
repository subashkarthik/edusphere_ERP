"""
EduSphere LMS — Native Backblaze B2 Video Uploader Utility
Uploads all course videos recursively from storage/videos to your Backblaze B2 bucket.
"""

import os
import sys
import dotenv
from b2sdk.v2 import B2Api, InMemoryAccountInfo, DoNothingProgressListener

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(BASE_DIR, ".env")
LOCAL_VIDEO_DIR = os.path.join(BASE_DIR, "storage", "videos")

dotenv.load_dotenv(ENV_FILE)

def main():
    key_id = os.getenv("AWS_ACCESS_KEY_ID")
    app_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    bucket_name = os.getenv("S3_BUCKET_NAME", "edusphere-free-videos")

    print("====================================================")
    print("      EDUSPHERE LMS — NATIVE BACKBLAZE B2 UPLOADER")
    print("====================================================")
    print(f"Bucket Name: {bucket_name}")
    print(f"Key ID     : {key_id}")
    print("====================================================")

    if not key_id or not app_key:
        print("[ERROR] Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in server/.env")
        return

    info = InMemoryAccountInfo()
    b2_api = B2Api(info)

    try:
        b2_api.authorize_account('production', key_id, app_key)
        print("[OK] Authenticated with Backblaze B2 successfully!")
    except Exception as e:
        print(f"[ERROR] Backblaze authorization failed ({e}).")
        print("[HINT] Please generate a NEW Application Key in Backblaze B2 dashboard with Read and Write permissions.")
        return

    try:
        bucket = b2_api.get_bucket_by_name(bucket_name)
        print(f"[OK] Found target bucket: {bucket_name}")
    except Exception as e:
        print(f"[ERROR] Bucket '{bucket_name}' not found: {e}")
        return

    if not os.path.exists(LOCAL_VIDEO_DIR):
        print(f"[ERROR] Local video directory not found: {LOCAL_VIDEO_DIR}")
        return

    files_to_upload = []
    supported_extensions = ('.mp4', '.mkv', '.webm')

    for root, _, files in os.walk(LOCAL_VIDEO_DIR):
        for file in files:
            if file.lower().endswith(supported_extensions):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, LOCAL_VIDEO_DIR).replace('\\', '/')
                files_to_upload.append((full_path, rel_path, file))

    if not files_to_upload:
        print("[INFO] No video files found to upload.")
        return

    print(f"[INFO] Starting upload for {len(files_to_upload)} course video assets...")

    success_count = 0
    for idx, (local_path, b2_path, filename) in enumerate(files_to_upload, 1):
        file_size_mb = os.path.getsize(local_path) / (1024 * 1024)
        print(f"\n[{idx}/{len(files_to_upload)}] Uploading '{b2_path}' ({file_size_mb:.2f} MB)...")
        try:
            bucket.upload_local_file(
                local_file=local_path,
                file_name=b2_path,
                progress_listener=DoNothingProgressListener()
            )
            print(f"  [OK] Uploaded {filename} to Backblaze B2 successfully!")
            success_count += 1
        except Exception as e:
            print(f"  [FAILED] Upload error: {e}")

    print("\n====================================================")
    print(f"Job Completed: {success_count}/{len(files_to_upload)} video assets uploaded to Backblaze B2!")
    print("====================================================")

if __name__ == "__main__":
    main()
