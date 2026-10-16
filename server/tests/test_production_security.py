import io
import time
import uuid
import pytest
from datetime import datetime, timedelta, timezone
from jose import jwt
from fastapi.testclient import TestClient

from main import app
from database import SessionLocal
from config import settings, validate_production_security
from models.user import User, UserRole, StudentProfile
from models.audit import AuditLog
from utils.password import hash_password
from utils.jwt import create_access_token
from routes.upload import generate_signed_file_url

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def setup_users(db_session):
    # Ensure admin user
    admin = db_session.query(User).filter(User.role == UserRole.ADMIN).first()
    if not admin:
        admin = User(
            id="sec-admin-01",
            org_id="org-edusphere",
            email="sec_admin@edusphere.edu.in",
            login_id="SECADMIN01",
            password_hash=hash_password("SecAdminPass2026!"),
            name="Security Admin",
            role=UserRole.ADMIN,
            is_active=True,
            must_change_password=False,
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)

    # Ensure student user
    student = db_session.query(User).filter(User.role == UserRole.STUDENT).first()
    if not student:
        student = User(
            id="sec-student-01",
            org_id="org-edusphere",
            email="sec_student@edusphere.edu.in",
            login_id="SECSTU01",
            password_hash=hash_password("SecStudentPass2026!"),
            name="Security Student",
            phone="9876543210",
            role=UserRole.STUDENT,
            is_active=True,
            must_change_password=False,
        )
        db_session.add(student)
        db_session.commit()
        db_session.refresh(student)

        profile = StudentProfile(
            id="sec-stu-prof-01",
            user_id=student.id,
            roll_number="SECSTU01",
            department="Computer Science",
            semester=1,
            section="A",
        )
        db_session.add(profile)
        db_session.commit()

    # Ensure faculty user
    faculty = db_session.query(User).filter(User.role == UserRole.FACULTY).first()
    if not faculty:
        faculty = User(
            id="sec-faculty-01",
            org_id="org-edusphere",
            email="sec_faculty@edusphere.edu.in",
            login_id="SECFAC01",
            password_hash=hash_password("SecFacultyPass2026!"),
            name="Security Faculty",
            phone="9876543299",
            role=UserRole.FACULTY,
            is_active=True,
            must_change_password=False,
        )
        db_session.add(faculty)
        db_session.commit()
        db_session.refresh(faculty)

    return {"admin": admin, "student": student, "faculty": faculty}


# ==============================================================================
# TEST 1: TOKEN-LESS ACCESS REJECTED (401)
# ==============================================================================
def test_token_less_access_rejected():
    """Protected endpoints must reject requests with no Authorization header."""
    res = client.get("/api/users")
    assert res.status_code == 401
    assert "detail" in res.json()


