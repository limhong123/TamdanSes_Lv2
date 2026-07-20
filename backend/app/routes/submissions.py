import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.homework import Homework
from app.models.homework_submission import HomeworkSubmission
from app.models.score import Score
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User
from app.schemas.submission_schema import SubmissionReview
from app.services.notification_service import send_push_notification
from app.utils.cloudinary_upload import upload_file_to_cloudinary

router = APIRouter(
    prefix="/submissions",
    tags=["Submissions"],
)


# =========================================================
# Helpers
# =========================================================

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_status(value: str | None) -> str:
    return str(value or "").strip().lower()


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
        student_user = (
            db.query(User)
            .filter(User.id == student.user_id)
            .first()
        )

        if student_user:
            student_name = (
                f"{student_user.first_name or ''} "
                f"{student_user.last_name or ''}"
            ).strip() or "-"

    file_paths = []

    if item.file_paths:
        try:
            parsed = json.loads(item.file_paths)

            if isinstance(parsed, list):
                file_paths = [
                    str(file_url)
                    for file_url in parsed
                    if file_url
                ]
        except (json.JSONDecodeError, TypeError):
            file_paths = []

    if item.file_path and item.file_path not in file_paths:
        file_paths.insert(0, item.file_path)

    return {
        "id": item.id,
        "homework_id": item.homework_id,
        "homework_title": homework.title if homework else "-",
        "student_id": item.student_id,
        "student_name": student_name,
        "answer_text": item.answer_text,
        "file_path": item.file_path,
        "file_paths": file_paths,
        "status": normalize_status(item.status),
        "score": float(item.score or 0),
        "bonus": float(item.bonus or 0),
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
        .filter(Homework.id == submission.homework_id)
        .first()
    )

    student = (
        db.query(Student)
        .filter(Student.id == submission.student_id)
        .first()
    )

    if not homework or not student:
        return

    student_user = (
        db.query(User)
        .filter(User.id == student.user_id)
        .first()
    )

    teacher = (
        db.query(Teacher)
        .filter(Teacher.id == homework.teacher_id)
        .first()
    )

    if not teacher:
        return

    teacher_user = (
        db.query(User)
        .filter(User.id == teacher.user_id)
        .first()
    )

    if not teacher_user or not teacher_user.fcm_token:
        return

    student_name = "Student"

    if student_user:
        student_name = (
            f"{student_user.first_name or ''} "
            f"{student_user.last_name or ''}"
        ).strip() or "Student"

    try:
        send_push_notification(
            token=teacher_user.fcm_token,
            title="New Homework Submission",
            body=(
                f"{student_name} submitted homework\n"
                f"Title: {homework.title}"
            ),
        )
    except Exception as error:
        print("FCM teacher submission error:", error)


def notify_student_review(
    submission: HomeworkSubmission,
    db: Session,
):
    homework = (
        db.query(Homework)
        .filter(Homework.id == submission.homework_id)
        .first()
    )

    student = (
        db.query(Student)
        .filter(Student.id == submission.student_id)
        .first()
    )

    if not student:
        return

    student_user = (
        db.query(User)
        .filter(User.id == student.user_id)
        .first()
    )

    if not student_user or not student_user.fcm_token:
        return

    homework_title = homework.title if homework else "Homework"

    try:
        send_push_notification(
            token=student_user.fcm_token,
            title="Homework Checked",
            body=(
                f"{homework_title}\n"
                f"Bonus: +{submission.bonus or 0}\n"
                f"Comment: {submission.teacher_comment or '-'}"
            ),
        )
    except Exception as error:
        print("FCM student review error:", error)


# =========================================================
# Student submits homework
# POST /submissions/
# =========================================================

@router.post("/")
async def submit_homework(
    homework_id: int = Form(...),
    student_id: int = Form(...),
    answer_text: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
):
    cleaned_answer = str(answer_text or "").strip()

    homework = (
        db.query(Homework)
        .filter(Homework.id == homework_id)
        .first()
    )

    if not homework:
        raise HTTPException(
            status_code=404,
            detail="Homework not found",
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

    if student.class_id != homework.class_id:
        raise HTTPException(
            status_code=403,
            detail="This homework does not belong to your class",
        )

    existing = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.homework_id == homework_id,
            HomeworkSubmission.student_id == student_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="You already submitted this homework",
        )

    valid_files = [
        file
        for file in (files or [])
        if file and file.filename
    ]

    if not cleaned_answer and not valid_files:
        raise HTTPException(
            status_code=400,
            detail="Please write an answer or upload at least one file",
        )

    uploaded_files: list[str] = []

    for upload in valid_files:
        try:
            uploaded_url = upload_file_to_cloudinary(upload)

            if uploaded_url:
                uploaded_files.append(uploaded_url)
        except Exception as error:
            raise HTTPException(
                status_code=500,
                detail=f"File upload failed: {str(error)}",
            )

    submission = HomeworkSubmission(
        homework_id=homework_id,
        student_id=student_id,
        answer_text=cleaned_answer or None,
        file_path=uploaded_files[0] if uploaded_files else None,
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
        submitted_at=utc_now(),
    )

    db.add(submission)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="You already submitted this homework",
        )

    db.refresh(submission)

    notify_teacher_submission(submission, db)

    return submission_response(submission, db)


