from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date

from app.database.db import get_db
from app.routes.profile import get_current_user
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_teacher import ClassTeacher
from app.models.permission_request import PermissionRequest
from app.models.schedule import Schedule
from app.models.subject import Subject
from app.schemas.permission_schema import PermissionCreate, PermissionAction

router = APIRouter(prefix="/permissions", tags=["Permissions"])


def response(item: PermissionRequest, db: Session):
    student = db.query(Student).filter(Student.id == item.student_id).first()
    user = db.query(User).filter(User.id == student.user_id).first() if student else None

    schedule = db.query(Schedule).filter(Schedule.id == item.schedule_id).first()
    subject = db.query(Subject).filter(Subject.id == schedule.subject_id).first() if schedule else None

    teacher_name = "-"
    if schedule:
        teacher = db.query(Teacher).filter(Teacher.id == schedule.teacher_id).first()
        teacher_user = db.query(User).filter(User.id == teacher.user_id).first() if teacher else None
        if teacher_user:
            teacher_name = f"{teacher_user.first_name} {teacher_user.last_name}"

    return {
        "id": item.id,
        "student_id": item.student_id,
        "student_name": f"{user.first_name} {user.last_name}" if user else "-",
        "class_id": item.class_id,
        "schedule_id": item.schedule_id,
        "subject_name": subject.name if subject else "-",
        "day": schedule.day if schedule else "-",
        "start_time": str(schedule.start_time) if schedule else "-",
        "end_time": str(schedule.end_time) if schedule else "-",
        "teacher_name": teacher_name,
        "type": item.type,
        "start_date": str(item.start_date),
        "end_date": str(item.end_date),
        "reason": item.reason,
        "status": item.status,
        "teacher_id": item.teacher_id,
        "created_at": str(item.created_at),
    }


@router.post("/")
def create_permission(
    data: PermissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only student can request permission")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    schedule = db.query(Schedule).filter(Schedule.id == data.schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if schedule.class_id != student.class_id:
        raise HTTPException(status_code=400, detail="This schedule does not belong to your class")

    today = date.today()

    old = db.query(PermissionRequest).filter(
        PermissionRequest.student_id == student.id,
        PermissionRequest.schedule_id == data.schedule_id,
        PermissionRequest.start_date == today,
    ).first()

    if old:
        raise HTTPException(status_code=400, detail="You already requested permission for this subject today")

    item = PermissionRequest(
        student_id=student.id,
        class_id=student.class_id,
        schedule_id=data.schedule_id,
        type=data.type,
        start_date=today,
        end_date=today,
        reason=data.reason,
        status="pending",
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return response(item, db)


@router.get("/student/me")
def my_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expire_date = datetime.utcnow().date() - timedelta(days=2)

    db.query(PermissionRequest).filter(
        PermissionRequest.end_date < expire_date
    ).delete(synchronize_session=False)

    db.commit()

    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only student can view this")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    items = db.query(PermissionRequest).filter(
        PermissionRequest.student_id == student.id
    ).order_by(PermissionRequest.id.desc()).all()

    return [response(i, db) for i in items]


@router.get("/teacher/me")
def teacher_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teacher can view this")

    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    items = db.query(PermissionRequest).filter(
        PermissionRequest.schedule_id.in_(
            db.query(Schedule.id).filter(Schedule.teacher_id == teacher.id)
        )
    ).order_by(PermissionRequest.id.desc()).all()

    return [response(i, db) for i in items]


@router.put("/{permission_id}/status")
def update_permission_status(
    permission_id: int,
    data: PermissionAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teacher can approve or reject")

    if data.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be approved or rejected")

    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    item = db.query(PermissionRequest).filter(PermissionRequest.id == permission_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Permission request not found")

    schedule = db.query(Schedule).filter(Schedule.id == item.schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if schedule.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="You cannot manage this request")

    item.status = data.status
    item.teacher_id = teacher.id

    db.commit()
    db.refresh(item)

    return response(item, db)