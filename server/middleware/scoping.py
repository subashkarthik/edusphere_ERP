from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.user import User, UserRole
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog
from models.content import Assignment, Submission
from models.exam import Quiz, QuizAttempt, ExamSchedule
from models.certificate import Certificate


def verify_org_access(current_user: User, resource_org_id: Optional[str]) -> None:
    """
    Enforce organizational boundary (ADMIN, FACULTY, STUDENT).
    Users cannot access resources belonging to another organization.
    """
    user_org = getattr(current_user, "org_id", None) or "org-edusphere"
    res_org = resource_org_id or "org-edusphere"
    if user_org != res_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cross-organization data access denied.",
        )


def verify_user_access(
    target_user_id: str,
    current_user: User,
    db: Session,
    action: str = "read",
) -> User:
    """
    Enforce user profile and data scoping:
    - STUDENT: strictly their own user ID. Changing any ID in URL returns 403.
    - FACULTY: themselves OR students actively enrolled in courses taught by this faculty.
               Cannot view/modify other faculty or administrative accounts.
    - ADMIN: any user in their organization. Never other organizations.
    """
    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    verify_org_access(current_user, target.org_id)

    # 1. STUDENT
    if current_user.role == UserRole.STUDENT:
        if current_user.id != target_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Students are only permitted to access their own profile and records.",
            )
        return target

    # 2. FACULTY
    if current_user.role == UserRole.FACULTY:
        if action in ["write", "modify", "delete", "reset_password", "status"]:
            if current_user.id != target_user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Faculty cannot modify other accounts.",
                )
            return target

        # Read action
        if current_user.id == target_user_id:
            return target

        if target.role == UserRole.STUDENT:
            # Must be actively enrolled in at least one course taught by this faculty member
            is_enrolled = (
                db.query(Enrollment)
                .join(Course, Enrollment.course_id == Course.id)
                .filter(
                    Enrollment.student_id == target_user_id,
                    Course.faculty_id == current_user.id,
                    Course.org_id == current_user.org_id,
                    Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
                )
                .first()
            )
            if not is_enrolled:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Faculty can only inspect students enrolled in their assigned courses.",
                )
            return target
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Faculty cannot inspect other faculty or administrative accounts.",
            )

    # 3. ADMIN
    if current_user.role == UserRole.ADMIN:
        return target

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Forbidden: Access denied.",
    )


def verify_course_access(
    course_id: str,
    current_user: User,
    db: Session,
    action: str = "read",
) -> Course:
    """
    Enforce course scoping:
    - STUDENT: only enrolled courses (or public catalog read). Cannot manage or view rosters.
    - FACULTY: only courses where faculty_id == me for management/roster/marking/grading.
    - ADMIN: any course in their org. Never other orgs.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    verify_org_access(current_user, course.org_id)

    # Management / write actions
    if action in ["write", "manage", "mark_attendance", "grade", "create_content", "enroll"]:
        if current_user.role == UserRole.STUDENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Students cannot manage courses.",
            )
        if current_user.role == UserRole.FACULTY:
            if course.faculty_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Faculty can only manage courses where faculty_id = me.",
                )
        return course

    # Roster / enrolled students / faculty metrics actions
    if action in ["roster", "view_enrolled", "faculty_metrics"]:
        if current_user.role == UserRole.STUDENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Students cannot view course enrollment rosters.",
            )
        if current_user.role == UserRole.FACULTY:
            if course.faculty_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Faculty can only view roster and metrics for courses where faculty_id = me.",
                )
        return course

    # Read course metrics / materials
    if action in ["read_metrics", "materials"]:
        if current_user.role == UserRole.STUDENT:
            is_enrolled = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course.id,
                Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
            ).first()
            if not is_enrolled:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Students can only view metrics and materials for their enrolled courses.",
                )
        elif current_user.role == UserRole.FACULTY:
            if course.faculty_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Faculty can only view metrics for courses where faculty_id = me.",
                )

    return course


def verify_attendance_session_access(
    session_id: str,
    current_user: User,
    db: Session,
    action: str = "read",
) -> AttendanceSession:
    """
    Enforce attendance session scoping:
    - STUDENT: cannot access full session roster/details.
    - FACULTY: only sessions for courses where faculty_id = me.
    - ADMIN: only sessions in their org.
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance session not found",
        )

    verify_org_access(current_user, session.org_id)

    if current_user.role == UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Students cannot inspect or mark attendance session rosters.",
        )

    if current_user.role == UserRole.FACULTY:
        course = session.course or db.query(Course).filter(Course.id == session.course_id).first()
        if not course or course.faculty_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Faculty can only access attendance sessions for courses where faculty_id = me.",
            )

    return session


