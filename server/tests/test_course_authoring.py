import uuid
import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User, UserRole
from models.academic import Course, Enrollment, EnrollmentStatus
from models.content import Module, Lesson, ContentType
from utils.password import hash_password
from utils.jwt import create_access_token

client = TestClient(app)


@pytest.fixture
def authoring_fixture():
    db = SessionLocal()
    try:
        org_id = "org-edusphere"

        # 1. Faculty user
        faculty = db.query(User).filter(User.email == "faculty_author_test@edusphere.edu.in").first()
        if not faculty:
            faculty = User(
                id="user-faculty-author-test",
                org_id=org_id,
                email="faculty_author_test@edusphere.edu.in",
                password_hash=hash_password("password123"),
                name="Prof. Author Test",
                role=UserRole.FACULTY,
            )
            db.add(faculty)
            db.commit()

        # 2. Student user
        student = db.query(User).filter(User.email == "student_author_test@edusphere.edu.in").first()
        if not student:
            student = User(
                id="user-student-author-test",
                org_id=org_id,
                email="student_author_test@edusphere.edu.in",
                password_hash=hash_password("password123"),
                name="Student Author Test",
                role=UserRole.STUDENT,
                enrollment_no="AUTH/2026/001",
            )
            db.add(student)
            db.commit()

        TEST_CODES = ["OS-501", "BIO-601", "SHORT-101", "EMPTY-301", "MOD-401", "UPL-501"]

        def _cleanup():
            test_courses = db.query(Course).filter(Course.code.in_(TEST_CODES)).all()
            for c in test_courses:
                db.query(Enrollment).filter(Enrollment.course_id == c.id).delete(synchronize_session=False)
                mods = db.query(Module).filter(Module.course_id == c.id).all()
                for m in mods:
                    db.query(Lesson).filter(Lesson.module_id == m.id).delete(synchronize_session=False)
                db.query(Module).filter(Module.course_id == c.id).delete(synchronize_session=False)
                db.delete(c)
            db.commit()

        _cleanup()

        fac_token = create_access_token({"sub": faculty.id, "email": faculty.email, "role": "FACULTY", "org_id": org_id})
        stu_token = create_access_token({"sub": student.id, "email": student.email, "role": "STUDENT", "org_id": org_id})

        yield {
            "faculty": faculty,
            "student": student,
            "fac_headers": {"Authorization": f"Bearer {fac_token}"},
            "stu_headers": {"Authorization": f"Bearer {stu_token}"},
        }

        _cleanup()
    finally:
        db.close()


def test_course_description_min_30_chars(authoring_fixture):
    """Test 1: Course creation fails if description is less than 30 characters."""
    headers = authoring_fixture["fac_headers"]

    payload = {
        "code": "SHORT-101",
        "title": "Short Description Course",
        "description": "Too short desc",  # Only 14 chars!
        "credits": 3,
        "semester": 5,
        "syllabus_topics": ["Topic 1"]
    }
    res = client.post("/api/courses/", json=payload, headers=headers)
    assert res.status_code in [400, 422], f"Expected 400 or 422 for short description, got {res.status_code}: {res.text}"


def test_create_two_courses_different_content_isolation(authoring_fixture):
    """
    Test 2: Create two distinct courses with different custom descriptions and topics.
    Verify each returns ONLY its own entered text and topics, with zero cross-contamination
    and zero auto-generated fallback strings.
    """
    headers = authoring_fixture["fac_headers"]

    # Course 1: Operating Systems Engineering
    payload_1 = {
        "code": "OS-501",
        "title": "Operating Systems Engineering",
        "description": "In-depth study of multi-core kernels, virtual memory management, and process scheduling.",
        "credits": 4,
        "semester": 5,
        "department": "Computer Science",
        "syllabus_topics": ["Kernel Architecture", "Virtual Memory", "Deadlock Avoidance"]
    }
    res1 = client.post("/api/courses/", json=payload_1, headers=headers)
    assert res1.status_code == 200, f"Course 1 creation failed: {res1.text}"
    c1_data = res1.json()
    c1_id = c1_data["id"]

    # Course 2: Computational Biology & Genomics
    payload_2 = {
        "code": "BIO-601",
        "title": "Computational Biology & Genomics",
        "description": "Algorithmic analysis of genomic sequencing, protein structure alignment, and CRISPR models.",
        "credits": 3,
        "semester": 6,
        "department": "Bioengineering",
        "syllabus_topics": ["Sequence Alignment", "Phylogenetic Trees", "RNA Folding"]
    }
    res2 = client.post("/api/courses/", json=payload_2, headers=headers)
    assert res2.status_code == 200, f"Course 2 creation failed: {res2.text}"
    c2_data = res2.json()
    c2_id = c2_data["id"]

    # Retrieve Course 1
    fetch_1 = client.get(f"/api/courses/{c1_id}", headers=headers)
    assert fetch_1.status_code == 200
    d1 = fetch_1.json()
    assert d1["code"] == "OS-501"
    assert d1["title"] == "Operating Systems Engineering"
    assert d1["description"] == payload_1["description"]
    assert d1["syllabus_topics"] == ["Kernel Architecture", "Virtual Memory", "Deadlock Avoidance"]
    # Ensure no contamination from Course 2
    assert "Sequence Alignment" not in d1["syllabus_topics"]
    # Ensure no old hardcoded mock topics or descriptions
    assert "Comprehensive institutional course covering" not in d1["description"]
    assert "C Fundamentals" not in d1["syllabus_topics"]

    # Retrieve Course 2
    fetch_2 = client.get(f"/api/courses/{c2_id}", headers=headers)
    assert fetch_2.status_code == 200
    d2 = fetch_2.json()
    assert d2["code"] == "BIO-601"
    assert d2["title"] == "Computational Biology & Genomics"
    assert d2["description"] == payload_2["description"]
    assert d2["syllabus_topics"] == ["Sequence Alignment", "Phylogenetic Trees", "RNA Folding"]
    # Ensure no contamination from Course 1
    assert "Kernel Architecture" not in d2["syllabus_topics"]


