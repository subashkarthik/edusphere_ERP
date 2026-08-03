import os
import sys
import dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

import cloudinary
import cloudinary.api

def check_count():
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")

    print(f"Connecting to Cloudinary Cloud: {cloud_name}...")
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True
    )

    try:
        res = cloudinary.api.resources(resource_type="video", max_results=500)
        videos = res.get("resources", [])
        total_count = len(videos)
        total_size_mb = sum(v.get("bytes", 0) for v in videos) / (1024 * 1024)

        print("\n==================================================")
        print(f"📊 CLOUDINARY LIVE STATS FOR '{cloud_name}'")
        print(f"📹 Total Uploaded Video Files: {total_count}")
        print(f"💾 Total Cloud Storage Used: {round(total_size_mb, 2)} MB")
        print("==================================================")

        print("\nUploaded Video Files List:")
        for idx, v in enumerate(videos, 1):
            name = v.get("public_id")
            mb = round(v.get("bytes", 0) / (1024 * 1024), 2)
            url = v.get("secure_url")
            print(f" {idx:02d}. [{mb} MB] {name}  -->  {url}")

        return total_count
    except Exception as e:
        print(f"[CLOUDINARY API ERROR] {e}")
        return 0

if __name__ == "__main__":
    check_count()
