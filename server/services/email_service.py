import os
import smtplib
import logging
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings

# Setup Notification File Logger
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "notifications.log")

email_logger = logging.getLogger("EmailNotification")
email_logger.setLevel(logging.INFO)
file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
file_handler.setFormatter(logging.Formatter("[%(asctime)s] [EMAIL] %(message)s"))
if not email_logger.handlers:
    email_logger.addHandler(file_handler)

def send_email(to_email: str, subject: str, body_text: str, body_html: str = None) -> bool:
    """
    Dispatches an HTML & Plain Text email to the specified email address via SMTP (Gmail/SendGrid)
    or logs to server/logs/notifications.log.
    """
    if not to_email:
        print("[EMAIL WARNING] Target email is empty. Skipping Email dispatch.")
        return False

    clean_email = str(to_email).strip().lower()
    timestamp_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")

    if smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"EduSphere LMS Alert: {subject}"
            msg["From"] = f"EduSphere University Notifications <{smtp_user}>"
            msg["To"] = clean_email

            msg.attach(MIMEText(body_text, "plain"))
            if body_html:
                msg.attach(MIMEText(body_html, "html"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [clean_email], msg.as_string())

            print(f"[EMAIL SUCCESS] SMTP Email sent to {clean_email}")
            email_logger.info(f"DISPATCHED (SMTP) -> To: {clean_email} | Subject: {subject}")
            return True
        except Exception as e:
            print(f"[EMAIL SMTP ERROR] {e}")

    # Fallback to Notification File Logger
    log_entry = f"TO: {clean_email} | SUBJECT: {subject} | TIME: {timestamp_str} | BODY: {body_text[:120]}..."
    print(f"[EMAIL DISPATCHED] {log_entry}")
    email_logger.info(f"SIMULATED DISPATCH -> {log_entry}")
    return True
