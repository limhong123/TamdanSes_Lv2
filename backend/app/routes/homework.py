from datetime import date, datetime
import traceback

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
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
from app.routes.profile import get_current_user
from app.services.notification_service import send_push_notification
from app.utils.cloudinary_upload import upload_file_to_cloudinary


router = APIRouter(
    prefix="/homework",
    tags=["Homework"],
)


# =========================================================
# Helpers
# =========================================================

def save_file(
    file: UploadFile | None,
) -> str | None:
    if not file:
        return None

    if not file.filename:
        return None

    uploaded_url = upload_file_to_cloudinary(file)

    if not uploaded_url:
        raise ValueError(
            "Cloudinary did not return a file URL"
        )

    return uploaded_url


def parse_due_date(
    value: str | None,
) -> date | None:
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
    due = parse_due_date(
        getattr(item, "due_date", None)
    )

    # Keep old invalid homework visible
    # so teacher can edit or delete it.
    if due is None:
        return True

    return due >= date.today()


def normalized_submission_status():
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
    Accept either:
    - Teacher.id
    - User.id connected to Teacher
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
            Teacher.user_id == teacher_or_user_id
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
        db=db,
        teacher_or_user_id=teacher_id,
    )

    if not teacher:
        raise HTTPException(
            status_code=404,
            detail="Teacher not found",
        )

    return (
        school_class,
        subject,
        teacher,
    )


def get_class_name(
    school_class: SchoolClass | None,
) -> str:
    if not school_class:
        return "-"

    name = str(
        getattr(
            school_class,
            "name",
            "",
        )
        or ""
    ).strip()

    section = str(
        getattr(
            school_class,
            "section",
            "",
        )
        or ""
    ).strip()

    full_name = (
        f"{name} {section}"
    ).strip()

    return full_name or "-"


def get_subject_name(
    subject: Subject | None,
) -> str:
    if not subject:
        return "-"

    return str(
        getattr(
            subject,
            "name",
            "-",
        )
        or "-"
    )


