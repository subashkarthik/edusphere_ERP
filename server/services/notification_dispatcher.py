from services.sms_service import send_sms
from services.email_service import send_email

def dispatch_certificate_alert(user_name: str, phone: str, email: str, cert_code: str, course_name: str):
    """Dispatches Certificate Generation & Download Alerts via SMS and Email."""
    sms_msg = f"EduSphere Alert: Hi {user_name}, your official certificate ({cert_code}) for '{course_name}' is now issued and downloaded!"
    send_sms(phone, sms_msg)

    email_subject = f"Official Certificate Issued — {cert_code}"
    email_text = f"Dear {user_name},\n\nYour official degree/course certificate ({cert_code}) for '{course_name}' has been verified and downloaded successfully.\n\nEduSphere University Systems"
    email_html = f"""
    <div style="font-family: Arial, sans-serif; background: #030612; color: #fff; padding: 24px; border-radius: 16px;">
        <h2 style="color: #6366f1;">🎓 Official Certificate Verification</h2>
        <p>Dear <strong>{user_name}</strong>,</p>
        <p>Your official academic certificate has been verified and issued:</p>
        <ul>
            <li><strong>Certificate Code:</strong> {cert_code}</li>
            <li><strong>Course:</strong> {course_name}</li>
            <li><strong>Verification Status:</strong> VERIFIED & ISSUED</li>
        </ul>
        <p style="color: #10b981; font-weight: bold;">EduSphere Institutional Registrations</p>
    </div>
    """
    send_email(email, email_subject, email_text, email_html)

def dispatch_attendance_alert(user_name: str, phone: str, email: str, subject_name: str, attendance_pct: float, required_lectures: int):
    """Dispatches Low Attendance Warning Alerts via SMS and Email."""
    sms_msg = f"EduSphere Warning: Hi {user_name}, your attendance in {subject_name} is {attendance_pct}%. Attend next {required_lectures} lectures to avoid condonation fine!"
    send_sms(phone, sms_msg)

    email_subject = f"ATTENDANCE WARNING ALERT: {subject_name} ({attendance_pct}%)"
    email_text = f"Dear {user_name},\n\nYour attendance in {subject_name} has dropped to {attendance_pct}%. Please attend the next {required_lectures} lectures immediately to meet the 75% university requirement.\n\nEduSphere Attendance Controller"
    email_html = f"""
    <div style="font-family: Arial, sans-serif; background: #030612; color: #fff; padding: 24px; border-radius: 16px; border: 1px solid #f43f5e;">
        <h2 style="color: #f43f5e;">⚠️ Low Attendance Warning Notice</h2>
        <p>Dear <strong>{user_name}</strong>,</p>
        <p>Your attendance in <strong>{subject_name}</strong> is currently <strong>{attendance_pct}%</strong> (Below the 75% cutoff threshold).</p>
        <p style="color: #fbbf24; font-weight: bold;">Action Required: Attend the next {required_lectures} consecutive lectures to avoid academic condonation.</p>
    </div>
    """
    send_email(email, email_subject, email_text, email_html)

def dispatch_grading_alert(user_name: str, phone: str, email: str, assignment_title: str, marks_obtained: float, max_marks: float, feedback: str):
    """Dispatches Assignment Rubric Grading Alerts via SMS and Email."""
    sms_msg = f"EduSphere Grade Alert: Hi {user_name}, your submission for '{assignment_title}' has been graded! Score: {marks_obtained}/{max_marks}."
    send_sms(phone, sms_msg)

    email_subject = f"Assignment Graded — {assignment_title}"
    email_text = f"Dear {user_name},\n\nYour assignment '{assignment_title}' was evaluated. Score: {marks_obtained}/{max_marks}.\nFeedback: {feedback}\n\nEduSphere Academic Office"
    email_html = f"""
    <div style="font-family: Arial, sans-serif; background: #030612; color: #fff; padding: 24px; border-radius: 16px;">
        <h2 style="color: #10b981;">📝 Assignment Evaluation Graded</h2>
        <p>Dear <strong>{user_name}</strong>,</p>
        <p>Your faculty reviewer has evaluated your submission for <strong>{assignment_title}</strong>:</p>
        <div style="background: #1e1b4b; padding: 16px; border-radius: 12px; font-size: 20px; font-weight: bold; color: #34d399;">
            Score: {marks_obtained} / {max_marks} Marks
        </div>
        <p><em>Reviewer Remarks: "{feedback}"</em></p>
    </div>
    """
    send_email(email, email_subject, email_text, email_html)

def dispatch_security_alert(user_name: str, phone: str, email: str, ip_address: str):
    """Dispatches Login & Security Activity Alerts via SMS and Email."""
    sms_msg = f"EduSphere Security Alert: Hi {user_name}, new workspace login detected from IP {ip_address}."
    send_sms(phone, sms_msg)

    email_subject = "Security Notice: Account Login Detected"
    email_text = f"Dear {user_name},\n\nA successful workspace sign-in was recorded for your account from IP address {ip_address}.\n\nEduSphere Security Operations"
    send_email(email, email_subject, email_text)
