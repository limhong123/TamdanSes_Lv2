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
    ParentCreatePasswordSchema,
    ParentPasswordLoginSchema,
)
from app.models.parent import Parent
from app.models.parent_student import ParentStudent


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
def get_parent_students(
    parent_id: int,
    db: Session,
):
    relations = (
        db.query(ParentStudent)
        .filter(ParentStudent.parent_id == parent_id)
        .all()
    )

    students = []

    for relation in relations:
        student = (
            db.query(Student)
            .filter(Student.id == relation.student_id)
            .first()
        )

        if not student:
            continue

        student_user = (
            db.query(User)
            .filter(User.id == student.user_id)
            .first()
        )

        full_name = ""

        if student_user:
            full_name = (
                f"{student_user.first_name or ''} "
                f"{student_user.last_name or ''}"
            ).strip()

        students.append({
            "id": student.id,
            "student_code": student.student_code,
            "student_name": full_name,
            "class_id": student.class_id,
            "relationship_type": relation.relationship_type,
        })

    return students

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

    parent = (
        db.query(Parent)
        .filter(Parent.phone == input_phone)
        .first()
    )

    if not parent:
        raise HTTPException(
            status_code=404,
            detail="Parent phone not found",
        )

    relation = (
        db.query(ParentStudent)
        .filter(
            ParentStudent.parent_id == parent.id,
            ParentStudent.student_id == student.id,
        )
        .first()
    )

    if not relation:
        raise HTTPException(
            status_code=401,
            detail="This parent is not linked to this student",
        )

    parent_user = (
        db.query(User)
        .filter(User.id == parent.user_id)
        .first()
    )

    if not parent_user:
        raise HTTPException(
            status_code=404,
            detail="Parent user account not found",
        )

    otp = str(random.randint(100000, 999999))

    parent_user.reset_otp = otp
    parent_user.reset_otp_expire = (
        datetime.utcnow() + timedelta(minutes=5)
    )

    try:
        send_sms(
            parent.phone,
            (
                f"TAM DAN SES Parent OTP: {otp}. "
                "Expires in 5 minutes."
            ),
        )
    except Exception as error:
        db.rollback()
        print("Parent OTP SMS error:", error)

        raise HTTPException(
            status_code=500,
            detail="SMS send failed",
        )

    db.commit()

    return {
        "message": "OTP sent successfully",
        "expires_in": 300,
        "password_created": parent.password_created,
    }

@router.post("/parent/verify-otp")
def verify_parent_otp(
    data: ParentVerifyOtpSchema,
    db: Session = Depends(get_db),
):
    student_code = data.student_code.strip()
    input_phone = normalize_phone(data.parent_phone)
    input_otp = data.otp.strip()

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

    parent = (
        db.query(Parent)
        .filter(Parent.phone == input_phone)
        .first()
    )

    if not parent:
        raise HTTPException(
            status_code=404,
            detail="Parent phone not found",
        )

    relation = (
        db.query(ParentStudent)
        .filter(
            ParentStudent.parent_id == parent.id,
            ParentStudent.student_id == student.id,
        )
        .first()
    )

    if not relation:
        raise HTTPException(
            status_code=401,
            detail="Parent and student information do not match",
        )

    parent_user = (
        db.query(User)
        .filter(User.id == parent.user_id)
        .first()
    )

    if not parent_user:
        raise HTTPException(
            status_code=404,
            detail="Parent user account not found",
        )

    if not parent_user.reset_otp:
        raise HTTPException(
            status_code=400,
            detail="Please request OTP first",
        )

    if parent_user.reset_otp != input_otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP",
        )

    if (
        not parent_user.reset_otp_expire
        or parent_user.reset_otp_expire < datetime.utcnow()
    ):
        parent_user.reset_otp = None
        parent_user.reset_otp_expire = None
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP expired",
        )

    parent_user.reset_otp = None
    parent_user.reset_otp_expire = None

    # Parent មិនទាន់មាន Password
    if not parent.password_created:
        setup_token = create_access_token({
            "id": parent_user.id,
            "parent_id": parent.id,
            "role": "parent_setup",
            "purpose": "create_parent_password",
        })

        db.commit()

        return {
            "message": "OTP verified successfully",
            "requires_password_setup": True,
            "setup_token": setup_token,
            "parent_id": parent.id,
        }

    # Parent មាន Password រួច ហើយប្រើ OTP សម្រាប់ reset password
    setup_token = create_access_token({
        "id": parent_user.id,
        "parent_id": parent.id,
        "role": "parent_setup",
        "purpose": "reset_parent_password",
    })

    db.commit()

    return {
        "message": "OTP verified successfully",
        "requires_password_setup": True,
        "setup_token": setup_token,
        "parent_id": parent.id,
    }

