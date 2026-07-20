from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.class_teacher import ClassTeacher
from app.models.parent import Parent
from app.models.parent_student import ParentStudent
from app.models.permission_request import PermissionRequest
from app.models.schedule import Schedule
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.user import User
from app.routes.profile import get_current_user
from app.schemas.permission_schema import (
    ParentPermissionCreate,
    PermissionAction,
    PermissionCreate,
)


router = APIRouter(
    prefix="/permissions",
    tags=["Permissions"],
)


# =========================================================
# Permission response
# =========================================================

def permission_response(
    item: PermissionRequest,
    db: Session,
):
    student = (
        db.query(Student)
        .filter(Student.id == item.student_id)
        .first()
    )

    student_user = None

    if student:
        student_user = (
            db.query(User)
            .filter(User.id == student.user_id)
            .first()
        )

    schedule = None
    subject = None
    teacher_name = "-"

    if item.schedule_id:
        schedule = (
            db.query(Schedule)
            .filter(Schedule.id == item.schedule_id)
            .first()
        )

        if schedule:
            subject = (
                db.query(Subject)
                .filter(
                    Subject.id == schedule.subject_id
                )
                .first()
            )

            teacher = (
                db.query(Teacher)
                .filter(
                    Teacher.id == schedule.teacher_id
                )
                .first()
            )

            if teacher:
                teacher_user = (
                    db.query(User)
                    .filter(
                        User.id == teacher.user_id
                    )
                    .first()
                )

                if teacher_user:
                    teacher_name = (
                        f"{teacher_user.first_name} "
                        f"{teacher_user.last_name}"
                    )

    requested_by_role = (
        getattr(
            item,
            "requested_by_role",
            None,
        )
        or "student"
    )

    student_name = "-"

    if student_user:
        student_name = (
            f"{student_user.first_name} "
            f"{student_user.last_name}"
        ).strip()

    return {
        "id": item.id,
        "student_id": item.student_id,
        "student_name": student_name,
        "class_id": item.class_id,
        "request_type": (
            "full_day"
            if item.schedule_id is None
            else "subject"
        ),
        "schedule_id": item.schedule_id,
        "subject_name": (
            subject.name
            if subject
            else "Full Day"
        ),
        "day": (
            schedule.day
            if schedule
            else "All Day"
        ),
        "start_time": (
            str(schedule.start_time)
            if schedule
            else "-"
        ),
        "end_time": (
            str(schedule.end_time)
            if schedule
            else "-"
        ),
        "teacher_name": teacher_name,
        "type": item.type,
        "start_date": str(item.start_date),
        "end_date": str(item.end_date),
        "reason": item.reason,
        "status": item.status,
        "teacher_id": item.teacher_id,
        "requested_by_role": requested_by_role,
        "requested_by_user_id": getattr(
            item,
            "requested_by_user_id",
            None,
        ),
        "created_at": (
            str(item.created_at)
            if item.created_at
            else None
        ),
    }


# =========================================================
# Student permission validation
# =========================================================

def validate_permission_request(
    student: Student,
    data: PermissionCreate,
    db: Session,
):
    today = date.today()

    if data.request_type not in [
        "full_day",
        "subject",
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid request type",
        )

    reason = data.reason.strip()

    if not reason:
        raise HTTPException(
            status_code=400,
            detail="Reason is required",
        )

    schedule_id = None

    if data.request_type == "subject":
        if not data.schedule_id:
            raise HTTPException(
                status_code=400,
                detail="Please select subject schedule",
            )

        schedule = (
            db.query(Schedule)
            .filter(
                Schedule.id == data.schedule_id
            )
            .first()
        )

        if not schedule:
            raise HTTPException(
                status_code=404,
                detail="Schedule not found",
            )

        if schedule.class_id != student.class_id:
            raise HTTPException(
                status_code=400,
                detail=(
                    "This schedule does not belong "
                    "to this student's class"
                ),
            )

        schedule_id = schedule.id

        old_request = (
            db.query(PermissionRequest)
            .filter(
                PermissionRequest.student_id
                == student.id,

                PermissionRequest.schedule_id
                == schedule_id,

                PermissionRequest.start_date
                == today,
            )
            .first()
        )

        if old_request:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Permission was already requested "
                    "for this subject today"
                ),
            )

    elif data.request_type == "full_day":
        old_request = (
            db.query(PermissionRequest)
            .filter(
                PermissionRequest.student_id
                == student.id,

                PermissionRequest.schedule_id
                .is_(None),

                PermissionRequest.start_date
                == today,
            )
            .first()
        )

        if old_request:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Full day permission was already "
                    "requested today"
                ),
            )

    return schedule_id, today


# =========================================================
# Create permission helper
# =========================================================