def get_teacher_name(
    teacher: Teacher | None,
    db: Session,
) -> str:
    if not teacher:
        return "-"

    teacher_user = (
        db.query(User)
        .filter(
            User.id == teacher.user_id
        )
        .first()
    )

    if not teacher_user:
        return "-"

    first_name = str(
        getattr(
            teacher_user,
            "first_name",
            "",
        )
        or ""
    ).strip()

    last_name = str(
        getattr(
            teacher_user,
            "last_name",
            "",
        )
        or ""
    ).strip()

    return (
        f"{first_name} {last_name}"
    ).strip() or "-"


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

    subject_name = get_subject_name(
        subject
    )

    description = (
        homework.description
        or "No description"
    )

    due_date_value = (
        homework.due_date
        or "-"
    )

    title = (
        f"New Homework: {subject_name}"
    )

    message = (
        f"{homework.title}\n"
        f"{description}\n"
        f"Due date: {due_date_value}"
    )

    # Keep notification database creation
    # separate from FCM failures.
    try:
        notification = Notification(
            title=title,
            message=message,
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

    except Exception as error:
        db.rollback()

        print(
            "HOMEWORK NOTIFICATION DATABASE ERROR:",
            repr(error),
        )

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
            or not getattr(
                user,
                "fcm_token",
                None,
            )
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
                repr(error),
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

    # Count only ID.
    # This avoids selecting the complete
    # HomeworkSubmission entity.
    submitted_count = (
        db.query(
            func.count(
                HomeworkSubmission.id
            )
        )
        .filter(
            HomeworkSubmission.homework_id
            == item.id
        )
        .scalar()
        or 0
    )

    waiting_count = (
        db.query(
            func.count(
                HomeworkSubmission.id
            )
        )
        .filter(
            HomeworkSubmission.homework_id
            == item.id,
            normalized_submission_status()
            != "checked",
        )
        .scalar()
        or 0
    )

    checked_count = (
        db.query(
            func.count(
                HomeworkSubmission.id
            )
        )
        .filter(
            HomeworkSubmission.homework_id
            == item.id,
            normalized_submission_status()
            == "checked",
        )
        .scalar()
        or 0
    )

    total_students = (
        db.query(
            func.count(Student.id)
        )
        .filter(
            Student.class_id
            == item.class_id
        )
        .scalar()
        or 0
    )

    return {
        "id": item.id,
        "title": item.title,
        "description": getattr(
            item,
            "description",
            None,
        ),
        "file_path": getattr(
            item,
            "file_path",
            None,
        ),

        "class_id": item.class_id,
        "class_name": get_class_name(
            school_class
        ),

        "subject_id": item.subject_id,
        "subject_name": get_subject_name(
            subject
        ),

        "teacher_id": item.teacher_id,
        "teacher_user_id": (
            getattr(
                teacher,
                "user_id",
                None,
            )
            if teacher
            else None
        ),
        "teacher_name": get_teacher_name(
            teacher,
            db,
        ),

        "due_date": getattr(
            item,
            "due_date",
            None,
        ),
        "created_at": getattr(
            item,
            "created_at",
            None,
        ),

        "is_bonus": bool(
            getattr(
                item,
                "is_bonus",
                False,
            )
        ),

        "max_bonus": int(
            getattr(
                item,
                "max_bonus",
                0,
            )
            or 0
        ),

        "is_active": is_homework_active(
            item
        ),

        "total_students": int(
            total_students
        ),
        "submitted_count": int(
            submitted_count
        ),
        "waiting_count": int(
            waiting_count
        ),
        "checked_count": int(
            checked_count
        ),
    }


def homework_error_response(
    error: Exception,
    action: str,
):
    traceback.print_exc()

    error_message = (
        f"{type(error).__name__}: "
        f"{str(error)}"
    )

    print(
        f"{action}:",
        error_message,
    )

    raise HTTPException(
        status_code=500,
        detail=error_message,
    )


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
    try:
        clean_title = str(
            title or ""
        ).strip()

        clean_description = str(
            description or ""
        ).strip()

        clean_due_date = str(
            due_date or ""
        ).strip()

        if not clean_title:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Homework title is required"
                ),
            )

        parsed_due = parse_due_date(
            clean_due_date
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

        if file and file.filename:
            try:
                file_path = save_file(file)

            except Exception as error:
                print(
                    "HOMEWORK FILE UPLOAD ERROR:",
                    repr(error),
                )

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Homework file upload failed: "
                        f"{str(error)}"
                    ),
                )

        homework = Homework(
            title=clean_title,
            description=(
                clean_description
                or None
            ),
            class_id=class_id,
            subject_id=subject_id,
            teacher_id=teacher.id,
            due_date=clean_due_date,
            file_path=file_path,
            is_bonus=False,
            max_bonus=0,
        )

        db.add(homework)

        try:
            db.commit()
            db.refresh(homework)

        except SQLAlchemyError as error:
            db.rollback()

            print(
                "CREATE HOMEWORK DATABASE ERROR:",
                repr(error),
            )

            raise HTTPException(
                status_code=500,
                detail=(
                    "Cannot save homework: "
                    f"{str(error)}"
                ),
            )

        try:
            notify_students_new_homework(
                homework=homework,
                db=db,
            )

        except Exception as error:
            print(
                "HOMEWORK NOTIFICATION ERROR:",
                repr(error),
            )

        return homework_response(
            homework,
            db,
        )

    except HTTPException:
        raise

    except Exception as error:
        db.rollback()

        homework_error_response(
            error,
            "CREATE HOMEWORK ERROR",
        )


# =========================================================
# Get all homework
# GET /homework/
# =========================================================

@router.get("/")
def get_all_homework(
    db: Session = Depends(get_db),
):
    try:
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

    except Exception as error:
        homework_error_response(
            error,
            "GET ALL HOMEWORK ERROR",
        )


# =========================================================
# Current teacher active homework
# GET /homework/teacher/me
#
# Keep this route before:
# /teacher/{teacher_id}
# =========================================================

@router.get("/teacher/me")
def get_my_teacher_homework(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    try:
        if current_user.role != "teacher":
            raise HTTPException(
                status_code=403,
                detail=(
                    "Only teachers can view "
                    "teacher homework"
                ),
            )

        teacher = (
            db.query(Teacher)
            .filter(
                Teacher.user_id
                == current_user.id
            )
            .first()
        )

        if not teacher:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Teacher profile not found"
                ),
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

    except HTTPException:
        raise

    except Exception as error:
        homework_error_response(
            error,
            "GET MY TEACHER HOMEWORK ERROR",
        )


