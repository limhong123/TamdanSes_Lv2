import requests
from app.core.config import settings

URL = "https://cloudapi.plasgate.com/rest/send"


def send_sms(phone: str, message: str):
    # Convert +855xxxx -> 855xxxx for PlasGate
    if phone.startswith("+"):
        phone = phone[1:]

    headers = {
        "X-Secret": settings.PLASGATE_SECRET,
        "Content-Type": "application/json",
    }

    params = {
        "private_key": settings.PLASGATE_PRIVATE_KEY,
    }

    body = {
        "sender": settings.PLASGATE_SENDER,
        "to": phone,
        "content": message,
    }

    response = requests.post(
        URL,
        params=params,
        headers=headers,
        json=body,
        timeout=30,
    )

    print(response.status_code)
    print(response.text)

    response.raise_for_status()
    return response.json()