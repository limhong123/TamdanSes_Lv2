from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.database.db import get_db
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.user import User
from app.models.teacher import Teacher
from app.models.schedule import Schedule
from app.models.subject import Subject
from app.models.permission_request import PermissionRequest
from app.schemas.attendance_schema import AttendanceSave
from app.routes.profile import get_current_user

router = APIRouter(prefix="/attendance", tags=["Attendance"])

VALID_STATUSES = ["P", "A", "L", "E", "Permission"]


def get_teacher_from_user(user: User, db: Session):
    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return teacher


def get_schedule_or_404(schedule_id: int, db: Session):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


def check_teacher_schedule_permission(user: User, schedule: Schedule, db: Session):
    if user.role == "admin":
        return True

    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="Permission denied")

    teacher = get_teacher_from_user(user, db)

    if schedule.teacher_id != teacher.id:
        raise HTTPException(
            status_code=403,
            detail="You can manage attendance only for your own schedule",
        )

    return True


def attendance_response(attendance: Attendance, db: Session):
    schedule = db.query(Schedule).filter(Schedule.id == attendance.schedule_id).first()
    subject = db.query(Subject).filter(Subject.id == schedule.subject_id).first() if schedule else None

    return {
        "id": attendance.id,
        "student_id": attendance.student_id,
        "schedule_id": attendance.schedule_id,
        "class_id": schedule.class_id if schedule else None,
        "subject_id": schedule.subject_id if schedule else None,
        "subject_name": subject.name if subject else "-",
        "teacher_id": schedule.teacher_id if schedule else None,
        "date": str(attendance.date),
        "day": schedule.day if schedule else "-",
        "start_time": str(schedule.start_time) if schedule else "-",
        "end_time": str(schedule.end_time) if schedule else "-",
        "status": attendance.status,
        "remark": getattr(attendance, "remark", None) or "-",
    }


def find_permission(student_id: int, schedule: Schedule, schedule_id: int, target_date: date, db: Session):
    return db.query(PermissionRequest).filter(
        PermissionRequest.student_id == student_id,
        PermissionRequest.class_id == schedule.class_id,
        PermissionRequest.schedule_id == schedule_id,
        PermissionRequest.status.in_(["pending", "approved"]),
        PermissionRequest.start_date <= target_date,
        PermissionRequest.end_date >= target_date,
    ).first()


@router.get("/schedule/{schedule_id}")
def get_schedule_attendance(
    schedule_id: int,
    attendance_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    schedule = get_schedule_or_404(schedule_id, db)
    check_teacher_schedule_permission(current_user, schedule, db)

    students = db.query(Student).filter(Student.class_id == schedule.class_id).all()

    saved_count = db.query(Attendance).filter(
        Attendance.schedule_id == schedule_id,
        Attendance.date == attendance_date,
    ).count()

    locked = saved_count > 0
    result = []

    for student in students:
        user = db.query(User).filter(User.id == student.user_id).first()

        attendance = db.query(Attendance).filter(
            Attendance.student_id == student.id,
            Attendance.schedule_id == schedule_id,
            Attendance.date == attendance_date,
        ).first()

        permission = find_permission(
            student_id=student.id,
            schedule=schedule,
            schedule_id=schedule_id,
            target_date=attendance_date,
            db=db,
        )

        if attendance:
            status = attendance.status
            remark = getattr(attendance, "remark", None) or "-"
        elif permission:
            status = "Permission"
            remark = permission.reason
        else:
            status = "P"
            remark = "-"

        result.append({
            "student_id": student.id,
            "student_name": f"{user.first_name} {user.last_name}" if user else "-",
            "gender": student.gender,
            "permission_reason": permission.reason if permission else "-",
            "status": status,
            "remark": remark,
        })

    return {
        "locked": locked,
        "schedule": {
            "id": schedule.id,
            "class_id": schedule.class_id,
            "subject_id": schedule.subject_id,
            "teacher_id": schedule.teacher_id,
            "day": schedule.day,
            "start_time": str(schedule.start_time),
            "end_time": str(schedule.end_time),
        },
        "students": result,
    }


@router.post("/save")
def save_attendance(
    data: AttendanceSave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    schedule = get_schedule_or_404(data.schedule_id, db)
    check_teacher_schedule_permission(current_user, schedule, db)

    old_attendance = db.query(Attendance).filter(
        Attendance.schedule_id == data.schedule_id,
        Attendance.date == data.date,
    ).first()

    if old_attendance:
        raise HTTPException(
            status_code=400,
            detail="Attendance already submitted for this schedule and date",
        )

    for item in data.items:
        if item.status not in VALID_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Status must be one of P, A, L, E, Permission",
            )

        student = db.query(Student).filter(Student.id == item.student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student {item.student_id} not found")

        if student.class_id != schedule.class_id:
            raise HTTPException(
                status_code=400,
                detail=f"Student {item.student_id} does not belong to this class",
            )

        status = item.status
        remark = getattr(item, "remark", None)

        if status == "Permission" and not remark:
            permission = find_permission(
                student_id=student.id,
                schedule=schedule,
                schedule_id=data.schedule_id,
                target_date=data.date,
                db=db,
            )
            remark = permission.reason if permission else None

        attendance = Attendance(
            student_id=item.student_id,
            schedule_id=data.schedule_id,
            date=data.date,
            status=status,
            remark=remark,
        )

        db.add(attendance)

    db.commit()

    return {"message": "Attendance saved successfully"}


@router.get("/me")
def my_attendance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expire_date = date.today() - timedelta(days=2)

    db.query(Attendance).filter(
        Attendance.date < expire_date
    ).delete(synchronize_session=False)
    db.commit()

    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only student can view this")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    records = db.query(Attendance).filter(
        Attendance.student_id == student.id
    ).order_by(Attendance.date.desc(), Attendance.id.desc()).all()

    return [attendance_response(r, db) for r in records]