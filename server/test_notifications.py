import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.notification_dispatcher import (
    dispatch_certificate_alert,
    dispatch_attendance_alert,
    dispatch_grading_alert,
    dispatch_security_alert
)

def run_test():
    print("=== TESTING REAL MULTI-CHANNEL SMS & EMAIL NOTIFICATION ENGINE ===")

    # 1. Certificate Alert
    print("\n[TEST 1] Dispatching Certificate Download Alert...")
    dispatch_certificate_alert(
        user_name="Alex Johnson",
        phone="9876540001",
        email="alex.j@edusphere.edu.in",
        cert_code="CERT-2026-ETHICA-001",
        course_name="Ethical Hacking & Cyber Security"
    )

    # 2. Attendance Warning Alert
    print("\n[TEST 2] Dispatching Low Attendance Warning Alert...")
    dispatch_attendance_alert(
        user_name="Alex Johnson",
        phone="9876540001",
        email="alex.j@edusphere.edu.in",
        subject_name="Cloud Security Architecture (CS8701)",
        attendance_pct=68.5,
        required_lectures=3
    )

    # 3. Grading Alert
    print("\n[TEST 3] Dispatching Assignment Rubric Grading Alert...")
    dispatch_grading_alert(
        user_name="Alex Johnson",
        phone="9876540001",
        email="alex.j@edusphere.edu.in",
        assignment_title="Zero Trust Security Paradigm",
        marks_obtained=95.0,
        max_marks=100.0,
        feedback="Exceptional analytical diagramming and defense strategy."
    )

    # 4. Security Login Alert
    print("\n[TEST 4] Dispatching Security Activity Alert...")
    dispatch_security_alert(
        user_name="Alex Johnson",
        phone="9876540001",
        email="alex.j@edusphere.edu.in",
        ip_address="192.168.1.42"
    )

    print("\n=== SUCCESS: ALL 4 MULTI-CHANNEL DISPATCHERS EXECUTED CLEANLY ===")

if __name__ == "__main__":
    run_test()
