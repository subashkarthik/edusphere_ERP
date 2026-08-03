import pyodbc
from sqlalchemy.orm import Session
from database import SessionLocal
from models.synced_legacy import (
    SyncedSubject, SyncedFaculty, SyncedRoom, SyncedTimeSlot,
    SyncedTimetable, SyncedSemester, SyncedAttendance
)
from access_db import (
    ACCESS_DATABASES, _get_connection_string,
    get_all_subjects, get_course_registrations, get_all_faculty,
    get_all_rooms, get_time_slots, get_timetable_entries,
    get_semesters, get_attendance_records
)
from datetime import datetime

class LegacySyncAgent:
    def __init__(self):
        pass

    def run_sync(self):
        """Run the sync process. Replicating Access data into local Postgres/SQLite."""
        db: Session = SessionLocal()
        print("[SYNC] Starting MS Access to database synchronizer...")
        
        try:
            # 1. Sync Subjects
            self._sync_subjects(db)
            
            # 2. Sync Faculty
            self._sync_faculty(db)
            
            # 3. Sync Rooms
            self._sync_rooms(db)
            
            # 4. Sync Time Slots
            self._sync_time_slots(db)
            
            # 5. Sync Timetable
            self._sync_timetable(db)
            
            # 6. Sync Semesters
            self._sync_semesters(db)
            
            # 7. Sync Attendance
            self._sync_attendance(db)
            
            db.commit()
            print("[SYNC] Database synchronization completed successfully!")
            return True
        except Exception as e:
            db.rollback()
            print(f"[SYNC ERROR] Sync failed: {e}")
            print("[SYNC WARNING] Reverting to pre-loaded/seeded mock data fallback.")
            self._seed_mock_synced_data(db)
            db.commit()
            return False
        finally:
            db.close()

    def _sync_subjects(self, db: Session):
        print("   - Syncing Subjects...")
        subjects = get_all_subjects()
        if not subjects:
            raise RuntimeError("No subjects found in Access database.")
        
        # Clear existing
        db.query(SyncedSubject).delete()
        
        for s in subjects:
            subj_id = int(s.get("SubjectID"))
            db.add(SyncedSubject(
                id=subj_id,
                name=s.get("SubjectName", f"Subject {subj_id}"),
                is_lab=bool(s.get("IsLab", False)),
                department=s.get("Department"),
                hours_per_week=int(s.get("HoursPerWeek", 3))
            ))
        db.flush()

    def _sync_faculty(self, db: Session):
        print("   - Syncing Faculty...")
        faculty = get_all_faculty()
        if not faculty:
            raise RuntimeError("No faculty members found in Access database.")
        
        db.query(SyncedFaculty).delete()
        for f in faculty:
            fac_id = int(f.get("FacultyID"))
            db.add(SyncedFaculty(
                id=fac_id,
                name=f.get("Name", f"Faculty {fac_id}"),
                department=f.get("Department")
            ))
        db.flush()

    def _sync_rooms(self, db: Session):
        print("   - Syncing Rooms...")
        rooms = get_all_rooms()
        if not rooms:
            raise RuntimeError("No rooms found in Access database.")
            
        db.query(SyncedRoom).delete()
        for r in rooms:
            room_id = int(r.get("RoomID"))
            db.add(SyncedRoom(
                id=room_id,
                name=r.get("RoomName", f"Room {room_id}"),
                capacity=int(r.get("Capacity", 60)),
                is_lab=bool(r.get("IsLab", False))
            ))
        db.flush()

    def _sync_time_slots(self, db: Session):
        print("   - Syncing Time Slots...")
        slots = get_time_slots()
        if not slots:
            raise RuntimeError("No time slots found in Access database.")
            
        db.query(SyncedTimeSlot).delete()
        for s in slots:
            slot_id = int(s.get("SlotID"))
            db.add(SyncedTimeSlot(
                id=slot_id,
                day_of_week=s.get("DayOfWeek", "Monday"),
                start_time=s.get("StartTime", "09:00"),
                end_time=s.get("EndTime", "10:00")
            ))
        db.flush()

    def _sync_timetable(self, db: Session):
        print("   - Syncing Timetable...")
        entries = get_timetable_entries()
        if not entries:
            raise RuntimeError("No timetable entries found in Access database.")
            
        db.query(SyncedTimetable).delete()
        for e in entries:
            tt_id = int(e.get("TTID", e.get("ID")))
            db.add(SyncedTimetable(
                id=tt_id,
                slot_id=int(e.get("SlotID")),
                subject_id=int(e.get("SubjectID")),
                faculty_id=int(e.get("FacultyID")),
                room_id=int(e.get("RoomID")),
                semester_id=int(e.get("SemesterID"))
            ))
        db.flush()

    def _sync_semesters(self, db: Session):
        print("   - Syncing Semesters...")
        sems = get_semesters()
        if not sems:
            raise RuntimeError("No semesters found in Access database.")
            
        db.query(SyncedSemester).delete()
        for s in sems:
            sem_id = int(s.get("SemesterID"))
            db.add(SyncedSemester(
                id=sem_id,
                semester_name=s.get("SemesterName", f"Semester {sem_id}")
            ))
        db.flush()

    def _sync_attendance(self, db: Session):
        print("   - Syncing Attendance Records...")
        records = get_attendance_records()
        # Attendance might be empty initially, which is fine
        db.query(SyncedAttendance).delete()
        
        for r in records:
            dt = r.get("Date")
            if isinstance(dt, str):
                try:
                    dt = datetime.fromisoformat(dt)
                except ValueError:
                    dt = datetime.utcnow()
            elif not isinstance(dt, datetime):
                dt = datetime.utcnow()
                
            db.add(SyncedAttendance(
                id=r.get("ID"),
                slot_id=r.get("SlotID"),
                student_id=str(r.get("StudentID", r.get("EnrollmentNo", "unknown"))),
                date=dt,
                status=r.get("Status", "Present")
            ))
        db.flush()

    def _seed_mock_synced_data(self, db: Session):
        """Fallback mock database seeding when pyodbc / MS Access drivers aren't available."""
        # 1. Sync Subjects
        if db.query(SyncedSubject).count() == 0:
            print("     -> Seeding fallback Subjects...")
            subjects_mock = [
                (1, "Web Technologies", False, "Computer Science", 3),
                (2, "Advanced Java Programming", False, "Computer Science", 4),
                (3, "Database Systems Lab", True, "Computer Science", 2),
                (4, "Compiler Design", False, "Computer Science", 4),
                (5, "Design and Analysis of Algorithms", False, "Computer Science", 4),
                (6, "Computer Networks Lab", True, "Computer Science", 2),
            ]
            for sid, name, is_lab, dept, hours in subjects_mock:
                db.add(SyncedSubject(id=sid, name=name, is_lab=is_lab, department=dept, hours_per_week=hours))
        
        # 2. Sync Faculty
        if db.query(SyncedFaculty).count() == 0:
            print("     -> Seeding fallback Faculty...")
            faculty_mock = [
                (1, "Dr. Arun Kumar", "Computer Science"),
                (2, "Prof. S. Devi", "Computer Science"),
                (3, "Dr. P. Raj", "Mechanical Engineering"),
                (4, "Mrs. K. Priya", "Computer Science"),
            ]
            for fid, name, dept in faculty_mock:
                db.add(SyncedFaculty(id=fid, name=name, department=dept))

        # 3. Sync Rooms
        if db.query(SyncedRoom).count() == 0:
            print("     -> Seeding fallback Rooms...")
            rooms_mock = [
                (101, "LH-101", 60, False),
                (102, "LH-102", 60, False),
                (201, "LH-201", 120, False),
                (301, "Lab-1", 45, True),
                (302, "Lab-2", 45, True),
            ]
            for rid, name, cap, is_lab in rooms_mock:
                db.add(SyncedRoom(id=rid, name=name, capacity=cap, is_lab=is_lab))

        # 4. Sync Time Slots
        if db.query(SyncedTimeSlot).count() == 0:
            print("     -> Seeding fallback Time Slots...")
            slots_mock = [
                (1, "Monday", "09:00", "10:00"),
                (2, "Monday", "10:15", "11:15"),
                (3, "Tuesday", "09:00", "11:00"),
                (4, "Wednesday", "11:30", "12:30"),
                (5, "Thursday", "14:00", "15:30"),
                (6, "Friday", "14:00", "16:00"),
            ]
            for sid, day, start, end in slots_mock:
                db.add(SyncedTimeSlot(id=sid, day_of_week=day, start_time=start, end_time=end))

        # 5. Sync Timetable
        if db.query(SyncedTimetable).count() == 0:
            print("     -> Seeding fallback Timetable...")
            timetable_mock = [
                (1, 1, 1, 1, 101, 7),
                (2, 2, 2, 2, 301, 7),
                (3, 3, 3, 3, 302, 7),
                (4, 4, 4, 4, 102, 7),
                (5, 5, 5, 1, 201, 7),
                (6, 6, 6, 2, 301, 7),
            ]
            for ttid, sid, subid, facid, rid, semid in timetable_mock:
                db.add(SyncedTimetable(id=ttid, slot_id=sid, subject_id=subid, faculty_id=facid, room_id=rid, semester_id=semid))

        # 6. Sync Semesters
        if db.query(SyncedSemester).count() == 0:
            print("     -> Seeding fallback Semesters...")
            sems_mock = [
                (1, "Semester 1"),
                (2, "Semester 2"),
                (7, "Semester 7"),
            ]
            for sid, name in sems_mock:
                db.add(SyncedSemester(id=sid, semester_name=name))

        # 7. Sync Attendance
        if db.query(SyncedAttendance).count() == 0:
            print("     -> Seeding fallback Attendance...")
            now = datetime.now()
            attendance_mock = [
                (1, 1, "user-alex", now, "Present"),
                (2, 2, "user-alex", now, "Present"),
                (3, 3, "user-alex", now, "Present"),
                (4, 4, "user-alex", now, "Absent"),
            ]
            for id_, sid, stid, dt, status in attendance_mock:
                db.add(SyncedAttendance(id=id_, slot_id=sid, student_id=stid, date=dt, status=status))

        db.flush()

sync_agent = LegacySyncAgent()
