import os
import requests
import asyncio
from typing import List, Optional
from datetime import datetime
from models import UserModel

# ─── Config ──────────────────────────────────────────────────────────────────
FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "")          # from fast2sms.com dashboard
WHATSAPP_TOKEN   = os.getenv("WHATSAPP_ACCESS_TOKEN", "")     # Meta permanent token
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "") # Meta phone number ID


# ─── SMS via Fast2SMS ─────────────────────────────────────────────────────────

def send_sms_fast2sms(phone_numbers: List[str], message: str) -> dict:
    """
    Send bulk SMS to a list of Indian mobile numbers via Fast2SMS.
    Free tier: ~200 SMS on signup credits. No DLT needed for dev/testing.

    Args:
        phone_numbers: list of 10-digit Indian numbers e.g. ["9876543210", ...]
        message: plain text, max 160 chars per segment

    Returns:
        {"sent": int, "failed": int, "response": dict}
    """
    if not FAST2SMS_API_KEY:
        print("[SOS/SMS] FAST2SMS_API_KEY not set — skipping SMS")
        return {"sent": 0, "failed": len(phone_numbers), "response": {}}

    # Fast2SMS accepts comma-separated numbers, max 200 per request
    results = {"sent": 0, "failed": 0, "response": {}}
    batch_size = 200

    for i in range(0, len(phone_numbers), batch_size):
        batch = phone_numbers[i : i + batch_size]
        numbers_str = ",".join(batch)

        try:
            response = requests.post(
                "https://www.fast2sms.com/dev/bulkV2",
                headers={
                    "authorization": FAST2SMS_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "route": "q",          # Quick SMS route (no sender ID needed)
                    "message": message,
                    "language": "english",
                    "flash": 0,
                    "numbers": numbers_str,
                },
                timeout=15,
            )
            data = response.json()
            if data.get("return"):
                results["sent"] += len(batch)
                results["response"] = data
                print(f"[SOS/SMS] Sent to {len(batch)} numbers: {data.get('message')}")
            else:
                results["failed"] += len(batch)
                print(f"[SOS/SMS] Fast2SMS error: {data}")
        except Exception as e:
            results["failed"] += len(batch)
            print(f"[SOS/SMS] Exception: {e}")

    return results


# ─── WhatsApp via Meta Business Cloud API ─────────────────────────────────────

def send_whatsapp_message(phone: str, message: str) -> bool:
    """
    Send a single WhatsApp message via Meta Business Cloud API.
    Free tier: 1000 conversations/month.

    Setup (one-time):
    1. Go to developers.facebook.com → create app → add WhatsApp product
    2. Get a temporary/permanent access token and phone number ID
    3. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env

    Args:
        phone: E.164 format e.g. "919876543210" (91 = India country code)
        message: plain text message
    """
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_ID:
        print("[SOS/WA] WhatsApp credentials not set — skipping")
        return False

    try:
        response = requests.post(
            f"https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_ID}/messages",
            headers={
                "Authorization": f"Bearer {WHATSAPP_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "messaging_product": "whatsapp",
                "to": phone,
                "type": "text",
                "text": {"body": message},
            },
            timeout=10,
        )
        data = response.json()
        if "messages" in data:
            return True
        else:
            print(f"[SOS/WA] Error for {phone}: {data}")
            return False
    except Exception as e:
        print(f"[SOS/WA] Exception for {phone}: {e}")
        return False


def _unused_broadcast_whatsapp_to_ward(ward_number: int, message: str) -> dict:  # superseded by broadcast_sos
    """
    Broadcast WhatsApp message to all users in a ward who have phone numbers.
    Runs synchronously — for production consider background task queue.
    """
    users = UserModel.find_by_ward(ward_number)
    sent, failed = 0, 0

    for user in users:
        raw_phone = user.get("phone_number", "")
        if not raw_phone:
            continue

        # Normalize to E.164: strip spaces/dashes, prepend 91 if missing
        digits = "".join(filter(str.isdigit, raw_phone))
        if len(digits) == 10:
            phone_e164 = "91" + digits
        elif len(digits) == 12 and digits.startswith("91"):
            phone_e164 = digits
        else:
            failed += 1
            continue

        if send_whatsapp_message(phone_e164, message):
            sent += 1
        else:
            failed += 1

    print(f"[SOS/WA] Ward {ward_number}: {sent} sent, {failed} failed")
    return {"sent": sent, "failed": failed}


