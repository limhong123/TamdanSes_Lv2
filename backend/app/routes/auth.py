from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.user import User
from app.schemas.auth_schema import RegisterSchema, LoginSchema
from app.core.security import hash_password, verify_password, create_access_token
from app.models.teacher import Teacher
from app.models.student import Student
router = APIRouter(prefix="/auth", tags=["Auth"])


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
    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email")

    if not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid password")

    token = create_access_token({
        "id": user.id,
        "email": user.email,
        "role": user.role,
    })
    teacher = None
    student = None

    if user.role == "teacher":
        teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()

    if user.role == "student":
        student = db.query(Student).filter(Student.user_id == user.id).first()

    return {
        "id": user.id,
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": f"{user.first_name} {user.last_name}",
        
        "teacher_id": teacher.id if teacher else None,
        "student_id": student.id if student else None,
        "class_id": student.class_id if student else None,
    }