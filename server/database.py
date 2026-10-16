import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.exc import OperationalError
from config import settings

db_url = settings.DATABASE_URL
connect_args = {}

# Check if SQLite is requested
is_sqlite = db_url.startswith("sqlite")

# Test connection if PostgreSQL is requested
if not is_sqlite:
    try:
        # Create a quick testing engine to verify connectivity
        # We use a short timeout to prevent blocking server startup
        test_engine = create_engine(db_url, connect_args={"connect_timeout": 3} if "postgresql" in db_url else {})
        with test_engine.connect() as conn:
            pass
        test_engine.dispose()
        print("[DB] Connected to primary database (PostgreSQL) successfully.")
    except Exception as e:
        print(f"[DB WARNING] Primary database connection failed: {e}")
        print("[DB WARNING] Falling back to local SQLite database: edusphere.db")
        db_url = "sqlite:///./edusphere.db"
        is_sqlite = True

# Configure SQLite-specific args
if is_sqlite:
    connect_args = {"check_same_thread": False}
    print(f"[DB] Initializing engine with SQLite: {db_url}")
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        echo=False,
    )
else:
    print(f"[DB] Initializing engine with PostgreSQL: {db_url}")
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        echo=False,
        pool_size=20,          # Increase base connections for multi-tenant load
        max_overflow=10,       # Allow burst capacity during peak hours
        pool_recycle=3600,     # Recycle connections every hour
        pool_pre_ping=True,    # Ensure connection is alive before use
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def _run_schema_migrations():
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            if not is_sqlite:
                conn.execute(text("ALTER TABLE certificates ADD COLUMN IF NOT EXISTS progress_pct FLOAT DEFAULT 0.0;"))
                conn.execute(text("ALTER TABLE certificate_settings ADD COLUMN IF NOT EXISTS min_progress_pct FLOAT DEFAULT 100.0;"))
                conn.execute(text("ALTER TABLE certificates ADD COLUMN IF NOT EXISTS is_override BOOLEAN DEFAULT FALSE;"))
                conn.execute(text("ALTER TABLE certificates ADD COLUMN IF NOT EXISTS override_reason VARCHAR(500);"))
                conn.execute(text("ALTER TABLE certificates ADD COLUMN IF NOT EXISTS override_by_id VARCHAR(36);"))
                conn.execute(text("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_results_published BOOLEAN DEFAULT FALSE;"))
                conn.execute(text("ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_results_published BOOLEAN DEFAULT FALSE;"))
                conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS period VARCHAR(50);"))
                try:
                    conn.execute(text("ALTER TABLE courses ALTER COLUMN department_id DROP NOT NULL;"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE audit_logs ALTER COLUMN resource_type DROP NOT NULL;"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS syllabus_topics JSON DEFAULT '[]';"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;"))
                    conn.execute(text("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;"))
                except Exception:
                    pass
            else:
                for stmt in [
                    "ALTER TABLE certificates ADD COLUMN progress_pct FLOAT DEFAULT 0.0;",
                    "ALTER TABLE certificate_settings ADD COLUMN min_progress_pct FLOAT DEFAULT 100.0;",
                    "ALTER TABLE certificates ADD COLUMN is_override BOOLEAN DEFAULT 0;",
                    "ALTER TABLE certificates ADD COLUMN override_reason VARCHAR(500);",
                    "ALTER TABLE certificates ADD COLUMN override_by_id VARCHAR(36);",
                    "ALTER TABLE assignments ADD COLUMN is_results_published BOOLEAN DEFAULT 0;",
                    "ALTER TABLE quizzes ADD COLUMN is_results_published BOOLEAN DEFAULT 0;",
                    "ALTER TABLE attendance_sessions ADD COLUMN period VARCHAR(50);",
                    "ALTER TABLE courses ADD COLUMN syllabus_topics JSON DEFAULT '[]';",
                    "ALTER TABLE modules ADD COLUMN is_published BOOLEAN DEFAULT 1;",
                    "ALTER TABLE lessons ADD COLUMN is_published BOOLEAN DEFAULT 1;",
                ]:
                    try:
                        conn.execute(text(stmt))
                    except Exception:
                        pass
    except Exception as e:
        print(f"[DB MIGRATION NOTE] {e}")

_run_schema_migrations()


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

