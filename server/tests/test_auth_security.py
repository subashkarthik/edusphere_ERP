import pytest
import io
import time
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User, UserRole, StudentProfile, FacultyProfile
from models.academic import Course
from utils.password import hash_password
from utils.jwt import create_access_token

client = TestClient(app)


def get_or_create_admin(db):
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if not admin:
        admin = User(
            id="admin-security-test",
            org_id="org-edusphere",
            email="admin_security_test@edusphere.edu.in",
            login_id="ADMIN001",
            password_hash=hash_password("SuperAdmin2026!"),
            name="Security Admin",
            role=UserRole.ADMIN,
            is_active=True,
            must_change_password=False,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
    return admin


def test_public_registration_is_disabled():
    """Requirement 1 Test: Public registration endpoints are removed/return 404."""
    res_pub = client.post(
        "/api/auth/register-public",
        json={
            "email": "hacker_student@edusphere.edu.in",
            "password": "password123",
            "name": "Hacker Student",
            "role": "STUDENT",
        }
    )
    assert res_pub.status_code == 404
    assert "Public registration is disabled" in res_pub.json()["detail"]

    res_reg = client.post(
        "/api/auth/register",
        json={
            "email": "hacker_student2@edusphere.edu.in",
            "password": "password123",
            "name": "Hacker Student 2",
            "role": "FACULTY",
        }
    )
    assert res_reg.status_code == 404


def test_account_cannot_be_created_without_admin():
    """Requirement 1 & 6 Test: No way to create an account without an admin."""
    # 1. Unauthenticated request returns 401 or 403
    res_unauth = client.post(
        "/api/users/student",
        json={
            "name": "Unauth Student",
            "register_no": "REG/UNAUTH/001",
            "email": "unauth@edusphere.edu.in",
            "department": "Computer Science",
            "semester": 1,
            "section": "A",
        }
    )
    assert res_unauth.status_code in (401, 403)

    db = SessionLocal()
    try:
        admin = get_or_create_admin(db)
        admin_token = create_access_token({"sub": admin.id, "role": admin.role.value, "email": admin.email})

        # 2. Admin provisions student and gets single-use temporary password
        ts = int(time.time())
        res_admin = client.post(
            "/api/users/student",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Legit Student",
                "register_no": f"REG/{ts}/LEGIT",
                "email": f"legit.student.{ts}@edusphere.edu.in",
                "department": "Computer Science",
                "semester": 1,
                "section": "A",
            }
        )
        assert res_admin.status_code == 200
        data = res_admin.json()
        assert "temp_password" in data
        assert len(data["temp_password"]) >= 16
        student_id = data["user"]["id"]

        # 3. Student token attempting to provision faculty returns 403 Forbidden
        student_token = create_access_token({"sub": student_id, "role": "STUDENT", "email": data["user"]["email"]})
        res_forbidden = client.post(
            "/api/users/faculty",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "name": "Rogue Faculty",
                "email": f"rogue.fac.{ts}@edusphere.edu.in",
                "department": "Computer Science",
            }
        )
        assert res_forbidden.status_code == 403
    finally:
        db.close()


def test_temp_password_works_once_then_forces_change():
    """Requirement 4 Test: First login forces password change, policy verified."""
    db = SessionLocal()
    try:
        admin = get_or_create_admin(db)
        admin_token = create_access_token({"sub": admin.id, "role": admin.role.value, "email": admin.email})

        ts = int(time.time())
        # Provision student
        res_prov = client.post(
            "/api/users/student",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Alice Rivers",
                "register_no": f"REG/{ts}/ALICE",
                "email": f"alice.rivers.{ts}@edusphere.edu.in",
                "department": "Computer Science",
                "semester": 2,
                "section": "B",
            }
        )
        assert res_prov.status_code == 200
        temp_pass = res_prov.json()["temp_password"]
        login_id = res_prov.json()["login_id"]

        # First login with temp password
        res_login = client.post(
            "/api/auth/login",
            json={"identifier": login_id, "password": temp_pass}
        )
        assert res_login.status_code == 200
        login_data = res_login.json()
        assert login_data["user"]["must_change_password"] is True
        student_token = login_data["access_token"]

        # Attempt to change password violating policy (too short < 10 chars)
        res_policy_short = client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"current_password": temp_pass, "new_password": "short"}
        )
        assert res_policy_short.status_code == 400
        assert "at least 10 characters" in res_policy_short.json()["detail"]

        # Attempt to change password containing login_id
        res_policy_id = client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"current_password": temp_pass, "new_password": f"Secret{login_id}Key!"}
        )
        assert res_policy_id.status_code == 400
        assert "login ID" in res_policy_id.json()["detail"]

        # Attempt to change password containing parts of name (e.g. Alice)
        res_policy_name = client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"current_password": temp_pass, "new_password": "SecretAlicePassword123!"}
        )
        assert res_policy_name.status_code == 400
        assert "parts of your name" in res_policy_name.json()["detail"]

        # Successful password change
        new_valid_password = "SuperSecretKey9988#$!"
        res_change = client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"current_password": temp_pass, "new_password": new_valid_password}
        )
        assert res_change.status_code == 200

        # Login with old temp password fails
        res_old_fail = client.post(
            "/api/auth/login",
            json={"identifier": login_id, "password": temp_pass}
        )
        assert res_old_fail.status_code == 401
        assert res_old_fail.json()["detail"] == "Invalid ID or password"

        # Login with new permanent password succeeds and must_change_password is False
        res_new_login = client.post(
            "/api/auth/login",
            json={"identifier": login_id, "password": new_valid_password}
        )
        assert res_new_login.status_code == 200
        assert res_new_login.json()["user"]["must_change_password"] is False

    finally:
        db.close()


