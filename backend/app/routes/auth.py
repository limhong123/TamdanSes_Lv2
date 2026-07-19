from datetime import datetime, timedelta
import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.plasgate import send_sms
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)
from app.database.db import get_db
from app.models.user import User
from app.models.teacher import Teacher
from app.models.student import Student
from app.schemas.auth_schema import (
    RegisterSchema,
    LoginSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    AdminRegisterSchema,
    ParentRequestOtpSchema,
    ParentVerifyOtpSchema,
)


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


def normalize_phone(phone: str | None) -> str | None:
    """
    Convert Cambodian phone numbers to +855 format.

    Examples:
        012345678     -> +85512345678
        85512345678   -> +85512345678
        +85512345678  -> +85512345678
    """

    if not phone:
        return None

    phone = (
        phone.strip()
        .replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )

    if phone.startswith("+855"):
        return phone

    if phone.startswith("855"):
        return f"+{phone}"

    if phone.startswith("0"):
        return f"+855{phone[1:]}"

    return phone


def clear_parent_otp(student: Student) -> None:
    student.parent_login_otp = None
    student.parent_login_otp_expire = None


@router.post("/register-admin")
def register_admin(
    data: AdminRegisterSchema,
    db: Session = Depends(get_db),
):
    if data.secret_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(
            status_code=403,
            detail="Invalid admin secret key",
        )

    email = data.email.strip().lower()

    old_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if old_user:
        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )

    user = User(
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        email=email,
        password=hash_password(data.password),
        role="admin",
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Admin registered successfully",
        "id": user.id,
    }


@router.post("/register")
def register(
    data: RegisterSchema,
    db: Session = Depends(get_db),
):
    email = data.email.strip().lower()

    old_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if old_user:
        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )

    allowed_roles = [
        "admin",
        "teacher",
        "student",
        "parent",
    ]

    if data.role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Invalid user role",
        )

    user = User(
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        email=email,
        password=hash_password(data.password),
        role=data.role,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Register success",
        "id": user.id,
        "role": user.role,
    }


@router.post("/login")
def login(
    data: LoginSchema,
    db: Session = Depends(get_db),
):
    login_id = data.login_id.strip()

    if not login_id:
        raise HTTPException(
            status_code=400,
            detail="Login ID is required",
        )

    user = None
    student = None
    teacher = None

    # Login using email
    if "@" in login_id:
        user = (
            db.query(User)
            .filter(User.email == login_id.lower())
            .first()
        )

    else:
        # Login using student code
        student = (
            db.query(Student)
            .filter(Student.student_code == login_id)
            .first()
        )

        if student:
            user = (
                db.query(User)
                .filter(User.id == student.user_id)
                .first()
            )

        # Login using teacher code
        if not user:
            teacher = (
                db.query(Teacher)
                .filter(Teacher.teacher_code == login_id)
                .first()
            )

            if teacher:
                user = (
                    db.query(User)
                    .filter(User.id == teacher.user_id)
                    .first()
                )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid login ID or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Your account is inactive",
        )

    if not verify_password(data.password, user.password):
        raise HTTPException(
            status_code=401,
            detail="Invalid login ID or password",
        )

    if user.role == "teacher" and not teacher:
        teacher = (
            db.query(Teacher)
            .filter(Teacher.user_id == user.id)
            .first()
        )

    if user.role == "student" and not student:
        student = (
            db.query(Student)
            .filter(Student.user_id == user.id)
            .first()
        )

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
        "full_name": (
            f"{user.first_name or ''} "
            f"{user.last_name or ''}"
        ).strip(),
        "email": user.email,
        "teacher_id": teacher.id if teacher else None,
        "teacher_code": (
            teacher.teacher_code
            if teacher
            else None
        ),
        "student_id": student.id if student else None,
        "student_code": (
            student.student_code
            if student
            else None
        ),
        "class_id": student.class_id if student else None,
    }


@router.post("/parent/request-otp")
def request_parent_otp(
    data: ParentRequestOtpSchema,
    db: Session = Depends(get_db),
):
    student_code = data.student_code.strip()
    input_phone = normalize_phone(data.parent_phone)

    if not student_code:
        raise HTTPException(
            status_code=400,
            detail="Student ID is required",
        )

    if not input_phone:
        raise HTTPException(
            status_code=400,
            detail="Parent phone is required",
        )

    student = (
        db.query(Student)
        .filter(Student.student_code == student_code)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student ID not found",
        )

    registered_phone = normalize_phone(
        student.guardian_phone
    )

    if not registered_phone:
        raise HTTPException(
            status_code=400,
            detail=(
                "Parent phone is not registered "
                "for this student"
            ),
        )

    if input_phone != registered_phone:
        raise HTTPException(
            status_code=401,
            detail=(
                "Student ID and parent phone "
                "do not match"
            ),
        )

    otp = str(random.randint(100000, 999999))

    student.parent_login_otp = otp
    student.parent_login_otp_expire = (
        datetime.utcnow() + timedelta(minutes=5)
    )

    try:
        send_sms(
            registered_phone,
            (
                f"TAM DAN SES Parent Login OTP: {otp}. "
                f"Expires in 5 minutes."
            ),
        )

    except Exception as error:
        db.rollback()

        print(
            "Parent OTP SMS Error:",
            str(error),
        )

        raise HTTPException(
            status_code=500,
            detail="SMS send failed",
        )

    db.commit()
    db.refresh(student)

    return {
        "message": "OTP sent successfully",
        "expires_in": 300,
        "student_code": student.student_code,
        "phone": mask_phone(registered_phone),
    }


