import os
from dotenv import load_dotenv
from sos_service import send_sms_fast2sms, send_whatsapp_message

# Correctly load the environment variables
load_dotenv()

TEST_NUMBER_10_DIGIT = "9625427940" # Replace with your actual 10-digit number!
TEST_NUMBER_E164 = "91" + TEST_NUMBER_10_DIGIT # For WhatsApp
TEST_MESSAGE = "This is a direct API test from the FloodWatch backend."

print("Testing Fast2SMS...")
sms_result = send_sms_fast2sms([TEST_NUMBER_10_DIGIT], TEST_MESSAGE)
print(f"SMS Result: {sms_result}")

print("\nTesting WhatsApp...")
wa_result = send_whatsapp_message(TEST_NUMBER_E164, TEST_MESSAGE)
print(f"WhatsApp Result: {'Success' if wa_result else 'Failed'}")