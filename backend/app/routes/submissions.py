import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.homework_submission import HomeworkSubmission
from app.models.homework import Homework
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User
from app.models.score import Score
from app.schemas.submission_schema import SubmissionReview
from app.utils.cloudinary_upload import upload_file_to_cloudinary
from app.services.notification_service import send_push_notification

router = APIRouter(
    prefix="/submissions",
    tags=["Submissions"],
)


def get_utc_now():
    return datetime.now(timezone.utc)


def submission_response(
    item: HomeworkSubmission,
    db: Session,
):
    student = (
        db.query(Student)
        .filter(Student.id == item.student_id)
        .first()
    )

    homework = (
        db.query(Homework)
        .filter(Homework.id == item.homework_id)
        .first()
    )

    student_name = "-"

    if student:
        user = (
            db.query(User)
            .filter(User.id == student.user_id)
            .first()
        )

        if user:
            student_name = (
                f"{user.first_name or ''} "
                f"{user.last_name or ''}"
            ).strip()

    file_paths = []

    if item.file_paths:
        try:
            parsed_files = json.loads(item.file_paths)

            if isinstance(parsed_files, list):
                file_paths = parsed_files

        except (json.JSONDecodeError, TypeError):
            file_paths = []

    if item.file_path and item.file_path not in file_paths:
        file_paths.insert(0, item.file_path)

    return {
        "id": item.id,

        "homework_id": item.homework_id,
        "homework_title": (
            homework.title
            if homework
            else "-"
        ),

        "student_id": item.student_id,
        "student_name": student_name,

        "answer_text": item.answer_text,

        "file_path": item.file_path,
        "file_paths": file_paths,

        "status": item.status,

        "score": item.score or 0,
        "bonus": item.bonus or 0,

        "teacher_comment": item.teacher_comment,

        "submitted_at": item.submitted_at,
        "reviewed_at": item.reviewed_at,
    }


def notify_teacher_submission(
    submission: HomeworkSubmission,
    db: Session,
):
    homework = (
        db.query(Homework)
        .filter(
            Homework.id == submission.homework_id
        )
        .first()
    )

    student = (
        db.query(Student)
        .filter(
            Student.id == submission.student_id
        )
        .first()
    )

    if not homework or not student:
        return

    student_user = (
        db.query(User)
        .filter(
            User.id == student.user_id
        )
        .first()
    )

    teacher = (
        db.query(Teacher)
        .filter(
            Teacher.id == homework.teacher_id
        )
        .first()
    )

    if not teacher:
        return

    teacher_user = (
        db.query(User)
        .filter(
            User.id == teacher.user_id
        )
        .first()
    )

    if not teacher_user:
        return

    if not teacher_user.fcm_token:
        return

    student_name = "Student"

    if student_user:
        student_name = (
            f"{student_user.first_name or ''} "
            f"{student_user.last_name or ''}"
        ).strip()

    try:
        send_push_notification(
            token=teacher_user.fcm_token,
            title="📩 New Homework Submission",
            body=(
                f"{student_name} submitted homework\n"
                f"Title: {homework.title}"
            ),
        )

    except Exception as error:
        print(
            "FCM teacher submission error:",
            error,
        )


def notify_student_review(
    submission: HomeworkSubmission,
    db: Session,
):
    homework = (
        db.query(Homework)
        .filter(
            Homework.id == submission.homework_id
        )
        .first()
    )

    student = (
        db.query(Student)
        .filter(
            Student.id == submission.student_id
        )
        .first()
    )

    if not student:
        return

    student_user = (
        db.query(User)
        .filter(
            User.id == student.user_id
        )
        .first()
    )

    if not student_user:
        return

    if not student_user.fcm_token:
        return

    homework_title = (
        homework.title
        if homework
        else "Homework"
    )

    try:
        send_push_notification(
            token=student_user.fcm_token,
            title="✅ Homework Checked",
            body=(
                f"{homework_title}\n"
                f"Status: Checked\n"
                f"Bonus: +{submission.bonus or 0}\n"
                f"Comment: "
                f"{submission.teacher_comment or '-'}"
            ),
        )

    except Exception as error:
        print(
            "FCM student review error:",
            error,
        )


