from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.models.user import User
from app.core.security import hash_password
from app.schemas.teacher_schema import TeacherCreate

router = APIRouter(prefix="/teachers", tags=["Teachers"])


def teacher_response(teacher, db):
    user = db.query(User).filter(User.id == teacher.user_id).first()

    return {
        "id": teacher.id,
        "user_id": teacher.user_id,
        "teacher_name": f"{user.first_name} {user.last_name}" if user else "-",
        "email": user.email if user else "-",
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

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        password=hash_password(data.password),
        role="teacher",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    teacher = Teacher(
        user_id=user.id,
        phone=data.phone,
        address=data.address,
        qualification=data.qualification,
    )

    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    return teacher_response(teacher, db)

@router.put("/{teacher_id}")
def update_teacher(teacher_id: int, data: TeacherCreate, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    for key, value in data.model_dump().items():
        setattr(teacher, key, value)

    db.commit()
    db.refresh(teacher)

    return teacher_response(teacher, db)


@router.delete("/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    db.delete(teacher)
    db.commit()

    return {"message": "Teacher deleted successfully"}