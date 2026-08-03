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


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