@router.post("/")
async def submit_homework(
    homework_id: int = Form(...),
    student_id: int = Form(...),
    answer_text: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
):
    answer_text = str(
        answer_text or ""
    ).strip()

    files = files or []

    homework = (
        db.query(Homework)
        .filter(
            Homework.id == homework_id
        )
        .first()
    )

    if not homework:
        raise HTTPException(
            status_code=404,
            detail="Homework not found",
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

    old_submission = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.homework_id
            == homework_id,

            HomeworkSubmission.student_id
            == student_id,
        )
        .first()
    )

    if old_submission:
        raise HTTPException(
            status_code=400,
            detail=(
                "You already submitted "
                "this homework"
            ),
        )

    real_files = [
        file
        for file in files
        if file and file.filename
    ]

    if not answer_text and len(real_files) == 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "Please write an answer or "
                "upload at least one file"
            ),
        )

    uploaded_files = []

    for file in real_files:
        try:
            uploaded_url = (
                upload_file_to_cloudinary(file)
            )

            if uploaded_url:
                uploaded_files.append(
                    uploaded_url
                )

        except Exception as error:
            raise HTTPException(
                status_code=500,
                detail=str(error),
            )

    submission = HomeworkSubmission(
        homework_id=homework_id,
        student_id=student_id,

        answer_text=answer_text,

        file_path=(
            uploaded_files[0]
            if uploaded_files
            else None
        ),

        file_paths=(
            json.dumps(uploaded_files)
            if uploaded_files
            else None
        ),

        status="submitted",

        score=0,
        bonus=0,

        teacher_comment=None,
        reviewed_at=None,
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    notify_teacher_submission(
        submission,
        db,
    )

    return submission_response(
        submission,
        db,
    )


@router.get("/homework/{homework_id}")
def get_homework_submissions(
    homework_id: int,
    db: Session = Depends(get_db),
):
    """
    Rules:

    submitted:
    Always show until teacher checks it.

    checked:
    Show only for 24 hours after teacher checked it.

    checked older than 24 hours:
    Hide from teacher UI.
    """

    homework = (
        db.query(Homework)
        .filter(
            Homework.id == homework_id
        )
        .first()
    )

    if not homework:
        raise HTTPException(
            status_code=404,
            detail="Homework not found",
        )

    twenty_four_hours_ago = (
        get_utc_now()
        - timedelta(hours=24)
    )

    submissions = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.homework_id
            == homework_id,

            or_(
                # Not checked: always show
                HomeworkSubmission.status
                != "checked",

                # Old data without reviewed_at
                HomeworkSubmission.reviewed_at
                .is_(None),

                # Checked less than 24 hours ago
                HomeworkSubmission.reviewed_at
                >= twenty_four_hours_ago,
            ),
        )
        .order_by(
            HomeworkSubmission.submitted_at.desc()
        )
        .all()
    )

    return [
        submission_response(
            submission,
            db,
        )
        for submission in submissions
    ]


@router.get("/homework/{homework_id}/all")
def get_all_homework_submissions(
    homework_id: int,
    db: Session = Depends(get_db),
):
    """
    Optional history endpoint.

    Returns all submissions including checked
    submissions older than 24 hours.
    """

    submissions = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.homework_id
            == homework_id
        )
        .order_by(
            HomeworkSubmission.submitted_at.desc()
        )
        .all()
    )

    return [
        submission_response(
            submission,
            db,
        )
        for submission in submissions
    ]


@router.get("/student/{student_id}")
def get_student_submissions(
    student_id: int,
    db: Session = Depends(get_db),
):
    """
    Student can still see checked submission.
    Data is not deleted from database.
    """

    submissions = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.student_id
            == student_id
        )
        .order_by(
            HomeworkSubmission.submitted_at.desc()
        )
        .all()
    )

    return [
        submission_response(
            submission,
            db,
        )
        for submission in submissions
    ]


@router.get("/student-bonus")
def get_student_bonus(
    student_id: int,
    class_id: int,
    db: Session = Depends(get_db),
):
    submissions = (
        db.query(HomeworkSubmission)
        .join(
            Homework,
            HomeworkSubmission.homework_id
            == Homework.id,
        )
        .filter(
            HomeworkSubmission.student_id
            == student_id,

            Homework.class_id
            == class_id,

            HomeworkSubmission.status
            == "checked",
        )
        .all()
    )

    total_bonus = sum(
        float(submission.bonus or 0)
        for submission in submissions
    )

    return {
        "student_id": student_id,
        "class_id": class_id,
        "bonus": total_bonus,
    }


@router.put("/{submission_id}/review")
def review_submission(
    submission_id: int,
    data: SubmissionReview,
    db: Session = Depends(get_db),
):
    item = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.id
            == submission_id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Submission not found",
        )

    if item.status == "checked":
        raise HTTPException(
            status_code=400,
            detail=(
                "This submission is "
                "already checked"
            ),
        )

    bonus = float(data.bonus or 0)

    if bonus < 0:
        raise HTTPException(
            status_code=400,
            detail="Bonus cannot be negative",
        )

    item.status = "checked"

    item.score = float(
        data.score or bonus
    )

    item.bonus = bonus

    item.teacher_comment = (
        data.teacher_comment
        or "Checked by teacher"
    )

    # Record teacher check time
    item.reviewed_at = get_utc_now()

    homework = (
        db.query(Homework)
        .filter(
            Homework.id == item.homework_id
        )
        .first()
    )

    if homework:
        score = (
            db.query(Score)
            .filter(
                Score.student_id
                == item.student_id,

                Score.class_id
                == homework.class_id,

                Score.subject_id
                == homework.subject_id,

                Score.semester == 1,
                Score.month == 1,
            )
            .first()
        )

        if score:
            score.bonus = bonus

            score.total_score = min(
                float(score.score or 0)
                + bonus,

                float(
                    score.max_score or 100
                ),
            )

        else:
            score = Score(
                student_id=item.student_id,
                class_id=homework.class_id,
                subject_id=homework.subject_id,
                teacher_id=homework.teacher_id,

                semester=1,
                month=1,

                score=0,
                bonus=bonus,
                total_score=min(
                    bonus,
                    100,
                ),
                max_score=100,

                remark="Homework bonus",
            )

            db.add(score)

    db.commit()
    db.refresh(item)

    notify_student_review(
        item,
        db,
    )

    return submission_response(
        item,
        db,
    )