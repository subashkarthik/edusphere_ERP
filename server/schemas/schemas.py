from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# --- Course Schemas ---
class CourseCreate(BaseModel):
    code: str
    name: str
    credits: int = 3
    department_id: str
    faculty_id: Optional[str] = None
    semester: int = 7
    description: Optional[str] = None
    schedule: Optional[str] = None
    max_students: int = 120


class CourseResponse(BaseModel):
    id: str
    code: str
    name: str
    credits: int
    department_id: str
    faculty_id: Optional[str] = None
    faculty_name: Optional[str] = None
    semester: int
    description: Optional[str] = None
    schedule: Optional[str] = None
    max_students: int
    enrolled_count: int = 0
    progress: int = 0
    is_active: bool

    class Config:
        from_attributes = True


class CourseDetailResponse(CourseResponse):
    materials: List[dict] = []
    attendance_history: List[dict] = []


# --- Enrollment Schemas ---
class EnrollRequest(BaseModel):
    student_ids: List[str]


class EnrollmentResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    course_id: str
    course_name: str
    semester_label: str
    grade: Optional[str] = None
    gpa_points: Optional[float] = None
    status: str

    class Config:
        from_attributes = True


# --- Material Schemas ---
class MaterialCreate(BaseModel):
    title: str
    file_type: str = "PDF"
    file_url: str = ""
    file_size: str = "0 KB"


class MaterialResponse(BaseModel):
    id: str
    title: str
    file_type: str
    file_url: str
    file_size: str
    uploaded_at: datetime
    uploaded_by_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- Attendance Schemas ---
class AttendanceSessionCreate(BaseModel):
    course_id: str
    session_date: str  # YYYY-MM-DD
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class AttendanceMarkRequest(BaseModel):
    marks: List[dict]  # [{"student_id": "...", "status": "PRESENT|ABSENT|LATE"}]


class AttendanceSummaryResponse(BaseModel):
    course_code: str
    course_name: str
    percentage: float
    classes_held: int
    classes_attended: int
    status: Optional[str] = "SAFE"



class AttendanceHistoryResponse(BaseModel):
    date: str
    status: str
    time: str
    faculty: str


# --- Exam Schemas ---
class ExamScheduleCreate(BaseModel):
    course_id: str
    exam_type: str
    title: str
    exam_date: str  # ISO datetime
    max_marks: int = 100
    duration_minutes: int = 180
    venue: str = "TBD"


class ExamResultCreate(BaseModel):
    student_id: str
    enrollment_id: str
    marks_obtained: float
    grade: Optional[str] = None
    remarks: Optional[str] = None


class ExamResultBulkCreate(BaseModel):
    exam_id: str
    results: List[ExamResultCreate]


class TranscriptResponse(BaseModel):
    semester: str
    courses: List[dict]
    sgpa: float


# --- Finance Schemas ---
class FeeResponse(BaseModel):
    id: str
    label: str
    amount: float
    due_date: str
    status: str  # Paid / Pending
    payment_date: Optional[str] = None
    semester_label: str


class PaymentCreate(BaseModel):
    fee_structure_id: str
    amount_paid: float
    payment_method: str = "Online"
    transaction_id: str = ""


class FinanceReportResponse(BaseModel):
    total_revenue: float
    total_outstanding: float
    total_students: int
    collection_rate: float


# --- Placement Schemas ---
class PlacementDriveCreate(BaseModel):
    company_name: str
    role_offered: str
    package_lpa: float
    drive_date: str
    last_date_apply: str
    eligibility_criteria: Optional[str] = None
    description: Optional[str] = None


class PlacementDriveResponse(BaseModel):
    id: str
    company_name: str
    role_offered: str
    package_lpa: float
    drive_date: str
    status: str
    application_status: Optional[str] = None

    class Config:
        from_attributes = True


class PlacementStatsResponse(BaseModel):
    year: str
    placed: int
    total: int
    avg_lpa: float


# --- Timetable Schemas ---
class TimetableCreate(BaseModel):
    course_id: str
    faculty_id: Optional[str] = None
    day_of_week: str
    start_time: str
    end_time: str
    venue: str
    entry_type: str = "LECTURE"


class TimetableResponse(BaseModel):
    id: str
    day: str
    time: str
    course: str
    venue: str
    faculty: Optional[str] = None
    entry_type: str


# --- Announcement Schemas ---
class AnnouncementCreate(BaseModel):
    title: str
    content: str
    target_roles: str = "ADMIN,FACULTY,STUDENT"
    priority: str = "MEDIUM"
    is_pinned: bool = False


class AnnouncementResponse(BaseModel):
    id: str
    title: str
    content: str
    author_name: str
    target_roles: str
    priority: str
    is_pinned: bool
    published_at: datetime

    class Config:
        from_attributes = True


# --- Dashboard Schemas ---
class DashboardMetricResponse(BaseModel):
    label: str
    value: str
    change: str
    trend: str  # up / down / neutral


class ActivityResponse(BaseModel):
    label: str
    description: str
    time: str
    type: str  # attendance / enrollment / fee / security


# --- AI Schemas ---
class AIChatRequest(BaseModel):
    message: str


class AIChatResponse(BaseModel):
    response: str
