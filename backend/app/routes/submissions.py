import json
from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.homework_submission import HomeworkSubmission
from app.models.homework import Homework
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User
from app.models.score import Score
from app.schemas.submission_schema import SubmissionReview
from app.core.telegram import send_telegram_message
from app.utils.cloudinary_upload import upload_file_to_cloudinary

router = APIRouter(prefix="/submissions", tags=["Submissions"])


def save_file(file: UploadFile):
    if not file:
        return None

    return upload_file_to_cloudinary(file)


def submission_response(item: HomeworkSubmission, db: Session):
    student = db.query(Student).filter(Student.id == item.student_id).first()
    homework = db.query(Homework).filter(Homework.id == item.homework_id).first()

    student_name = "-"

    if student:
        user = db.query(User).filter(User.id == student.user_id).first()
        if user:
            student_name = f"{user.first_name} {user.last_name}"

    file_paths = []

    if getattr(item, "file_paths", None):
        try:
            file_paths = json.loads(item.file_paths)
        except Exception:
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
        "status": item.status,
        "score": item.score,
        "bonus": item.bonus or 0,
        "teacher_comment": item.teacher_comment,
        "submitted_at": item.submitted_at,
    }


def notify_teacher_submission(submission: HomeworkSubmission, db: Session):
    homework = db.query(Homework).filter(
        Homework.id == submission.homework_id
    ).first()

    student = db.query(Student).filter(
        Student.id == submission.student_id
    ).first()

    if not homework or not student:
        return

    student_user = db.query(User).filter(
        User.id == student.user_id
    ).first()

    teacher = db.query(Teacher).filter(
        Teacher.id == homework.teacher_id
    ).first()

    teacher_user = None

    if teacher:
        teacher_user = db.query(User).filter(
            User.id == teacher.user_id
        ).first()

    if not teacher_user or not teacher_user.telegram_chat_id:
        return

    student_name = (
        f"{student_user.first_name} {student_user.last_name}"
        if student_user
        else "-"
    )

    message = f"""
📩 TAM DAN SES

New Homework Submission

Student:
{student_name}

Homework:
{homework.title}

Please review the submission.
"""

    send_telegram_message(teacher_user.telegram_chat_id, message)


def notify_student_review(submission: HomeworkSubmission, db: Session):
    homework = db.query(Homework).filter(
        Homework.id == submission.homework_id
    ).first()

    student = db.query(Student).filter(
        Student.id == submission.student_id
    ).first()

    if not student:
        return

    student_user = db.query(User).filter(
        User.id == student.user_id
    ).first()

    if not student_user or not student_user.telegram_chat_id:
        return

    message = f"""
✅ TAM DAN SES

Homework Checked

Homework:
{homework.title if homework else "-"}

Status:
{submission.status}

Bonus:
+{submission.bonus or 0}

Teacher Comment:
{submission.teacher_comment or "-"}
"""

    send_telegram_message(student_user.telegram_chat_id, message)


@router.post("/")
def submit_homework(
    homework_id: int = Form(...),
    student_id: int = Form(...),
    answer_text: str = Form(""),
    files: List[UploadFile] | None = File(None),
    db: Session = Depends(get_db),
):
    old_submission = db.query(HomeworkSubmission).filter(
        HomeworkSubmission.homework_id == homework_id,
        HomeworkSubmission.student_id == student_id,
    ).first()

    if old_submission:
        raise HTTPException(
            status_code=400,
            detail="You already submitted this homework",
        )

    has_answer = bool(answer_text.strip())
    valid_files = [
        file for file in (files or [])
        if file and file.filename
    ]

    if not has_answer and len(valid_files) == 0:
        raise HTTPException(
            status_code=400,
            detail="Please write an answer or upload at least one file",
        )

    uploaded_files = []

    for file in valid_files:
        uploaded_url = save_file(file)
        if uploaded_url:
            uploaded_files.append(uploaded_url)

    submission = HomeworkSubmission(
        homework_id=homework_id,
        student_id=student_id,
        answer_text=answer_text.strip(),
        file_path=uploaded_files[0] if uploaded_files else None,
        file_paths=json.dumps(uploaded_files),
        status="submitted",
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    notify_teacher_submission(submission, db)

    return submission_response(submission, db)


@router.get("/homework/{homework_id}")
def get_homework_submissions(
    homework_id: int,
    db: Session = Depends(get_db),
):
    items = db.query(HomeworkSubmission).filter(
        HomeworkSubmission.homework_id == homework_id
    ).order_by(HomeworkSubmission.id.desc()).all()

    return [submission_response(i, db) for i in items]


@router.get("/student/{student_id}")
def get_student_submissions(
    student_id: int,
    db: Session = Depends(get_db),
):
    items = db.query(HomeworkSubmission).filter(
        HomeworkSubmission.student_id == student_id
    ).order_by(HomeworkSubmission.id.desc()).all()

    return [submission_response(i, db) for i in items]


@router.get("/student-bonus")
def get_student_bonus(
    student_id: int,
    class_id: int,
    db: Session = Depends(get_db),
):
    submissions = (
        db.query(HomeworkSubmission)
        .join(Homework, HomeworkSubmission.homework_id == Homework.id)
        .filter(
            HomeworkSubmission.student_id == student_id,
            Homework.class_id == class_id,
            HomeworkSubmission.status == "checked",
        )
        .all()
    )

    total_bonus = sum([s.bonus or 0 for s in submissions])

    return {"bonus": total_bonus}


@router.put("/{submission_id}/review")
def review_submission(
    submission_id: int,
    data: SubmissionReview,
    db: Session = Depends(get_db),
):
    item = db.query(HomeworkSubmission).filter(
        HomeworkSubmission.id == submission_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Submission not found")

    item.status = data.status
    item.score = data.score
    item.bonus = data.bonus or 0
    item.teacher_comment = data.teacher_comment

    bonus = item.bonus

    homework = db.query(Homework).filter(
        Homework.id == item.homework_id
    ).first()

    if homework:
        score = db.query(Score).filter(
            Score.student_id == item.student_id,
            Score.class_id == homework.class_id,
            Score.subject_id == homework.subject_id,
            Score.semester == 1,
            Score.month == 1,
        ).first()

        if score:
            score.bonus = bonus
            score.total_score = min(
                (score.score or 0) + bonus,
                score.max_score,
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
                total_score=bonus,
                max_score=100,
                remark="Homework bonus",
            )

            db.add(score)

    db.commit()
    db.refresh(item)

    notify_student_review(item, db)

    return submission_response(item, db)