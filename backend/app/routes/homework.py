import os
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.homework import Homework
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.user import User
from app.models.student import Student

router = APIRouter(prefix="/homework", tags=["Homework"])

UPLOAD_DIR = "uploads/homework"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def save_file(file: UploadFile):
    if not file:
        return None

    file_path = f"{UPLOAD_DIR}/{file.filename}"

    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())

    return file_path


def homework_response(item: Homework, db: Session):
    school_class = db.query(SchoolClass).filter(SchoolClass.id == item.class_id).first()
    subject = db.query(Subject).filter(Subject.id == item.subject_id).first()
    teacher = db.query(Teacher).filter(Teacher.id == item.teacher_id).first()

    teacher_name = "-"

    if teacher:
        user = db.query(User).filter(User.id == teacher.user_id).first()
        if user:
            teacher_name = f"{user.first_name} {user.last_name}"

    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "file_path": item.file_path,
        "class_id": item.class_id,
        "class_name": f"{school_class.name} {school_class.section}" if school_class else "-",
        "subject_id": item.subject_id,
        "subject_name": subject.name if subject else "-",
        "teacher_id": item.teacher_id,
        "teacher_name": teacher_name,
        "due_date": item.due_date,
        "created_at": item.created_at,
    }


@router.post("/")
def create_homework(
    title: str = Form(...),
    description: str = Form(""),
    class_id: int = Form(...),
    subject_id: int = Form(...),
    teacher_id: int = Form(...),
    due_date: str = Form(...),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db)
):
    file_path = save_file(file) if file else None

    homework = Homework(
        title=title,
        description=description,
        class_id=class_id,
        subject_id=subject_id,
        teacher_id=teacher_id,
        due_date=due_date,
        file_path=file_path,
    )

    db.add(homework)
    db.commit()
    db.refresh(homework)

    return homework_response(homework, db)


@router.get("/")
def get_all_homework(db: Session = Depends(get_db)):
    items = db.query(Homework).order_by(Homework.id.desc()).all()
    return [homework_response(i, db) for i in items]


@router.get("/teacher/{teacher_id}")
def get_teacher_homework(
    teacher_id: int,
    db: Session = Depends(get_db)
):
    items = db.query(Homework).filter(
        Homework.teacher_id == teacher_id
    ).order_by(Homework.id.desc()).all()

    return [homework_response(i, db) for i in items]


@router.get("/student/{student_id}")
def get_student_homework(
    student_id: int,
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        return []

    items = db.query(Homework).filter(
        Homework.class_id == student.class_id
    ).order_by(Homework.id.desc()).all()

    return [homework_response(i, db) for i in items]