import os
import requests
from typing import List, Optional
from datetime import datetime
from models import UserModel
from dotenv import load_dotenv

load_dotenv()

# ─── Twilio Config ────────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID     = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN      = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER    = os.getenv("TWILIO_PHONE_NUMBER", "")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "")

def _twilio_sms_configured() -> bool:
    return all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER])

def _twilio_wa_configured() -> bool:
    return all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER])


# ─── Phone number helper ──────────────────────────────────────────────────────

def _extract_valid_phone(user: dict) -> Optional[str]:
    raw = user.get("phone_number")
    if not raw or not isinstance(raw, str):
        return None
    digits = "".join(filter(str.isdigit, raw.strip()))
    if len(digits) == 10:
        return digits
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]
    return None


# ─── SMS via Twilio ───────────────────────────────────────────────────────────

def send_sms_twilio(phone_10d: str, message: str) -> bool:
    if not _twilio_sms_configured():
        print("[SOS/SMS] Twilio SMS not configured — skipping")
        return False
    to_number = f"+91{phone_10d}"
    try:
        response = requests.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json",
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={"From": TWILIO_PHONE_NUMBER, "To": to_number, "Body": message},
            timeout=10,
        )
        data = response.json()
        if response.status_code == 201 and data.get("sid"):
            print(f"[SOS/SMS] Sent to {to_number} SID:{data['sid']}")
            return True
        print(f"[SOS/SMS] Failed for {to_number}: {data.get('message', data)}")
        return False
    except Exception as e:
        print(f"[SOS/SMS] Exception for {to_number}: {e}")
        return False


# ─── WhatsApp via Twilio ──────────────────────────────────────────────────────

def send_whatsapp_twilio(phone_10d: str, message: str) -> bool:
    if not _twilio_wa_configured():
        print("[SOS/WA] Twilio WhatsApp not configured — skipping")
        return False
    to_number = f"whatsapp:+91{phone_10d}"
    try:
        response = requests.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json",
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={"From": TWILIO_WHATSAPP_NUMBER, "To": to_number, "Body": message},
            timeout=10,
        )
        data = response.json()
        if response.status_code == 201 and data.get("sid"):
            print(f"[SOS/WA] Sent to {to_number} SID:{data['sid']}")
            return True
        print(f"[SOS/WA] Failed for {to_number}: {data.get('message', data)}")
        return False
    except Exception as e:
        print(f"[SOS/WA] Exception for {to_number}: {e}")
        return False


# ─── Main Broadcast ───────────────────────────────────────────────────────────

def broadcast_sos(ward_number: int, message: str, broadcast_by: str, sender_name: str = "") -> dict:
    print(f"[SOS] Starting broadcast by {broadcast_by} (ward {ward_number})")

    sender_label = sender_name or broadcast_by
    full_message = (
        f"[FloodWatch Delhi - Ward {ward_number}]\n"
        f"{message}\n"
        f"- Sent by Ward Officer {sender_label}"
    )

    users = UserModel.find_all()
    print(f"[SOS] Total users in DB: {len(users)}")

    phone_numbers = []
    skipped = 0
    for u in users:
        phone = _extract_valid_phone(u)
        if phone:
            phone_numbers.append(phone)
            print(f"[SOS] Will notify: {u.get('email')} -> {phone}")
        else:
            skipped += 1

    print(f"[SOS] Sending to {len(phone_numbers)} users, skipping {skipped}")

    sms_sent, wa_sent = 0, 0
    for phone_10d in phone_numbers:
        if send_sms_twilio(phone_10d, full_message):
            sms_sent += 1
        if send_whatsapp_twilio(phone_10d, full_message):
            wa_sent += 1

    print(f"[SOS] Done: SMS={sms_sent}, WhatsApp={wa_sent}")

    from models import NotificationModel
    broadcast_id = NotificationModel.create({
        "type": "sos_broadcast",
        "ward_number": ward_number,
        "message": full_message,
        "created_by": broadcast_by,
        "sms_sent": sms_sent,
        "whatsapp_sent": wa_sent,
        "skipped_no_phone": skipped,
        "created_at": datetime.now(),
    })

    return {
        "ward": f"Ward {ward_number}",
        "sms_sent": sms_sent,
        "whatsapp_sent": wa_sent,
        "whatsapp_groups_notified": wa_sent,
        "residents_notified": max(sms_sent, wa_sent),
        "skipped_no_phone": skipped,
        "broadcast_id": str(broadcast_id),
        "timestamp": datetime.now().isoformat(),
    }