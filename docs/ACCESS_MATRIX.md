# EduSphere LMS Access Control & Data Scoping Matrix

This document defines the server-side role-based access control (RBAC) and data scoping policies implemented across all EduSphere API endpoints.

All scoping rules are centrally enforced via `server/middleware/scoping.py` and `server/middleware/auth.py`. Ad-hoc security checks have been replaced with central policy dependencies.

---

## Central Scoping Principles

1. **STUDENT Scoping**:
   - May only read their own profile, enrollments, attendance records, submission grades, quiz attempts, and certificates.
   - Any attempt to access, modify, or view another student's ID or record results in `403 Forbidden` or `404 Not Found`.
   - Access to Faculty and Admin management routes is strictly forbidden (`403 Forbidden`).

2. **FACULTY Scoping**:
   - May only access courses where `course.faculty_id == current_user.id`.
   - May only view student lists, rosters, and profiles for students enrolled in those courses.
   - May only mark attendance, grade assignments, create quizzes, and view submissions for their assigned courses.
   - Cross-faculty course operations result in `403 Forbidden`.

3. **ADMIN Scoping**:
   - Scope is strictly bounded by `current_user.org_id`.
   - Admin from Organization 1 can **never** view, modify, or query data belonging to Organization 2.
   - Attempts to access cross-organization resources result in `403 Forbidden` or `404 Not Found`.

4. **List & Pagination Guarantees**:
   - Every collection endpoint (`/api/users`, `/api/courses`, `/api/assignments`, `/api/certificates`, `/api/exams/results`, etc.) is scoped by organization and role filters.
   - Unpaginated global dump endpoints are removed; all listing queries require `limit` and `offset` pagination.

---

## Route Access Matrix

