from datetime import date, datetime

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.homework import Homework
from app.models.homework_submission import HomeworkSubmission
from app.models.notification import Notification
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.user import User
from app.services.notification_service import send_push_notification
from app.utils.cloudinary_upload import upload_file_to_cloudinary


router = APIRouter(
    prefix="/homework",
    tags=["Homework"],
)


# =========================================================
# Helpers
# =========================================================

def save_file(file: UploadFile | None):
    if not file:
        return None

    return upload_file_to_cloudinary(file)


def parse_due_date(
    value: str | None,
) -> date | None:
    """
    Homework due_date is stored as YYYY-MM-DD text.

    Example:
        2026-07-22 remains active through 2026-07-22.
        It becomes inactive on 2026-07-23.
    """
    if not value:
        return None

    try:
        return datetime.strptime(
            str(value).strip(),
            "%Y-%m-%d",
        ).date()
    except (TypeError, ValueError):
        return None


def is_homework_active(
    item: Homework,
) -> bool:
    due = parse_due_date(item.due_date)

    # Keep invalid legacy dates visible so the teacher
    # can edit or delete them.
    if due is None:
        return True

    return due >= date.today()


def normalize_status_query():
    return func.lower(
        func.trim(
            func.coalesce(
                HomeworkSubmission.status,
                "",
            )
        )
    )


def resolve_teacher(
    db: Session,
    teacher_or_user_id: int,
) -> Teacher | None:
    """
    Support both:
    - Teacher.id
    - User.id belonging to a teacher

    This prevents dashboard failure when localStorage contains
    user_id instead of teacher_id.
    """

    teacher = (
        db.query(Teacher)
        .filter(
            Teacher.id == teacher_or_user_id
        )
        .first()
    )

    if teacher:
        return teacher

    return (
        db.query(Teacher)
        .filter(
            Teacher.user_id
            == teacher_or_user_id
        )
        .first()
    )


def validate_homework_relations(
    db: Session,
    class_id: int,
    subject_id: int,
    teacher_id: int,
):
    school_class = (
        db.query(SchoolClass)
        .filter(
            SchoolClass.id == class_id
        )
        .first()
    )

    if not school_class:
        raise HTTPException(
            status_code=404,
            detail="Class not found",
        )

    subject = (
        db.query(Subject)
        .filter(
            Subject.id == subject_id
        )
        .first()
    )

    if not subject:
        raise HTTPException(
            status_code=404,
            detail="Subject not found",
        )

    teacher = resolve_teacher(
        db,
        teacher_id,
    )

    if not teacher:
        raise HTTPException(
            status_code=404,
            detail="Teacher not found",
        )

    return school_class, subject, teacher


def notify_students_new_homework(
    homework: Homework,
    db: Session,
):
    subject = (
        db.query(Subject)
        .filter(
            Subject.id
            == homework.subject_id
        )
        .first()
    )

    subject_name = (
        subject.name
        if subject
        else "Subject"
    )

    description = (
        homework.description
        or "No description"
    )

    due_date = (
        homework.due_date
        or "-"
    )

    title = (
        f"New Homework: {subject_name}"
    )

    message = (
        f"{homework.title}\n"
        f"{description}\n"
        f"Due date: {due_date}"
    )

    notification = Notification(
        title=title,
        message=message,
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    students = (
        db.query(Student)
        .filter(
            Student.class_id
            == homework.class_id
        )
        .all()
    )

    for student in students:
        user = (
            db.query(User)
            .filter(
                User.id
                == student.user_id
            )
            .first()
        )

        if (
            not user
            or not user.fcm_token
        ):
            continue

        try:
            send_push_notification(
                token=user.fcm_token,
                title=title,
                body=message,
            )
        except Exception as error:
            print(
                "FCM HOMEWORK ERROR:",
                error,
            )


def homework_response(
    item: Homework,
    db: Session,
):
    school_class = (
        db.query(SchoolClass)
        .filter(
            SchoolClass.id
            == item.class_id
        )
        .first()
    )

    subject = (
        db.query(Subject)
        .filter(
            Subject.id
            == item.subject_id
        )
        .first()
    )

    teacher = (
        db.query(Teacher)
        .filter(
            Teacher.id
            == item.teacher_id
        )
        .first()
    )

    teacher_name = "-"

    if teacher:
        teacher_user = (
            db.query(User)
            .filter(
                User.id
                == teacher.user_id
            )
            .first()
        )

        if teacher_user:
            teacher_name = (
                f"{teacher_user.first_name or ''} "
                f"{teacher_user.last_name or ''}"
            ).strip() or "-"

    submitted_count = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.homework_id
            == item.id
        )
        .count()
    )

    waiting_count = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.homework_id
            == item.id,
            normalize_status_query()
            != "checked",
        )
        .count()
    )

    checked_count = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.homework_id
            == item.id,
            normalize_status_query()
            == "checked",
        )
        .count()
    )

    total_students = (
        db.query(Student)
        .filter(
            Student.class_id
            == item.class_id
        )
        .count()
    )

    class_name = "-"

    if school_class:
        class_name = (
            f"{school_class.name or ''} "
            f"{school_class.section or ''}"
        ).strip() or "-"

    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "file_path": item.file_path,

        "class_id": item.class_id,
        "class_name": class_name,

        "subject_id": item.subject_id,
        "subject_name": (
            subject.name
            if subject
            else "-"
        ),

        "teacher_id": item.teacher_id,
        "teacher_user_id": (
            teacher.user_id
            if teacher
            else None
        ),
        "teacher_name": teacher_name,

        "due_date": item.due_date,
        "created_at": item.created_at,
        "is_active": is_homework_active(
            item
        ),

        "total_students": total_students,
        "submitted_count": submitted_count,
        "waiting_count": waiting_count,
        "checked_count": checked_count,
    }


