from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.models.user import User
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.models.class_teacher import ClassTeacher
from app.schemas.class_schema import ClassCreate

router = APIRouter(prefix="/classes", tags=["Classes"])


def get_class_teachers(class_id: int, db: Session):
    relations = db.query(ClassTeacher).filter(
        ClassTeacher.class_id == class_id
    ).all()

    result = []

    for r in relations:
        teacher = db.query(Teacher).filter(Teacher.id == r.teacher_id).first()
        subject = db.query(Subject).filter(Subject.id == r.subject_id).first()

        user = None
        if teacher:
            user = db.query(User).filter(User.id == teacher.user_id).first()

        result.append({
            "relation_id": r.id,
            "teacher_id": teacher.id if teacher else None,
            "user_id": teacher.user_id if teacher else None,
            "teacher_name": f"{user.first_name} {user.last_name}" if user else "-",
            "subject_id": subject.id if subject else None,
            "subject_name": subject.name if subject else "-",
            "phone": teacher.phone if teacher else None,
})

    return result

def class_response(c: SchoolClass, db: Session):
    students_count = db.query(Student).filter(Student.class_id == c.id).count()
    teachers_count = db.query(ClassTeacher).filter(
        ClassTeacher.class_id == c.id
    ).count()

    return {
        "id": c.id,
        "name": c.name,
        "section": c.section,
        "students_count": students_count,
        "teachers_count": teachers_count,
    }


@router.get("/")
def get_classes(db: Session = Depends(get_db)):
    classes = db.query(SchoolClass).all()
    return [class_response(c, db) for c in classes]


@router.get("/teacher/my-classes")
def get_my_teacher_classes(
    current_user: User = Depends(__import__("app.routes.profile", fromlist=["get_current_user"]).get_current_user),
    db: Session = Depends(get_db),
):
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id
    ).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    relations = db.query(ClassTeacher).filter(
        ClassTeacher.teacher_id == teacher.id
    ).all()

    class_ids = list(set([r.class_id for r in relations]))

    classes = db.query(SchoolClass).filter(
        SchoolClass.id.in_(class_ids)
    ).all()

    return [class_response(c, db) for c in classes]


@router.get("/{class_id}")
def get_class_detail(class_id: int, db: Session = Depends(get_db)):
    c = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()

    if not c:
        raise HTTPException(status_code=404, detail="Class not found")

    students = db.query(Student).filter(Student.class_id == class_id).all()

    student_list = []
    for s in students:
        user = db.query(User).filter(User.id == s.user_id).first()

        student_list.append({
            "id": s.id,
            "user_id": s.user_id,
            "name": f"{user.first_name} {user.last_name}" if user else "-",
            "email": user.email if user else "-",
            "gender": s.gender,
            "guardian_name": s.guardian_name,
            "guardian_phone": s.guardian_phone,
            "address": s.address,
        })

    return {
        "id": c.id,
        "name": c.name,
        "section": c.section,
        "teachers": get_class_teachers(class_id, db),
        "students": student_list,
    }


@router.post("/")
def create_class(data: ClassCreate, db: Session = Depends(get_db)):
    c = SchoolClass(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)

    return class_response(c, db)


@router.put("/{class_id}")
def update_class(class_id: int, data: ClassCreate, db: Session = Depends(get_db)):
    c = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()

    if not c:
        raise HTTPException(status_code=404, detail="Class not found")

    for key, value in data.model_dump().items():
        setattr(c, key, value)

    db.commit()
    db.refresh(c)

    return class_response(c, db)


@router.delete("/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db)):
    c = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()

    if not c:
        raise HTTPException(status_code=404, detail="Class not found")

    db.delete(c)
    db.commit()

    return {"message": "Class deleted successfully"}