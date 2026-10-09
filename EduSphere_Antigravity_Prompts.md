# EduSphere – Module-by-Module Antigravity Prompts

Use order: P0 → P1 → ... → P9. After EACH prompt: run the "Test" step yourself, then `git commit`. Don't start the next prompt until the test passes.

Paste this at the top of every prompt (global rules):

> GLOBAL RULES: Work ONLY on what this prompt asks. Do not touch unrelated modules. No hardcoded/mock/dummy data in any screen I ask you to fix – everything must come from the backend DB. Don't add new features or buzzwords. After finishing, list the files you changed and the exact steps to test. If something is blocked, say so instead of faking it.

---

## P0 – Repo cleanup (15 min)

```
Project: EduSphere (React 19 + Vite + TS frontend, FastAPI + SQLAlchemy backend in /server).
Task: clean the repo.
1. Delete automate_commits.py and CONTRIBUTIONS.md.
2. Delete any ad-hoc test/debug scripts in the repo root and /server that are not part of a real test suite (list them to me first, then delete).
3. server/requirements.txt: add every missing import (requests, cloudinary, b2sdk, email-validator, etc.). Verify with a fresh venv: pip install -r requirements.txt && python -c "import main".
4. server/main.py: replace db.execute("SELECT 1") with db.execute(text("SELECT 1")) (SQLAlchemy 2).
5. Make sure .gitignore covers .env, *.db, storage/, node_modules, dist, __pycache__.
6. Replace Tailwind CDN in index.html with a proper Tailwind build (tailwind.config.js + postcss) OR keep CDN but remove the CSS overrides in main.css that force all slate text to white. App must keep looking good.
Test: backend starts with no import errors; npm run build succeeds.
```

## P1 – Auth & security (most important)

```
Task: fix authentication and security. Files: server/routes/auth.py, server/config.py, docker-compose.yml, server/routes/upload.py, server/main.py (websocket), services/api.ts, components/Login.tsx, App.tsx.
1. Remove hardcoded faculty key "FACULTY-2026-KEY" from auth.py AND from the prefilled input in Login.tsx. Faculty registration must read the key from env var FACULTY_INVITE_KEY. Better: public register creates only STUDENT; faculty accounts are created by admin.
2. Remove prefilled demo credentials from Login.tsx. Put a small "Demo accounts" hint ONLY when VITE_DEMO_MODE=true.
3. server/config.py + docker-compose.yml: no default DB password or JWT secret. Read from env; if JWT secret missing in production, raise an error at startup. Provide .env.example.
4. Login must not send SMS/email using hardcoded IP/phone. Remove that or put behind a feature flag that is OFF.
5. services/api.ts: keep access token in localStorage (key 'token'), attach "Authorization: Bearer" in ONE central request helper, on 401 redirect to login. On page refresh the user must stay logged in (restore from token via /auth/me).
6. Replace every raw fetch() in views/ with that helper (start with views/CertificationsModule.tsx and views/LearningWorkspace.tsx which read localStorage 'token' that was never set).
7. Protect: upload download endpoint, certificate PDF download endpoint (owner/admin/faculty only), and websocket (token as query param, verify before accept).
8. cms.py: add role + ownership checks to update/delete course, modules, lessons. update_course must use an explicit Pydantic schema, not setattr mass assignment.
Test: register as student → cannot become faculty; refresh browser → still logged in; call /api/certificates/... without token → 401; student cannot delete another faculty's course.
```

## P2 – Student self-enrollment

```
Task: students can enroll themselves. Files: server/routes/courses.py (currently POST /{course_id}/enroll is ADMIN only), views/PublicCatalog.tsx, views/Modules.tsx, services/api.ts.
1. Add backend POST /api/courses/{course_id}/self-enroll (role STUDENT, current user only, idempotent, 404 if course inactive, uses the Enrollment status enum properly).
2. Add GET /api/courses/my-enrollments.
3. Course catalog card: "Enroll" button → calls self-enroll → shows "Enrolled" state; "Continue" button opens the learning workspace.
4. Faculty/admin must see the enrolled students list for their course.
5. Fix bulk_enroll in cms.py to use the enum, not a plain string.
Test: login as student → enroll in a course → refresh → still enrolled → course appears in My Courses → admin sees the student in that course.
```

