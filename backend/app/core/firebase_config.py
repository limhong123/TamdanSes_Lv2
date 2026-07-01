import os
import json
from pathlib import Path

import firebase_admin
from firebase_admin import credentials

if not firebase_admin._apps:

    firebase_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")

    if firebase_json:
        # Render
        cred = credentials.Certificate(json.loads(firebase_json))
    else:
        # Local
        BASE_DIR = Path(__file__).resolve().parents[2]
        SERVICE_ACCOUNT = BASE_DIR / "firebase_service_account.json"

        cred = credentials.Certificate(str(SERVICE_ACCOUNT))

    firebase_admin.initialize_app(cred)

print("Firebase Connected")