def test_failed_login_rate_limiting_locks_account_at_6th_attempt():
    """Requirement 7 Test: 5 fails / 15 min -> 6th wrong password locks account."""
    ident = f"rate_limit_test_{int(time.time())}@edusphere.edu.in"

    # Attempts 1 to 5: 401 Invalid ID or password
    for i in range(5):
        res = client.post(
            "/api/auth/login",
            json={"identifier": ident, "password": f"wrong-pass-{i}"}
        )
        assert res.status_code == 401
        assert res.json()["detail"] == "Invalid ID or password"

    # Attempt 6: Locked with 429
    res_6th = client.post(
        "/api/auth/login",
        json={"identifier": ident, "password": "wrong-pass-6"}
    )
    assert res_6th.status_code == 429
    assert "temporarily locked" in res_6th.json()["detail"]


def test_deactivated_user_existing_token_stops_working():
    """Requirement 5 & Test Criteria: Deactivated user's existing token stops working."""
    db = SessionLocal()
    try:
        admin = get_or_create_admin(db)
        admin_token = create_access_token({"sub": admin.id, "role": admin.role.value, "email": admin.email})

        ts = int(time.time())
        # Provision a student to test deactivation
        res_prov = client.post(
            "/api/users/student",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Deactivatee Student",
                "register_no": f"REG/{ts}/DEACT",
                "email": f"deact.student.{ts}@edusphere.edu.in",
                "department": "Computer Science",
                "semester": 1,
                "section": "C",
            }
        )
        assert res_prov.status_code == 200
        user_id = res_prov.json()["user"]["id"]
        temp_pass = res_prov.json()["temp_password"]
        login_id = res_prov.json()["login_id"]

        # Student logs in and receives token
        res_login = client.post(
            "/api/auth/login",
            json={"identifier": login_id, "password": temp_pass}
        )
        assert res_login.status_code == 200
        student_token = res_login.json()["access_token"]

        # Token works before deactivation
        res_me_active = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        assert res_me_active.status_code == 200

        # Admin deactivates user
        res_deact = client.patch(
            f"/api/users/{user_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_active": False}
        )
        assert res_deact.status_code == 200
        assert res_deact.json()["is_active"] is False

        # Existing token now IMMEDIATELY fails with 401
        res_me_deactivated = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        assert res_me_deactivated.status_code == 401
        assert "deactivated" in res_me_deactivated.json()["detail"]

    finally:
        db.close()


def test_bulk_preview_and_import():
    """Requirement 3 Test: Bulk import validation preview and credentials sheet generation."""
    db = SessionLocal()
    try:
        admin = get_or_create_admin(db)
        admin_token = create_access_token({"sub": admin.id, "role": admin.role.value, "email": admin.email})

        ts = int(time.time())
        # Sample CSV with valid and invalid rows
        csv_content = (
            "name,register_no,email,department,semester,section\n"
            f"Bulk Student 1,BULK/{ts}/01,bulk1_{ts}@edusphere.edu.in,Computer Science,1,A\n"
            f"Bulk Student 2,BULK/{ts}/02,bulk2_{ts}@edusphere.edu.in,Computer Science,2,B\n"
            "Invalid Student,,invalid-email,Computer Science,9,A\n"
        )
        csv_file = io.BytesIO(csv_content.encode("utf-8"))

        # Preview endpoint
        res_preview = client.post(
            "/api/users/bulk-preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("students.csv", csv_file, "text/csv")}
        )
        assert res_preview.status_code == 200
        pdata = res_preview.json()
        assert pdata["total_rows"] == 3
        assert pdata["valid_count"] == 2
        assert pdata["invalid_count"] == 1

        # Import endpoint returns credentials CSV sheet
        csv_file.seek(0)
        res_import = client.post(
            "/api/users/bulk-import",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("students.csv", csv_file, "text/csv")}
        )
        assert res_import.status_code == 200
        assert "text/csv" in res_import.headers["content-type"]
        body_text = res_import.text
        assert "name,login_id,temp_password" in body_text
        assert f"Bulk Student 1,BULK/{ts}/01" in body_text
        assert f"Bulk Student 2,BULK/{ts}/02" in body_text

    finally:
        db.close()