## P3 – Attendance (faculty marking + student view)

```
Task: complete the attendance pillar. Files: views/AttendanceModule.tsx, services/api.ts (attendanceApi), server attendance routes/models (inspect what exists first and tell me).
1. Backend: POST /api/attendance/mark (faculty/admin only, body: course_id, date, list of {student_id, status: present|absent|late}; upsert per student+course+date). GET /api/attendance/course/{course_id}?date= (faculty). GET /api/attendance/me (student: per-course percentage + history). GET /api/attendance/summary/{course_id}.
2. Frontend, FACULTY view: pick course → pick date → list of enrolled students with Present/Absent/Late toggles + "Mark all present" + Save. 
3. Frontend, STUDENT view: per-course attendance % with a bar, red warning below 75%, and a history table. Everything from API.
4. Remove ALL hardcoded numbers, fake "predictive" values, fake logs, and dead buttons from AttendanceModule.tsx. If a button has no function, delete it.
5. Fix services/api.ts so attendanceApi calls endpoints that really exist.
Test: faculty marks attendance for 3 students → student logs in and sees the exact percentage → reducing attendance below 75% shows the warning.
```

## P4 – Assessments: quiz builder + taking + auto-grade

```
Task: finish quizzes. Files: views/ExamsModule.tsx, server quiz routes/models, services/api.ts.
1. Faculty create-quiz modal must support: title, course (dropdown of the faculty's real courses – remove the default 'course-1'), time limit, pass %, and adding MCQ questions (question text, 4 options, correct option, marks). Save to backend in one call.
2. Student: list only quizzes for enrolled courses; take quiz with countdown timer; auto-submit on timeout (fix the stale-closure bug – use refs or functional state); backend calculates score (never trust client score); store attempt, score, pass/fail; one or limited attempts.
3. Show result + review of correct answers after submit.
4. Remove DEFAULT_QUIZZES / FALLBACK_QUESTIONS / fake ids. Fix `userChoice.upper?.()` and the `reloadQuizzes` that useApi does not return.
5. Faculty sees attempts/results table per quiz.
Test: faculty creates a 3-question quiz → student takes it → score matches manual calculation → faculty sees the result.
```

## P5 – Assignments (small cleanup)

```
Task: fix views/AssignmentModule.tsx. 
1. Only ONE grading modal can be open at a time. 
2. Remove DEFAULT_SUBMISSIONS demo data; faculty sees only real submissions.
3. Rubric default must be 0, not full marks. Validate marks <= max marks.
4. Student can upload a submission (use the authenticated upload endpoint) and see grade + feedback.
5. Graded marks must be stored so they can feed P6 (certificate eligibility) as part of the assessment score.
Test: student submits → faculty grades → student sees marks.
```

## P6 – Certificates (the integration proof)  ⭐

```
Task: make certification truly integrated. Files: server/routes/certificates.py, server/services/certificate_service.py, views/CertificationsModule.tsx, views/CertificateVerification.tsx.
RULE (configurable per course, defaults): certificate is issued ONLY IF attendance >= 75% AND average assessment score (quizzes + graded assignments) >= 50% AND course progress == 100%.
1. In /my-certificates and wherever certificates are evaluated, use evaluate_and_issue_certificate with REAL attendance, assessment and progress numbers from the DB. Delete evaluate_video_course_certificates and the scan of local storage/videos. Remove hardcoded attendance_pct=95.0 and the "progress >= 50" shortcut.
2. Certificate code must be stable and unique: use secrets/uuid based code (e.g. EDU-2026-XXXXXXXX), stored in DB. Never Python hash().
3. PDF must draw a real QR code (qrcode lib) pointing to <FRONTEND_URL>/verify/<code>. Sanitize the filename. Student name in notifications must be the real student, not "Alex Johnson".
4. Public verify endpoint GET /api/certificates/verify/{code} returns valid/revoked, student, course, date. CertificateVerification page uses it.
5. Student UI: for every enrolled course show an eligibility checklist ("Attendance 82% ✔ / Assessment 40% ✘ / Progress 100% ✔") and the Download button only when eligible. Remove defaultStudentCerts fake data completely.
6. Faculty/admin: view issued certs, revoke (with auth header), see eligibility per student.
Test (do all four): (a) student with 60% attendance → NOT eligible, no certificate; (b) all criteria met → certificate issued; (c) scan QR / open /verify/<code> → shows valid; (d) revoke → verify shows revoked.
```

