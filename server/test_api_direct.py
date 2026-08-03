"""Direct backend API verification using FastAPI TestClient."""
import sys
import os
from datetime import datetime


# Ensure the server directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
passed = 0
failed = 0

def test(label, fn):
    global passed, failed
    try:
        fn()
        passed += 1
        print(f"✅ {label}: PASSED")
    except Exception as e:
        print(f"❌ {label}: FAILED - {e}")
        failed += 1

# 1. Health
def t1():
    r = client.get("/api/health")
    assert r.status_code == 200
    print(f"   Health response: {r.json()}")
test("Health Probe", t1)

# 2. Student Login
student_token = None
def t2():
    global student_token
    r = client.post("/api/auth/login", json={"email": "alex.j@edusphere.edu.in", "password": "student123"})
    assert r.status_code == 200
    data = r.json()
    student_token = data["access_token"]
    user = data["user"]
    print(f"   Student Logged in: {user['name']} ({user['role']})")
test("Student Login", t2)

sh = {"Authorization": f"Bearer {student_token}"} if student_token else {}

# 3. Dashboard Metrics
def t3():
    headers = {"Authorization": f"Bearer {student_token}"}
    r = client.get("/api/dashboard/metrics", headers=headers)
    assert r.status_code == 200
    print(f"   Dashboard Metrics ({len(r.json())} items)")
test("Dashboard Metrics", t3)

# 4. Attendance Summary
def t4():
    headers = {"Authorization": f"Bearer {student_token}"}
    r = client.get("/api/attendance/summary", headers=headers)
    assert r.status_code == 200
    print(f"   Attendance Summary: {len(r.json())} subjects")
test("Attendance Summary", t4)

# 5. Timetable
def t5():
    headers = {"Authorization": f"Bearer {student_token}"}
    r = client.get("/api/timetable", headers=headers)
    assert r.status_code == 200
    print(f"   Timetable count: {len(r.json())} entries")
test("Timetable Entries", t5)

# 6. Courses
def t6():
    headers = {"Authorization": f"Bearer {student_token}"}
    r = client.get("/api/courses", headers=headers)
    assert r.status_code == 200
    print(f"   Enrolled Courses: {len(r.json())} entries")
test("Enrolled Courses", t6)

# 7. Fees Ledger
def t7():
    headers = {"Authorization": f"Bearer {student_token}"}
    r = client.get("/api/finance/fees", headers=headers)
    assert r.status_code == 200
    print(f"   Fee Structures count: {len(r.json())} items")
test("Fee Structures", t7)

# 8. Outstanding
def t8():
    headers = {"Authorization": f"Bearer {student_token}"}
    r = client.get("/api/finance/outstanding", headers=headers)
    assert r.status_code == 200
    print(f"   Outstanding Balance: ₹{r.json()['outstanding']}")
test("Outstanding Balance", t8)

# 9. Get Ledger
def t9_ledger():
    headers = {"Authorization": f"Bearer {student_token}"}
    r = client.get("/api/finance/ledger", headers=headers)
    assert r.status_code == 200
    print(f"   Ledger entries count: {len(r.json())}")
test("Get Student Ledger", t9_ledger)

# 10. Admin Login
admin_token = None
def t10():
    global admin_token
    r = client.post("/api/auth/login", json={"email": "admin@edusphere.edu.in", "password": "admin123"})
    assert r.status_code == 200
    admin_token = r.json()["access_token"]
    print("   Admin Logged in successfully")
test("Admin Login", t10)

ah = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

# 11. Admin get all ledger
def t11():
    headers = {"Authorization": f"Bearer {admin_token}"}
    r = client.get("/api/finance/ledger", headers=headers)
    assert r.status_code == 200
    print(f"   Total Administrative Ledger entries: {len(r.json())}")
test("Get Administrative Ledger", t11)

# 12. Submit/Approve/Reject State Machine
def t12():
    # 1. Faculty Login
    r_fac = client.post("/api/auth/login", json={"email": "arun.kumar@edusphere.edu.in", "password": "faculty123"})
    assert r_fac.status_code == 200
    fac_token = r_fac.json()["access_token"]
    fh = {"Authorization": f"Bearer {fac_token}"}

    # 2. Create Course as Faculty
    new_crs = client.post("/api/cms/courses", headers=fh, json={
        "code": "TEST-101",
        "name": "State Machine Test Course",
        "description": "Validating curriculum state machine transitions.",
        "credits": 4,
        "department_id": "dept-cse"
    })

    assert new_crs.status_code == 201
    course_id = new_crs.json()["id"]
    print(f"   Created Course {course_id} in draft state")

    # 3. Submit Course for Review
    r_sub = client.post(f"/api/cms/courses/{course_id}/submit", headers=fh)
    assert r_sub.status_code == 200
    assert r_sub.json()["approval_status"] == "DEPT_PENDING"
    print("   Syllabus successfully submitted for HoD review")

    # 4. Approve as Admin
    headers_adm = {"Authorization": f"Bearer {admin_token}"}
    r_app = client.post(f"/api/cms/courses/{course_id}/approve", headers=headers_adm)
    assert r_app.status_code == 200
    assert r_app.json()["approval_status"] == "ACTIVE"
    print("   Syllabus approved and active in catalogue")

# 13. Certificate Engine & PDF Download Endpoint
def t13():
    headers_std = {"Authorization": f"Bearer {student_token}"}
    r = client.get("/api/certificates/my-certificates", headers=headers_std)
    assert r.status_code == 200
    certs = r.json()
    assert len(certs) > 0
    print(f"   Student Certificates Evaluated: {len(certs)} records")
    cert = certs[0]
    print(f"   Sample Certificate Code: {cert['certificate_code']} (Status: {cert['eligibility_status']})")

    # Generate a test certificate for PDF download verification
    from services.certificate_service import generate_certificate_pdf
    pdf_url = generate_certificate_pdf(cert['certificate_code'], "Alex Johnson", cert['course_name'], datetime.utcnow(), 95.0, 100.0)
    filename = f"{cert['certificate_code']}.pdf"
    r_pdf = client.get(f"/api/certificates/download-pdf/{filename}")
    assert r_pdf.status_code == 200
    assert r_pdf.headers["content-type"] == "application/pdf"
    print(f"   Verified PDF Download for {filename} (Content-Type: application/pdf)")


    # Test Admin Threshold Update & Re-evaluation
    headers_adm = {"Authorization": f"Bearer {admin_token}"}
    r_settings = client.post("/api/certificates/settings", headers=headers_adm, json={
        "min_attendance_pct": 70.0,
        "min_assessment_pct": 55.0
    })
    assert r_settings.status_code == 200
    assert r_settings.json()["min_attendance_pct"] == 70.0
    print("   Admin successfully configured new thresholds (70% Attendance, 55% Score)")

test("Certificate Engine & ReportLab PDF Download", t13)

print("\n" + "="*50)
print(f"Direct API Results: {passed} passed, {failed} failed out of {passed+failed} tests")
print("="*50)

if failed > 0:
    sys.exit(1)
else:
    sys.exit(0)

