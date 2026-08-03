"""End-to-end API verification test for EduSphere LMS backend."""
import sys
import requests

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://localhost:5000/api"
passed = 0
failed = 0


def test(label, fn):
    global passed, failed
    try:
        fn()
        passed += 1
    except Exception as e:
        print(f"  FAIL: {e}")
        failed += 1


# 1. Health
def t1():
    r = requests.get(f"{BASE}/health")
    assert r.status_code == 200
    print(f"[1] Health: {r.json()}")
test("Health", t1)

# 2. Student Login
student_token = None
def t2():
    global student_token
    r = requests.post(f"{BASE}/auth/login", json={"email": "alex.j@edusphere.edu.in", "password": "student123"})
    assert r.status_code == 200
    data = r.json()
    student_token = data["access_token"]
    user = data["user"]
    print(f"[2] Student Login: {user['name']} ({user['role']})")
test("Student Login", t2)

sh = {"Authorization": f"Bearer {student_token}"}

# 3. Dashboard Metrics
def t3():
    r = requests.get(f"{BASE}/dashboard/metrics", headers=sh)
    assert r.status_code == 200
    print(f"[3] Dashboard Metrics ({len(r.json())} items):")
    for m in r.json():
        print(f"    {m['label']}: {m['value']} ({m['change']})")
test("Dashboard Metrics", t3)

# 4. Attendance Summary
def t4():
    r = requests.get(f"{BASE}/attendance/summary", headers=sh)
    assert r.status_code == 200
    print(f"[4] Attendance Summary:")
    for a in r.json():
        print(f"    {a['course_code']} {a['course_name']}: {a['percentage']}% ({a['classes_attended']}/{a['classes_held']})")
test("Attendance Summary", t4)

# 5. Timetable
def t5():
    r = requests.get(f"{BASE}/timetable", headers=sh)
    assert r.status_code == 200
    entries = r.json()
    print(f"[5] Timetable: {len(entries)} entries")
    for t in entries[:3]:
        print(f"    {t['day']} {t['time']}: {t['course']} @ {t['venue']}")
test("Timetable", t5)

# 6. Courses
def t6():
    r = requests.get(f"{BASE}/courses", headers=sh)
    assert r.status_code == 200
    courses = r.json()
    print(f"[6] Courses: {len(courses)} enrolled")
    for c in courses[:4]:
        print(f"    {c['code']} {c['name']} (Credits: {c['credits']}, Progress: {c['progress']}%)")
test("Courses", t6)

# 7. Fees
def t7():
    r = requests.get(f"{BASE}/finance/fees", headers=sh)
    assert r.status_code == 200
    print(f"[7] Fee Status:")
    for f in r.json():
        print(f"    {f['label']}: Rs.{f['amount']} [{f['status']}]")
test("Fees", t7)

# 8. Outstanding
def t8():
    r = requests.get(f"{BASE}/finance/outstanding", headers=sh)
    assert r.status_code == 200
    data = r.json()
    print(f"[8] Outstanding: Rs.{data['outstanding']} (Paid: Rs.{data['total_paid']})")
test("Outstanding", t8)

# 9. Placement Drives
def t9():
    r = requests.get(f"{BASE}/placements/drives", headers=sh)
    assert r.status_code == 200
    print(f"[9] Placement Drives:")
    for d in r.json():
        app = d.get("application_status") or "Not Applied"
        print(f"    {d['company_name']} - {d['role_offered']} ({d['package_lpa']} LPA) [{d['status']}] App: {app}")
test("Placement Drives", t9)

# 10. Placement Stats
def t10():
    r = requests.get(f"{BASE}/placements/stats", headers=sh)
    assert r.status_code == 200
    print(f"[10] Placement Stats:")
    for s in r.json():
        print(f"    {s['year']}: {s['placed']}/{s['total']} placed (Avg: {s['avg_lpa']} LPA)")
test("Placement Stats", t10)

# 11. Announcements
def t11():
    r = requests.get(f"{BASE}/announcements", headers=sh)
    assert r.status_code == 200
    print(f"[11] Announcements: {len(r.json())} items")
test("Announcements", t11)

# 12. Analytics
def t12():
    r = requests.get(f"{BASE}/dashboard/analytics", headers=sh)
    assert r.status_code == 200
    trends = r.json().get("placement_trends", [])
    print(f"[12] Analytics: {len(trends)} years of placement data")
test("Analytics", t12)

# 13. Transcripts
def t13():
    r = requests.get(f"{BASE}/exams/transcripts", headers=sh)
    assert r.status_code == 200
    print(f"[13] Transcripts: {len(r.json())} semesters")
test("Transcripts", t13)

# 14. Admin Login + Metrics
admin_token = None
def t14():
    global admin_token
    r = requests.post(f"{BASE}/auth/login", json={"email": "admin@edusphere.edu.in", "password": "admin123"})
    assert r.status_code == 200
    admin_token = r.json()["access_token"]
    ah = {"Authorization": f"Bearer {admin_token}"}
    r2 = requests.get(f"{BASE}/dashboard/metrics", headers=ah)
    assert r2.status_code == 200
    print(f"[14] Admin Dashboard:")
    for m in r2.json():
        print(f"    {m['label']}: {m['value']}")
test("Admin Login + Dashboard", t14)

ah = {"Authorization": f"Bearer {admin_token}"}

# 15. Users List (Admin)
def t15():
    r = requests.get(f"{BASE}/users", headers=ah)
    assert r.status_code == 200
    print(f"[15] Users List: {len(r.json())} users")
test("Users List", t15)

# 16. Finance Reports (Admin)
def t16():
    r = requests.get(f"{BASE}/finance/reports", headers=ah)
    assert r.status_code == 200
    data = r.json()
    print(f"[16] Finance Report: Revenue Rs.{data['total_revenue']}, Collection Rate: {data['collection_rate']}%")
test("Finance Reports", t16)

# 17. Faculty Login + Courses
def t17():
    r = requests.post(f"{BASE}/auth/login", json={"email": "arun.kumar@edusphere.edu.in", "password": "faculty123"})
    assert r.status_code == 200
    fh = {"Authorization": f"Bearer {r.json()['access_token']}"}
    r2 = requests.get(f"{BASE}/courses", headers=fh)
    assert r2.status_code == 200
    print(f"[17] Faculty Courses: {len(r2.json())} courses taught")
test("Faculty Login + Courses", t17)

# 18. Access Control: Student cannot access users list
def t18():
    r = requests.get(f"{BASE}/users", headers=sh)
    assert r.status_code == 403
    print(f"[18] RBAC: Student blocked from /users -> 403 (correct)")
test("Access Control", t18)

# 19. Certificates API
def t19():
    # Student fetch certificates
    r = requests.get(f"{BASE}/certificates/my-certificates", headers=sh)
    assert r.status_code == 200
    certs = r.json()
    print(f"[19] Certificates API: Student retrieved {len(certs)} certificates")
    
    # Admin fetch settings
    r2 = requests.get(f"{BASE}/certificates/settings", headers=ah)
    assert r2.status_code == 200
    s = r2.json()
    print(f"     Thresholds: Attendance >={s['min_attendance_pct']}%, Assessment >={s['min_assessment_pct']}%")
test("Certificates API", t19)

print()
print(f"{'='*50}")
print(f"Results: {passed} passed, {failed} failed out of {passed+failed} tests")
print(f"{'='*50}")