def create_permission_item(
    student: Student,
    data: PermissionCreate,
    requested_by_role: str,
    requested_by_user_id: int,
    db: Session,
):
    schedule_id, today = (
        validate_permission_request(
            student=student,
            data=data,
            db=db,
        )
    )

    item = PermissionRequest(
        student_id=student.id,
        class_id=student.class_id,
        schedule_id=schedule_id,
        type=data.type,
        start_date=today,
        end_date=today,
        reason=data.reason.strip(),
        status="pending",
        requested_by_role=requested_by_role,
        requested_by_user_id=requested_by_user_id,
    )

    try:
        db.add(item)
        db.commit()
        db.refresh(item)

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to create permission: "
                f"{str(error)}"
            ),
        )

    return permission_response(
        item=item,
        db=db,
    )


# =========================================================
# Parent helpers
# =========================================================

def get_parent_profile(
    current_user: User,
    db: Session,
):
    parent = (
        db.query(Parent)
        .filter(
            Parent.user_id == current_user.id
        )
        .first()
    )

    if not parent:
        raise HTTPException(
            status_code=404,
            detail="Parent profile not found",
        )

    return parent


def get_parent_child(
    parent_id: int,
    student_id: int,
    db: Session,
):
    relation = (
        db.query(ParentStudent)
        .filter(
            ParentStudent.parent_id == parent_id,
            ParentStudent.student_id == student_id,
        )
        .first()
    )

    if not relation:
        raise HTTPException(
            status_code=403,
            detail=(
                "This student is not linked "
                "to your parent account"
            ),
        )

    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    return student


def get_teacher_profile(
    current_user: User,
    db: Session,
):
    teacher = (
        db.query(Teacher)
        .filter(
            Teacher.user_id == current_user.id
        )
        .first()
    )

    if not teacher:
        raise HTTPException(
            status_code=404,
            detail="Teacher profile not found",
        )

    return teacher


# =========================================================
# Delete expired permission requests
# =========================================================

def delete_expired_permissions(
    db: Session,
):
    expire_date = (
        datetime.utcnow().date()
        - timedelta(days=2)
    )

    try:
        (
            db.query(PermissionRequest)
            .filter(
                PermissionRequest.end_date
                < expire_date
            )
            .delete(
                synchronize_session=False
            )
        )

        db.commit()

    except Exception:
        db.rollback()


# =========================================================
# Test route
# =========================================================

@router.get("/test")
def permission_test():
    return {
        "message": "Permission router is working"
    }


# =========================================================
# Parent linked students
# =========================================================

