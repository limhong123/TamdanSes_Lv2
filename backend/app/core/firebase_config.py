from pathlib import Path

import firebase_admin
from firebase_admin import credentials

# backend/
BASE_DIR = Path(__file__).resolve().parents[2]

SERVICE_ACCOUNT = BASE_DIR / "firebase_service_account.json"

cred = credentials.Certificate(str(SERVICE_ACCOUNT))

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

print("Firebase Connected")