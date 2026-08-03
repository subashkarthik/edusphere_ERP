import os
import sys
import logging
import dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
dotenv.load_dotenv(env_path)

from config import settings

logger = logging.getLogger("CloudinaryService")

# Default High-Quality Cloudinary Educational Sample Videos (CDN Streaming URLs)
DEFAULT_CLOUDINARY_VIDEOS = {
    "computer_science": [
        "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711172/vidssave.com_1__Getting_Started_with_C_Programming_2025___C_Programming_for_Beginners_1080P_p4zh7l.mp4",
        "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711662/vidssave.com_2__C_Variables_and_Print_Output___2025_C_Programming_for_Beginners_1080P_zvbax2.mp4",
        "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711316/vidssave.com_4__Get_User_Input_in_C_Programming_1080P_k3ca6n.mp4",
        "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711479/vidssave.com_7__Type_Conversion_in_C___Implicit_and_Explicit_Type_Conversion_1080P_d9tobz.mp4",
        "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711546/vidssave.com_2_Java_Development_Kit_JDK_Setup_1080P_lzfrg0.mp4",
        "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711745/vidssave.com_3_First_Code_in_Java_1080P_u6v7fr.mp4",
        "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711883/vidssave.com_4_How_Java_Works_1080P_eril9s.mp4",
        "https://res.cloudinary.com/ducisa7vu/video/upload/v1785712079/vidssave.com_5_Variables_in_Java_1080P_ugfhwt.mp4"
    ],
    "cyber_security": [
        "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711546/vidssave.com_2_Java_Development_Kit_JDK_Setup_1080P_lzfrg0.mp4"
    ],
    "web_development": [
        "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711172/vidssave.com_1__Getting_Started_with_C_Programming_2025___C_Programming_for_Beginners_1080P_p4zh7l.mp4"
    ]
}

def get_cloudinary_video_url(category: str, filename: str) -> str:
    """
    Returns secure Cloudinary CDN HTTPS URL for course video playback.
    If Cloudinary API credentials are set in .env, uses uploaded Cloudinary asset URL.
    Otherwise uses high-performance Cloudinary Demo CDN stream.
    """
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    if cloud_name and cloud_name != "your_cloud_name":
        # Format Cloudinary CDN URL
        clean_name = filename.replace(".mp4", "").replace(" ", "_")
        return f"https://res.cloudinary.com/{cloud_name}/video/upload/v1/edusphere/{category}/{clean_name}.mp4"

    # Default Cloudinary Sample CDN fallback
    cat_key = category.lower().replace(" ", "_")
    video_list = DEFAULT_CLOUDINARY_VIDEOS.get(cat_key, DEFAULT_CLOUDINARY_VIDEOS["computer_science"])
    return video_list[0]

def upload_file_to_cloudinary(local_path: str, public_id: str) -> str:
    """
    Uploads a local video file to Cloudinary cloud storage using SDK or REST API.
    """
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")

    if not cloud_name or cloud_name == "your_cloud_name":
        print(f"[CLOUDINARY MOCK UPLOAD] Simulated Cloudinary upload for {local_path}")
        return f"https://res.cloudinary.com/demo/video/upload/edusphere/{public_id}.mp4"

    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        res = cloudinary.uploader.upload_large(
            local_path,
            resource_type="video",
            public_id=f"edusphere/{public_id}",
            overwrite=True
        )
        print(f"[CLOUDINARY SUCCESS] Video uploaded successfully: {res.get('secure_url')}")
        return res.get("secure_url")
    except Exception as e:
        print(f"[CLOUDINARY UPLOAD ERROR] {e}")
        return f"https://res.cloudinary.com/demo/video/upload/edusphere/{public_id}.mp4"
