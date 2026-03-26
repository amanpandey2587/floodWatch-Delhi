"""
Run this from your backend folder:
    python debug_users.py

It will:
1. Print all users with their phone numbers and ward
2. Test sending WhatsApp directly to each number that has one
"""

import os
from dotenv import load_dotenv
load_dotenv()

from database import db          # adjust if your db import path differs
from sos_service import send_whatsapp_message, _extract_valid_phone

def check_users():
    print("=" * 60)
    print("ALL USERS IN DATABASE")
    print("=" * 60)

    users = list(db.users.find({}))
    print(f"Total users: {len(users)}\n")

    users_with_phone = []
    users_without_phone = []

    for u in users:
        phone_raw = u.get("phone_number")
        phone_clean = _extract_valid_phone(u)
        name = u.get("name", "?")
        email = u.get("email", "?")
        ward = u.get("ward_number", "null")
        role = u.get("role", "?")

        print(f"  Name   : {name}")
        print(f"  Email  : {email}")
        print(f"  Role   : {role}  |  Ward: {ward}")
        print(f"  Phone  : raw={repr(phone_raw)}  →  parsed={repr(phone_clean)}")
        print()

        if phone_clean:
            users_with_phone.append((name, email, phone_clean))
        else:
            users_without_phone.append((name, email))

    print("=" * 60)
    print(f"Have phone number : {len(users_with_phone)}")
    print(f"No phone number   : {len(users_without_phone)}")
    print("=" * 60)

    return users_with_phone


def test_whatsapp_to_all(users_with_phone):
    print("\nTesting WhatsApp to all users with phone numbers...")
    print("=" * 60)

    token = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
    phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    print(f"WHATSAPP_ACCESS_TOKEN  : {'SET ✓' if token else 'MISSING ✗'}")
    print(f"WHATSAPP_PHONE_NUMBER_ID: {'SET ✓' if phone_id else 'MISSING ✗'}")
    print()

    test_message = "[FloodWatch Test] This is a WhatsApp delivery test from FloodWatch Delhi."

    for name, email, phone_10d in users_with_phone:
        e164 = "91" + phone_10d
        print(f"Sending to {name} ({email}) → +{e164} ...", end=" ")
        result = send_whatsapp_message(e164, test_message)
        print("✓ Sent" if result else "✗ Failed")

    print("\nDone.")


if __name__ == "__main__":
    users_with_phone = check_users()
    if users_with_phone:
        test_whatsapp_to_all(users_with_phone)
    else:
        print("\nNo users with valid phone numbers found — nothing to test.")