# =========================================================
# Create homework
# POST /homework/
# =========================================================

@router.post("/")
def create_homework(
    title: str = Form(...),
    description: str = Form(""),
    class_id: int = Form(...),
    subject_id: int = Form(...),
    teacher_id: int = Form(...),
    due_date: str = Form(...),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    title = str(
        title or ""
    ).strip()

    description = str(
        description or ""
    ).strip()

    due_date = str(
        due_date or ""
    ).strip()

    if not title:
        raise HTTPException(
            status_code=400,
            detail=(
                "Homework title is required"
            ),
        )

    parsed_due = parse_due_date(
        due_date
    )

    if parsed_due is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Due date must use "
                "YYYY-MM-DD format"
            ),
        )

    if parsed_due < date.today():
        raise HTTPException(
            status_code=400,
            detail=(
                "Due date cannot be "
                "in the past"
            ),
        )

    _, _, teacher = (
        validate_homework_relations(
            db=db,
            class_id=class_id,
            subject_id=subject_id,
            teacher_id=teacher_id,
        )
    )

    file_path = None

    if file:
        try:
            file_path = save_file(file)
        except Exception as error:
            print(
                "HOMEWORK FILE UPLOAD ERROR:",
                error,
            )

            raise HTTPException(
                status_code=500,
                detail=(
                    "Homework file upload failed"
                ),
            )

    homework = Homework(
        title=title,
        description=(
            description or None
        ),
        class_id=class_id,
        subject_id=subject_id,

        # Always save the real Teacher.id
        teacher_id=teacher.id,

        due_date=due_date,
        file_path=file_path,
    )

    db.add(homework)
    db.commit()
    db.refresh(homework)

    try:
        notify_students_new_homework(
            homework,
            db,
        )
    except Exception as error:
        print(
            "HOMEWORK NOTIFICATION ERROR:",
            error,
        )

    return homework_response(
        homework,
        db,
    )


# =========================================================
# Get all homework history
# GET /homework/
# =========================================================

@router.get("/")
def get_all_homework(
    db: Session = Depends(get_db),
):
    items = (
        db.query(Homework)
        .order_by(
            Homework.id.desc()
        )
        .all()
    )

    return [
        homework_response(
            item,
            db,
        )
        for item in items
    ]


# =========================================================
# Teacher full homework history
# Supports Teacher.id or User.id
# GET /homework/teacher/{teacher_id}/all
# =========================================================

@router.get(
    "/teacher/{teacher_id}/all"
)
def get_teacher_homework_history(
    teacher_id: int,
    db: Session = Depends(get_db),
):
    teacher = resolve_teacher(
        db,
        teacher_id,
    )

    if not teacher:
        raise HTTPException(
            status_code=404,
            detail="Teacher not found",
        )

    items = (
        db.query(Homework)
        .filter(
            Homework.teacher_id
            == teacher.id
        )
        .order_by(
            Homework.id.desc()
        )
        .all()
    )

    return [
        homework_response(
            item,
            db,
        )
        for item in items
    ]


