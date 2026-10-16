from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from datetime import datetime


# --- Course Schemas ---
class CourseCreate(BaseModel):
    code: str
    name: Optional[str] = None
    title: Optional[str] = None
    description: str = Field(..., min_length=30)
    credits: int = 3
    department_id: Optional[str] = None
    department: Optional[str] = None
    faculty_id: Optional[str] = None
    faculty: Optional[str] = None
    semester: int = 7
    schedule: Optional[str] = None
    max_students: int = 120
    syllabus_topics: List[str] = Field(default_factory=list)

    @model_validator(mode='after')
    def validate_name_title(self):
        if not self.name and not self.title:
            raise ValueError("Course title or name is required")
        if not self.name:
            self.name = self.title
        if not self.title:
            self.title = self.name
        return self


class CourseUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = Field(None, min_length=30)
    credits: Optional[int] = None
    department_id: Optional[str] = None
    faculty_id: Optional[str] = None
    semester: Optional[int] = None
    schedule: Optional[str] = None
    max_students: Optional[int] = None
    is_active: Optional[bool] = None
    syllabus_topics: Optional[List[str]] = None


class CourseResponse(BaseModel):
    id: str
    code: str
    name: str
    title: Optional[str] = None
    credits: int
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    faculty_id: Optional[str] = None
    faculty_name: Optional[str] = None
    semester: int
    description: Optional[str] = None
    schedule: Optional[str] = None
    max_students: int
    enrolled_count: int = 0
    progress: int = 0
    is_active: bool
    syllabus_topics: List[str] = []
    lessons_count: int = 0
    lesson_types: List[str] = []
    modules: List[dict] = []
    my_attendance: Optional[float] = None
    my_marks: Optional[float] = None

    class Config:
        from_attributes = True


class CourseDetailResponse(CourseResponse):
    materials: List[dict] = []
    attendance_history: List[dict] = []


class ModuleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    order_index: int = 0
    is_published: bool = True


class LessonCreate(BaseModel):
    title: str
    content_type: str = "VIDEO"
    content_url: Optional[str] = None
    content_body: Optional[str] = None
    duration_minutes: int = 0
    order_index: int = 0
    is_published: bool = True


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
    period: Optional[str] = None  # e.g. "09:00 - 10:00" or "Period 1"
    topic: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class AttendanceMarkItem(BaseModel):
    student_id: str
    status: str = "PRESENT"  # PRESENT | ABSENT | LATE


class AttendanceMarkPayload(BaseModel):
    course_id: str
    date: Optional[str] = None  # YYYY-MM-DD
    session_date: Optional[str] = None
    period: Optional[str] = None
    reason: Optional[str] = None  # Required if edit window (> 24h) has expired
    marks: Optional[List[AttendanceMarkItem]] = None
    students: Optional[List[AttendanceMarkItem]] = None
    attendance: Optional[List[AttendanceMarkItem]] = None


class AttendanceMarkRequest(BaseModel):
    reason: Optional[str] = None  # Required if edit window (> 24h) has expired
    marks: Optional[List[dict]] = None  # [{"student_id": "...", "status": "PRESENT|ABSENT|LATE"}]
    attendance: Optional[List[dict]] = None


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