@router.post("/parent/create-password")
def create_parent_password(
    data: ParentCreatePasswordSchema,
    db: Session = Depends(get_db),
):
    if data.new_password != data.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match",
        )

    try:
        from jose import JWTError, jwt

        payload = jwt.decode(
            data.setup_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired setup token",
        )

    purpose = payload.get("purpose")
    parent_id = payload.get("parent_id")
    user_id = payload.get("id")

    if purpose not in [
        "create_parent_password",
        "reset_parent_password",
    ]:
        raise HTTPException(
            status_code=401,
            detail="Invalid setup token purpose",
        )

    parent = (
        db.query(Parent)
        .filter(
            Parent.id == parent_id,
            Parent.user_id == user_id,
        )
        .first()
    )

    if not parent:
        raise HTTPException(
            status_code=404,
            detail="Parent account not found",
        )

    parent_user = (
        db.query(User)
        .filter(User.id == parent.user_id)
        .first()
    )

    if not parent_user:
        raise HTTPException(
            status_code=404,
            detail="Parent user account not found",
        )

    parent_user.password = hash_password(
        data.new_password
    )

    parent.password_created = True

    db.commit()
    db.refresh(parent)

    students = get_parent_students(
        parent.id,
        db,
    )

    access_token = create_access_token({
        "id": parent_user.id,
        "parent_id": parent.id,
        "role": "parent",
    })

    return {
        "message": "Parent password created successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "role": "parent",
        "parent": {
            "id": parent.id,
            "name": parent.full_name,
            "phone": parent.phone,
        },
        "students": students,
    }

@router.post("/parent/login")
def parent_password_login(
    data: ParentPasswordLoginSchema,
    db: Session = Depends(get_db),
):
    student_code = data.student_code.strip()

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

    relation = (
        db.query(ParentStudent)
        .filter(ParentStudent.student_id == student.id)
        .first()
    )

    if not relation:
        raise HTTPException(
            status_code=404,
            detail="Parent is not linked to this student",
        )

    parent = (
        db.query(Parent)
        .filter(Parent.id == relation.parent_id)
        .first()
    )

    if not parent:
        raise HTTPException(
            status_code=404,
            detail="Parent account not found",
        )

    if not parent.password_created:
        raise HTTPException(
            status_code=403,
            detail="Please verify your phone and create a password first",
        )

    parent_user = (
        db.query(User)
        .filter(User.id == parent.user_id)
        .first()
    )

    if not parent_user:
        raise HTTPException(
            status_code=404,
            detail="Parent user account not found",
        )

    if not verify_password(
        data.password,
        parent_user.password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid Student ID or password",
        )

    if not parent_user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Parent account is inactive",
        )

    students = get_parent_students(
        parent.id,
        db,
    )

    access_token = create_access_token({
        "id": parent_user.id,
        "parent_id": parent.id,
        "role": "parent",
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": "parent",
        "parent": {
            "id": parent.id,
            "name": parent.full_name,
            "phone": parent.phone,
        },
        "students": students,
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