# =========================================================
# Current teacher full history
# GET /homework/teacher/me/all
# =========================================================

@router.get("/teacher/me/all")
def get_my_teacher_homework_history(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    try:
        if current_user.role != "teacher":
            raise HTTPException(
                status_code=403,
                detail=(
                    "Only teachers can view "
                    "teacher homework"
                ),
            )

        teacher = (
            db.query(Teacher)
            .filter(
                Teacher.user_id
                == current_user.id
            )
            .first()
        )

        if not teacher:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Teacher profile not found"
                ),
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

    except HTTPException:
        raise

    except Exception as error:
        homework_error_response(
            error,
            "GET MY HOMEWORK HISTORY ERROR",
        )


# =========================================================
# Teacher full history by ID
# Supports Teacher.id or User.id
# GET /homework/teacher/{teacher_id}/all
# =========================================================

@router.get("/teacher/{teacher_id}/all")
def get_teacher_homework_history(
    teacher_id: int,
    db: Session = Depends(get_db),
):
    try:
        teacher = resolve_teacher(
            db=db,
            teacher_or_user_id=teacher_id,
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

    except HTTPException:
        raise

    except Exception as error:
        homework_error_response(
            error,
            "GET TEACHER HOMEWORK HISTORY ERROR",
        )


# =========================================================
# Teacher active homework by ID
# Supports Teacher.id or User.id
# GET /homework/teacher/{teacher_id}
# =========================================================

@router.get("/teacher/{teacher_id}")
def get_teacher_homework(
    teacher_id: int,
    db: Session = Depends(get_db),
):
    try:
        teacher = resolve_teacher(
            db=db,
            teacher_or_user_id=teacher_id,
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

    except HTTPException:
        raise

    except Exception as error:
        homework_error_response(
            error,
            "GET TEACHER HOMEWORK ERROR",
        )


# =========================================================
# Student active homework
# GET /homework/student/{student_id}
# =========================================================

@router.get("/student/{student_id}")
def get_student_homework(
    student_id: int,
    db: Session = Depends(get_db),
):
    try:
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

    except HTTPException:
        raise

    except Exception as error:
        homework_error_response(
            error,
            "GET STUDENT HOMEWORK ERROR",
        )


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
    try:
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

        clean_title = str(
            title or ""
        ).strip()

        clean_description = str(
            description or ""
        ).strip()

        clean_due_date = str(
            due_date or ""
        ).strip()

        if not clean_title:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Homework title is required"
                ),
            )

        parsed_due = parse_due_date(
            clean_due_date
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

        homework.title = clean_title
        homework.description = (
            clean_description
            or None
        )
        homework.class_id = class_id
        homework.subject_id = subject_id
        homework.teacher_id = teacher.id
        homework.due_date = clean_due_date

        if file and file.filename:
            try:
                homework.file_path = (
                    save_file(file)
                )

            except Exception as error:
                print(
                    "HOMEWORK UPDATE FILE ERROR:",
                    repr(error),
                )

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Homework file upload failed: "
                        f"{str(error)}"
                    ),
                )

        try:
            db.commit()
            db.refresh(homework)

        except SQLAlchemyError as error:
            db.rollback()

            raise HTTPException(
                status_code=500,
                detail=(
                    "Cannot update homework: "
                    f"{str(error)}"
                ),
            )

        return homework_response(
            homework,
            db,
        )

    except HTTPException:
        raise

    except Exception as error:
        db.rollback()

        homework_error_response(
            error,
            "UPDATE HOMEWORK ERROR",
        )


# =========================================================
# Delete homework
# DELETE /homework/{homework_id}
# =========================================================

@router.delete("/{homework_id}")
def delete_homework(
    homework_id: int,
    db: Session = Depends(get_db),
):
    try:
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

        try:
            db.commit()

        except SQLAlchemyError as error:
            db.rollback()

            raise HTTPException(
                status_code=500,
                detail=(
                    "Cannot delete homework: "
                    f"{str(error)}"
                ),
            )

        return {
            "message": (
                "Homework deleted successfully"
            ),
        }

    except HTTPException:
        raise

    except Exception as error:
        db.rollback()

        homework_error_response(
            error,
            "DELETE HOMEWORK ERROR",
        )