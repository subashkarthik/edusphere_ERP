# EduSphere LMS — Database Schema & Data Model Specification

## 1. Overview & Multi-Tenancy Design
EduSphere is a multi-tenant institutional Learning Management System. Every entity in the system belongs to an **Organization** (`org_id`). 
All database queries must be filtered by the authenticated user's `org_id` derived directly from their verified JWT token.

---

## 2. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : "has members"
    ORGANIZATION ||--o{ COURSE : "offers"
    ORGANIZATION ||--o{ AUDIT_LOG : "records"
    ORGANIZATION ||--o{ CERTIFICATE_POLICY : "defines"

    USER ||--o| STUDENT_PROFILE : "profile (student)"
    USER ||--o| FACULTY_PROFILE : "profile (faculty)"
    USER ||--o{ ENROLLMENT : "enrolled in"
    USER ||--o{ COURSE : "teaches (faculty)"
    USER ||--o{ ATTENDANCE : "attendance records"
    USER ||--o{ QUIZ_ATTEMPT : "attempts"
    USER ||--o{ SUBMISSION : "submits"
    USER ||--o{ LESSON_PROGRESS : "completes"
    USER ||--o{ CERTIFICATE : "earns"
    USER ||--o{ AUDIT_LOG : "performs (actor)"

    COURSE ||--o{ ENROLLMENT : "has students"
    COURSE ||--o{ CLASS_SESSION : "schedules"
    COURSE ||--o{ MODULE : "contains"
    COURSE ||--o{ QUIZ : "evaluates"
    COURSE ||--o{ ASSIGNMENT : "assigns"
    COURSE ||--o| CERTIFICATE_POLICY : "governed by"
    COURSE ||--o{ CERTIFICATE : "issues"

    CLASS_SESSION ||--o{ ATTENDANCE : "logs attendance"

    MODULE ||--o{ LESSON : "contains"
    LESSON ||--o{ LESSON_PROGRESS : "tracks progress"

    QUIZ ||--o{ QUIZ_QUESTION : "contains"
    QUIZ ||--o{ QUIZ_ATTEMPT : "attempts"

    ASSIGNMENT ||--o{ SUBMISSION : "receives"

    ORGANIZATION {
        string id PK
        string name
        string domain UK
        string plan
        datetime created_at
    }

    USER {
        string id PK
        string org_id FK
        string role "ADMIN | FACULTY | STUDENT"
        string name
        string email UK
        string login_id UK
        string password_hash
        boolean must_change_password
        boolean is_active
        string created_by FK
        datetime last_login_at
        datetime created_at
        datetime updated_at
    }

    STUDENT_PROFILE {
        string id PK
        string org_id FK
        string user_id FK, UK
        string register_no UK
        string department
        string year_semester
        string section
        datetime created_at
    }

    FACULTY_PROFILE {
        string id PK
        string org_id FK
        string user_id FK, UK
        string employee_id UK
        string department
        string designation
        datetime created_at
    }

    COURSE {
        string id PK
        string org_id FK
        string code
        string title
        string description
        int credits
        int semester
        string department_id FK
        string faculty_id FK
        boolean is_active
        datetime created_at
    }

    ENROLLMENT {
        string id PK
        string org_id FK
        string student_id FK
        string course_id FK
        string status "ACTIVE | COMPLETED | DROPPED"
        string enrolled_by FK
        datetime enrolled_at
    }

    CLASS_SESSION {
        string id PK
        string org_id FK
        string course_id FK
        date session_date
        string period
        string topic
        string created_by FK
        string status "OPEN | CLOSED"
        datetime created_at
    }

    ATTENDANCE {
        string id PK
        string org_id FK
        string session_id FK
        string student_id FK
        string status "PRESENT | ABSENT | LATE | OD"
        string marked_by FK
        datetime marked_at
    }

    QUIZ {
        string id PK
        string org_id FK
        string course_id FK
        string title
        int total_marks
        float passing_percentage
        boolean is_active
        datetime created_at
    }

    QUIZ_ATTEMPT {
        string id PK
        string org_id FK
        string quiz_id FK
        string student_id FK
        float score
        float percentage
        boolean passed
        datetime completed_at
    }

    ASSIGNMENT {
        string id PK
        string org_id FK
        string course_id FK
        string title
        int max_marks
        datetime due_date
        datetime created_at
    }

    SUBMISSION {
        string id PK
        string org_id FK
        string assignment_id FK
        string student_id FK
        string file_url
        float marks_obtained
        string status "SUBMITTED | GRADED | LATE"
        string graded_by_id FK
        datetime submitted_at
    }

    LESSON {
        string id PK
        string org_id FK
        string module_id FK
        string title
        string content_type "VIDEO | PDF | QUIZ | LINK"
        int duration_minutes
        int order_index
        datetime created_at
    }

    LESSON_PROGRESS {
        string id PK
        string org_id FK
        string user_id FK
        string lesson_id
        boolean completed
        datetime completed_at
    }

    CERTIFICATE_POLICY {
        string id PK
        string org_id FK
        string course_id FK, UK
        float min_attendance_pct
        float min_assessment_pct
        float min_progress_pct
        datetime updated_at
    }

    CERTIFICATE {
        string id PK
        string org_id FK
        string certificate_code UK
        string user_id FK
        string course_id FK
        float attendance_pct
        float assessment_pct
        float progress_pct
        string eligibility_status "ISSUED | REVOKED"
        datetime issued_date
        datetime revoked_at
    }

    AUDIT_LOG {
        string id PK
        string org_id FK
        string actor_id FK
        string action
        string entity
        string entity_id
        json before_state
        json after_state
        string ip
        datetime created_at
    }
```

---

## 3. Detailed Entity Schema & Constraints

### 3.1 Organization (`organizations`)
- `id`: `String(36)`, Primary Key.
- `name`: `String(100)`, Not Null.
- `domain`: `String(100)`, Unique, Nullable.
- `plan`: `Enum('FREE', 'PRO', 'ENTERPRISE')`, Default `'FREE'`.
- `created_at`: `DateTime`, Default UTC.

### 3.2 User (`users`)
- `id`: `String(36)`, Primary Key.
- `org_id`: `String(36)`, Foreign Key → `organizations.id`, Not Null, Indexed.
- `role`: `Enum('ADMIN', 'FACULTY', 'STUDENT')`, Not Null, Default `'STUDENT'`.
- `name`: `String(255)`, Not Null.
- `email`: `String(255)`, Unique, Not Null, Indexed.
- `login_id`: `String(100)`, Unique, Nullable, Indexed (can hold Roll No / Employee ID / handle).
- `password_hash`: `String(255)`, Not Null (PBKDF2-SHA256).
- `must_change_password`: `Boolean`, Default `False`.
- `is_active`: `Boolean`, Default `True`.
- `created_by`: `String(36)`, Foreign Key → `users.id`, Nullable.
- `last_login_at`: `DateTime`, Nullable.
- `created_at`: `DateTime`, Default UTC.
- `updated_at`: `DateTime`, Default UTC.

### 3.3 StudentProfile (`student_profiles`)
- `id`: `String(36)`, Primary Key.
- `org_id`: `String(36)`, Foreign Key → `organizations.id`, Not Null, Indexed.
- `user_id`: `String(36)`, Foreign Key → `users.id`, Unique, Not Null, Indexed.
- `register_no`: `String(50)`, Nullable, Indexed.
- `department`: `String(100)`, Nullable.
- `year_semester`: `String(50)`, Nullable.
- `section`: `String(20)`, Nullable.
- `created_at`: `DateTime`, Default UTC.
- `updated_at`: `DateTime`, Default UTC.
- **Constraints**: `UNIQUE(org_id, register_no)`.

### 3.4 FacultyProfile (`faculty_profiles`)
- `id`: `String(36)`, Primary Key.
- `org_id`: `String(36)`, Foreign Key → `organizations.id`, Not Null, Indexed.
- `user_id`: `String(36)`, Foreign Key → `users.id`, Unique, Not Null, Indexed.
- `employee_id`: `String(50)`, Nullable, Indexed.
- `department`: `String(100)`, Nullable.
- `designation`: `String(100)`, Nullable.
- `created_at`: `DateTime`, Default UTC.
- `updated_at`: `DateTime`, Default UTC.
- **Constraints**: `UNIQUE(org_id, employee_id)`.

### 3.5 Course (`courses`)
- `id`: `String(36)`, Primary Key.
- `org_id`: `String(36)`, Foreign Key → `organizations.id`, Not Null, Indexed.
- `code`: `String(20)`, Not Null, Indexed.
- `title`: `String(255)`, Not Null.
- `description`: `Text`, Nullable.
- `credits`: `Integer`, Default 3.
- `semester`: `Integer`, Default 1.
- `department_id`: `String(36)`, Foreign Key → `departments.id`, Nullable.
- `faculty_id`: `String(36)`, Foreign Key → `users.id`, Nullable, Indexed.
- `is_active`: `Boolean`, Default `True`.
- `created_at`: `DateTime`, Default UTC.
- **Constraints**: `UNIQUE(org_id, code)`.

### 3.6 Enrollment (`enrollments`)
- `id`: `String(36)`, Primary Key.
- `org_id`: `String(36)`, Foreign Key → `organizations.id`, Not Null, Indexed.
- `student_id`: `String(36)`, Foreign Key → `users.id`, Not Null, Indexed.
- `course_id`: `String(36)`, Foreign Key → `courses.id`, Not Null, Indexed.
- `status`: `Enum('ACTIVE', 'COMPLETED', 'DROPPED')`, Default `'ACTIVE'`.
- `enrolled_by`: `String(36)`, Foreign Key → `users.id`, Nullable.
- `enrolled_at`: `DateTime`, Default UTC.
- **Constraints**: `UNIQUE(student_id, course_id)`.

### 3.7 ClassSession (`attendance_sessions` / `class_sessions`)
- `id`: `String(36)`, Primary Key.
- `org_id`: `String(36)`, Foreign Key → `organizations.id`, Not Null, Indexed.
- `course_id`: `String(36)`, Foreign Key → `courses.id`, Not Null, Indexed.
- `session_date`: `Date`, Not Null, Indexed.
- `period`: `String(50)`, Nullable (e.g. "09:00 - 10:00").
- `topic`: `String(255)`, Nullable.
- `created_by`: `String(36)`, Foreign Key → `users.id`, Not Null.
- `status`: `Enum('OPEN', 'CLOSED')`, Default `'OPEN'`.
- `created_at`: `DateTime`, Default UTC.

### 3.8 Attendance (`attendance_logs`)
- `id`: `String(36)`, Primary Key.
- `org_id`: `String(36)`, Foreign Key → `organizations.id`, Not Null, Indexed.
- `session_id`: `String(36)`, Foreign Key → `attendance_sessions.id`, Not Null, Indexed.
- `student_id`: `String(36)`, Foreign Key → `users.id`, Not Null, Indexed.
- `status`: `Enum('PRESENT', 'ABSENT', 'LATE', 'OD')`, Default `'PRESENT'`.
- `marked_by`: `String(36)`, Foreign Key → `users.id`, Nullable.
- `marked_at`: `DateTime`, Default UTC.
- **Constraints**: `UNIQUE(session_id, student_id)`.

### 3.9 Assessment (Quiz & Assignment), Attempts & Scores
- **Quiz (`quizzes`)**:
  - `id`: PK, `org_id`: FK, `course_id`: FK, `title`: String, `total_marks`: Int, `passing_percentage`: Float, `is_active`: Bool.
- **QuizAttempt (`quiz_attempts`)**:
  - `id`: PK, `org_id`: FK, `quiz_id`: FK, `student_id`: FK, `score`: Float, `percentage`: Float, `passed`: Bool, `completed_at`: DateTime.
- **Assignment (`assignments`)**:
  - `id`: PK, `org_id`: FK, `course_id`: FK, `title`: String, `max_marks`: Int, `due_date`: DateTime.
- **Submission (`submissions`)**:
  - `id`: PK, `org_id`: FK, `assignment_id`: FK, `student_id`: FK, `file_url`: String, `marks_obtained`: Float, `status`: Enum, `graded_by_id`: FK.
  - **Constraints**: `UNIQUE(assignment_id, student_id)`.

### 3.10 Lesson & LessonProgress (`lessons`, `lesson_progress`)
- **Lesson (`lessons`)**:
  - `id`: PK, `org_id`: FK, `module_id`: FK, `title`: String, `content_type`: Enum, `duration_minutes`: Int, `order_index`: Int.
- **LessonProgress (`lesson_progress`)**:
  - `id`: PK, `org_id`: FK, `user_id`: FK (`student_id`), `lesson_id`: String, `completed`: Bool, `completed_at`: DateTime.
  - **Constraints**: `UNIQUE(user_id, lesson_id)`.

### 3.11 CertificatePolicy & Certificate
- **CertificatePolicy (`certificate_policies`)**:
  - `id`: `String(36)`, Primary Key.
  - `org_id`: `String(36)`, Foreign Key → `organizations.id`, Not Null, Indexed.
  - `course_id`: `String(36)`, Foreign Key → `courses.id`, Not Null, Indexed.
  - `min_attendance_pct`: `Float`, Default 75.0.
  - `min_assessment_pct`: `Float`, Default 50.0.
  - `min_progress_pct`: `Float`, Default 100.0.
  - `created_at`: `DateTime`, Default UTC.
  - `updated_at`: `DateTime`, Default UTC.
  - **Constraints**: `UNIQUE(course_id)`.
- **Certificate (`certificates`)**:
  - `id`: `String(36)`, Primary Key.
  - `org_id`: `String(36)`, Foreign Key → `organizations.id`, Not Null, Indexed.
  - `certificate_code`: `String(100)`, Unique, Not Null, Indexed.
  - `user_id`: `String(36)`, Foreign Key → `users.id`, Not Null, Indexed.
  - `course_id`: `String(36)`, Foreign Key → `courses.id`, Not Null, Indexed.
  - `attendance_pct`: `Float`, Not Null (snapshot at issuance).
  - `assessment_pct`: `Float`, Not Null (snapshot at issuance).
  - `progress_pct`: `Float`, Not Null (snapshot at issuance).
  - `eligibility_status`: `Enum('ISSUED', 'REVOKED')`.
  - `issued_date`: `DateTime`, Default UTC.
  - `revoked_at`: `DateTime`, Nullable.
  - **Constraints**: `UNIQUE(certificate_code)`.

### 3.12 AuditLog (`audit_logs`)
- `id`: `String(36)`, Primary Key.
- `org_id`: `String(36)`, Foreign Key → `organizations.id`, Not Null, Indexed.
- `actor_id`: `String(36)`, Foreign Key → `users.id`, Not Null, Indexed.
- `action`: `String(100)`, Not Null (e.g. `ENROLLMENT_CREATED`, `GRADE_SUBMITTED`, `CERTIFICATE_ISSUED`).
- `entity`: `String(50)`, Not Null (e.g. `COURSE`, `USER`, `ATTENDANCE`, `CERTIFICATE`).
- `entity_id`: `String(36)`, Nullable, Indexed.
- `before_state`: `JSON`, Nullable.
- `after_state`: `JSON`, Nullable.
- `ip`: `String(45)`, Nullable.
- `user_agent`: `Text`, Nullable.
- `created_at`: `DateTime`, Default UTC, Indexed.

---

## 4. Query Isolation & Access Control Rules

1. **Multi-Tenant Filter**:
   Every query must include `WHERE org_id = :current_user_org_id`.
2. **Role Boundaries**:
   - `STUDENT`: Can read own profile, own enrollments, own attendance records, own quiz attempts, own submissions, and own certificates. Cannot view other students' records.
   - `FACULTY`: Can read and manage only courses where `faculty_id = :current_user_id`, class sessions for their courses, attendance logs for their courses, and submissions for their assignments.
   - `ADMIN`: Can manage all entities within their own `org_id`. Cannot access entities belonging to other organizations.
