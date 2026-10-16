import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./edusphere.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    ENABLE_SECURITY_ALERTS: bool = os.getenv("ENABLE_SECURITY_ALERTS", "false").lower() == "true"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    GEMINI_API_KEY: str = ""
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173"
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    S3_BUCKET_NAME: str = "edusphere-course-assets"
    S3_REGION: str = "us-east-1"
    S3_CDN_BASE_URL: str = "https://edusphere-course-assets.s3.us-east-1.amazonaws.com"

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if self.FRONTEND_URL and self.FRONTEND_URL.strip() not in origins:
            origins.append(self.FRONTEND_URL.strip())
        # Strictly disallow wildcard '*' to prevent CORS credential leakage
        filtered = [o for o in origins if o != "*"]
        return filtered or ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

# Known committed or weak secret signatures that must never be used in production
DISALLOWED_WEAK_SECRETS = {
    "secret",
    "changeme",
    "change_me_secret_key",
    "password",
    "12345678",
    "edusphere-super-secret-key-change-in-production-2024",
    "universe-erp-jwt-secret-change-in-production-2026",
    "dev-insecure-secret-key-edusphere-2026",
    "your_secure_jwt_secret_key_here",
    "change-this-to-a-secure-random-secret-key",
}

def validate_production_security(conf: Settings = None, db_url: str = None, environment: str = None):
    """Enforce strict production secret entropy and environment-only sourcing."""
    # Support either passing a Settings instance or individual values
    if isinstance(conf, str):
        jwt_key = conf
        database_url = db_url or ""
        env_name = environment or "production"
    elif conf is not None:
        jwt_key = (conf.JWT_SECRET_KEY or "").strip()
        database_url = (conf.DATABASE_URL or "").strip()
        env_name = conf.ENVIRONMENT
    else:
        jwt_key = (settings.JWT_SECRET_KEY or "").strip()
        database_url = (settings.DATABASE_URL or "").strip()
        env_name = settings.ENVIRONMENT

    is_prod = env_name.lower() in ["production", "prod"]
    if is_prod:
        # 1. JWT Secret Validation
        key = (jwt_key or "").strip()
        if not key:
            raise RuntimeError("CRITICAL SECURITY ERROR: JWT_SECRET_KEY environment variable is missing in production mode.")
        if len(key) < 32:
            raise RuntimeError(f"CRITICAL SECURITY ERROR: JWT_SECRET_KEY is too weak ({len(key)} chars). Minimum 32 characters required in production.")
        if key.lower() in DISALLOWED_WEAK_SECRETS:
            raise RuntimeError("CRITICAL SECURITY ERROR: JWT_SECRET_KEY matches a known default/weak placeholder secret. Rotate immediately!")

        # 2. Database URL Validation
        db = (database_url or "").strip()
        if not db:
            raise RuntimeError("CRITICAL SECURITY ERROR: DATABASE_URL environment variable is missing in production mode.")
        if db.startswith("sqlite"):
            raise RuntimeError("CRITICAL SECURITY ERROR: SQLite is not permitted in production. A managed PostgreSQL database URL is required.")
    else:
        # Safe development fallback
        if isinstance(conf, Settings) and not conf.JWT_SECRET_KEY:
            conf.JWT_SECRET_KEY = "dev-insecure-secret-key-edusphere-2026"

validate_production_security(settings)





