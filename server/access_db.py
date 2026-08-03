"""
MS Access Database Reader Module

Provides read-only access to the 7 Access databases in the institutional folder.
Uses pyodbc with the Microsoft Access ODBC driver.

All data fetching from Access goes through this module.
Write operations are NOT supported — those go to SQLite.

Includes in-memory caching to avoid excessive Access file locks.
"""
import pyodbc
import time
import threading
from typing import List, Dict, Any, Optional
from datetime import datetime
from config import settings


# Database file mapping
ACCESS_DATABASES = {
    "academic":    "AcademicDB.accdb",
    "attendance":  "AttendanceDB.accdb",
    "faculty":     "FacultyDB.accdb",
    "resource":    "ResourceDB.accdb",
    "subject":     "Subject&Course.accdb",
    "timetable":   "TimeTableDB.accdb",
    "lms_main":    "ERP_Main.accdb",
}

# Simple in-memory cache to avoid hammering Access files on every request
_cache: Dict[str, Any] = {}
_cache_timestamps: Dict[str, float] = {}
_cache_lock = threading.Lock()
CACHE_TTL_SECONDS = 300  # Cache data for 5 minutes


def _get_connection_string(db_key: str) -> str:
    """Build ODBC connection string for a specific Access database."""
    db_file = ACCESS_DATABASES.get(db_key)
    if not db_file:
        raise ValueError(f"Unknown Access database key: {db_key}")
    db_path = f"{settings.ACCESS_DB_DIR}\\{db_file}"
    return (
        r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
        f"DBQ={db_path};"
    )


def _get_cached(cache_key: str) -> Optional[Any]:
    """Check if data is in cache and still valid."""
    with _cache_lock:
        if cache_key in _cache:
            age = time.time() - _cache_timestamps.get(cache_key, 0)
            if age < CACHE_TTL_SECONDS:
                return _cache[cache_key]
    return None


def _set_cached(cache_key: str, data: Any):
    """Store data in cache."""
    with _cache_lock:
        _cache[cache_key] = data
        _cache_timestamps[cache_key] = time.time()

_db_status: Dict[str, Optional[bool]] = {
    "academic": None,
    "attendance": None,
    "faculty": None,
    "resource": None,
    "subject": None,
    "timetable": None,
    "lms_main": None,
}