# ─── Combined SOS Broadcast ───────────────────────────────────────────────────

def _extract_valid_phone(user: dict) -> Optional[str]:
    """
    Extract a valid 10-digit Indian mobile number from a user document.
    Matches the DB format: phone_number stored as plain "9625427940" string.
    Returns the 10-digit string, or None if missing/invalid.
    """
    raw = user.get("phone_number")
    if not raw or not isinstance(raw, str):
        return None
    digits = "".join(filter(str.isdigit, raw.strip()))
    # Accept exactly 10 digits (Indian mobile), or 12 starting with 91
    if len(digits) == 10:
        return digits
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]   # normalize to 10-digit
    return None             # invalid — skip silently


def broadcast_sos(ward_number: int, message: str, broadcast_by: str, sender_name: str = "") -> dict:
    """
    Main entry point. Sends SMS + WhatsApp to ALL registered users regardless
    of ward. SOS is a city-wide emergency — everyone must be notified.
    Users without phone_number are silently skipped.

    The outgoing message is prefixed with ward + sender context so residents
    know who sent it and which ward it concerns.

    Returns a result dict the frontend SOSBroadcast.tsx expects:
    {
        "ward": str,
        "sms_sent": int,
        "whatsapp_sent": int,
        "residents_notified": int,
        "skipped_no_phone": int,
        "broadcast_id": str,
        "timestamp": str
    }
    """
    print(f"[SOS] Broadcasting to ward {ward_number} by {broadcast_by}")

    # Build the full message residents will receive
    sender_label = sender_name or broadcast_by
    full_message = (
        f"[FloodWatch Delhi - Ward {ward_number}]\n"
        f"{message}\n"
        f"- Sent by Ward Officer {sender_label}"
    )

    # Fetch ALL users — SOS is city-wide emergency, everyone must be notified
    users = UserModel.find_all()

    phone_numbers_10d = []   # 10-digit strings for Fast2SMS
    skipped = 0

    for u in users:
        phone = _extract_valid_phone(u)
        if phone:
            phone_numbers_10d.append(phone)
        else:
            skipped += 1

    print(f"[SOS] {len(phone_numbers_10d)} users have phone numbers, {skipped} skipped (no phone)")

    # SMS broadcast (Fast2SMS takes 10-digit numbers directly)
    sms_result = send_sms_fast2sms(phone_numbers_10d, full_message)

    # WhatsApp broadcast (needs E.164 — prepend 91)
    wa_sent, wa_failed = 0, 0
    for phone_10d in phone_numbers_10d:
        
        # --- DEBUG TRACKER ---
        print(f"👉 Processing user number: {phone_10d}")
        if phone_10d == "9625xxxxxx":  # <-- PUT YOUR EXACT 10-DIGIT NUMBER HERE
            print("🛑 BINGO! Found my test number in the database!")
            
        if send_whatsapp_message("91" + phone_10d, full_message):
            wa_sent += 1
            if phone_10d == "9625xxxxxx": 
                print("✅ SUCCESS: Meta accepted my number!")
        else:
            wa_failed += 1
            if phone_10d == "9625xxxxxx": 
                print("❌ FAILED: Meta rejected my number!")

    print(f"[SOS] WhatsApp: {wa_sent} sent, {wa_failed} failed")

    # Log to DB
    from models import NotificationModel
    broadcast_id = NotificationModel.create({
        "type": "sos_broadcast",
        "ward_number": ward_number,
        "message": full_message,
        "created_by": broadcast_by,
        "sms_sent": sms_result["sent"],
        "whatsapp_sent": wa_sent,
        "skipped_no_phone": skipped,
        "created_at": datetime.now(),
    })

    residents_notified = max(sms_result["sent"], wa_sent)

    return {
        "ward": f"Ward {ward_number}",
        "sms_sent": sms_result["sent"],
        "whatsapp_sent": wa_sent,
        "whatsapp_groups_notified": wa_sent,    # kept for frontend compat
        "residents_notified": residents_notified,
        "skipped_no_phone": skipped,
        "broadcast_id": str(broadcast_id),
        "timestamp": datetime.now().isoformat(),
    }