@router.get("/parent/students")
def parent_students(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    if current_user.role != "parent":
        raise HTTPException(
            status_code=403,
            detail="Only parent can view linked students",
        )

    parent = get_parent_profile(
        current_user=current_user,
        db=db,
    )

    relations = (
        db.query(ParentStudent)
        .filter(
            ParentStudent.parent_id == parent.id
        )
        .all()
    )

    result = []

    for relation in relations:
        student = (
            db.query(Student)
            .filter(
                Student.id == relation.student_id
            )
            .first()
        )

        if not student:
            continue

        student_user = (
            db.query(User)
            .filter(
                User.id == student.user_id
            )
            .first()
        )

        full_name = "-"

        if student_user:
            full_name = (
                f"{student_user.first_name} "
                f"{student_user.last_name}"
            ).strip()

        result.append(
            {
                "id": student.id,
                "student_code": student.student_code,
                "full_name": full_name,
                "class_id": student.class_id,
            }
        )

    return result


# =========================================================
# Student create permission
# =========================================================

@router.post("/")
def create_student_permission(
    data: PermissionCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail=(
                "Only student can use "
                "this permission endpoint"
            ),
        )

    student = (
        db.query(Student)
        .filter(
            Student.user_id == current_user.id
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    return create_permission_item(
        student=student,
        data=data,
        requested_by_role="student",
        requested_by_user_id=current_user.id,
        db=db,
    )


# =========================================================
# Parent create permission for child
# =========================================================

@router.post("/parent")
def create_parent_permission(
    data: ParentPermissionCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    if current_user.role != "parent":
        raise HTTPException(
            status_code=403,
            detail=(
                "Only parent can request "
                "permission for a child"
            ),
        )

    parent = get_parent_profile(
        current_user=current_user,
        db=db,
    )

    student = get_parent_child(
        parent_id=parent.id,
        student_id=data.student_id,
        db=db,
    )

    permission_data = PermissionCreate(
        request_type=data.request_type,
        schedule_id=data.schedule_id,
        type=data.type,
        reason=data.reason,
    )

    return create_permission_item(
        student=student,
        data=permission_data,
        requested_by_role="parent",
        requested_by_user_id=current_user.id,
        db=db,
    )


# =========================================================
# Student permission history
# =========================================================

@router.get("/student/me")
def student_permissions(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only student can view this",
        )

    delete_expired_permissions(db)

    student = (
        db.query(Student)
        .filter(
            Student.user_id == current_user.id
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    items = (
        db.query(PermissionRequest)
        .filter(
            PermissionRequest.student_id
            == student.id
        )
        .order_by(
            PermissionRequest.id.desc()
        )
        .all()
    )

    return [
        permission_response(
            item=item,
            db=db,
        )
        for item in items
    ]


# =========================================================
# Parent permission history
# =========================================================

@router.get("/parent/{student_id}")
def parent_permissions(
    student_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    if current_user.role != "parent":
        raise HTTPException(
            status_code=403,
            detail="Only parent can view this",
        )

    delete_expired_permissions(db)

    parent = get_parent_profile(
        current_user=current_user,
        db=db,
    )

    student = get_parent_child(
        parent_id=parent.id,
        student_id=student_id,
        db=db,
    )

    items = (
        db.query(PermissionRequest)
        .filter(
            PermissionRequest.student_id
            == student.id
        )
        .order_by(
            PermissionRequest.id.desc()
        )
        .all()
    )

    return [
        permission_response(
            item=item,
            db=db,
        )
        for item in items
    ]


# =========================================================
# Parent child schedules
# =========================================================

@router.get("/parent/{student_id}/schedules")
def parent_child_schedules(
    student_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    if current_user.role != "parent":
        raise HTTPException(
            status_code=403,
            detail="Only parent can view schedules",
        )

    parent = get_parent_profile(
        current_user=current_user,
        db=db,
    )

    student = get_parent_child(
        parent_id=parent.id,
        student_id=student_id,
        db=db,
    )

    schedules = (
        db.query(Schedule)
        .filter(
            Schedule.class_id == student.class_id
        )
        .order_by(
            Schedule.day.asc(),
            Schedule.start_time.asc(),
        )
        .all()
    )

    result = []

    for schedule in schedules:
        subject = (
            db.query(Subject)
            .filter(
                Subject.id == schedule.subject_id
            )
            .first()
        )

        teacher = (
            db.query(Teacher)
            .filter(
                Teacher.id == schedule.teacher_id
            )
            .first()
        )

        teacher_user = None

        if teacher:
            teacher_user = (
                db.query(User)
                .filter(
                    User.id == teacher.user_id
                )
                .first()
            )

        teacher_name = "-"

        if teacher_user:
            teacher_name = (
                f"{teacher_user.first_name} "
                f"{teacher_user.last_name}"
            ).strip()

        result.append(
            {
                "id": schedule.id,
                "class_id": schedule.class_id,
                "subject_id": schedule.subject_id,
                "subject_name": (
                    subject.name
                    if subject
                    else "-"
                ),
                "teacher_id": schedule.teacher_id,
                "teacher_name": teacher_name,
                "day": schedule.day,
                "start_time": str(
                    schedule.start_time
                ),
                "end_time": str(
                    schedule.end_time
                ),
            }
        )

    return result


# =========================================================
# Teacher permission list
# =========================================================

@router.get("/teacher/me")
def teacher_permissions(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=403,
            detail="Only teacher can view this",
        )

    delete_expired_permissions(db)

    teacher = get_teacher_profile(
        current_user=current_user,
        db=db,
    )

    teacher_schedule_ids = (
        db.query(Schedule.id)
        .filter(
            Schedule.teacher_id == teacher.id
        )
    )

    class_ids = [
        relation.class_id
        for relation in (
            db.query(ClassTeacher)
            .filter(
                ClassTeacher.teacher_id
                == teacher.id
            )
            .all()
        )
    ]

    query = db.query(PermissionRequest)

    if class_ids:
        query = query.filter(
            (
                PermissionRequest.schedule_id.in_(
                    teacher_schedule_ids
                )
            )
            |
            (
                PermissionRequest.schedule_id
                .is_(None)
                &
                PermissionRequest.class_id.in_(
                    class_ids
                )
            )
        )

    else:
        query = query.filter(
            PermissionRequest.schedule_id.in_(
                teacher_schedule_ids
            )
        )

    items = (
        query
        .order_by(
            PermissionRequest.id.desc()
        )
        .all()
    )

    return [
        permission_response(
            item=item,
            db=db,
        )
        for item in items
    ]


# =========================================================
# Teacher approve or reject
# =========================================================

@router.put("/{permission_id}/status")
def update_permission_status(
    permission_id: int,
    data: PermissionAction,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=403,
            detail=(
                "Only teacher can approve "
                "or reject"
            ),
        )

    if data.status not in [
        "approved",
        "rejected",
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Status must be approved "
                "or rejected"
            ),
        )

    teacher = get_teacher_profile(
        current_user=current_user,
        db=db,
    )

    item = (
        db.query(PermissionRequest)
        .filter(
            PermissionRequest.id
            == permission_id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Permission request not found",
        )

    if item.schedule_id:
        schedule = (
            db.query(Schedule)
            .filter(
                Schedule.id == item.schedule_id
            )
            .first()
        )

        if not schedule:
            raise HTTPException(
                status_code=404,
                detail="Schedule not found",
            )

        if schedule.teacher_id != teacher.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You cannot manage "
                    "this request"
                ),
            )

    else:
        allowed = (
            db.query(ClassTeacher)
            .filter(
                ClassTeacher.teacher_id
                == teacher.id,

                ClassTeacher.class_id
                == item.class_id,
            )
            .first()
        )

        if not allowed:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You cannot manage "
                    "this request"
                ),
            )

    item.status = data.status
    item.teacher_id = teacher.id

    try:
        db.commit()
        db.refresh(item)

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to update permission: "
                f"{str(error)}"
            ),
        )

    return permission_response(
        item=item,
        db=db,
    )