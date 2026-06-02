from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.student import Student
from app.models.user import User
from app.models.school_class import SchoolClass
from app.schemas.student_schema import StudentCreate
from app.core.security import hash_password

router = APIRouter(prefix="/students", tags=["Students"])


def student_response(student: Student, db: Session):
    user = db.query(User).filter(User.id == student.user_id).first()

    school_class = db.query(SchoolClass).filter(
        SchoolClass.id == student.class_id
    ).first()

    return {
        "id": student.id,
        "user_id": student.user_id,

        "first_name": user.first_name if user else None,
        "last_name": user.last_name if user else None,

        "student_name": f"{user.first_name} {user.last_name}" if user else None,

        "email": user.email if user else None,

        "class_id": student.class_id,

        "class_name": (
            f"{school_class.name} {school_class.section or ''}"
            if school_class
            else None
        ),

        "gender": student.gender,
        "guardian_name": student.guardian_name,
        "guardian_phone": student.guardian_phone,
        "address": student.address,
    }

@router.get("/{student_id}")
def get_student_detail(
    student_id: int,
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return student_response(student, db)


@router.post("/")
def create_student(data: StudentCreate, db: Session = Depends(get_db)):
    old_user = db.query(User).filter(User.email == data.email).first()

    if old_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        password=hash_password(data.password),
        role="student",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    student = Student(
        user_id=user.id,
        class_id=data.class_id,
        gender=data.gender,
        guardian_name=data.guardian_name,
        guardian_phone=data.guardian_phone,
        address=data.address,
    )

    db.add(student)
    db.commit()
    db.refresh(student)

    return student_response(student, db)


@router.get("/")
def get_students(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    return [student_response(student, db) for student in students]


@router.put("/{student_id}")
def update_student(
    student_id: int,
    data: StudentCreate,
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = db.query(User).filter(User.id == student.user_id).first()

    if user:
        user.first_name = data.first_name
        user.last_name = data.last_name
        user.email = data.email

        if data.password:
            user.password = hash_password(data.password)

    student.class_id = data.class_id
    student.gender = data.gender
    student.guardian_name = data.guardian_name
    student.guardian_phone = data.guardian_phone
    student.address = data.address

    db.commit()
    db.refresh(student)

    return student_response(student, db)


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = db.query(User).filter(User.id == student.user_id).first()

    db.delete(student)

    if user:
        db.delete(user)

    db.commit()

    return {"message": "Student deleted successfully"}