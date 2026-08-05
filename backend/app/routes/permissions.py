from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.attendance import Attendance
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
    PermissionUpdate,
)
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)

router = APIRouter(
    prefix="/permissions",
    tags=["Permissions"],
)


# =========================================================
# General helpers
# =========================================================

def get_user_full_name(
    user: User | None,
) -> str:
    if user is None:
        return "-"

    first_name = str(
        getattr(user, "first_name", "")
        or ""
    ).strip()

    last_name = str(
        getattr(user, "last_name", "")
        or ""
    ).strip()

    full_name = (
        f"{first_name} {last_name}"
    ).strip()

    if full_name:
        return full_name

    return str(
        getattr(user, "full_name", None)
        or getattr(user, "username", None)
        or getattr(user, "email", None)
        or "-"
    )


def serialize_time(value) -> str:
    if value is None:
        return "-"

    return str(value)


# =========================================================
# Parent helpers
# =========================================================

def get_parent_profile(
    current_user: User,
    db: Session,
) -> Parent:
    if current_user.role != "parent":
        raise HTTPException(
            status_code=403,
            detail="Only parent can access this resource",
        )

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
) -> Student:
    relation = (
        db.query(ParentStudent)
        .filter(
            ParentStudent.parent_id
            == parent_id,
            ParentStudent.student_id
            == student_id,
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
        .filter(
            Student.id == student_id
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    return student


# =========================================================
# Student helper
# =========================================================

def get_student_profile(
    current_user: User,
    db: Session,
) -> Student:
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only student can access this resource",
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

    return student


# =========================================================
# Teacher helper
# =========================================================

def get_teacher_profile(
    current_user: User,
    db: Session,
) -> Teacher:
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=403,
            detail="Only teacher can access this resource",
        )

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
# Attendance lock helpers
# =========================================================

def get_permission_attendance_query(
    item: PermissionRequest,
    db: Session,
):
    query = (
        db.query(Attendance)
        .filter(
            Attendance.student_id
            == item.student_id,
            Attendance.date
            >= item.start_date,
            Attendance.date
            <= item.end_date,
        )
    )

    # Subject permission:
    # lock only when attendance for the same
    # student, schedule and date has been saved.
    if item.schedule_id is not None:
        query = query.filter(
            Attendance.schedule_id
            == item.schedule_id,
        )

    # Full-day permission:
    # schedule_id is null, therefore any attendance
    # record for the student on that date locks it.
    return query


def is_attendance_saved(
    item: PermissionRequest,
    db: Session,
) -> bool:
    attendance = (
        get_permission_attendance_query(
            item=item,
            db=db,
        )
        .first()
    )

    return attendance is not None


def ensure_permission_editable(
    item: PermissionRequest,
    db: Session,
):
    if is_attendance_saved(
        item=item,
        db=db,
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Attendance has already been saved. "
                "This permission request cannot "
                "be edited or deleted."
            ),
        )


# =========================================================
# Permission ownership
# =========================================================

def ensure_permission_owner(
    item: PermissionRequest,
    current_user: User,
    db: Session,
):
    if current_user.role == "student":
        student = get_student_profile(
            current_user=current_user,
            db=db,
        )

        if item.student_id != student.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You cannot manage this "
                    "permission request"
                ),
            )

        return

    if current_user.role == "parent":
        parent = get_parent_profile(
            current_user=current_user,
            db=db,
        )

        get_parent_child(
            parent_id=parent.id,
            student_id=item.student_id,
            db=db,
        )

        return

    raise HTTPException(
        status_code=403,
        detail=(
            "Only student or parent can manage "
            "this permission request"
        ),
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
        .filter(
            Student.id == item.student_id
        )
        .first()
    )

    student_user = None

    if student:
        student_user = (
            db.query(User)
            .filter(
                User.id == student.user_id
            )
            .first()
        )

    schedule = None
    subject = None
    teacher_name = "-"

    if item.schedule_id:
        schedule = (
            db.query(Schedule)
            .filter(
                Schedule.id == item.schedule_id
            )
            .first()
        )

        if schedule:
            subject = (
                db.query(Subject)
                .filter(
                    Subject.id
                    == schedule.subject_id
                )
                .first()
            )

            teacher = (
                db.query(Teacher)
                .filter(
                    Teacher.id
                    == schedule.teacher_id
                )
                .first()
            )

            if teacher:
                teacher_user = (
                    db.query(User)
                    .filter(
                        User.id
                        == teacher.user_id
                    )
                    .first()
                )

                teacher_name = (
                    get_user_full_name(
                        teacher_user
                    )
                )

    requested_by_role = (
        getattr(
            item,
            "requested_by_role",
            None,
        )
        or "student"
    )

    student_name = get_user_full_name(
        student_user
    )

    attendance_saved = is_attendance_saved(
        item=item,
        db=db,
    )

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
            serialize_time(
                schedule.start_time
            )
            if schedule
            else "-"
        ),

        "end_time": (
            serialize_time(
                schedule.end_time
            )
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

        "requested_by_role": (
            requested_by_role
        ),

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

        # Edit/Delete lock information
        "attendance_saved": attendance_saved,
        "can_edit": not attendance_saved,
        "can_delete": not attendance_saved,
    }


