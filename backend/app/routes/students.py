from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.student import Student
from app.models.user import User
from app.models.school_class import SchoolClass
from app.schemas.student_schema import StudentCreate
from app.core.security import hash_password
import secrets
import string
router = APIRouter(prefix="/students", tags=["Students"])

def generate_password(length=8):
    chars = string.ascii_letters + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))
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

    last_student = db.query(Student).order_by(
        Student.id.desc()
    ).first()

    next_number = last_student.id + 1 if last_student else 1
    student_code = f"ST-{next_number:04d}"

    base_email = data.last_name.lower().replace(" ", "")
    auto_email = data.email or f"{base_email}@gmail.com"

    counter = 1
    while db.query(User).filter(User.email == auto_email).first():
        auto_email = f"{base_email}{counter}@gmail.com"
        counter += 1

    auto_password = data.password or generate_password()

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=auto_email,
        password=hash_password(auto_password),
        phone=normalize_phone(data.phone),
        role="student",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

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

    result = student_response(student, db)
    result["login_id"] = student_code
    result["default_password"] = auto_password

    return result

@router.post("/{student_id}/reset-password")
def reset_student_password(
    student_id: int,
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = db.query(User).filter(User.id == student.user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_password = generate_password()

    user.password = hash_password(new_password)

    db.commit()

    return {
        "student_code": student.student_code,
        "email": user.email,
        "temporary_password": new_password,
    }
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