| Method | Path | Allowed Roles | Central Policy / Scoping Rule |
| :--- | :--- | :--- | :--- |
| **Authentication & Profile** | | | |
| `POST` | `/api/auth/login` | Public | Validates user credentials; returns JWT containing `sub`, `role`, `org_id`. |
| `POST` | `/api/auth/logout` | Authenticated | Invalidates session for current user. |
| `POST` | `/api/auth/refresh` | Authenticated | Refreshes token for caller only. |
| `GET` | `/api/auth/me` | Authenticated | Returns caller profile (`current_user`). |
| `POST` | `/api/auth/change-password` | Authenticated | Enforces password complexity; modifies password for caller only. |
| `POST` | `/api/auth/verify-reset-token`| Public | Verifies token validity within tenant context. |
| `POST` | `/api/auth/reset-password` | Public | Resets user password with valid reset token. |
| **User Management** | | | |
| `GET` | `/api/users/` | Admin, Faculty | Scoped by `org_id`. Faculty restricted strictly to students enrolled in taught courses. Paginated (`limit`, `offset`). Student receives `403 Forbidden`. |
| `GET` | `/api/users/{id}` | Authenticated | `verify_user_access`: Student only own ID; Faculty only enrolled students; Admin only within org. Cross-org returns `403 Forbidden`. |
| `POST` | `/api/users/student` | Admin | Creates student account scoped strictly to `current_user.org_id`. |
| `POST` | `/api/users/faculty` | Admin | Creates faculty account scoped strictly to `current_user.org_id`. |
| `POST` | `/api/users/bulk-import-preview` | Admin | In-memory validation for preview; scoped to admin `org_id`. |
| `POST` | `/api/users/bulk-import-confirm` | Admin | Provisions accounts and returns ephemeral in-memory credential sheet; scoped to admin `org_id`. |
| `PATCH`| `/api/users/{id}/status` | Admin | `verify_user_access(action="status")`; Target user must belong to admin `org_id`. |
| `POST` | `/api/users/{id}/reset-password` | Admin | `verify_user_access(action="reset_pwd")`; Target user must belong to admin `org_id`. Generates 16+ char temporary password. |
| `PUT`  | `/api/users/{id}` | Authenticated | `verify_user_access(action="write")`: Student can only update own profile; Admin within `org_id`. |
| `DELETE`| `/api/users/{id}` | Admin | `verify_user_access(action="delete")`: Target must belong to admin `org_id`. |
| **Courses & Curriculum** | | | |
| `GET` | `/api/courses/` | Authenticated | Scoped to `current_user.org_id`. Paginated (`limit`, `offset`). Role filtered. |
| `POST`| `/api/courses/` | Admin | Creates course with `org_id = current_user.org_id`. Faculty assigned must belong to same org. |
| `GET` | `/api/courses/{id}` | Authenticated | `verify_course_access(action="read")`: Enforces org scope, student enrollment check, or faculty assignment check. |
| `PUT` | `/api/courses/{id}` | Admin | `verify_course_access(action="manage")`: Admin within same org only. |
| `DELETE`| `/api/courses/{id}` | Admin | `verify_course_access(action="manage")`: Admin within same org only. |
| `GET` | `/api/courses/{id}/students` | Admin, Faculty | `verify_course_access(action="roster")`: Faculty only if assigned to course. Student receives `403 Forbidden`. |
| `POST`| `/api/courses/{id}/enroll` | Admin, Faculty | `verify_course_access(action="manage")`: Course & student must belong to caller org. Student receives `403 Forbidden`. |
| `DELETE`| `/api/courses/{id}/students/{sid}` | Admin, Faculty | `verify_course_access(action="manage")`: Student receives `403 Forbidden`. |
| `GET` | `/api/courses/{id}/materials` | Authenticated | `verify_course_access(action="materials")`: Requires enrollment or faculty assignment. |
| `POST`| `/api/courses/{id}/materials` | Admin, Faculty | `verify_course_access(action="manage_materials")`: Faculty must teach course. Student receives `403 Forbidden`. |
| **Attendance Operations** | | | |
| `POST`| `/api/attendance/mark` | Admin, Faculty | `verify_course_access(action="write")`: Faculty can only mark attendance for courses they teach. Student receives `403 Forbidden`. |
| `GET` | `/api/attendance/course/{id}/roster` | Admin, Faculty | `verify_course_access(action="roster")`: Faculty only if assigned. Student receives `403 Forbidden`. |
| `GET` | `/api/attendance/course/{id}/summary`| Admin, Faculty | `verify_course_access(action="roster")`: Faculty only if assigned. Student receives `403 Forbidden`. |
| `POST`| `/api/attendance/sessions` | Admin, Faculty | `verify_course_access(action="write")`: Course must belong to caller org and faculty. Student receives `403 Forbidden`. |
| `GET` | `/api/attendance/sessions/{id}` | Authenticated | `verify_attendance_session_access(action="read")`: Must have course access. |
| `POST`| `/api/attendance/sessions/{id}/mark`| Admin, Faculty | `verify_attendance_session_access(action="write")`: Faculty only for own course session. Student receives `403 Forbidden`. |
| `GET` | `/api/attendance/history` | Authenticated | Scoped to caller org; Student only sees own history; Faculty only taught courses; Admin sees org; Paginated. |
| `GET` | `/api/attendance/course/{cid}/student/{sid}` | Authenticated | Scoped: Student only self (`sid == current_user.id`); Faculty only if assigned to `cid`; Admin within org. Cross-student returns `403 Forbidden`. |
| **Assignments & Submissions** | | | |
| `GET` | `/api/assignments` | Authenticated | Scoped to caller org; Student only enrolled courses; Faculty only taught courses; Admin sees org; Paginated (`limit`, `offset`). |
| `POST`| `/api/assignments` | Admin, Faculty | `verify_course_access(action="write")`: Faculty must teach target course. Student receives `403 Forbidden`. |
| `GET` | `/api/assignments/{id}` | Authenticated | `verify_assignment_access(action="read")`: Student must be enrolled in course; Faculty must teach course. |
| `POST`| `/api/assignments/{id}/submit` | Student | `verify_assignment_access(action="submit")`: Student must be enrolled in course; Submits only on their own behalf. |
| `GET` | `/api/assignments/{id}/submissions` | Admin, Faculty | `verify_assignment_access(action="grade")`: Faculty only for taught courses. Paginated (`limit`, `offset`). Student receives `403 Forbidden`. |
| `POST`| `/api/assignments/submissions/{id}/grade` | Admin, Faculty | `verify_submission_access(action="grade")`: Faculty can only grade submissions in courses they teach. Student receives `403 Forbidden`. |
| **Examinations & Quizzes** | | | |
| `GET` | `/api/exams/schedules` | Authenticated | Scoped to `current_user.org_id`. Paginated. |
| `POST`| `/api/exams/schedules` | Admin, Faculty | `verify_course_access(action="write")`: Faculty must teach course. Student receives `403 Forbidden`. |
| `GET` | `/api/exams/results` | Authenticated | Student only views own results; Faculty only taught courses; Admin views org; Paginated (`limit`, `offset`). |
| `POST`| `/api/exams/results/bulk` | Admin, Faculty | `verify_course_access(action="write")`: Faculty only for taught courses. Student receives `403 Forbidden`. |
| `GET` | `/api/exams/quizzes` | Authenticated | Student enrolled courses; Faculty taught courses; Admin org; Paginated. |
| `POST`| `/api/exams/quizzes` | Admin, Faculty | `verify_course_access(action="write")`: Faculty must teach course. Student receives `403 Forbidden`. |
| `GET` | `/api/exams/quizzes/{id}` | Authenticated | `verify_quiz_access(action="read")`: Must have access to quiz course. |
| `POST`| `/api/exams/quizzes/{id}/submit` | Student | `verify_quiz_access(action="submit")`: Student must be enrolled. Attempt registered only for caller. |
| `GET` | `/api/exams/quizzes/{id}/attempts` | Admin, Faculty | `verify_quiz_access(action="view_attempts")`: Faculty only for taught course. Student receives `403 Forbidden`. |
| **Certificates & Verification** | | | |
| `GET` | `/api/certificates` | Authenticated | Student only sees own certificates; Faculty only taught courses; Admin sees org; Paginated (`limit`, `offset`). |
| `GET` | `/api/certificates/{id_or_code}` | Authenticated | `verify_certificate_access(action="read")`: Student only own certificate; Faculty only taught course; Admin org. Cross-student returns `403 Forbidden`. |
| `POST`| `/api/certificates/evaluate` | Admin, Faculty | `verify_course_access(action="evaluate_cert")`: Student receives `403 Forbidden`. |
| `POST`| `/api/certificates/bulk-issue` | Admin | Issues eligible certificates across org. Non-admin receives `403 Forbidden`. |
| `POST`| `/api/certificates/{id}/revoke`| Admin | `verify_certificate_access(action="revoke")`: Target cert must belong to admin `org_id`. Non-admin receives `403 Forbidden`. |
| `GET` | `/api/certificates/{id}/download` | Authenticated | `verify_certificate_access(action="read")`: Student only own certificate. Cross-student returns `403 Forbidden`. |
| **Metrics & Academic Computing** | | | |
| `GET` | `/api/me/summary` | Student, Authenticated | Computes metrics strictly for authenticated student using `services/metrics.py`. |
| `GET` | `/api/me/courses/{id}/metrics` | Authenticated | `verify_course_access(action="read")`: Enforces enrollment for student. |
| `GET` | `/api/faculty/courses/{id}/metrics` | Admin, Faculty | `verify_course_access(action="read_metrics")`: Faculty only for courses where `faculty_id == me`. Student receives `403 Forbidden`. |
| `GET` | `/api/admin/overview` | Admin | Filtered strictly by `org_id == current_user.org_id`. Non-admin receives `403 Forbidden`. |
| **Dashboard Feeds** | | | |
| `GET` | `/api/dashboard/student` | Authenticated | Data computed strictly for authenticated student caller. |
| `GET` | `/api/dashboard/faculty` | Admin, Faculty | Courses filtered to `Course.faculty_id == current_user.id` (or org if admin). |
| `GET` | `/api/dashboard/admin` | Admin | Aggregate counts filtered strictly by `current_user.org_id`. |
| `GET` | `/api/dashboard/system/config`| Admin | System config scoped to admin `org_id`. |
| `POST`| `/api/dashboard/system/provision`| Admin | Scoped to admin `org_id`. Non-admin receives `403 Forbidden`. |
| `POST`| `/api/dashboard/system/audit`| Admin | Scoped to admin `org_id`. Non-admin receives `403 Forbidden`. |
| `GET` | `/api/dashboard/analytics` | Admin, Faculty | Filtered to `PlacementStats.org_id == current_user.org_id`. |
| **Reports & Exports** | | | |
| `GET` | `/api/reports/attendance.csv` | Admin, Faculty | Scoped to `org_id`; Faculty limited to taught courses. Student receives `403 Forbidden`. |
| `GET` | `/api/reports/marks.csv` | Admin, Faculty | Scoped to `org_id`; Faculty limited to taught courses. Student receives `403 Forbidden`. |
| `GET` | `/api/reports/certificates.csv` | Admin, Faculty | Scoped to `org_id`; Faculty limited to taught courses. Student receives `403 Forbidden`. |
| `GET` | `/api/reports/admin/summary` | Admin | Aggregated course summaries strictly for admin `org_id`. Non-admin receives `403 Forbidden`. |