# =========================================================
# Teacher waiting list
#
# Only submissions not yet checked are returned.
# A submission stays here until the teacher checks it.
# After checking, it disappears immediately from this list.
#
# GET /submissions/homework/{homework_id}
# =========================================================

@router.get("/homework/{homework_id}")
def get_homework_submissions(
    homework_id: int,
    db: Session = Depends(get_db),
):
    homework = (
        db.query(Homework)
        .filter(Homework.id == homework_id)
        .first()
    )

    if not homework:
        raise HTTPException(
            status_code=404,
            detail="Homework not found",
        )

    submissions = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.homework_id == homework_id,
            func.lower(
                func.trim(HomeworkSubmission.status)
            ) != "checked",
        )
        .order_by(
            HomeworkSubmission.submitted_at.desc()
        )
        .all()
    )

    return [
        submission_response(item, db)
        for item in submissions
    ]


# =========================================================
# Full submission history
# GET /submissions/homework/{homework_id}/all
# =========================================================

@router.get("/homework/{homework_id}/all")
def get_all_homework_submissions(
    homework_id: int,
    db: Session = Depends(get_db),
):
    homework = (
        db.query(Homework)
        .filter(Homework.id == homework_id)
        .first()
    )

    if not homework:
        raise HTTPException(
            status_code=404,
            detail="Homework not found",
        )

    submissions = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.homework_id == homework_id
        )
        .order_by(
            HomeworkSubmission.submitted_at.desc()
        )
        .all()
    )

    return [
        submission_response(item, db)
        for item in submissions
    ]


# =========================================================
# Student submission history
# GET /submissions/student/{student_id}
# =========================================================

@router.get("/student/{student_id}")
def get_student_submissions(
    student_id: int,
    db: Session = Depends(get_db),
):
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

    submissions = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.student_id == student_id
        )
        .order_by(
            HomeworkSubmission.submitted_at.desc()
        )
        .all()
    )

    return [
        submission_response(item, db)
        for item in submissions
    ]


# =========================================================
# Student total homework bonus
# GET /submissions/student-bonus
# =========================================================

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
            HomeworkSubmission.homework_id == Homework.id,
        )
        .filter(
            HomeworkSubmission.student_id == student_id,
            Homework.class_id == class_id,
            func.lower(
                func.trim(HomeworkSubmission.status)
            ) == "checked",
        )
        .all()
    )

    total_bonus = sum(
        float(item.bonus or 0)
        for item in submissions
    )

    return {
        "student_id": student_id,
        "class_id": class_id,
        "bonus": round(total_bonus, 2),
    }


# =========================================================
# Teacher checks submission
# PUT /submissions/{submission_id}/review
# =========================================================

@router.put("/{submission_id}/review")
def review_submission(
    submission_id: int,
    data: SubmissionReview,
    db: Session = Depends(get_db),
):
    item = (
        db.query(HomeworkSubmission)
        .filter(HomeworkSubmission.id == submission_id)
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Submission not found",
        )

    if normalize_status(item.status) == "checked":
        raise HTTPException(
            status_code=400,
            detail="This submission is already checked",
        )

    bonus = float(data.bonus or 0)

    if bonus < 0:
        raise HTTPException(
            status_code=400,
            detail="Bonus cannot be negative",
        )

    score_value = (
        float(data.score)
        if data.score is not None
        else bonus
    )

    if score_value < 0:
        raise HTTPException(
            status_code=400,
            detail="Score cannot be negative",
        )

    item.status = "checked"
    item.score = score_value
    item.bonus = bonus
    item.teacher_comment = (
        str(
            data.teacher_comment
            or "Checked by teacher"
        ).strip()
    )
    item.reviewed_at = utc_now()

    homework = (
        db.query(Homework)
        .filter(Homework.id == item.homework_id)
        .first()
    )

    if homework:
        semester = 1
        month = 1

        score_record = (
            db.query(Score)
            .filter(
                Score.student_id == item.student_id,
                Score.class_id == homework.class_id,
                Score.subject_id == homework.subject_id,
                Score.semester == semester,
                Score.month == month,
            )
            .first()
        )

        if score_record:
            score_record.bonus = bonus

            base_score = float(
                score_record.score or 0
            )

            maximum = float(
                score_record.max_score or 100
            )

            score_record.total_score = min(
                base_score + bonus,
                maximum,
            )
        else:
            score_record = Score(
                student_id=item.student_id,
                class_id=homework.class_id,
                subject_id=homework.subject_id,
                teacher_id=homework.teacher_id,
                semester=semester,
                month=month,
                score=0,
                bonus=bonus,
                total_score=min(bonus, 100),
                max_score=100,
                remark="Homework bonus",
            )

            db.add(score_record)

    db.commit()
    db.refresh(item)

    notify_student_review(item, db)

    return submission_response(item, db)