# =========================================================
# Teacher active homework
# Supports Teacher.id or User.id
#
# Homework remains visible throughout its due date.
# It disappears the next day.
#
# GET /homework/teacher/{teacher_id}
# =========================================================

@router.get(
    "/teacher/{teacher_id}"
)
def get_teacher_homework(
    teacher_id: int,
    db: Session = Depends(get_db),
):
    teacher = resolve_teacher(
        db,
        teacher_id,
    )

    if not teacher:
        raise HTTPException(
            status_code=404,
            detail="Teacher not found",
        )

    items = (
        db.query(Homework)
        .filter(
            Homework.teacher_id
            == teacher.id
        )
        .order_by(
            Homework.id.desc()
        )
        .all()
    )

    active_items = [
        item
        for item in items
        if is_homework_active(item)
    ]

    return [
        homework_response(
            item,
            db,
        )
        for item in active_items
    ]


# =========================================================
# Student active homework
# GET /homework/student/{student_id}
# =========================================================

@router.get(
    "/student/{student_id}"
)
def get_student_homework(
    student_id: int,
    db: Session = Depends(get_db),
):
    student = (
        db.query(Student)
        .filter(
            Student.id
            == student_id
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    items = (
        db.query(Homework)
        .filter(
            Homework.class_id
            == student.class_id
        )
        .order_by(
            Homework.id.desc()
        )
        .all()
    )

    active_items = [
        item
        for item in items
        if is_homework_active(item)
    ]

    return [
        homework_response(
            item,
            db,
        )
        for item in active_items
    ]


# =========================================================
# Update homework
# PUT /homework/{homework_id}
# =========================================================

@router.put("/{homework_id}")
def update_homework(
    homework_id: int,
    title: str = Form(...),
    description: str = Form(""),
    class_id: int = Form(...),
    subject_id: int = Form(...),
    teacher_id: int = Form(...),
    due_date: str = Form(...),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    homework = (
        db.query(Homework)
        .filter(
            Homework.id
            == homework_id
        )
        .first()
    )

    if not homework:
        raise HTTPException(
            status_code=404,
            detail="Homework not found",
        )

    title = str(
        title or ""
    ).strip()

    description = str(
        description or ""
    ).strip()

    due_date = str(
        due_date or ""
    ).strip()

    if not title:
        raise HTTPException(
            status_code=400,
            detail=(
                "Homework title is required"
            ),
        )

    parsed_due = parse_due_date(
        due_date
    )

    if parsed_due is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Due date must use "
                "YYYY-MM-DD format"
            ),
        )

    if parsed_due < date.today():
        raise HTTPException(
            status_code=400,
            detail=(
                "Due date cannot be "
                "in the past"
            ),
        )

    _, _, teacher = (
        validate_homework_relations(
            db=db,
            class_id=class_id,
            subject_id=subject_id,
            teacher_id=teacher_id,
        )
    )

    homework.title = title
    homework.description = (
        description or None
    )
    homework.class_id = class_id
    homework.subject_id = subject_id
    homework.teacher_id = (
        teacher.id
    )
    homework.due_date = due_date

    if file:
        try:
            homework.file_path = (
                save_file(file)
            )
        except Exception as error:
            print(
                "HOMEWORK UPDATE FILE ERROR:",
                error,
            )

            raise HTTPException(
                status_code=500,
                detail=(
                    "Homework file upload failed"
                ),
            )

    db.commit()
    db.refresh(homework)

    return homework_response(
        homework,
        db,
    )


# =========================================================
# Delete homework permanently
# DELETE /homework/{homework_id}
# =========================================================

@router.delete("/{homework_id}")
def delete_homework(
    homework_id: int,
    db: Session = Depends(get_db),
):
    homework = (
        db.query(Homework)
        .filter(
            Homework.id
            == homework_id
        )
        .first()
    )

    if not homework:
        raise HTTPException(
            status_code=404,
            detail="Homework not found",
        )

    db.delete(homework)
    db.commit()

    return {
        "message": (
            "Homework deleted successfully"
        ),
    }