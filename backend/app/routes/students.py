from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.student import Student
from app.models.user import User
from app.models.school_class import SchoolClass
from app.schemas.student_schema import StudentCreate
from app.core.security import hash_password

router = APIRouter(prefix="/students", tags=["Students"])


def normalize_phone(phone: str):
    if not phone:
        return None

    phone = phone.strip().replace(" ", "").replace("-", "")

    if phone.startswith("0"):
        return "+855" + phone[1:]

    return phone


def student_response(student: Student, db: Session):
    user = db.query(User).filter(User.id == student.user_id).first()

    school_class = db.query(SchoolClass).filter(
        SchoolClass.id == student.class_id
    ).first()

    return {
        "id": student.id,
        "student_code": student.student_code,
        "user_id": student.user_id,

        "first_name": user.first_name if user else "",
        "last_name": user.last_name if user else "",
        "student_name": f"{user.first_name} {user.last_name}" if user else "-",
        "email": user.email if user else "",

        "phone": user.phone if user else "",

        "class_id": student.class_id,
        "class_name": (
            f"{school_class.name} {school_class.section or ''}"
            if school_class
            else "-"
        ),

        "gender": student.gender,
        "guardian_name": student.guardian_name,
        "guardian_phone": student.guardian_phone,
        "address": student.address,
    }


@router.get("/")
def get_students(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    return [student_response(student, db) for student in students]


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

    if not data.password:
        raise HTTPException(
            status_code=400,
            detail="Password is required"
        )

    old_user = db.query(User).filter(
        User.email == data.email
    ).first()

    if old_user:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    normalized_phone = normalize_phone(data.phone)

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        password=hash_password(data.password),
        phone=normalized_phone,
        role="student",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    last_student = db.query(Student).order_by(
        Student.id.desc()
    ).first()

    next_number = last_student.id + 1 if last_student else 1
    student_code = f"ST-{next_number:04d}"

    student = Student(
        student_code=student_code,
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

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    normalized_phone = normalize_phone(data.phone)

    user.first_name = data.first_name
    user.last_name = data.last_name
    user.email = data.email
    user.phone = normalized_phone

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