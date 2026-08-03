from sqlalchemy import String, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from database import Base
from datetime import datetime

class SyncedSubject(Base):
    __tablename__ = "synced_subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_lab: Mapped[bool] = mapped_column(Boolean, default=False)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hours_per_week: Mapped[int] = mapped_column(Integer, default=3)

class SyncedFaculty(Base):
    __tablename__ = "synced_faculty"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)

class SyncedRoom(Base):
    __tablename__ = "synced_rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=60)
    is_lab: Mapped[bool] = mapped_column(Boolean, default=False)

class SyncedTimeSlot(Base):
    __tablename__ = "synced_time_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    day_of_week: Mapped[str] = mapped_column(String(15), nullable=False)
    start_time: Mapped[str] = mapped_column(String(20), nullable=False)
    end_time: Mapped[str] = mapped_column(String(20), nullable=False)

class SyncedTimetable(Base):
    __tablename__ = "synced_timetable"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slot_id: Mapped[int] = mapped_column(Integer, nullable=False)
    subject_id: Mapped[int] = mapped_column(Integer, nullable=False)
    faculty_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    room_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    semester_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

class SyncedSemester(Base):
    __tablename__ = "synced_semesters"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    semester_name: Mapped[str] = mapped_column(String(50), nullable=False)

class SyncedAttendance(Base):
    __tablename__ = "synced_attendance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slot_id: Mapped[int] = mapped_column(Integer, nullable=False)
    student_id: Mapped[str] = mapped_column(String(50), nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(15), default="Present")