## P7 – Real dashboards (Student / Faculty / Admin)

```
Task: dashboards must show real data. Files: views/Dashboard.tsx, views/ExecutiveCommandCenter.tsx, FacultyWorkspace.tsx, StudentJourneyWorkspace.tsx, FacultyDashboard.tsx, AdminDashboard.tsx, constants.tsx.
1. Dashboard.tsx should render by role: STUDENT → StudentIntelligenceDashboard (enrolled courses, attendance %, upcoming quizzes/assignments, certificates earned/eligible), FACULTY → FacultyDashboard (my courses, students, pending grading, attendance today), ADMIN → AdminDashboard (users by role, courses, enrollments, certificates issued, attendance rate).
2. Create backend endpoints GET /api/dashboard/student, /faculty, /admin computing everything from DB.
3. Delete ExecutiveCommandCenter, FacultyWorkspace, StudentJourneyWorkspace and every MOCK_* constant in constants.tsx that becomes unused. Empty state ("No courses yet") instead of fake numbers.
4. Every number on the dashboard must be traceable to a DB query.
Test: create a new student with no data → dashboard shows zeros, not fake numbers; enroll + attend → numbers change after refresh.
```

## P8 – Remove bloat

```
Task: remove everything that is not part of the 5 pillars (login/roles, enrollment, attendance, assessments, certification) + dashboard.
Delete these views and all their routes, menu entries, imports and constants: EnterpriseEcosystem.tsx, EcosystemDrawer.tsx, VoiceVivaModule.tsx, VirtualLab3DView.tsx, SkillQuestView.tsx, DegreeAuditView.tsx, SystemModule.tsx (fake telemetry), JudgeDemoTour.tsx. Review LibraryView.tsx, TimetableView.tsx, AnnouncementsView.tsx: keep only if they use real data and work end to end; otherwise delete.
Remove fake KPIs/buzzwords (NAAC A++, ₹ crore figures, "Quantum", "Neural Sentinel", Math.random CPU stats) from the whole codebase. Remove unused Gemini/Cloudinary/B2/MS-Access-sync code unless it is used by a pillar.
Make sure the sidebar shows only: Dashboard, Courses, Attendance, Assessments (Quizzes/Assignments), Certificates, Users (admin), Settings.
Test: npm run build with zero errors, no dead menu items, grep for the removed names returns nothing.
```

## P9 – Demo data, docs, deployment

```
Task: make it demo-ready.
1. Create server/seed_demo.py (run manually, idempotent, NOT at startup, never truncates tables): 1 admin, 2 faculty, 10 students, 3 courses with modules/lessons, enrollments, attendance records for 4 weeks, 2 quizzes with questions + attempts, 1 assignment, 2 students fully eligible for certificates and some not eligible.
2. Remove the startup auto-seed / 30-min legacy sync that deletes and reseeds tables.
3. README.md: honest feature list only, setup steps, .env.example, demo accounts, architecture diagram (mermaid), screenshots folder.
4. Add basic pytest tests: auth, self-enroll, attendance percentage, certificate eligibility rule, verify endpoint.
5. Deployment: make sure Render (backend) + Vercel/Netlify (frontend) configs work with env vars and Postgres. Give me the exact deployment steps.
Test: fresh clone → follow README only → app runs with demo data; pytest passes.
```

---

### Final checklist before submission
- [ ] All P0–P9 tests pass
- [ ] Live public link works on a phone
- [ ] PPT (8–10 slides): problem → solution → 5 pillars → architecture → demo → impact
- [ ] 3-minute demo script: Admin creates course → Student enrolls → Faculty marks attendance + quiz → Student gets certificate → QR verify
- [ ] Viva Q&A prepared (ask me, I'll generate)