# =========================================================
# Validate permission request
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

    permission_type = data.type.strip()

    if not permission_type:
        raise HTTPException(
            status_code=400,
            detail="Permission type is required",
        )

    schedule_id = None

    if data.request_type == "subject":
        if not data.schedule_id:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Please select subject schedule"
                ),
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

    else:
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
        type=data.type.strip(),
        start_date=today,
        end_date=today,
        reason=data.reason.strip(),
        status="pending",
        requested_by_role=requested_by_role,
        requested_by_user_id=(
            requested_by_user_id
        ),
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
        "message": (
            "Permission router is working"
        ),
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
    parent = get_parent_profile(
        current_user=current_user,
        db=db,
    )

    relations = (
        db.query(ParentStudent)
        .filter(
            ParentStudent.parent_id
            == parent.id
        )
        .all()
    )

    result = []

    for relation in relations:
        student = (
            db.query(Student)
            .filter(
                Student.id
                == relation.student_id
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

        result.append(
            {
                "id": student.id,
                "student_code": (
                    student.student_code
                ),
                "full_name": (
                    get_user_full_name(
                        student_user
                    )
                ),
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
    student = get_student_profile(
        current_user=current_user,
        db=db,
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
    student = get_student_profile(
        current_user=current_user,
        db=db,
    )

    delete_expired_permissions(db)

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
# Student edits submitted homework
#
# submitted => can edit
# checked   => cannot edit
#
# PUT /submissions/{submission_id}
# =========================================================

@router.put("/{submission_id}")
async def update_submission(
    submission_id: int,
    student_id: int = Form(...),
    answer_text: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    keep_old_files: bool = Form(True),
    db: Session = Depends(get_db),
):
    item = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.id == submission_id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Submission not found",
        )

    # Ensure this submission belongs to this student
    if item.student_id != student_id:
        raise HTTPException(
            status_code=403,
            detail="You cannot edit another student's submission",
        )

    # Once teacher checks, student cannot edit
    if normalize_status(item.status) == "checked":
        raise HTTPException(
            status_code=400,
            detail=(
                "This homework has already been checked "
                "and cannot be edited"
            ),
        )

    cleaned_answer = str(
        answer_text or ""
    ).strip()

    valid_files = [
        file
        for file in (files or [])
        if file and file.filename
    ]

    old_file_paths = (
        parse_file_paths(item)
        if keep_old_files
        else []
    )

    uploaded_files: list[str] = []

    for upload in valid_files:
        try:
            uploaded_url = upload_file_to_cloudinary(
                upload
            )

            if uploaded_url:
                uploaded_files.append(
                    uploaded_url
                )

        except Exception as error:
            raise HTTPException(
                status_code=500,
                detail=(
                    f"File upload failed: "
                    f"{str(error)}"
                ),
            )

    final_files = (
        old_file_paths + uploaded_files
    )

    # Prevent empty submission
    if not cleaned_answer and not final_files:
        raise HTTPException(
            status_code=400,
            detail=(
                "Please write an answer or "
                "upload at least one file"
            ),
        )

    item.answer_text = (
        cleaned_answer or None
    )

    item.file_path = (
        final_files[0]
        if final_files
        else None
    )

    item.file_paths = (
        json.dumps(final_files)
        if final_files
        else None
    )

    item.status = "submitted"
    item.submitted_at = utc_now()

    db.commit()
    db.refresh(item)

    return submission_response(
        item,
        db,
    )
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
    parent = get_parent_profile(
        current_user=current_user,
        db=db,
    )

    student = get_parent_child(
        parent_id=parent.id,
        student_id=student_id,
        db=db,
    )

    delete_expired_permissions(db)

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
            Schedule.class_id
            == student.class_id
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
                Subject.id
                == schedule.subject_id
            )
            .first()
        )

        teacher = (
            db.query(Teacher)
            .filter(
                Teacher.id
                == schedule.teacher_id
            )
            .first()
        )

        teacher_user = None

        if teacher:
            teacher_user = (
                db.query(User)
                .filter(
                    User.id
                    == teacher.user_id
                )
                .first()
            )

        result.append(
            {
                "id": schedule.id,
                "class_id": schedule.class_id,
                "subject_id": (
                    schedule.subject_id
                ),
                "subject_name": (
                    subject.name
                    if subject
                    else "-"
                ),
                "teacher_id": (
                    schedule.teacher_id
                ),
                "teacher_name": (
                    get_user_full_name(
                        teacher_user
                    )
                ),
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
# Update permission by owner
# =========================================================

@router.put("/{permission_id}")
def update_permission_request(
    permission_id: int,
    data: PermissionUpdate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
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

    ensure_permission_owner(
        item=item,
        current_user=current_user,
        db=db,
    )

    ensure_permission_editable(
        item=item,
        db=db,
    )

    current_request_type = (
        "full_day"
        if item.schedule_id is None
        else "subject"
    )

    request_type = (
        data.request_type
        if data.request_type is not None
        else current_request_type
    )

    if request_type not in [
        "full_day",
        "subject",
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid request type",
        )

    if data.type is not None:
        permission_type = data.type.strip()

        if not permission_type:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Permission type is required"
                ),
            )

        item.type = permission_type

    if data.reason is not None:
        reason = data.reason.strip()

        if not reason:
            raise HTTPException(
                status_code=400,
                detail="Reason is required",
            )

        item.reason = reason

    if request_type == "full_day":
        item.schedule_id = None

    else:
        schedule_id = (
            data.schedule_id
            if data.schedule_id is not None
            else item.schedule_id
        )

        if schedule_id is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Schedule ID is required "
                    "for subject permission"
                ),
            )

        schedule = (
            db.query(Schedule)
            .filter(
                Schedule.id == schedule_id
            )
            .first()
        )

        if not schedule:
            raise HTTPException(
                status_code=404,
                detail="Schedule not found",
            )

        if schedule.class_id != item.class_id:
            raise HTTPException(
                status_code=400,
                detail=(
                    "This schedule does not belong "
                    "to the student's class"
                ),
            )

        duplicate = (
            db.query(PermissionRequest)
            .filter(
                PermissionRequest.id
                != item.id,
                PermissionRequest.student_id
                == item.student_id,
                PermissionRequest.schedule_id
                == schedule.id,
                PermissionRequest.start_date
                == item.start_date,
            )
            .first()
        )

        if duplicate:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Permission was already requested "
                    "for this subject"
                ),
            )

        item.schedule_id = schedule.id

    item.status = "pending"
    item.teacher_id = None

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


# =========================================================
# Delete permission by owner
# =========================================================

@router.delete("/{permission_id}")
def delete_permission_request(
    permission_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
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

    ensure_permission_owner(
        item=item,
        current_user=current_user,
        db=db,
    )

    ensure_permission_editable(
        item=item,
        db=db,
    )

    try:
        db.delete(item)
        db.commit()

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to delete permission: "
                f"{str(error)}"
            ),
        )

    return {
        "message": (
            "Permission request deleted "
            "successfully"
        ),
    }


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
    teacher = get_teacher_profile(
        current_user=current_user,
        db=db,
    )

    delete_expired_permissions(db)

    teacher_schedule_ids = (
        db.query(Schedule.id)
        .filter(
            Schedule.teacher_id
            == teacher.id
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
                Schedule.id
                == item.schedule_id
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