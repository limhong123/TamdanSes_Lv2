from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.models.parent import Parent
from app.database.db import get_db
from app.models.user import User
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.core.config import settings
from app.models.school_class import SchoolClass
from app.utils.cloudinary_upload import upload_file_to_cloudinary
from app.models.class_teacher import ClassTeacher


router = APIRouter(prefix="/profile", tags=["Profile"])
security = HTTPBearer()


DEFAULT_AVATAR_URL = (
    "https://res.cloudinary.com/dkn5zii0b/"
    "image/upload/v1781493124/profile_ix4pkm.webp"
)


# =========================================================
# SCHEMAS
# =========================================================

class UpdateProfileInfo(BaseModel):
    first_name: str
    last_name: str


class ChangePassword(BaseModel):
    old_password: str
    new_password: str


class ChangeEmail(BaseModel):
    email: EmailStr


# =========================================================
# AUTH / CURRENT USER
# =========================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )

        user_id = payload.get("id")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid token",
            )

        user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found",
            )

        return user

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token",
        )


# =========================================================
# COMMON USER RESPONSE
# =========================================================

def user_response(user: User):
    full_name = (
        f"{user.first_name or ''} "
        f"{user.last_name or ''}"
    ).strip()

    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": full_name,
        "email": user.email,
        "role": user.role,
        "avatar_url": user.avatar_url,
        "has_avatar": bool(user.avatar_url),
    }


# =========================================================
# GET MY PROFILE
# =========================================================

@router.get(
    "/me",
    summary="To get my own profile",
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = None

    # =====================================================
    # STUDENT
    # =====================================================
    if current_user.role == "student":
        student = (
            db.query(Student)
            .filter(Student.user_id == current_user.id)
            .first()
        )

        if student:
            school_class = (
                db.query(SchoolClass)
                .filter(SchoolClass.id == student.class_id)
                .first()
            )

            profile = {
                "id": student.id,
                "student_code": student.student_code,
                "user_id": student.user_id,
                "class_id": student.class_id,

                "class_name": (
                    f"{school_class.name} "
                    f"{school_class.section or ''}"
                ).strip()
                if school_class
                else None,

                "roll_no": getattr(student, "roll_no", None),
                "gender": getattr(student, "gender", None),

                # Student phone is stored in users table
                "phone": current_user.phone,

                # Parent information
                "guardian_name": getattr(
                    student,
                    "guardian_name",
                    None,
                ),
                "guardian_phone": getattr(
                    student,
                    "guardian_phone",
                    None,
                ),
                "address": getattr(
                    student,
                    "address",
                    None,
                ),
            }
    # =====================================================
    # TEACHER
    # =====================================================
    elif current_user.role == "teacher":

        teacher = (
            db.query(Teacher)
            .filter(Teacher.user_id == current_user.id)
            .first()
        )

        if teacher:
            class_teacher = (
                db.query(ClassTeacher)
                .filter(
                    ClassTeacher.teacher_id == teacher.id
                )
                .first()
            )

            subject = None

            if class_teacher:
                subject = (
                    db.query(Subject)
                    .filter(
                        Subject.id
                        == class_teacher.subject_id
                    )
                    .first()
                )

            profile = {
                "id": teacher.id,
                "teacher_code": teacher.teacher_code,
                "user_id": teacher.user_id,

                "subject_id": (
                    class_teacher.subject_id
                    if class_teacher
                    else None
                ),

                "subject_name": (
                    subject.name
                    if subject
                    else None
                ),

                "phone": teacher.phone,
                "address": teacher.address,
                "qualification": teacher.qualification,
            }

    # =====================================================
    # PARENT
    # =====================================================
    elif current_user.role == "parent":

        parent = (
            db.query(Parent)
            .filter(Parent.user_id == current_user.id)
            .first()
        )

        if parent:
            profile = {
                "id": parent.id,
                "user_id": parent.user_id,

                # Parent has one name field only
                "full_name": parent.full_name,

                "phone": parent.phone,
                "password_created": parent.password_created,
            }

    # =====================================================
    # BUILD USER RESPONSE
    # =====================================================

    user_data = user_response(current_user)

    if profile:

        # -------------------------------------------------
        # Student
        # -------------------------------------------------
        if current_user.role == "student":

            # IMPORTANT:
            # Student phone must be student's phone,
            # not guardian_phone.
            user_data["phone"] = profile.get("phone")

        # -------------------------------------------------
        # Teacher
        # -------------------------------------------------
        elif current_user.role == "teacher":

            user_data["phone"] = profile.get("phone")

        # -------------------------------------------------
        # Parent
        # -------------------------------------------------
        elif current_user.role == "parent":

            user_data["phone"] = profile.get("phone")

            # Parent uses only full_name
            user_data["full_name"] = profile.get("full_name")

            # Parent does not use first_name / last_name
            user_data.pop("first_name", None)
            user_data.pop("last_name", None)

    else:
        user_data["phone"] = None

    return {
        "user": user_data,
        "profile": profile,
    }


# =========================================================
# UPDATE PROFILE INFO
# =========================================================

@router.put(
    "/info",
    summary="To update profile info",
)
def update_profile_info(
    data: UpdateProfileInfo,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    # Parent does not use first_name / last_name
    if current_user.role == "parent":
        raise HTTPException(
            status_code=400,
            detail=(
                "Parent profile uses full_name. "
                "Use a parent-specific update endpoint."
            ),
        )

    current_user.first_name = data.first_name
    current_user.last_name = data.last_name

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Profile updated successfully",
        "user": user_response(current_user),
    }


# =========================================================
# UPLOAD AVATAR
# =========================================================

@router.post(
    "/avatar",
    summary="To upload profile avatar",
)
def update_avatar(
    avatar: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    avatar_url = upload_file_to_cloudinary(
        avatar,
        folder="tamdan/avatars",
    )

    current_user.avatar_url = avatar_url

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Avatar uploaded successfully",
        "avatar_url": current_user.avatar_url,
    }


# =========================================================
# DELETE AVATAR
# =========================================================

@router.delete(
    "/avatar",
    summary="To delete profile avatar",
)
def delete_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    current_user.avatar_url = None

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Avatar deleted successfully",
        "avatar_url": None,
    }