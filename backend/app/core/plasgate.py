import requests
from app.core.config import settings

URL = "https://cloudapi.plasgate.com/rest/send"


def normalize_phone(phone: str) -> str:
    phone = (
        phone.strip()
        .replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )

    if phone.startswith("+855"):
        return phone[1:]

    if phone.startswith("855"):
        return phone

    if phone.startswith("0"):
        return "855" + phone[1:]

    return "855" + phone


def send_sms(phone: str, message: str):
    to_number = normalize_phone(phone)

    headers = {
        "X-Secret": settings.PLASGATE_SECRET,
        "Content-Type": "application/json",
    }

    params = {
        "private_key": settings.PLASGATE_PRIVATE_KEY,
    }

    payload = {
        "sender": settings.PLASGATE_SENDER,
        "to": to_number,
        "content": message,
    }

    print("=== PlasGate SMS ===")
    print("Sender:", settings.PLASGATE_SENDER)
    print("Phone:", to_number)
    print(
        "Secret format:",
        settings.PLASGATE_SECRET.startswith("$5$rounds=")
    )

    try:
        response = requests.post(
            URL,
            params=params,
            headers=headers,
            json=payload,
            timeout=30,
        )
    except requests.RequestException as error:
        raise Exception(f"Cannot connect to PlasGate: {error}")

    print("Status:", response.status_code)
    print("Response:", response.text)

    if response.status_code != 200:
        raise Exception(
            f"PlasGate failed: "
            f"{response.status_code} - {response.text}"
        )

    try:
        return response.json()
    except ValueError:
        return {
            "status": response.status_code,
            "message": response.text,
        }