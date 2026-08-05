from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.attendance import Attendance
from app.models.homework import Homework
from app.models.homework_submission import HomeworkSubmission
from app.models.parent import Parent
from app.models.parent_student import ParentStudent
from app.models.schedule import Schedule
from app.models.school_class import SchoolClass
from app.models.score import Score
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.user import User
from app.routes.profile import get_current_user


router = APIRouter(
    prefix="/parents",
    tags=["Parents"],
)


# =========================================================
# Parent helper
# =========================================================
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


# =========================================================
# Verify parent and student relation
# =========================================================
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


# =========================================================
# User full name
# =========================================================
def get_user_full_name(
    user: User | None,
) -> str:
    if not user:
        return "-"

    first_name = str(
        getattr(user, "first_name", "") or ""
    ).strip()

    last_name = str(
        getattr(user, "last_name", "") or ""
    ).strip()

    full_name = f"{first_name} {last_name}".strip()

    if full_name:
        return full_name

    return str(
        getattr(user, "full_name", None)
        or getattr(user, "username", None)
        or getattr(user, "email", None)
        or "-"
    )


# =========================================================
# Class name
# =========================================================
def get_class_name(
    class_id: int | None,
    db: Session,
) -> str:
    if not class_id:
        return "-"

    school_class = (
        db.query(SchoolClass)
        .filter(SchoolClass.id == class_id)
        .first()
    )

    if not school_class:
        return "-"

    name = str(
        getattr(school_class, "name", "") or ""
    ).strip()

    section = str(
        getattr(school_class, "section", "") or ""
    ).strip()

    class_name = f"{name} {section}".strip()

    if class_name:
        return class_name

    return str(
        getattr(school_class, "class_name", None)
        or getattr(school_class, "title", None)
        or "-"
    )


# =========================================================
# Student response
# =========================================================
def student_info(
    student: Student,
    db: Session,
) -> dict:
    student_user = (
        db.query(User)
        .filter(User.id == student.user_id)
        .first()
    )

    return {
        "id": student.id,
        "student_code": student.student_code,
        "student_name": get_user_full_name(
            student_user
        ),
        "class_id": student.class_id,
        "class_name": get_class_name(
            student.class_id,
            db,
        ),
        "gender": getattr(
            student,
            "gender",
            None,
        ),
        "guardian_name": getattr(
            student,
            "guardian_name",
            None,
        ),
        "guardian_phone": getattr(
            student,
            "guardian_phone",
            None,
        ),
        "address": getattr(
            student,
            "address",
            None,
        ),
    }


# =========================================================
# Subject name
# =========================================================
def get_subject_name(
    subject_id: int | None,
    db: Session,
) -> str:
    if not subject_id:
        return "-"

    subject = (
        db.query(Subject)
        .filter(Subject.id == subject_id)
        .first()
    )

    if not subject:
        return "-"

    return str(
        getattr(subject, "name", None)
        or getattr(subject, "subject_name", None)
        or "-"
    )


# =========================================================
# Teacher name
# =========================================================
def get_teacher_name(
    teacher_id: int | None,
    db: Session,
) -> str:
    if not teacher_id:
        return "-"

    teacher = (
        db.query(Teacher)
        .filter(Teacher.id == teacher_id)
        .first()
    )

    if not teacher:
        return "-"

    teacher_user_id = getattr(
        teacher,
        "user_id",
        None,
    )

    if teacher_user_id:
        teacher_user = (
            db.query(User)
            .filter(User.id == teacher_user_id)
            .first()
        )

        teacher_name = get_user_full_name(
            teacher_user
        )

        if teacher_name != "-":
            return teacher_name

    return str(
        getattr(teacher, "full_name", None)
        or getattr(teacher, "name", None)
        or "-"
    )


# =========================================================
# Safe serializers
# =========================================================
def serialize_date(value):
    if value is None:
        return None

    if hasattr(value, "isoformat"):
        return value.isoformat()

    return str(value)


def serialize_time(value):
    if value is None:
        return ""

    return str(value)


