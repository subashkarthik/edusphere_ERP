from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# 1. Student Login
student_res = client.post("/api/auth/login", json={
    "email": "alex.j@edusphere.edu.in",
    "password": "student123"
})
student_token = student_res.json()["access_token"]

# 2. Student Submits Work for assignment
sub_res = client.post("/api/assignments/submit", json={
    "assignment_id": "ade93463-af12-410c-b62d-1bbe48aa7340",
    "file_url": "/api/upload/files/student_lab4_report.pdf"
}, headers={"Authorization": f"Bearer {student_token}"})
print("Submission response status:", sub_res.status_code)
print("Submission response:", sub_res.json())

# 3. Faculty Login
faculty_res = client.post("/api/auth/login", json={
    "email": "arun.kumar@edusphere.edu.in",
    "password": "faculty123"
})
faculty_token = faculty_res.json()["access_token"]

# 4. Faculty fetches submissions list
fac_submissions = client.get("/api/assignments/submissions", headers={"Authorization": f"Bearer {faculty_token}"})
print("Faculty submissions fetch status:", fac_submissions.status_code)
subs = fac_submissions.json()
print("Total submissions visible to Faculty:", len(subs))
for s in subs:
    print(f" - [{s['status']}] Student: {s['student_name']} | File: {s['file_url']}")
