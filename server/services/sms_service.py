import os
import requests
import logging
from datetime import datetime
from config import settings

# Setup Notification File Logger
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "notifications.log")

sms_logger = logging.getLogger("SMSNotification")
sms_logger.setLevel(logging.INFO)
file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
file_handler.setFormatter(logging.Formatter("[%(asctime)s] [SMS] %(message)s"))
if not sms_logger.handlers:
    sms_logger.addHandler(file_handler)

def send_sms(phone_number: str, message: str) -> bool:
    """
    Sends an SMS text message to the given mobile phone number.
    Supports Twilio, Fast2SMS, or logs to server/logs/notifications.log.
    """
    if not phone_number:
        print("[SMS WARNING] Target phone number is empty. Skipping SMS.")
        return False

    clean_phone = str(phone_number).strip().replace(" ", "").replace("-", "")
    timestamp_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    # 1. Check Twilio Integration
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_auth = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_from = os.getenv("TWILIO_PHONE_NUMBER")

    if twilio_sid and twilio_auth and twilio_from:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
            resp = requests.post(
                url,
                data={"To": clean_phone, "From": twilio_from, "Body": message},
                auth=(twilio_sid, twilio_auth),
                timeout=5
            )
            if resp.status_code in [200, 201]:
                print(f"[SMS SUCCESS] Twilio SMS dispatched to {clean_phone}")
                sms_logger.info(f"DISPATCHED (Twilio) -> To: {clean_phone} | Message: {message}")
                return True
            else:
                print(f"[SMS TWILIO ERROR] Status {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[SMS TWILIO EXCEPTION] {e}")

    # 2. Check Fast2SMS Integration
    fast2sms_key = os.getenv("FAST2SMS_API_KEY")
    if fast2sms_key:
        try:
            headers = {"authorization": fast2sms_key, "Content-Type": "application/json"}
            payload = {"route": "q", "message": message, "language": "english", "numbers": clean_phone}
            resp = requests.post("https://www.fast2sms.com/dev/bulkV2", json=payload, headers=headers, timeout=5)
            if resp.status_code == 200:
                print(f"[SMS SUCCESS] Fast2SMS dispatched to {clean_phone}")
                sms_logger.info(f"DISPATCHED (Fast2SMS) -> To: {clean_phone} | Message: {message}")
                return True
        except Exception as e:
            print(f"[SMS FAST2SMS EXCEPTION] {e}")

    # 3. Log Dispatch Notification in Development / Local Server Mode
    log_entry = f"TO: {clean_phone} | TIME: {timestamp_str} | MESSAGE: {message}"
    print(f"[SMS DISPATCHED] {log_entry}")
    sms_logger.info(f"SIMULATED DISPATCH -> {log_entry}")
    return True