@router.post("/parent/verify-otp")
def verify_parent_otp(
    data: ParentVerifyOtpSchema,
    db: Session = Depends(get_db),
):
    student_code = data.student_code.strip()
    input_phone = normalize_phone(data.parent_phone)
    input_otp = data.otp.strip()

    if not student_code:
        raise HTTPException(
            status_code=400,
            detail="Student ID is required",
        )

    if not input_phone:
        raise HTTPException(
            status_code=400,
            detail="Parent phone is required",
        )

    if not input_otp or len(input_otp) != 6:
        raise HTTPException(
            status_code=400,
            detail="OTP must contain 6 digits",
        )

    if not input_otp.isdigit():
        raise HTTPException(
            status_code=400,
            detail="OTP must contain only numbers",
        )

    student = (
        db.query(Student)
        .filter(Student.student_code == student_code)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student ID not found",
        )

    registered_phone = normalize_phone(
        student.guardian_phone
    )

    if not registered_phone:
        raise HTTPException(
            status_code=400,
            detail=(
                "Parent phone is not registered "
                "for this student"
            ),
        )

    if input_phone != registered_phone:
        raise HTTPException(
            status_code=401,
            detail=(
                "Student ID and parent phone "
                "do not match"
            ),
        )

    if not student.parent_login_otp:
        raise HTTPException(
            status_code=400,
            detail="Please request OTP first",
        )

    if not student.parent_login_otp_expire:
        clear_parent_otp(student)
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP expired",
        )

    if (
        student.parent_login_otp_expire
        < datetime.utcnow()
    ):
        clear_parent_otp(student)
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP expired",
        )

    if student.parent_login_otp != input_otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP",
        )

    student_user = (
        db.query(User)
        .filter(User.id == student.user_id)
        .first()
    )

    token = create_access_token({
        "role": "parent",
        "student_id": student.id,
        "student_code": student.student_code,
        "parent_phone": registered_phone,
    })

    clear_parent_otp(student)

    db.commit()
    db.refresh(student)

    student_full_name = None

    if student_user:
        student_full_name = (
            f"{student_user.first_name or ''} "
            f"{student_user.last_name or ''}"
        ).strip()

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "parent",
        "student_id": student.id,
        "student_code": student.student_code,
        "student_name": student_full_name,
        "class_id": student.class_id,
        "guardian_name": student.guardian_name,
        "guardian_phone": registered_phone,
    }


@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordSchema,
    db: Session = Depends(get_db),
):
    phone = normalize_phone(data.phone)

    if not phone:
        raise HTTPException(
            status_code=400,
            detail="Phone number is required",
        )

    user = (
        db.query(User)
        .filter(User.phone == phone)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Phone number not found",
        )

    otp = str(random.randint(100000, 999999))

    user.reset_otp = otp
    user.reset_otp_expire = (
        datetime.utcnow() + timedelta(minutes=5)
    )

    try:
        send_sms(
            phone,
            (
                f"TAM DAN SES OTP: {otp}. "
                f"Expires in 5 minutes."
            ),
        )

    except Exception as error:
        db.rollback()

        print(
            "PlasGate SMS Error:",
            str(error),
        )

        raise HTTPException(
            status_code=500,
            detail="SMS send failed",
        )

    db.commit()
    db.refresh(user)

    return {
        "message": "OTP sent by SMS",
        "expires_in": 300,
        "phone": mask_phone(phone),
    }


@router.post("/reset-password")
def reset_password(
    data: ResetPasswordSchema,
    db: Session = Depends(get_db),
):
    phone = normalize_phone(data.phone)
    input_otp = data.otp.strip()

    if not phone:
        raise HTTPException(
            status_code=400,
            detail="Phone number is required",
        )

    user = (
        db.query(User)
        .filter(User.phone == phone)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Phone number not found",
        )

    if not user.reset_otp:
        raise HTTPException(
            status_code=400,
            detail="Please request OTP first",
        )

    if user.reset_otp != input_otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP",
        )

    if not user.reset_otp_expire:
        user.reset_otp = None
        user.reset_otp_expire = None
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP expired",
        )

    if user.reset_otp_expire < datetime.utcnow():
        user.reset_otp = None
        user.reset_otp_expire = None
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP expired",
        )

    user.password = hash_password(
        data.new_password
    )

    user.reset_otp = None
    user.reset_otp_expire = None

    db.commit()
    db.refresh(user)

    return {
        "message": "Password reset successfully",
    }


def mask_phone(phone: str | None) -> str | None:
    """
    Example:
        +85512345678 -> +85512****678
    """

    if not phone:
        return None

    if len(phone) <= 7:
        return phone

    return (
        f"{phone[:6]}"
        f"{'*' * max(len(phone) - 9, 3)}"
        f"{phone[-3:]}"
    )