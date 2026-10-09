import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./edusphere.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    FACULTY_INVITE_KEY: str = os.getenv("FACULTY_INVITE_KEY", "")
    ENABLE_SECURITY_ALERTS: bool = os.getenv("ENABLE_SECURITY_ALERTS", "false").lower() == "true"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    GEMINI_API_KEY: str = ""
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173"
    ACCESS_DB_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage", "access_db")
    S3_BUCKET_NAME: str = "edusphere-course-assets"
    S3_REGION: str = "us-east-1"
    S3_CDN_BASE_URL: str = "https://edusphere-course-assets.s3.us-east-1.amazonaws.com"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

# Startup security validation for production mode
if settings.ENVIRONMENT.lower() == "production":
    if not settings.JWT_SECRET_KEY or settings.JWT_SECRET_KEY == "change_me_secret_key":
        raise RuntimeError("CRITICAL SECURITY ERROR: JWT_SECRET_KEY environment variable is missing or insecure in production mode.")
elif not settings.JWT_SECRET_KEY:
    settings.JWT_SECRET_KEY = "dev-insecure-secret-key-edusphere-2026"



