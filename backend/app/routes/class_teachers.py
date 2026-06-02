from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.class_teacher import ClassTeacher
from app.models.school_class import SchoolClass
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.models.user import User
from app.schemas.class_teacher_schema import ClassTeacherCreate

router = APIRouter(prefix="/class-teachers", tags=["Class Teachers"])


def relation_response(item: ClassTeacher, db: Session):
    school_class = db.query(SchoolClass).filter(
        SchoolClass.id == item.class_id
    ).first()

    teacher = db.query(Teacher).filter(
        Teacher.id == item.teacher_id
    ).first()

    subject = db.query(Subject).filter(
        Subject.id == item.subject_id
    ).first()

    teacher_name = None

    if teacher:
        user = db.query(User).filter(
            User.id == teacher.user_id
        ).first()

        if user:
            teacher_name = f"{user.first_name} {user.last_name}"

    return {
        "id": item.id,
        "class_id": item.class_id,
        "class_name": school_class.name if school_class else None,
        "class_section": school_class.section if school_class else None,

        "teacher_id": item.teacher_id,
        "teacher_name": teacher_name,

        "subject_id": item.subject_id,
        "subject_name": subject.name if subject else None,
    }

@router.get("/")
def get_relations(db: Session = Depends(get_db)):
    items = db.query(ClassTeacher).all()

    return [relation_response(i, db) for i in items]


@router.post("/")
def create_relation(
    data: ClassTeacherCreate,
    db: Session = Depends(get_db)
):
    exists = db.query(ClassTeacher).filter(
        ClassTeacher.class_id == data.class_id,
        ClassTeacher.teacher_id == data.teacher_id,
        ClassTeacher.subject_id == data.subject_id,
    ).first()

    if exists:
        raise HTTPException(
            status_code=400,
            detail="This teacher is already assigned to this class and subject"
        )

    item = ClassTeacher(**data.model_dump())

    db.add(item)
    db.commit()
    db.refresh(item)

    return relation_response(item, db)

@router.delete("/{relation_id}")
def delete_relation(
    relation_id: int,
    db: Session = Depends(get_db)
):
    item = db.query(ClassTeacher).filter(
        ClassTeacher.id == relation_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Relation not found")

    db.delete(item)
    db.commit()

    return {"message": "Deleted successfully"}