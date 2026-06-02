from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from app.database.db import get_db
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.user import User
from app.models.teacher import Teacher
from app.models.class_teacher import ClassTeacher
from app.schemas.attendance_schema import AttendanceSave
from app.routes.profile import get_current_user

router = APIRouter(prefix="/attendance", tags=["Attendance"])


def check_teacher_class_permission(user: User, class_id: int, db: Session):
    if user.role == "admin":
        return True

    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="Permission denied")

    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    relation = db.query(ClassTeacher).filter(
        ClassTeacher.teacher_id == teacher.id,
        ClassTeacher.class_id == class_id,
    ).first()

    if not relation:
        raise HTTPException(status_code=403, detail="You cannot manage this class")

    return True


@router.get("/class/{class_id}")
def get_class_attendance(
    class_id: int,
    attendance_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_teacher_class_permission(current_user, class_id, db)

    students = db.query(Student).filter(Student.class_id == class_id).all()

    saved_count = db.query(Attendance).filter(
        Attendance.class_id == class_id,
        Attendance.date == attendance_date,
    ).count()

    locked = saved_count > 0

    result = []

    for student in students:
        user = db.query(User).filter(User.id == student.user_id).first()

        attendance = db.query(Attendance).filter(
            Attendance.student_id == student.id,
            Attendance.date == attendance_date,
        ).first()

        result.append({
            "student_id": student.id,
            "student_name": f"{user.first_name} {user.last_name}" if user else "-",
            "gender": student.gender,
            "status": attendance.status if attendance else "P",
        })

    return {
        "locked": locked,
        "students": result,
    }

@router.post("/save")
def save_attendance(
    data: AttendanceSave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_teacher_class_permission(current_user, data.class_id, db)

    old_attendance = db.query(Attendance).filter(
        Attendance.class_id == data.class_id,
        Attendance.date == data.date,
    ).first()

    if old_attendance:
        raise HTTPException(
            status_code=400,
            detail="Attendance already submitted for this class and date"
        )

    for item in data.items:
        attendance = Attendance(
            student_id=item.student_id,
            class_id=data.class_id,
            date=data.date,
            status=item.status,
        )
        db.add(attendance)

    db.commit()

    return {"message": "Attendance saved successfully"}

@router.get("/me")
def my_attendance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only student can view this")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    records = db.query(Attendance).filter(
        Attendance.student_id == student.id
    ).order_by(Attendance.date.desc()).all()

    return records