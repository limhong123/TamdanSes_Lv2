import os
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.homework_submission import HomeworkSubmission
from app.models.homework import Homework
from app.models.student import Student
from app.models.user import User
from app.schemas.submission_schema import SubmissionReview

router = APIRouter(prefix="/submissions", tags=["Submissions"])

UPLOAD_DIR = "uploads/submissions"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def save_file(file: UploadFile):
    if not file:
        return None

    file_path = f"{UPLOAD_DIR}/{file.filename}"

    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())

    return file_path


def submission_response(item: HomeworkSubmission, db: Session):
    student = db.query(Student).filter(Student.id == item.student_id).first()
    homework = db.query(Homework).filter(Homework.id == item.homework_id).first()

    student_name = "-"

    if student:
        user = db.query(User).filter(User.id == student.user_id).first()
        if user:
            student_name = f"{user.first_name} {user.last_name}"

    return {
        "id": item.id,
        "homework_id": item.homework_id,
        "homework_title": homework.title if homework else "-",
        "student_id": item.student_id,
        "student_name": student_name,
        "answer_text": item.answer_text,
        "file_path": item.file_path,
        "status": item.status,
        "score": item.score,
        "teacher_comment": item.teacher_comment,
        "submitted_at": item.submitted_at,
    }


@router.post("/")
def submit_homework(
    homework_id: int = Form(...),
    student_id: int = Form(...),
    answer_text: str = Form(""),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db)
):
    old_submission = db.query(HomeworkSubmission).filter(
        HomeworkSubmission.homework_id == homework_id,
        HomeworkSubmission.student_id == student_id
    ).first()

    if old_submission:
        raise HTTPException(
            status_code=400,
            detail="You already submitted this homework"
        )

    file_path = save_file(file) if file else None

    submission = HomeworkSubmission(
        homework_id=homework_id,
        student_id=student_id,
        answer_text=answer_text,
        file_path=file_path,
        status="submitted",
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    return submission_response(submission, db)


@router.get("/homework/{homework_id}")
def get_homework_submissions(
    homework_id: int,
    db: Session = Depends(get_db)
):
    items = db.query(HomeworkSubmission).filter(
        HomeworkSubmission.homework_id == homework_id
    ).order_by(HomeworkSubmission.id.desc()).all()

    return [submission_response(i, db) for i in items]


@router.get("/student/{student_id}")
def get_student_submissions(
    student_id: int,
    db: Session = Depends(get_db)
):
    items = db.query(HomeworkSubmission).filter(
        HomeworkSubmission.student_id == student_id
    ).order_by(HomeworkSubmission.id.desc()).all()

    return [submission_response(i, db) for i in items]

@router.get("/student-bonus")
def get_student_bonus(
    student_id: int,
    class_id: int,
    db: Session = Depends(get_db)
):
    submissions = (
        db.query(HomeworkSubmission)
        .join(Homework, HomeworkSubmission.homework_id == Homework.id)
        .filter(
            HomeworkSubmission.student_id == student_id,
            Homework.class_id == class_id,
            HomeworkSubmission.status == "checked"
        )
        .all()
    )

    total_bonus = sum([s.bonus or 0 for s in submissions])

    return {"bonus": total_bonus}

@router.put("/{submission_id}/review")
def review_submission(
    submission_id: int,
    data: SubmissionReview,
    db: Session = Depends(get_db)
):
    item = db.query(HomeworkSubmission).filter(
        HomeworkSubmission.id == submission_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Submission not found")

    item.status = data.status
    item.score = data.score
    item.bonus =data.bonus
    item.teacher_comment = data.teacher_comment

    db.commit()
    db.refresh(item)

    return submission_response(item, db)