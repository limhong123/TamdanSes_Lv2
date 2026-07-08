import json

from fastapi import APIRouter, Depends, HTTPException, Request
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
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional

router = APIRouter(prefix="/submissions", tags=["Submissions"])


def submission_response(item: HomeworkSubmission, db: Session):
    student = db.query(Student).filter(Student.id == item.student_id).first()
    homework = db.query(Homework).filter(Homework.id == item.homework_id).first()

    student_name = "-"

    if student:
        user = db.query(User).filter(User.id == student.user_id).first()
        if user:
            student_name = f"{user.first_name} {user.last_name}"

    file_paths = []

    if item.file_paths:
        try:
            parsed_files = json.loads(item.file_paths)
            if isinstance(parsed_files, list):
                file_paths = parsed_files
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
async def submit_homework(
    homework_id: int = Form(...),
    student_id: int = Form(...),
    answer_text: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
):
    answer_text = str(answer_text or "").strip()
    files = files or []

    old_submission = db.query(HomeworkSubmission).filter(
        HomeworkSubmission.homework_id == homework_id,
        HomeworkSubmission.student_id == student_id,
    ).first()

    if old_submission:
        raise HTTPException(
            status_code=400,
            detail="You already submitted this homework",
        )

    real_files = [f for f in files if f and f.filename]

    print("FILES RECEIVED:", len(real_files))
    for f in real_files:
        print("FILE NAME:", f.filename)

    if not answer_text and len(real_files) == 0:
        raise HTTPException(
            status_code=400,
            detail="Please write an answer or upload at least one file",
        )

    uploaded_files = []

    for file in real_files:
        try:
            uploaded_url = upload_file_to_cloudinary(file)
            print("UPLOADED URL:", uploaded_url)

            if uploaded_url:
                uploaded_files.append(uploaded_url)
        except Exception as e:
            print("CLOUDINARY ERROR:", e)
            raise HTTPException(status_code=500, detail=str(e))

    submission = HomeworkSubmission(
        homework_id=homework_id,
        student_id=student_id,
        answer_text=answer_text,
        file_path=uploaded_files[0] if uploaded_files else None,
        file_paths=json.dumps(uploaded_files) if uploaded_files else None,
        status="submitted",
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    notify_teacher_submission(submission, db)

    return submission_response(submission, db)

@router.get("/homework/{homework_id}")
def get_homework_submissions(homework_id: int, db: Session = Depends(get_db)):
    submissions = (
        db.query(HomeworkSubmission)
        .filter(HomeworkSubmission.homework_id == homework_id)
        .all()
    )

    return [submission_response(s, db) for s in submissions]
@router.get("/student/{student_id}")
def get_student_submissions(student_id: int, db: Session = Depends(get_db)):
    submissions = (
        db.query(HomeworkSubmission)
        .filter(HomeworkSubmission.student_id == student_id)
        .all()
    )

    return [submission_response(s, db) for s in submissions]


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