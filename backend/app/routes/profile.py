from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from jose import jwt, JWTError


from app.database.db import get_db
from app.models.user import User
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models.school_class import SchoolClass
from app.utils.cloudinary_upload import upload_file_to_cloudinary
router = APIRouter(prefix="/profile", tags=["Profile"])
security = HTTPBearer()


class UpdateProfileInfo(BaseModel):
    first_name: str
    last_name: str


class ChangePassword(BaseModel):
    old_password: str
    new_password: str


class ChangeEmail(BaseModel):
    email: EmailStr


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
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/me", summary="to get my own profile")
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_data = {
        "id": current_user.id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "full_name": f"{current_user.first_name} {current_user.last_name}",
        "email": current_user.email,
        "role": current_user.role,
        "avatar_url": current_user.avatar_url,
    }

    profile = None

    if current_user.role == "student":
        student = db.query(Student).filter(
            Student.user_id == current_user.id
        ).first()

        if student:
            school_class = db.query(SchoolClass).filter(
                SchoolClass.id == student.class_id
            ).first()

            profile = {
                "id": student.id,
                "student_code": student.student_code,
                "user_id": student.user_id,
                "class_id": student.class_id,
                "class_name": (
                    f"{school_class.name} {school_class.section or ''}"
                    if school_class
                    else None
                ),
                "roll_no": getattr(student, "roll_no", None),
                "gender": getattr(student, "gender", None),
                "guardian_name": getattr(student, "guardian_name", None),
                "guardian_phone": getattr(student, "guardian_phone", None),
                "address": getattr(student, "address", None),
            }

    if current_user.role == "teacher":
        teacher = db.query(Teacher).filter(
            Teacher.user_id == current_user.id
        ).first()

        if teacher:
            subject = None

            if getattr(teacher, "subject_id", None):
                subject = db.query(Subject).filter(
                    Subject.id == teacher.subject_id
                ).first()

            profile = {
                "id": teacher.id,
                "teacher_code": teacher.teacher_code,
                "user_id": teacher.user_id,
                "subject_id": getattr(teacher, "subject_id", None),
                "subject_name": subject.name if subject else None,
                "phone": teacher.phone,
                "address": teacher.address,
                "qualification": teacher.qualification,
            }

    return {
        "user": user_data,
        "profile": profile,
    }


@router.put("/info", summary="to update profile info")
def update_profile_info(
    data: UpdateProfileInfo,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.first_name = data.first_name
    current_user.last_name = data.last_name

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Profile updated successfully",
        "user": {
            "id": current_user.id,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "full_name": f"{current_user.first_name} {current_user.last_name}",
            "email": current_user.email,
            "role": current_user.role,
            "avatar_url": current_user.avatar_url,
        },
    }




@router.post("/avatar", summary="to update profile avatar")
def update_avatar(
    avatar: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    avatar_url = upload_file_to_cloudinary(
        avatar,
        folder="tamdan/avatars"
    )

    current_user.avatar_url = avatar_url

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Avatar uploaded successfully",
        "avatar_url": avatar_url,
    }

@router.delete("/avatar", summary="to delete profile avatar")
def delete_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.avatar_url = None

    db.commit()

    return {"message": "Avatar deleted successfully"}