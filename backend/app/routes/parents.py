from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.parent import Parent
from app.models.parent_student import ParentStudent
from app.models.student import Student
from app.models.user import User
from app.models.homework import Homework
from app.models.homework_submission import HomeworkSubmission
from app.models.score import Score
from app.models.schedule import Schedule
from app.models.attendance import Attendance
from app.models.school_class import SchoolClass
from app.routes.profile import get_current_user



router = APIRouter(
    prefix="/parents",
    tags=["Parents"],
)


def get_parent_from_user(
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
        .filter(Parent.user_id == current_user.id)
        .first()
    )

    if not parent:
        raise HTTPException(
            status_code=404,
            detail="Parent profile not found",
        )

    return parent


def verify_parent_student(
    parent_id: int,
    student_id: int,
    db: Session,
) -> Student:
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
            detail="This student is not linked to your parent account",
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


def student_info(
    student: Student,
    db: Session,
):
    user = (
        db.query(User)
        .filter(User.id == student.user_id)
        .first()
    )

    school_class = (
        db.query(SchoolClass)
        .filter(SchoolClass.id == student.class_id)
        .first()
    )

    return {
        "id": student.id,
        "student_code": student.student_code,
        "student_name": (
            f"{user.first_name or ''} "
            f"{user.last_name or ''}"
        ).strip()
        if user
        else "-",
        "class_id": student.class_id,
        "class_name": (
            f"{school_class.name} "
            f"{school_class.section or ''}"
        ).strip()
        if school_class
        else "-",
        "gender": student.gender,
        "guardian_name": student.guardian_name,
        "guardian_phone": student.guardian_phone,
        "address": student.address,
    }


@router.get("/children")
def get_parent_children(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    parent = get_parent_from_user(current_user, db)

    relations = (
        db.query(ParentStudent)
        .filter(ParentStudent.parent_id == parent.id)
        .all()
    )

    children = []

    for relation in relations:
        student = (
            db.query(Student)
            .filter(Student.id == relation.student_id)
            .first()
        )

        if not student:
            continue

        item = student_info(student, db)
        item["relationship_type"] = relation.relationship_type

        children.append(item)

    return {
        "parent": {
            "id": parent.id,
            "name": parent.full_name,
            "phone": parent.phone,
        },
        "students": children,
    }


@router.get("/dashboard/{student_id}")
def get_parent_dashboard(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    parent = get_parent_from_user(current_user, db)

    student = verify_parent_student(
        parent_id=parent.id,
        student_id=student_id,
        db=db,
    )

    student_data = student_info(student, db)

    latest_score = (
        db.query(Score)
        .filter(Score.student_id == student.id)
        .order_by(
            Score.semester.desc(),
            Score.month.desc(),
            Score.id.desc(),
        )
        .first()
    )

    latest_month = latest_score.month if latest_score else None
    latest_semester = (
        latest_score.semester if latest_score else None
    )

    scores = []

    if latest_month is not None and latest_semester is not None:
        score_rows = (
            db.query(Score)
            .filter(
                Score.student_id == student.id,
                Score.month == latest_month,
                Score.semester == latest_semester,
            )
            .all()
        )

        scores = [
            {
                "id": score.id,
                "subject_id": score.subject_id,
                "total_score": score.total_score,
                "max_score": score.max_score,
                "month": score.month,
                "semester": score.semester,
            }
            for score in score_rows
        ]

    homework_rows = (
        db.query(Homework)
        .filter(Homework.class_id == student.class_id)
        .order_by(Homework.id.desc())
        .all()
    )

    homework = [
        {
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "due_date": item.due_date,
            "created_at": getattr(item, "created_at", None),
            "subject_id": item.subject_id,
            "teacher_id": item.teacher_id,
        }
        for item in homework_rows
    ]

    submission_rows = (
        db.query(HomeworkSubmission)
        .filter(HomeworkSubmission.student_id == student.id)
        .all()
    )

    submissions = [
        {
            "id": item.id,
            "homework_id": item.homework_id,
            "status": item.status,
        }
        for item in submission_rows
    ]

    schedule_rows = (
        db.query(Schedule)
        .filter(Schedule.class_id == student.class_id)
        .all()
    )

    schedules = [
        {
            "id": item.id,
            "day": item.day,
            "start_time": item.start_time,
            "end_time": item.end_time,
            "subject_id": item.subject_id,
            "teacher_id": item.teacher_id,
        }
        for item in schedule_rows
    ]

    attendance_rows = (
        db.query(Attendance)
        .filter(Attendance.student_id == student.id)
        .order_by(Attendance.id.desc())
        .all()
    )

    attendance = [
        {
            "id": item.id,
            "date": item.date,
            "status": item.status,
            "subject_id": item.subject_id,
            "teacher_id": item.teacher_id,
        }
        for item in attendance_rows
    ]

    total_score = sum(
        float(score.total_score or 0)
        for score in score_rows
    ) if latest_month is not None else 0

    total_max = sum(
        float(score.max_score or 0)
        for score in score_rows
    ) if latest_month is not None else 0

    average = (
        round((total_score / total_max) * 100, 1)
        if total_max > 0
        else 0
    )

    return {
        "student": student_data,
        "rank": {
            "rank": "-",
            "total_students": 0,
            "average": average,
            "month": latest_month,
            "semester": latest_semester,
        },
        "homework": homework,
        "submissions": submissions,
        "scores": scores,
        "schedules": schedules,
        "attendance": attendance,
    }