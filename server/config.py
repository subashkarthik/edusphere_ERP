import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:1407@localhost:5432/edusphere"
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET_KEY: str = "edusphere-lms-jwt-secret-change-in-production-2026"
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