def verify_assignment_access(
    assignment_id: str,
    current_user: User,
    db: Session,
    action: str = "read",
) -> Assignment:
    """
    Enforce assignment scoping:
    - STUDENT: only assignments for enrolled courses in their org.
    - FACULTY: only assignments for courses where faculty_id = me.
    - ADMIN: whole org.
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    verify_org_access(current_user, assignment.org_id)

    course = assignment.course or db.query(Course).filter(Course.id == assignment.course_id).first()

    if action in ["write", "manage"]:
        if current_user.role == UserRole.STUDENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Students cannot manage assignments.",
            )
        if current_user.role == UserRole.FACULTY:
            if not course or course.faculty_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Faculty can only manage assignments for courses where faculty_id = me.",
                )

    if action == "submit":
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Only students can submit assignments.",
            )
        if course:
            is_enrolled = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course.id,
                Enrollment.status == EnrollmentStatus.ACTIVE,
            ).first()
            if not is_enrolled:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You are not enrolled in the course for this assignment.",
                )

    return assignment


def verify_submission_access(
    submission_id: str,
    current_user: User,
    db: Session,
    action: str = "read",
) -> Submission:
    """
    Enforce submission scoping:
    - STUDENT: only their own submission.
    - FACULTY: only submissions for courses where faculty_id = me.
    - ADMIN: whole org.
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    verify_org_access(current_user, submission.org_id)

    assignment = submission.assignment or db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
    course = assignment.course if assignment else None
    if not course and assignment:
        course = db.query(Course).filter(Course.id == assignment.course_id).first()

    if current_user.role == UserRole.STUDENT:
        if submission.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Students can only access their own submissions.",
            )
        if action == "grade":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Students cannot grade submissions.",
            )

    if current_user.role == UserRole.FACULTY:
        if not course or course.faculty_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Faculty can only access or grade submissions for courses where faculty_id = me.",
            )

    return submission


def verify_quiz_access(
    quiz_id: str,
    current_user: User,
    db: Session,
    action: str = "read",
) -> Quiz:
    """
    Enforce quiz scoping:
    - STUDENT: only quizzes for enrolled courses in their org.
    - FACULTY: only quizzes for courses where faculty_id = me.
    - ADMIN: whole org.
    """
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found",
        )

    verify_org_access(current_user, quiz.org_id)

    course = quiz.course or db.query(Course).filter(Course.id == quiz.course_id).first()

    if action in ["write", "manage", "view_attempts"]:
        if current_user.role == UserRole.STUDENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Students cannot manage quizzes or inspect other attempts.",
            )
        if current_user.role == UserRole.FACULTY:
            if not course or course.faculty_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Faculty can only manage quizzes and view attempts for courses where faculty_id = me.",
                )

    if action in ["take", "submit"]:
        if current_user.role == UserRole.STUDENT:
            if course:
                is_enrolled = db.query(Enrollment).filter(
                    Enrollment.student_id == current_user.id,
                    Enrollment.course_id == course.id,
                    Enrollment.status == EnrollmentStatus.ACTIVE,
                ).first()
                if not is_enrolled:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Forbidden: You are not enrolled in the course for this quiz.",
                    )

    return quiz


def verify_certificate_access(
    certificate_id_or_code: str,
    current_user: User,
    db: Session,
    action: str = "read",
) -> Certificate:
    """
    Enforce certificate scoping:
    - STUDENT: only their own certificate.
    - FACULTY: only certificates for courses where faculty_id = me.
    - ADMIN: whole org.
    """
    cert = db.query(Certificate).filter(
        (Certificate.id == certificate_id_or_code) | (Certificate.certificate_code == certificate_id_or_code)
    ).first()
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found",
        )

    verify_org_access(current_user, cert.org_id)

    course = cert.course or db.query(Course).filter(Course.id == cert.course_id).first()

    if current_user.role == UserRole.STUDENT:
        if cert.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Students can only access their own certificates.",
            )
        if action == "revoke":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Students cannot revoke certificates.",
            )

    if current_user.role == UserRole.FACULTY:
        if not course or course.faculty_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Faculty can only access or manage certificates for courses where faculty_id = me.",
            )

    return cert