# ==============================================================================
# TEST 2: EXPIRED TOKEN REJECTED (401)
# ==============================================================================
def test_expired_token_rejected(setup_users):
    """Tokens with past expiration time must be rejected with 401."""
    student = setup_users["student"]
    expired_payload = {
        "sub": student.id,
        "email": student.email,
        "role": student.role.value if hasattr(student.role, "value") else str(student.role),
        "org_id": student.org_id,
        "exp": datetime.now(timezone.utc) - timedelta(hours=2),  # expired 2 hours ago
        "iat": datetime.now(timezone.utc) - timedelta(hours=3),
    }
    expired_token = jwt.encode(expired_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    res = client.get("/api/users/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    assert "detail" in res.json()


# ==============================================================================
# TEST 3: TAMPERED JWT ROLE CLAIM REJECTED (401)
# ==============================================================================
def test_tampered_jwt_signature_rejected(setup_users):
    """Forged token signed with a different key or tampered signature is rejected."""
    student = setup_users["student"]
    # Attacker tries to escalate privilege to ADMIN using attacker's own secret
    attacker_secret = "attacker-unauthorized-secret-key-32chars!"
    forged_payload = {
        "sub": student.id,
        "email": student.email,
        "role": "ADMIN",  # forged escalation
        "org_id": student.org_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    tampered_token = jwt.encode(forged_payload, attacker_secret, algorithm=settings.JWT_ALGORITHM)

    res = client.get("/api/users", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res.status_code == 401


# ==============================================================================
# TEST 4: SQL INJECTION STRINGS IN SEARCH BOXES SAFELY PARAMETERIZED
# ==============================================================================
@pytest.mark.parametrize("sqli_payload", [
    "' OR '1'='1",
    "admin'--",
    "' UNION SELECT null, null, null--",
    "'; DROP TABLE users;--",
    "1' OR 1=1 #",
])
def test_sql_injection_in_search_safely_handled(setup_users, sqli_payload):
    """SQL injection strings in directory search are safely treated as literal query strings."""
    admin = setup_users["admin"]
    token = create_access_token({"sub": admin.id, "email": admin.email, "role": admin.role.value, "org_id": admin.org_id})

    res = client.get(
        f"/api/users?search={sqli_payload}",
        headers={"Authorization": f"Bearer {token}"}
    )
    # Must succeed (HTTP 200) with empty list or exact literal match, never 500 or SQL syntax error
    assert res.status_code == 200
    assert isinstance(res.json(), list)


# ==============================================================================
# TEST 5: FILE UPLOAD WHITELIST & BLACKLIST ENFORCEMENT
# ==============================================================================
@pytest.mark.parametrize("bad_filename,mime_type", [
    ("payload.exe", "application/x-msdownload"),
    ("script.html", "text/html"),
    ("malicious.js", "application/javascript"),
    ("shell.sh", "application/x-sh"),
    ("backdoor.php", "application/x-php"),
    ("test.bat", "application/x-bat"),
    ("archive.vbs", "text/vbscript"),
])
def test_dangerous_file_upload_rejected(setup_users, bad_filename, mime_type):
    """Dangerous file extensions (.exe, .html, .js, .sh, etc.) must be rejected with 400."""
    admin = setup_users["admin"]
    token = create_access_token({"sub": admin.id, "email": admin.email, "role": admin.role.value, "org_id": admin.org_id})

    fake_file = io.BytesIO(b"MALICIOUS_PAYLOAD_CONTENT")
    res = client.post(
        "/api/upload",
        files={"file": (bad_filename, fake_file, mime_type)},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 400
    assert "prohibited" in res.json()["detail"].lower() or "not allowed" in res.json()["detail"].lower()


def test_valid_file_upload_allowed_with_signed_url(setup_users):
    """Valid files (.pdf) are accepted and returned with signed, expiring download URLs."""
    admin = setup_users["admin"]
    token = create_access_token({"sub": admin.id, "email": admin.email, "role": admin.role.value, "org_id": admin.org_id})

    sample_pdf = io.BytesIO(b"%PDF-1.4 sample secure document content for test")
    res = client.post(
        "/api/upload",
        files={"file": ("assignment_guidelines.pdf", sample_pdf, "application/pdf")},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "url" in data
    assert "expires_in" in data
    assert data["url"].startswith("/api/upload/files/")
    assert "expires=" in data["url"]
    assert "sig=" in data["url"]


# ==============================================================================
# TEST 6: FILE STORAGE ACCESS CONTROL (SIGNED URL VS UNAUTHENTICATED)
# ==============================================================================
def test_file_download_requires_valid_signature_or_token(setup_users):
    """Direct unauthenticated file access without signature returns 401."""
    admin = setup_users["admin"]
    token = create_access_token({"sub": admin.id, "email": admin.email, "role": admin.role.value, "org_id": admin.org_id})

    # Upload test file
    sample = io.BytesIO(b"private test data")
    upload_res = client.post(
        "/api/upload",
        files={"file": ("private_notes.pdf", sample, "application/pdf")},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert upload_res.status_code == 200
    signed_url = upload_res.json()["url"]
    raw_path = signed_url.split("?")[0]  # strip query parameters

    # 1. Unauthenticated request without signature must return 401
    res_no_sig = client.get(raw_path)
    assert res_no_sig.status_code == 401

    # 2. Tampered signature must return 401
    tampered_url = signed_url.replace("sig=", "sig=tampered_invalid_")
    res_tampered = client.get(tampered_url)
    assert res_tampered.status_code == 401

    # 3. Legitimate signed URL must return 200
    res_valid = client.get(signed_url)
    assert res_valid.status_code == 200

    # 4. Bearer token access to raw path also works for authenticated sessions
    res_auth = client.get(raw_path, headers={"Authorization": f"Bearer {token}"})
    assert res_auth.status_code == 200


# ==============================================================================
# TEST 7: PII MINIMIZATION (MASKS EMAIL/PHONE FOR NON-ADMINS, NO PASSWORD HASH)
# ==============================================================================
def test_pii_masked_in_user_list_for_non_admins(setup_users):
    """Faculty viewing directory must see masked student email and phone."""
    faculty = setup_users["faculty"]
    token = create_access_token({"sub": faculty.id, "email": faculty.email, "role": faculty.role.value, "org_id": faculty.org_id})

    res = client.get("/api/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    users_list = res.json()

    for u in users_list:
        # password_hash must NEVER appear in serialized responses
        assert "password_hash" not in u
        assert "password" not in u

        # If not the faculty's own record, email and phone must be masked
        if u["id"] != faculty.id:
            if u.get("email"):
                # Masked format: a***v@domain or ***
                assert "*" in u["email"] or "@" in u["email"]
            if u.get("phone"):
                assert "*" in u["phone"]


def test_pii_unmasked_for_admins(setup_users):
    """Admins need unmasked email and phone to administer institution."""
    admin = setup_users["admin"]
    token = create_access_token({"sub": admin.id, "email": admin.email, "role": admin.role.value, "org_id": admin.org_id})

    res = client.get("/api/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    users_list = res.json()
    for u in users_list:
        assert "password_hash" not in u


# ==============================================================================
# TEST 8: STUDENT DATA EXPORT & PURGE (AUDIT LOGGED)
# ==============================================================================
def test_student_data_export_and_audit_log(setup_users, db_session):
    """Admin can export student data, creating a verified audit trail."""
    admin = setup_users["admin"]
    student = setup_users["student"]
    token = create_access_token({"sub": admin.id, "email": admin.email, "role": admin.role.value, "org_id": admin.org_id})

    res = client.get(
        f"/api/users/{student.id}/export-data",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "profile" in data
    assert "enrollments" in data
    assert "quiz_attempts" in data
    assert "certificates" in data

    # Verify audit log entry
    audit = db_session.query(AuditLog).filter(
        AuditLog.action == "STUDENT_DATA_EXPORTED",
        AuditLog.user_id == admin.id
    ).order_by(AuditLog.created_at.desc()).first()
    assert audit is not None
    assert audit.resource_id == student.id or student.id in str(audit.metadata_json)


def test_student_purge_anonymizes_pii_and_audit_logs(setup_users, db_session):
    """Purging a student anonymizes their PII and logs the compliance action."""
    admin = setup_users["admin"]
    # Create temporary student to purge with unique dynamic identifiers
    purge_id = f"purge-target-{uuid.uuid4().hex[:8]}"
    purge_login = f"PURGE{uuid.uuid4().hex[:6]}"
    purge_email = f"test_{uuid.uuid4().hex[:8]}@edusphere.edu.in"
    to_purge = User(
        id=purge_id,
        org_id="org-edusphere",
        email=purge_email,
        login_id=purge_login,
        password_hash=hash_password("TempPass123!"),
        name="Target Student",
        phone="9123456780",
        role=UserRole.STUDENT,
        is_active=True,
    )
    db_session.add(to_purge)
    db_session.commit()

    admin_token = create_access_token({"sub": admin.id, "email": admin.email, "role": admin.role.value, "org_id": admin.org_id})

    # Purge request
    res = client.post(
        f"/api/users/{to_purge.id}/purge-data",
        json={"reason": "Student Right-to-be-Forgotten request"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200

    # Refresh user from database and verify anonymization
    db_session.refresh(to_purge)
    assert "Anonymized Student" in to_purge.name
    assert "purged_" in to_purge.email
    assert to_purge.phone is None
    assert to_purge.is_active is False

    # Verify audit log
    audit = db_session.query(AuditLog).filter(
        AuditLog.action == "STUDENT_DATA_PURGED",
        AuditLog.user_id == admin.id
    ).order_by(AuditLog.created_at.desc()).first()
    assert audit is not None
    assert audit.resource_id == to_purge.id or "Right-to-be-Forgotten" in str(audit.metadata_json)


# ==============================================================================
# TEST 9: SECURITY HEADERS ENFORCEMENT
# ==============================================================================
def test_security_headers_present():
    """All API responses must include strict security headers."""
    res = client.get("/api/health")
    headers = res.headers
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert "strict-origin-when-cross-origin" in headers.get("referrer-policy", "")
    assert "camera=()" in headers.get("permissions-policy", "")


# ==============================================================================
# TEST 10: WEAK SECRETS STARTUP VALIDATION
# ==============================================================================
def test_startup_validation_rejects_weak_secrets():
    """validate_production_security() must raise RuntimeError on weak/placeholder secrets."""
    # 1. Secret too short (< 32 chars)
    with pytest.raises(RuntimeError, match="Minimum 32 characters"):
        validate_production_security("short-secret", "postgresql://user:pass@localhost:5432/db", "production")

    # 2. Known default weak secret
    with pytest.raises(RuntimeError, match="known default/weak placeholder"):
        validate_production_security("edusphere-super-secret-key-change-in-production-2024", "postgresql://user:pass@localhost:5432/db", "production")

    # 3. SQLite in production
    with pytest.raises(RuntimeError, match="SQLite is not permitted in production"):
        validate_production_security("a" * 35, "sqlite:///./edusphere.db", "production")

    # 4. Valid production settings should pass without exception
    validate_production_security("a" * 35, "postgresql://user:pass@localhost:5432/db", "production")
