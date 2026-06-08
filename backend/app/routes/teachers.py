from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.teacher import Teacher
from app.models.user import User
from app.core.security import hash_password
from app.schemas.teacher_schema import TeacherCreate,TeacherUpdate

router = APIRouter(prefix="/teachers", tags=["Teachers"])


def normalize_phone(phone: str):
    if not phone:
        return None

    phone = phone.strip().replace(" ", "").replace("-", "")

    if phone.startswith("0"):
        return "+855" + phone[1:]

    return phone


def teacher_response(teacher, db):
    user = db.query(User).filter(User.id == teacher.user_id).first()

    return {
        "id": teacher.id,
        "teacher_code": teacher.teacher_code,
        "user_id": teacher.user_id,
        "first_name": user.first_name if user else "",
        "last_name": user.last_name if user else "",
        "teacher_name": f"{user.first_name} {user.last_name}" if user else "-",
        "email": user.email if user else "",
        "phone": teacher.phone,
        "address": teacher.address,
        "qualification": teacher.qualification,
    }


@router.get("/")
def get_teachers(db: Session = Depends(get_db)):
    teachers = db.query(Teacher).all()
    return [teacher_response(t, db) for t in teachers]


@router.post("/")
def create_teacher(data: TeacherCreate, db: Session = Depends(get_db)):
    old_user = db.query(User).filter(User.email == data.email).first()

    if old_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    normalized_phone = normalize_phone(data.phone)

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        password=hash_password(data.password),
        phone=normalized_phone,
        role="teacher",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    last_teacher = db.query(Teacher).order_by(Teacher.id.desc()).first()
    next_number = last_teacher.id + 1 if last_teacher else 1
    teacher_code = f"T-{next_number:04d}"

    teacher = Teacher(
        teacher_code=teacher_code,
        user_id=user.id,
        phone=normalized_phone,
        address=data.address,
        qualification=data.qualification,
    )

    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    return teacher_response(teacher, db)


@router.put("/{teacher_id}")
def update_teacher(
    teacher_id: int,
    data: TeacherUpdate,
    db: Session = Depends(get_db),
):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    user = db.query(User).filter(User.id == teacher.user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    normalized_phone = normalize_phone(data.phone)

    user.first_name = data.first_name
    user.last_name = data.last_name
    user.email = data.email
    user.phone = normalized_phone

    if data.password:
        user.password = hash_password(data.password)

    teacher.phone = normalized_phone
    teacher.address = data.address
    teacher.qualification = data.qualification

    db.commit()
    db.refresh(teacher)

    return teacher_response(teacher, db)


@router.delete("/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    user = db.query(User).filter(User.id == teacher.user_id).first()

    db.delete(teacher)

    if user:
        db.delete(user)

    db.commit()

    return {"message": "Teacher deleted successfully"}