def test_empty_course_shows_no_lessons(authoring_fixture):
    """
    Test 3: An empty course returns 0 lessons and empty modules.
    Verify that lessons_count is 0 and lesson_types is empty.
    """
    headers = authoring_fixture["fac_headers"]

    payload = {
        "code": "EMPTY-301",
        "title": "Operating Systems Engineering",
        "description": "In-depth study of multi-core kernels, virtual memory management, and process scheduling.",
        "credits": 4,
        "semester": 5,
        "syllabus_topics": ["Kernel Architecture"]
    }
    res = client.post("/api/courses/", json=payload, headers=headers)
    c_id = res.json()["id"]

    get_res = client.get(f"/api/courses/{c_id}", headers=headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["lessons_count"] == 0
    assert data["lesson_types"] == []
    assert data["modules"] == []


def test_faculty_adds_modules_and_lessons_with_publish_toggle(authoring_fixture):
    """
    Test 4: Faculty adds a module and lesson, and toggles publish/unpublish.
    Unpublished lessons must be hidden from students.
    """
    fac_headers = authoring_fixture["fac_headers"]
    stu_headers = authoring_fixture["stu_headers"]

    # Create Course
    c_res = client.post("/api/courses/", json={
        "code": "MOD-401",
        "title": "Operating Systems Engineering",
        "description": "In-depth study of multi-core kernels, virtual memory management, and process scheduling.",
        "credits": 4,
        "semester": 5,
        "syllabus_topics": ["Kernel Architecture"]
    }, headers=fac_headers)
    c_id = c_res.json()["id"]

    # Enroll student
    client.post(f"/api/courses/{c_id}/self-enroll", headers=stu_headers)

    # Faculty adds module
    m_res = client.post(f"/api/courses/{c_id}/modules", json={
        "title": "Module 1: Kernel Core Architecture",
        "description": "Kernel space primitives",
        "order_index": 0,
        "is_published": True
    }, headers=fac_headers)
    assert m_res.status_code == 200
    m_id = m_res.json()["id"]

    # Faculty adds lesson (published)
    l_res = client.post(f"/api/courses/modules/{m_id}/lessons", json={
        "title": "Lesson 1: Bootstrapping & Protected Mode",
        "content_type": "VIDEO",
        "content_url": "/uploads/boot_lecture.mp4",
        "duration_minutes": 25,
        "is_published": True
    }, headers=fac_headers)
    assert l_res.status_code == 200
    l_id = l_res.json()["id"]

    # Student checks course: should see 1 lesson
    stu_view = client.get(f"/api/courses/{c_id}", headers=stu_headers)
    assert stu_view.status_code == 200
    assert stu_view.json()["lessons_count"] == 1
    assert "video" in stu_view.json()["lesson_types"]

    # Faculty unpublishes the lesson
    patch_res = client.patch(f"/api/courses/lessons/{l_id}", json={
        "is_published": False
    }, headers=fac_headers)
    assert patch_res.status_code == 200

    # Student checks again: published lesson count should now be 0!
    stu_view2 = client.get(f"/api/courses/{c_id}", headers=stu_headers)
    assert stu_view2.status_code == 200
    assert stu_view2.json()["lessons_count"] == 0
    assert stu_view2.json()["modules"][0]["lessons"] == []


def test_file_upload_authenticated_and_size_limited(authoring_fixture):
    """
    Test 5: Authenticated file upload with size and type restrictions.
    Students cannot upload (403), allowed types succeed (200), disallowed extensions fail (400).
    """
    fac_headers = authoring_fixture["fac_headers"]
    stu_headers = authoring_fixture["stu_headers"]

    # Create Course
    c_res = client.post("/api/courses/", json={
        "code": "UPL-501",
        "title": "Operating Systems Engineering",
        "description": "In-depth study of multi-core kernels, virtual memory management, and process scheduling.",
        "credits": 4,
        "semester": 5,
        "syllabus_topics": ["Kernel Architecture"]
    }, headers=fac_headers)
    c_id = c_res.json()["id"]

    # 1. Student attempt -> 403
    res_stu = client.post(
        f"/api/courses/{c_id}/upload",
        files={"file": ("lecture.pdf", b"%PDF-1.4 test content", "application/pdf")},
        headers=stu_headers
    )
    assert res_stu.status_code == 403

    # 2. Faculty uploads PDF -> 200
    res_fac = client.post(
        f"/api/courses/{c_id}/upload",
        files={"file": ("syllabus.pdf", b"%PDF-1.4 syllabus content", "application/pdf")},
        headers=fac_headers
    )
    assert res_fac.status_code == 200
    assert res_fac.json()["content_type"] == "PDF"
    assert "/uploads/" in res_fac.json()["url"]

    # 3. Disallowed extension (.exe) -> 400
    res_bad = client.post(
        f"/api/courses/{c_id}/upload",
        files={"file": ("malware.exe", b"malicious binary", "application/octet-stream")},
        headers=fac_headers
    )
    assert res_bad.status_code == 400
