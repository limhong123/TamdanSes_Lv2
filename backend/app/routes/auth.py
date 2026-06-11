from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.config import settings

from app.database.db import get_db
from app.models.user import User
from app.models.teacher import Teacher
from app.models.student import Student
from app.schemas.auth_schema import (
    RegisterSchema,
    LoginSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
)
from app.core.security import hash_password, verify_password, create_access_token
from app.core.telegram import send_telegram_message

import random,requests
from datetime import datetime, timedelta
from app.schemas.auth_schema import AdminRegisterSchema

router = APIRouter(prefix="/auth", tags=["Auth"])


def normalize_phone(phone: str):
    if not phone:
        return None

    phone = phone.strip().replace(" ", "").replace("-", "")

    if phone.startswith("0"):
        return "+855" + phone[1:]

    return phone

@router.post("/register-admin")
def register_admin(data: AdminRegisterSchema, db: Session = Depends(get_db)):
    if data.secret_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin secret key")

    old_user = db.query(User).filter(User.email == data.email).first()
    if old_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        password=hash_password(data.password),
        role="admin",
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Admin registered successfully"}
@router.post("/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    old_user = db.query(User).filter(User.email == data.email).first()

    if old_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        password=hash_password(data.password),
        role=data.role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Register success",
        "id": user.id,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
    }


@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    login_id = data.login_id.strip()

    user = None
    student = None
    teacher = None

    if "@" in login_id:
        user = db.query(User).filter(User.email == login_id).first()
    else:
        student = db.query(Student).filter(
            Student.student_code == login_id
        ).first()

        if student:
            user = db.query(User).filter(User.id == student.user_id).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid login ID or password",
        )

    if not verify_password(data.password, user.password):
        raise HTTPException(
            status_code=401,
            detail="Invalid login ID or password",
        )

    if user.role == "teacher":
        teacher = db.query(Teacher).filter(
            Teacher.user_id == user.id
        ).first()

    if user.role == "student" and not student:
        student = db.query(Student).filter(
            Student.user_id == user.id
        ).first()

    token = create_access_token({
        "id": user.id,
        "email": user.email,
        "role": user.role,
    })

    return {
        "id": user.id,
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": f"{user.first_name} {user.last_name}",
        "email": user.email,

        "teacher_id": teacher.id if teacher else None,
        "teacher_code": teacher.teacher_code if teacher else None,

        "student_id": student.id if student else None,
        "student_code": student.student_code if student else None,
        "class_id": student.class_id if student else None,
    }


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordSchema, db: Session = Depends(get_db)):
    phone = normalize_phone(data.phone)

    user = db.query(User).filter(User.phone == phone).first()

    print("PHONE:", phone)
    print("USER:", user.email if user else None)
    print("CHAT:", user.telegram_chat_id if user else None)

    if not user:
        raise HTTPException(status_code=404, detail="Phone number not found")

    if not user.telegram_chat_id:
        raise HTTPException(status_code=400, detail="Telegram account not linked")

    otp = str(random.randint(100000, 999999))

    user.reset_otp = otp
    user.reset_otp_expire = datetime.utcnow() + timedelta(minutes=5)

    sent = send_telegram_message(
        user.telegram_chat_id,
        f"TAM DAN SES OTP: {otp}\nExpires in 5 minutes."
    )

    if not sent:
        raise HTTPException(status_code=500, detail="Telegram send failed")

    db.commit()

    return {"message": "OTP sent to Telegram"}
@router.post("/reset-password")
def reset_password(
    data: ResetPasswordSchema,
    db: Session = Depends(get_db),
):
    phone = normalize_phone(data.phone)

    user = db.query(User).filter(User.phone == phone).first()

    if not user:
        raise HTTPException(status_code=404, detail="Phone number not found")

    if user.reset_otp != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if not user.reset_otp_expire or user.reset_otp_expire < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    user.password = hash_password(data.new_password)
    user.reset_otp = None
    user.reset_otp_expire = None

    db.commit()

    return {"message": "Password reset successfully"}
@router.post("/telegram-webhook")
def telegram_webhook(update: dict, db: Session = Depends(get_db)):
    message = update.get("message", {})
    text = message.get("text", "")
    chat = message.get("chat", {})

    chat_id = str(chat.get("id"))

    if text.startswith("/start"):
        send_telegram_message(
            chat_id,
            "Welcome to TAM DAN SES.\n\nTo link your account, send:\n/link your_phone\n\nExample:\n/link 066968050"
        )
        return {"ok": True}

    if not text.startswith("/link"):
        return {"ok": True}

    parts = text.split()

    if len(parts) != 2:
        send_telegram_message(
            chat_id,
            "Wrong format.\nUse: /link 066968050"
        )
        return {"ok": True}

    phone = normalize_phone(parts[1])

    user = db.query(User).filter(User.phone == phone).first()

    if not user:
        send_telegram_message(
            chat_id,
            "Phone number not found in school system."
        )
        return {"ok": True}

    user.telegram_chat_id = chat_id
    db.commit()

    send_telegram_message(
        chat_id,
        f"Telegram linked successfully.\nAccount: {user.email}"
    )

    return {"ok": True}