# =========================================================
# GET Parent children
# GET /parents/children
# =========================================================
@router.get("/children")
def get_parent_children(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    parent = get_parent_from_user(
        current_user=current_user,
        db=db,
    )

    relations = (
        db.query(ParentStudent)
        .filter(
            ParentStudent.parent_id == parent.id
        )
        .all()
    )

    children = []

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

        item = student_info(
            student=student,
            db=db,
        )

        item["relationship_type"] = getattr(
            relation,
            "relationship_type",
            None,
        )

        children.append(item)

    parent_user = (
        db.query(User)
        .filter(User.id == parent.user_id)
        .first()
    )

    return {
        "parent": {
            "id": parent.id,
            "name": get_user_full_name(
                parent_user
            ),
            "phone": getattr(
                parent_user,
                "phone",
                None,
            ),
        },
        "students": children,
    }


# =========================================================
# GET Parent dashboard
# GET /parents/dashboard/{student_id}
# =========================================================
@router.get("/dashboard/{student_id}")
def get_parent_dashboard(
    student_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    parent = get_parent_from_user(
        current_user=current_user,
        db=db,
    )

    student = verify_parent_student(
        parent_id=parent.id,
        student_id=student_id,
        db=db,
    )

    student_data = student_info(
        student=student,
        db=db,
    )

    # =====================================================
    # Latest score month and semester
    # =====================================================
    latest_score = (
        db.query(Score)
        .filter(
            Score.student_id == student.id
        )
        .order_by(
            Score.semester.desc(),
            Score.month.desc(),
            Score.id.desc(),
        )
        .first()
    )

    latest_month = (
        latest_score.month
        if latest_score
        else None
    )

    latest_semester = (
        latest_score.semester
        if latest_score
        else None
    )

    # =====================================================
    # Scores
    # =====================================================
    score_rows = []

    if (
        latest_month is not None
        and latest_semester is not None
    ):
        score_rows = (
            db.query(Score)
            .filter(
                Score.student_id == student.id,
                Score.month == latest_month,
                Score.semester
                == latest_semester,
            )
            .all()
        )

    scores = []

    for score in score_rows:
        total_score_value = float(
            getattr(
                score,
                "total_score",
                0,
            )
            or 0
        )

        max_score_value = float(
            getattr(
                score,
                "max_score",
                0,
            )
            or 0
        )

        scores.append(
            {
                "id": score.id,
                "subject_id": score.subject_id,
                "subject_name": get_subject_name(
                    score.subject_id,
                    db,
                ),
                "total_score": total_score_value,
                "max_score": max_score_value,
                "month": score.month,
                "semester": score.semester,
            }
        )

    total_score = sum(
        float(
            getattr(
                score,
                "total_score",
                0,
            )
            or 0
        )
        for score in score_rows
    )

    total_max = sum(
        float(
            getattr(
                score,
                "max_score",
                0,
            )
            or 0
        )
        for score in score_rows
    )

    total_subjects = len(score_rows)

    average = (
        total_score / total_subjects
        if total_subjects > 0
        else 0
    )

    # =====================================================
    # Rank
    # =====================================================
    ranking = []

    if (
        latest_month is not None
        and latest_semester is not None
    ):
        class_students = (
            db.query(Student)
            .filter(
                Student.class_id
                == student.class_id
            )
            .all()
        )

        for class_student in class_students:
            class_student_scores = (
                db.query(Score)
                .filter(
                    Score.student_id
                    == class_student.id,
                    Score.semester
                    == latest_semester,
                    Score.month
                    == latest_month,
                )
                .all()
            )

            class_total_score = sum(
                float(
                    getattr(
                        item,
                        "total_score",
                        0,
                    )
                    or 0
                )
                for item in class_student_scores
            )

            class_subject_count = len(
                class_student_scores
            )

            class_average = (
                class_total_score
                / class_subject_count
                if class_subject_count > 0
                else 0
            )

            ranking.append(
                {
                    "student_id": class_student.id,
                    "average": class_average,
                    "total_score": class_total_score,
                }
            )

        ranking.sort(
            key=lambda item: item["average"],
            reverse=True,
        )

    student_rank = next(
        (
            index + 1
            for index, item in enumerate(
                ranking
            )
            if item["student_id"]
            == student.id
        ),
        "-",
    )

    # =====================================================
    # Homework
    # =====================================================
    homework_rows = (
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

    homework = []

    for item in homework_rows:
        subject_id = getattr(
            item,
            "subject_id",
            None,
        )

        teacher_id = getattr(
            item,
            "teacher_id",
            None,
        )

        homework.append(
            {
                "id": item.id,
                "title": getattr(
                    item,
                    "title",
                    "Homework",
                ),
                "description": getattr(
                    item,
                    "description",
                    None,
                ),
                "due_date": serialize_date(
                    getattr(
                        item,
                        "due_date",
                        None,
                    )
                ),
                "created_at": serialize_date(
                    getattr(
                        item,
                        "created_at",
                        None,
                    )
                ),
                "subject_id": subject_id,
                "subject_name": get_subject_name(
                    subject_id,
                    db,
                ),
                "teacher_id": teacher_id,
                "teacher_name": get_teacher_name(
                    teacher_id,
                    db,
                ),
            }
        )

    # =====================================================
    # Homework submissions
    # =====================================================
    submission_rows = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.student_id
            == student.id
        )
        .all()
    )

    submissions = []

    for item in submission_rows:
        submissions.append(
            {
                "id": item.id,
                "homework_id": item.homework_id,
                "status": getattr(
                    item,
                    "status",
                    None,
                ),
                "submitted_at": serialize_date(
                    getattr(
                        item,
                        "submitted_at",
                        None,
                    )
                ),
            }
        )

    # =====================================================
    # Schedules
    # =====================================================
    schedule_rows = (
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

    schedules = []

    for item in schedule_rows:
        subject_id = getattr(
            item,
            "subject_id",
            None,
        )

        teacher_id = getattr(
            item,
            "teacher_id",
            None,
        )

        schedules.append(
            {
                "id": item.id,
                "class_id": item.class_id,
                "class_name": get_class_name(
                    item.class_id,
                    db,
                ),
                "day": item.day,
                "start_time": serialize_time(
                    item.start_time
                ),
                "end_time": serialize_time(
                    item.end_time
                ),
                "subject_id": subject_id,
                "subject_name": get_subject_name(
                    subject_id,
                    db,
                ),
                "teacher_id": teacher_id,
                "teacher_name": get_teacher_name(
                    teacher_id,
                    db,
                ),
            }
        )

    # =====================================================
    # Attendance
    # =====================================================
    attendance_rows = (
        db.query(Attendance)
        .filter(
            Attendance.student_id
            == student.id
        )
        .order_by(
            Attendance.date.desc(),
            Attendance.id.desc(),
        )
        .all()
    )

    attendance = []

    for item in attendance_rows:
        schedule = (
            db.query(Schedule)
            .filter(
                Schedule.id
                == item.schedule_id
            )
            .first()
        )

        subject_id = (
            getattr(
                schedule,
                "subject_id",
                None,
            )
            if schedule
            else getattr(
                item,
                "subject_id",
                None,
            )
        )

        teacher_id = (
            getattr(
                schedule,
                "teacher_id",
                None,
            )
            if schedule
            else getattr(
                item,
                "teacher_id",
                None,
            )
        )

        class_id = (
            getattr(
                schedule,
                "class_id",
                None,
            )
            if schedule
            else student.class_id
        )

        attendance.append(
            {
                "id": item.id,
                "student_id": item.student_id,
                "schedule_id": item.schedule_id,

                "class_id": class_id or 0,
                "class_name": get_class_name(
                    class_id,
                    db,
                ),

                "subject_id": subject_id or 0,
                "subject_name": get_subject_name(
                    subject_id,
                    db,
                ),

                "teacher_id": teacher_id or 0,
                "teacher_name": get_teacher_name(
                    teacher_id,
                    db,
                ),

                "date": serialize_date(
                    item.date
                ),

                "day": (
                    str(
                        getattr(
                            schedule,
                            "day",
                            "",
                        )
                        or ""
                    )
                    if schedule
                    else ""
                ),

                "start_time": (
                    serialize_time(
                        getattr(
                            schedule,
                            "start_time",
                            None,
                        )
                    )
                    if schedule
                    else ""
                ),

                "end_time": (
                    serialize_time(
                        getattr(
                            schedule,
                            "end_time",
                            None,
                        )
                    )
                    if schedule
                    else ""
                ),

                "status": item.status,
                "remark": item.remark,
            }
        )

    # =====================================================
    # Final response
    # =====================================================
    return {
        "student": student_data,
        "rank": {
            "rank": student_rank,
            "total_students": len(ranking),
            "average": round(average, 2),
            "total_score": round(
                total_score,
                2,
            ),
            "total_max": round(
                total_max,
                2,
            ),
            "month": latest_month,
            "semester": latest_semester,
        },
        "homework": homework,
        "submissions": submissions,
        "scores": scores,
        "schedules": schedules,
        "attendance": attendance,
    }
# =========================================================
# GET Parent today's schedules
# GET /parents/schedules/{student_id}/today
# =========================================================
@router.get("/schedules/{student_id}/today")
def get_parent_today_schedules(
    student_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    # 1. Verify current user is parent
    parent = get_parent_from_user(
        current_user=current_user,
        db=db,
    )

    # 2. Verify student belongs to this parent
    student = verify_parent_student(
        parent_id=parent.id,
        student_id=student_id,
        db=db,
    )

    # 3. Get current day using Cambodia timezone
    now = datetime.now(
        ZoneInfo("Asia/Phnom_Penh")
    )

    today = now.strftime("%A")
    # Example: Monday, Tuesday, Wednesday...

    # 4. Get schedules for student's class and today
    schedule_rows = (
        db.query(Schedule)
        .filter(
            Schedule.class_id == student.class_id,
            Schedule.day == today,
        )
        .order_by(
            Schedule.start_time.asc()
        )
        .all()
    )

    schedules = []

    for item in schedule_rows:
        subject_id = getattr(
            item,
            "subject_id",
            None,
        )

        teacher_id = getattr(
            item,
            "teacher_id",
            None,
        )

        schedules.append(
            {
                "id": item.id,
                "class_id": item.class_id,
                "class_name": get_class_name(
                    item.class_id,
                    db,
                ),
                "day": item.day,
                "start_time": serialize_time(
                    item.start_time
                ),
                "end_time": serialize_time(
                    item.end_time
                ),
                "subject_id": subject_id,
                "subject_name": get_subject_name(
                    subject_id,
                    db,
                ),
                "teacher_id": teacher_id,
                "teacher_name": get_teacher_name(
                    teacher_id,
                    db,
                ),
            }
        )

    return {
        "student_id": student.id,
        "student_name": student_info(
            student=student,
            db=db,
        )["student_name"],
        "class_id": student.class_id,
        "class_name": get_class_name(
            student.class_id,
            db,
        ),
        "date": now.date().isoformat(),
        "day": today,
        "total": len(schedules),
        "schedules": schedules,
    }