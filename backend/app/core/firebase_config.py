import os
import json
from pathlib import Path

import firebase_admin
from firebase_admin import credentials

if not firebase_admin._apps:

    firebase_value = os.getenv("FIREBASE_SERVICE_ACCOUNT")

    if firebase_value:
        firebase_value = firebase_value.strip()

        if firebase_value.startswith("{"):
            cred = credentials.Certificate(json.loads(firebase_value))
        else:
            cred = credentials.Certificate(firebase_value)

    else:
        BASE_DIR = Path(__file__).resolve().parents[2]
        SERVICE_ACCOUNT = BASE_DIR / "firebase_service_account.json"
        cred = credentials.Certificate(str(SERVICE_ACCOUNT))

    firebase_admin.initialize_app(cred)

print("Firebase Connected")