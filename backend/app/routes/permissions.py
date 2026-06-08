from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.routes.profile import get_current_user
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_teacher import ClassTeacher
from app.models.permission_request import PermissionRequest
from app.schemas.permission_schema import PermissionCreate, PermissionAction

router = APIRouter(prefix="/permissions", tags=["Permissions"])


def response(item: PermissionRequest, db: Session):
    student = db.query(Student).filter(Student.id == item.student_id).first()
    user = db.query(User).filter(User.id == student.user_id).first() if student else None

    return {
        "id": item.id,
        "student_id": item.student_id,
        "student_name": f"{user.first_name} {user.last_name}" if user else "-",
        "class_id": item.class_id,
        "type": item.type,
        "start_date": str(item.start_date),
        "end_date": str(item.end_date),
        "reason": item.reason,
        "status": item.status,
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

    if data.end_date < data.start_date:
        raise HTTPException(status_code=400, detail="End date cannot be before start date")

    item = PermissionRequest(
        student_id=student.id,
        class_id=student.class_id,
        type=data.type,
        start_date=data.start_date,
        end_date=data.end_date,
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

    class_ids = [
        r.class_id
        for r in db.query(ClassTeacher).filter(ClassTeacher.teacher_id == teacher.id).all()
    ]

    items = db.query(PermissionRequest).filter(
        PermissionRequest.class_id.in_(class_ids)
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

    allowed = db.query(ClassTeacher).filter(
        ClassTeacher.teacher_id == teacher.id,
        ClassTeacher.class_id == item.class_id,
    ).first()

    if not allowed:
        raise HTTPException(status_code=403, detail="You cannot manage this request")

    item.status = data.status
    item.teacher_id = teacher.id

    db.commit()
    db.refresh(item)

    return response(item, db)