def query_access(db_key: str, sql: str, params: tuple = (), use_cache: bool = True) -> List[Dict[str, Any]]:
    """
    Execute a read-only SQL query against an Access database.
    Returns list of dicts (column_name → value).
    Uses caching to avoid Access file locking issues.
    """
    if _db_status.get(db_key) is False:
        return []

    cache_key = f"{db_key}:{sql}:{params}"

    if use_cache:
        cached = _get_cached(cache_key)
        if cached is not None:
            return cached

    conn_str = _get_connection_string(db_key)
    conn = None
    try:
        conn = pyodbc.connect(conn_str, timeout=5)
        _db_status[db_key] = True
        cursor = conn.cursor()
        cursor.execute(sql, params)
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        result = [
            {col: _convert_value(val) for col, val in zip(columns, row)}
            for row in rows
        ]
        if use_cache:
            _set_cached(cache_key, result)
        return result
    except Exception as e:
        _db_status[db_key] = False
        print(f"[Access DB Error] Disabling further attempts for {db_key}. Error: {e}")
        raise RuntimeError(f"Access DB error: {e}")
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def query_access_one(db_key: str, sql: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    """Execute a query and return the first row or None."""
    results = query_access(db_key, sql, params)
    return results[0] if results else None


def _convert_value(val: Any) -> Any:
    """Convert Access-specific types to Python-friendly types."""
    if val is None:
        return None
    if isinstance(val, datetime):
        # Access stores time-only fields as datetime(1899, 12, 30, H, M, S)
        if val.year == 1899:
            return val.strftime("%H:%M")
        return val.isoformat()
    return val


def test_connections() -> Dict[str, bool]:
    """Test connectivity to all Access databases. Returns {db_key: success}."""
    results = {}
    for key in ACCESS_DATABASES:
        try:
            conn_str = _get_connection_string(key)
            conn = pyodbc.connect(conn_str)
            conn.close()
            results[key] = True
        except Exception as e:
            results[key] = False
            print(f"[Access] Failed to connect to {key}: {e}")
    return results


# ────────────────────────────────────────────────────────────────
# High-level data fetch functions (used directly by routes)
# ────────────────────────────────────────────────────────────────

def get_all_faculty() -> List[Dict]:
    """Get all faculty from Faculty_Master."""
    return query_access("faculty", "SELECT * FROM Faculty_Master ORDER BY FacultyID")


def get_faculty_by_id(faculty_id: int) -> Optional[Dict]:
    """Get a single faculty member by ID."""
    return query_access_one("faculty", "SELECT * FROM Faculty_Master WHERE FacultyID = ?", (faculty_id,))


def get_faculty_availability(faculty_id: int = None) -> List[Dict]:
    """Get faculty availability schedule."""
    if faculty_id:
        return query_access("faculty", "SELECT * FROM Faculty_Availability WHERE FacultyID = ?", (faculty_id,))
    return query_access("faculty", "SELECT * FROM Faculty_Availability")


def get_all_subjects() -> List[Dict]:
    """Get all subjects from Subject_Master."""
    return query_access("subject", "SELECT * FROM Subject_Master ORDER BY SubjectID")


def get_subject_by_id(subject_id: int) -> Optional[Dict]:
    """Get a subject by its numeric ID."""
    return query_access_one("subject", "SELECT * FROM Subject_Master WHERE SubjectID = ?", (subject_id,))


def get_course_registrations() -> List[Dict]:
    """Get all course registrations."""
    return query_access("subject", "SELECT * FROM Course_Registration")


def get_all_rooms() -> List[Dict]:
    """Get all rooms from Room_Master."""
    return query_access("resource", "SELECT * FROM Room_Master ORDER BY RoomID")


def get_room_by_id(room_id: int) -> Optional[Dict]:
    """Get a room by its numeric ID."""
    return query_access_one("resource", "SELECT * FROM Room_Master WHERE RoomID = ?", (room_id,))


def get_time_slots() -> List[Dict]:
    """Get all time slots."""
    return query_access("timetable", "SELECT * FROM Time_Slots ORDER BY SlotID")


def get_timetable_entries() -> List[Dict]:
    """Get all timetable entries."""
    return query_access("timetable", "SELECT * FROM Timetable ORDER BY TTID")


def get_attendance_records() -> List[Dict]:
    """Get all attendance records."""
    return query_access("attendance", "SELECT * FROM Attendance ORDER BY [Date] DESC")


def get_academic_years() -> List[Dict]:
    """Get all academic years."""
    return query_access("academic", "SELECT * FROM Academic_Year ORDER BY YearID")


def get_semesters() -> List[Dict]:
    """Get all semesters."""
    return query_access("academic", "SELECT * FROM Semester ORDER BY SemesterID")


def get_working_days() -> List[Dict]:
    """Get all working day entries."""
    return query_access("academic", "SELECT * FROM Working_Days ORDER BY [Date]")


def get_full_timetable() -> List[Dict]:
    """
    Build the complete timetable by joining Timetable entries with
    Subject_Master, Faculty_Master, Room_Master, and Time_Slots.
    Queries multiple databases in parallel for speed.
    """
    from concurrent.futures import ThreadPoolExecutor
    
    cached = _get_cached("full_timetable")
    if cached is not None:
        return cached

    # Fetch reference data in parallel
    with ThreadPoolExecutor(max_workers=6) as executor:
        f_tt = executor.submit(get_timetable_entries)
        f_slots = executor.submit(get_time_slots)
        f_subs = executor.submit(get_all_subjects)
        f_fac = executor.submit(get_all_faculty)
        f_rooms = executor.submit(get_all_rooms)
        f_sems = executor.submit(get_semesters)
        
        timetable_entries = f_tt.result()
        time_slots = {s["SlotID"]: s for s in f_slots.result()}
        subjects = {s["SubjectID"]: s for s in f_subs.result()}
        faculty = {f["FacultyID"]: f for f in f_fac.result()}
        rooms = {r["RoomID"]: r for r in f_rooms.result()}
        semesters = {s["SemesterID"]: s for s in f_sems.result()}

    result = []
    for entry in timetable_entries:
        slot = time_slots.get(entry.get("SlotID"))
        subj = subjects.get(entry.get("SubjectID"))
        fac = faculty.get(entry.get("FacultyID"))
        room = rooms.get(entry.get("RoomID"))
        sem = semesters.get(entry.get("SemesterID"))

        if not slot or not subj:
            continue  # Skip entries with missing references

        result.append({
            "id": str(entry.get("TTID", entry.get("ID", ""))),
            "day": slot.get("DayOfWeek", ""),
            "time": f"{slot.get('StartTime', '')} - {slot.get('EndTime', '')}",
            "course": subj.get("SubjectName", "Unknown"),
            "course_code": f"SUB-{subj.get('SubjectID', '')}",
            "department": subj.get("Department", ""),
            "venue": room.get("RoomName", "Unknown") if room else "TBA",
            "capacity": room.get("Capacity") if room else None,
            "is_lab": subj.get("IsLab", False),
            "faculty": fac.get("Name", "TBA") if fac else "TBA",
            "faculty_id": entry.get("FacultyID"),
            "entry_type": "LAB" if (subj.get("IsLab") or (room and room.get("IsLab"))) else "LECTURE",
            "semester": sem.get("SemesterName", "") if sem else "",
            "hours_per_week": subj.get("HoursPerWeek"),
        })

    # Sort by day order then time
    day_order = {"Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7}
    result.sort(key=lambda x: (day_order.get(x["day"], 8), x["time"]))

    _set_cached("full_timetable", result)
    return result


def get_attendance_summary() -> List[Dict]:
    """
    Build attendance summary by joining Attendance records with
    Faculty, Time_Slots, and Subject data.
    Queries multiple databases in parallel for speed.
    """
    from concurrent.futures import ThreadPoolExecutor
    
    cached = _get_cached("attendance_summary")
    if cached is not None:
        return cached

    with ThreadPoolExecutor(max_workers=3) as executor:
        f_att = executor.submit(get_attendance_records)
        f_tt = executor.submit(get_timetable_entries)
        f_subs = executor.submit(get_all_subjects)
        
        attendance = f_att.result()
        timetable = f_tt.result()
        subjects_list = f_subs.result()

    # Get timetable to map SlotID → SubjectID
    slot_to_subject = {}
    for tt in timetable:
        sid = tt.get("SlotID")
        if sid and sid not in slot_to_subject:
            slot_to_subject[sid] = tt.get("SubjectID")

    subjects = {s["SubjectID"]: s for s in subjects_list}

    # Group attendance by subject
    subject_stats: Dict[int, Dict] = {}
    for record in attendance:
        slot_id = record.get("SlotID")
        subject_id = slot_to_subject.get(slot_id)
        if not subject_id:
            continue

        if subject_id not in subject_stats:
            subj = subjects.get(subject_id, {})
            subject_stats[subject_id] = {
                "course_code": f"SUB-{subject_id}",
                "course_name": subj.get("SubjectName", f"Subject {subject_id}"),
                "department": subj.get("Department", ""),
                "total": 0,
                "present": 0,
            }

        subject_stats[subject_id]["total"] += 1
        if record.get("Status") == "Present":
            subject_stats[subject_id]["present"] += 1

    result = [
        {
            "course_code": stats["course_code"],
            "course_name": stats["course_name"],
            "percentage": round((stats["present"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 0,
            "classes_held": stats["total"],
            "classes_attended": stats["present"],
        }
        for stats in subject_stats.values()
    ]

    _set_cached("attendance_summary", result)
    return result


def check_access_health() -> str:
    """Check connectivity to all Access databases. Returns status string."""
    results = test_connections()
    connected = sum(1 for v in results.values() if v)
    total = len(results)
    if connected == total:
        return f"healthy ({connected}/{total} databases connected)"
    elif connected > 0:
        failed = [k for k, v in results.items() if not v]
        return f"degraded ({connected}/{total} connected, failed: {', '.join(failed)})"
    else:
        return "disconnected (0 databases reachable)"

