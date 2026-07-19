from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.attendance import Attendance
from app.models.homework import Homework
from app.models.homework_submission import HomeworkSubmission
from app.models.parent import Parent
from app.models.parent_student import ParentStudent
from app.models.permission_request import PermissionRequest
from app.models.schedule import Schedule
from app.models.score import Score
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.user import User
from app.routes.profile import get_current_user


router = APIRouter(
    prefix="/parent",
    tags=["Parent Dashboard"],
)


def get_parent_child(
    current_user: User,
    student_id: int,
    db: Session,
):
    if current_user.role != "parent":
        raise HTTPException(
            status_code=403,
            detail="Only parent can access this endpoint",
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

    relation = (
        db.query(ParentStudent)
        .filter(
            ParentStudent.parent_id == parent.id,
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


def get_score_value(item):
    value = getattr(item, "score", None)

    if value is None:
        value = getattr(item, "score_value", 0)

    return float(value or 0)


def get_max_score_value(item):
    value = getattr(item, "max_score", None)

    if value is None:
        value = getattr(item, "total_score", 100)

    return float(value or 100)


@router.get("/dashboard/{student_id}")
def parent_dashboard(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    student = get_parent_child(
        current_user=current_user,
        student_id=student_id,
        db=db,
    )

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

    semester = (
        latest_score.semester
        if latest_score
        else None
    )

    month = (
        latest_score.month
        if latest_score
        else None
    )

    student_scores = []

    if semester is not None and month is not None:
        student_scores = (
            db.query(Score)
            .filter(
                Score.student_id == student.id,
                Score.semester == semester,
                Score.month == month,
            )
            .all()
        )

    total_score = sum(
        get_score_value(item)
        for item in student_scores
    )

    total_max = sum(
        get_max_score_value(item)
        for item in student_scores
    )

    average = (
        total_score / total_max * 100
        if total_max > 0
        else 0
    )

    class_students = (
        db.query(Student)
        .filter(Student.class_id == student.class_id)
        .all()
    )

    ranking = []

    if semester is not None and month is not None:
        for class_student in class_students:
            class_student_scores = (
                db.query(Score)
                .filter(
                    Score.student_id == class_student.id,
                    Score.semester == semester,
                    Score.month == month,
                )
                .all()
            )

            ranking.append(
                {
                    "student_id": class_student.id,
                    "total": sum(
                        get_score_value(item)
                        for item in class_student_scores
                    ),
                }
            )

    ranking.sort(
        key=lambda item: item["total"],
        reverse=True,
    )

    rank = "-"

    for index, item in enumerate(ranking):
        if item["student_id"] == student.id:
            rank = index + 1
            break

    homework_query = (
        db.query(Homework)
        .filter(Homework.class_id == student.class_id)
    )

    homework_count = homework_query.count()

    submitted_homework_ids = [
        item.homework_id
        for item in (
            db.query(HomeworkSubmission)
            .filter(
                HomeworkSubmission.student_id == student.id
            )
            .all()
        )
    ]

    pending_query = (
        db.query(Homework)
        .filter(Homework.class_id == student.class_id)
    )

    if submitted_homework_ids:
        pending_query = pending_query.filter(
            ~Homework.id.in_(submitted_homework_ids)
        )

    pending_homework_count = pending_query.count()

    present_count = (
        db.query(Attendance)
        .filter(
            Attendance.student_id == student.id,
            Attendance.status == "present",
        )
        .count()
    )

    absent_count = (
        db.query(Attendance)
        .filter(
            Attendance.student_id == student.id,
            Attendance.status == "absent",
        )
        .count()
    )

    permission_count = (
        db.query(PermissionRequest)
        .filter(
            PermissionRequest.student_id == student.id
        )
        .count()
    )

    today_name = datetime.now().strftime("%A")

    today_schedules = (
        db.query(Schedule)
        .filter(
            Schedule.class_id == student.class_id,
            Schedule.day == today_name,
        )
        .order_by(Schedule.start_time.asc())
        .all()
    )

    schedule_result = []

    for schedule in today_schedules:
        subject = (
            db.query(Subject)
            .filter(Subject.id == schedule.subject_id)
            .first()
        )

        teacher = (
            db.query(Teacher)
            .filter(Teacher.id == schedule.teacher_id)
            .first()
        )

        teacher_user = None

        if teacher:
            teacher_user = (
                db.query(User)
                .filter(User.id == teacher.user_id)
                .first()
            )

        schedule_result.append(
            {
                "id": schedule.id,
                "subject_id": schedule.subject_id,
                "subject_name": (
                    subject.name
                    if subject
                    else "-"
                ),
                "teacher_id": schedule.teacher_id,
                "teacher_name": (
                    f"{teacher_user.first_name} "
                    f"{teacher_user.last_name}"
                    if teacher_user
                    else "-"
                ),
                "day": schedule.day,
                "start_time": str(schedule.start_time),
                "end_time": str(schedule.end_time),
            }
        )

    recent_homeworks = (
        homework_query
        .order_by(Homework.id.desc())
        .limit(5)
        .all()
    )

    homework_result = []

    for homework in recent_homeworks:
        subject = None

        subject_id = getattr(
            homework,
            "subject_id",
            None,
        )

        if subject_id:
            subject = (
                db.query(Subject)
                .filter(Subject.id == subject_id)
                .first()
            )

        due_date = getattr(
            homework,
            "due_date",
            None,
        )

        homework_result.append(
            {
                "id": homework.id,
                "title": getattr(
                    homework,
                    "title",
                    "Homework",
                ),
                "description": getattr(
                    homework,
                    "description",
                    None,
                ),
                "subject_name": (
                    subject.name
                    if subject
                    else "-"
                ),
                "due_date": (
                    str(due_date)
                    if due_date
                    else None
                ),
            }
        )

    return {
        "student_id": student.id,
        "rank": rank,
        "total_students": len(ranking),
        "average": round(average, 1),
        "semester": semester,
        "month": month,
        "homework_count": homework_count,
        "pending_homework_count": pending_homework_count,
        "present_count": present_count,
        "absent_count": absent_count,
        "permission_count": permission_count,
        "today_schedules": schedule_result,
        "recent_homeworks": homework_result,
    }
