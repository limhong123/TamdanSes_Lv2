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
        "student_name": get_user_full_name(student_user),

        "profile_image": getattr(
            student_user,
            "avatar_url",
            None,
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
            Score.student_id == student.id,
            Score.score_type == "monthly",
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
                Score.score_type == "monthly",
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
                    Score.score_type == "monthly",
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
# Parent result helpers
# =========================================================
MONTH_NAMES = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December",
}


def safe_float(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def score_percentage(
    total_score: float,
    max_score: float,
) -> float:
    if max_score <= 0:
        return 0.0

    return round(
        (total_score / max_score) * 100,
        2,
    )


def serialize_score_item(
    score: Score,
    db: Session,
) -> dict:
    score_value = safe_float(
        getattr(score, "score", 0)
    )
    bonus_value = safe_float(
        getattr(score, "bonus", 0)
    )
    total_score_value = safe_float(
        getattr(score, "total_score", 0)
    )
    max_score_value = safe_float(
        getattr(score, "max_score", 0)
    )

    return {
        "id": score.id,
        "student_id": score.student_id,
        "class_id": score.class_id,
        "subject_id": score.subject_id,
        "subject_name": get_subject_name(
            score.subject_id,
            db,
        ),
        "teacher_id": score.teacher_id,
        "teacher_name": get_teacher_name(
            score.teacher_id,
            db,
        ),
        "score_type": score.score_type,
        "semester": score.semester,
        "month": score.month,
        "month_name": (
            MONTH_NAMES.get(score.month)
            if score.month is not None
            else None
        ),
        "score": round(score_value, 2),
        "bonus": round(bonus_value, 2),
        "total_score": round(
            total_score_value,
            2,
        ),
        "max_score": round(
            max_score_value,
            2,
        ),
        "percentage": score_percentage(
            total_score_value,
            max_score_value,
        ),
        "remark": getattr(
            score,
            "remark",
            None,
        ),
    }


# =========================================================
# BUILD PARENT SEMESTER RESULT
# =========================================================

def build_parent_semester_result(
    student: Student,
    semester: int,
    db: Session,
) -> dict:

    # -----------------------------------------------------
    # Monthly scores
    # -----------------------------------------------------

    monthly_score_rows = (
        db.query(Score)
        .filter(
            Score.student_id == student.id,
            Score.semester == semester,
            Score.score_type == "monthly",
        )
        .order_by(
            Score.month.asc(),
            Score.subject_id.asc(),
            Score.id.asc(),
        )
        .all()
    )

    # -----------------------------------------------------
    # Semester exam scores
    # -----------------------------------------------------

    semester_exam_rows = (
        db.query(Score)
        .filter(
            Score.student_id == student.id,
            Score.semester == semester,
            Score.score_type == "semester_exam",
        )
        .order_by(
            Score.subject_id.asc(),
            Score.id.asc(),
        )
        .all()
    )

    # -----------------------------------------------------
    # Available months
    # -----------------------------------------------------

    months = sorted(
        {
            score.month
            for score in monthly_score_rows
            if score.month is not None
        }
    )

    monthly_results = []

    raw_monthly_averages = []

    # -----------------------------------------------------
    # Build each month result
    # -----------------------------------------------------

    for month in months:

        month_scores = [
            score
            for score in monthly_score_rows
            if score.month == month
        ]

        month_total_score = sum(
            safe_float(
                score.total_score
            )
            for score in month_scores
        )

        month_total_max = sum(
            safe_float(
                score.max_score
            )
            for score in month_scores
        )

        subject_count = len(
            month_scores
        )

        month_average_raw = (
            month_total_score
            / subject_count
            if subject_count > 0
            else 0.0
        )

        raw_monthly_averages.append(
            month_average_raw
        )

        monthly_results.append(
            {
                "month":
                    month,

                "month_name":
                    MONTH_NAMES.get(
                        month,
                        str(month),
                    ),

                "total_score":
                    round(
                        month_total_score,
                        2,
                    ),

                "total_max":
                    round(
                        month_total_max,
                        2,
                    ),

                "subjects":
                    subject_count,

                "average":
                    round(
                        month_average_raw,
                        2,
                    ),

                "percentage":
                    score_percentage(
                        month_total_score,
                        month_total_max,
                    ),

                "subject_results": [
                    serialize_score_item(
                        score=score,
                        db=db,
                    )
                    for score in month_scores
                ],
            }
        )

    # -----------------------------------------------------
    # Monthly average
    # -----------------------------------------------------

    monthly_average_raw = (
        sum(
            raw_monthly_averages
        )
        / len(
            raw_monthly_averages
        )
        if raw_monthly_averages
        else 0.0
    )

    # -----------------------------------------------------
    # Semester exam
    # -----------------------------------------------------

    semester_exam_total = sum(
        safe_float(
            score.total_score
        )
        for score in semester_exam_rows
    )

    semester_exam_max = sum(
        safe_float(
            score.max_score
        )
        for score in semester_exam_rows
    )

    semester_exam_subjects = len(
        semester_exam_rows
    )

    semester_exam_average_raw = (
        semester_exam_total
        / semester_exam_subjects
        if semester_exam_subjects > 0
        else 0.0
    )

    # -----------------------------------------------------
    # Final semester result
    #
    # If monthly + exam exist:
    # (monthly average + exam average) / 2
    # -----------------------------------------------------

    if (
        monthly_results
        and semester_exam_rows
    ):
        semester_result_raw = (
            monthly_average_raw
            + semester_exam_average_raw
        ) / 2

    elif monthly_results:

        semester_result_raw = (
            monthly_average_raw
        )

    elif semester_exam_rows:

        semester_result_raw = (
            semester_exam_average_raw
        )

    else:

        semester_result_raw = 0.0

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return {
        "semester":
            semester,

        "summary": {
            "monthly_average":
                round(
                    monthly_average_raw,
                    2,
                ),

            "semester_exam_average":
                round(
                    semester_exam_average_raw,
                    2,
                ),

            "semester_result":
                round(
                    semester_result_raw,
                    2,
                ),

            "monthly_count":
                len(
                    monthly_results
                ),

            "semester_exam_subjects":
                semester_exam_subjects,
        },

        "monthly_results":
            monthly_results,

        "semester_exam": {
            "total_score":
                round(
                    semester_exam_total,
                    2,
                ),

            "total_max":
                round(
                    semester_exam_max,
                    2,
                ),

            "subjects":
                semester_exam_subjects,

            "average":
                round(
                    semester_exam_average_raw,
                    2,
                ),

            "percentage":
                score_percentage(
                    semester_exam_total,
                    semester_exam_max,
                ),

            "subject_results": [
                serialize_score_item(
                    score=score,
                    db=db,
                )
                for score in semester_exam_rows
            ],
        },

        # Internal raw value used for ranking
        "_raw_semester_result":
            semester_result_raw,
    }


# =========================================================
# STUDENT NAME FOR RANK
# =========================================================

def get_rank_student_name(
    student: Student,
    db: Session,
) -> str:

    user = (
        db.query(User)
        .filter(
            User.id
            == student.user_id
        )
        .first()
    )

    return get_user_full_name(
        user
    )


# =========================================================
# FINALIZE RANKING
#
# Competition ranking:
#
# 95 -> rank 1
# 90 -> rank 2
# 90 -> rank 2
# 80 -> rank 4
# =========================================================

def finalize_ranking(
    rows: list[dict],
    target_student_id: int,
    value_key: str,
) -> dict:

    ordered = sorted(
        rows,
        key=lambda item: (
            -safe_float(
                item.get(
                    value_key,
                    0,
                )
            ),
            int(
                item.get(
                    "student_id",
                    0,
                )
            ),
        ),
    )

    ranking = []

    previous_value = None
    previous_rank = None

    target_rank = "-"

    for index, item in enumerate(
        ordered,
        start=1,
    ):

        current_value = (
            safe_float(
                item.get(
                    value_key,
                    0,
                )
            )
        )

        # Same result = same rank
        if (
            previous_value is not None
            and abs(
                current_value
                - previous_value
            )
            < 0.000000001
        ):
            rank = previous_rank

        else:
            rank = index

        # Remove internal fields
        public_item = {
            key: value
            for key, value
            in item.items()
            if not key.startswith("_")
        }

        public_item[
            "rank"
        ] = rank

        ranking.append(
            public_item
        )

        if (
            item.get(
                "student_id"
            )
            == target_student_id
        ):
            target_rank = rank

        previous_value = (
            current_value
        )

        previous_rank = (
            rank
        )

    return {
        "rank":
            target_rank,

        "total_students":
            len(
                ranking
            ),

        "ranking":
            ranking,
    }


# =========================================================
# MONTHLY CLASS RANK
# =========================================================

def build_month_class_ranking(
    student: Student,
    semester: int,
    month: int,
    db: Session,
) -> dict:

    class_students = (
        db.query(Student)
        .filter(
            Student.class_id
            == student.class_id
        )
        .all()
    )

    rows = []

    for class_student in class_students:

        score_rows = (
            db.query(Score)
            .filter(
                Score.student_id
                == class_student.id,

                Score.score_type
                == "monthly",

                Score.semester
                == semester,

                Score.month
                == month,
            )
            .all()
        )

        # Do not rank student with no result
        if not score_rows:
            continue

        total_score = sum(
            safe_float(
                score.total_score
            )
            for score in score_rows
        )

        total_max = sum(
            safe_float(
                score.max_score
            )
            for score in score_rows
        )

        subject_count = len(
            score_rows
        )

        average = (
            total_score
            / subject_count
            if subject_count > 0
            else 0.0
        )

        rows.append(
            {
                "student_id":
                    class_student.id,

                "student_code":
                    getattr(
                        class_student,
                        "student_code",
                        None,
                    ),

                "student_name":
                    get_rank_student_name(
                        class_student,
                        db,
                    ),

                "semester":
                    semester,

                "month":
                    month,

                "month_name":
                    MONTH_NAMES.get(
                        month,
                        str(month),
                    ),

                "total_score":
                    round(
                        total_score,
                        2,
                    ),

                "total_max":
                    round(
                        total_max,
                        2,
                    ),

                "subjects":
                    subject_count,

                "average":
                    round(
                        average,
                        2,
                    ),

                "percentage":
                    score_percentage(
                        total_score,
                        total_max,
                    ),

                "_rank_value":
                    average,
            }
        )

    return finalize_ranking(
        rows=rows,
        target_student_id=student.id,
        value_key="_rank_value",
    )


# =========================================================
# SEMESTER CLASS RANK
# =========================================================

def build_semester_class_ranking(
    student: Student,
    semester: int,
    db: Session,
) -> dict:

    class_students = (
        db.query(Student)
        .filter(
            Student.class_id
            == student.class_id
        )
        .all()
    )

    rows = []

    for class_student in class_students:

        result = (
            build_parent_semester_result(
                student=class_student,
                semester=semester,
                db=db,
            )
        )

        summary = (
            result[
                "summary"
            ]
        )

        has_result = (
            summary[
                "monthly_count"
            ] > 0
            or
            summary[
                "semester_exam_subjects"
            ] > 0
        )

        if not has_result:
            continue

        raw_result = safe_float(
            result.get(
                "_raw_semester_result",
                0,
            )
        )

        rows.append(
            {
                "student_id":
                    class_student.id,

                "student_code":
                    getattr(
                        class_student,
                        "student_code",
                        None,
                    ),

                "student_name":
                    get_rank_student_name(
                        class_student,
                        db,
                    ),

                "semester":
                    semester,

                "monthly_average":
                    summary[
                        "monthly_average"
                    ],

                "semester_exam_average":
                    summary[
                        "semester_exam_average"
                    ],

                "semester_result":
                    summary[
                        "semester_result"
                    ],

                "_rank_value":
                    raw_result,
            }
        )

    return finalize_ranking(
        rows=rows,
        target_student_id=student.id,
        value_key="_rank_value",
    )


# =========================================================
# YEARLY CLASS RANK
# =========================================================

def build_year_class_ranking(
    student: Student,
    db: Session,
) -> dict:

    class_students = (
        db.query(Student)
        .filter(
            Student.class_id
            == student.class_id
        )
        .all()
    )

    rows = []

    for class_student in class_students:

        semester_rows = (
            db.query(
                Score.semester
            )
            .filter(
                Score.student_id
                == class_student.id
            )
            .distinct()
            .order_by(
                Score.semester.asc()
            )
            .all()
        )

        semesters = [
            row[0]
            for row in semester_rows
            if row[0] is not None
        ]

        semester_values = []

        semester_summaries = []

        for semester in semesters:

            result = (
                build_parent_semester_result(
                    student=class_student,
                    semester=semester,
                    db=db,
                )
            )

            summary = (
                result[
                    "summary"
                ]
            )

            has_result = (
                summary[
                    "monthly_count"
                ] > 0
                or
                summary[
                    "semester_exam_subjects"
                ] > 0
            )

            if not has_result:
                continue

            raw_result = (
                safe_float(
                    result.get(
                        "_raw_semester_result",
                        0,
                    )
                )
            )

            semester_values.append(
                raw_result
            )

            semester_summaries.append(
                {
                    "semester":
                        semester,

                    "monthly_average":
                        summary[
                            "monthly_average"
                        ],

                    "semester_exam_average":
                        summary[
                            "semester_exam_average"
                        ],

                    "semester_result":
                        summary[
                            "semester_result"
                        ],
                }
            )

        if not semester_values:
            continue

        yearly_average = (
            sum(
                semester_values
            )
            / len(
                semester_values
            )
        )

        rows.append(
            {
                "student_id":
                    class_student.id,

                "student_code":
                    getattr(
                        class_student,
                        "student_code",
                        None,
                    ),

                "student_name":
                    get_rank_student_name(
                        class_student,
                        db,
                    ),

                "average":
                    round(
                        yearly_average,
                        2,
                    ),

                "total_semesters":
                    len(
                        semester_values
                    ),

                "semesters":
                    semester_summaries,

                "_rank_value":
                    yearly_average,
            }
        )

    return finalize_ranking(
        rows=rows,
        target_student_id=student.id,
        value_key="_rank_value",
    )


# =========================================================
# ATTACH MONTHLY + SEMESTER RANK TO SEMESTER RESULT
# =========================================================

def attach_semester_rankings(
    student: Student,
    result: dict,
    db: Session,
) -> dict:

    semester = (
        result[
            "semester"
        ]
    )

    # -----------------------------------------------------
    # Add rank to every month
    # -----------------------------------------------------

    for month_result in (
        result.get(
            "monthly_results",
            [],
        )
    ):

        month_result[
            "rank"
        ] = (
            build_month_class_ranking(
                student=student,
                semester=semester,
                month=month_result[
                    "month"
                ],
                db=db,
            )
        )

    # -----------------------------------------------------
    # Semester rank
    # -----------------------------------------------------

    result[
        "semester_rank"
    ] = (
        build_semester_class_ranking(
            student=student,
            semester=semester,
            db=db,
        )
    )

    return result


# =========================================================
# GET PARENT ALL STUDENT RESULTS
#
# GET /parents/results/{student_id}
# =========================================================

@router.get(
    "/results/{student_id}"
)
def get_parent_student_results(
    student_id: int,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    parent = (
        get_parent_from_user(
            current_user=current_user,
            db=db,
        )
    )

    student = (
        verify_parent_student(
            parent_id=parent.id,
            student_id=student_id,
            db=db,
        )
    )

    # -----------------------------------------------------
    # Find semesters
    # -----------------------------------------------------

    semester_rows = (
        db.query(
            Score.semester
        )
        .filter(
            Score.student_id
            == student.id
        )
        .distinct()
        .order_by(
            Score.semester.asc()
        )
        .all()
    )

    semesters = [
        row[0]
        for row in semester_rows
        if row[0] is not None
    ]

    semester_results = []

    raw_year_values = []

    # -----------------------------------------------------
    # Build each semester
    # -----------------------------------------------------

    for semester in semesters:

        result = (
            build_parent_semester_result(
                student=student,
                semester=semester,
                db=db,
            )
        )

        raw_value = (
            safe_float(
                result.get(
                    "_raw_semester_result",
                    0,
                )
            )
        )

        raw_year_values.append(
            raw_value
        )

        # Add monthly + semester ranks
        attach_semester_rankings(
            student=student,
            result=result,
            db=db,
        )

        # Do not expose internal field
        result.pop(
            "_raw_semester_result",
            None,
        )

        semester_results.append(
            result
        )

    # -----------------------------------------------------
    # Year average
    # -----------------------------------------------------

    yearly_average = (
        sum(
            raw_year_values
        )
        / len(
            raw_year_values
        )
        if raw_year_values
        else 0.0
    )

    # -----------------------------------------------------
    # Year rank
    # -----------------------------------------------------

    yearly_rank = (
        build_year_class_ranking(
            student=student,
            db=db,
        )
    )

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return {
        "student":
            student_info(
                student=student,
                db=db,
            ),

        "available_semesters":
            semesters,

        "semester_results":
            semester_results,

        "yearly": {
            "average":
                round(
                    yearly_average,
                    2,
                ),

            "total_semesters":
                len(
                    semester_results
                ),

            "rank":
                yearly_rank,

            "semesters": [
                {
                    "semester":
                        item[
                            "semester"
                        ],

                    "monthly_average":
                        item[
                            "summary"
                        ][
                            "monthly_average"
                        ],

                    "semester_exam_average":
                        item[
                            "summary"
                        ][
                            "semester_exam_average"
                        ],

                    "semester_result":
                        item[
                            "summary"
                        ][
                            "semester_result"
                        ],

                    "rank":
                        item[
                            "semester_rank"
                        ][
                            "rank"
                        ],

                    "total_students":
                        item[
                            "semester_rank"
                        ][
                            "total_students"
                        ],
                }
                for item in semester_results
            ],
        },
    }


# =========================================================
# GET PARENT STUDENT SEMESTER RESULT
#
# GET /parents/results/{student_id}/semester/{semester}
# =========================================================

@router.get(
    "/results/{student_id}/semester/{semester}"
)
def get_parent_student_semester_result(
    student_id: int,
    semester: int,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    if semester <= 0:

        raise HTTPException(
            status_code=400,
            detail="Invalid semester",
        )

    parent = (
        get_parent_from_user(
            current_user=current_user,
            db=db,
        )
    )

    student = (
        verify_parent_student(
            parent_id=parent.id,
            student_id=student_id,
            db=db,
        )
    )

    semester_exists = (
        db.query(
            Score.id
        )
        .filter(
            Score.student_id
            == student.id,

            Score.semester
            == semester,
        )
        .first()
    )

    # -----------------------------------------------------
    # No result
    # -----------------------------------------------------

    if not semester_exists:

        return {
            "student":
                student_info(
                    student=student,
                    db=db,
                ),

            "semester":
                semester,

            "summary": {
                "monthly_average":
                    0.0,

                "semester_exam_average":
                    0.0,

                "semester_result":
                    0.0,

                "monthly_count":
                    0,

                "semester_exam_subjects":
                    0,
            },

            "monthly_results":
                [],

            "semester_exam": {
                "total_score":
                    0.0,

                "total_max":
                    0.0,

                "subjects":
                    0,

                "average":
                    0.0,

                "percentage":
                    0.0,

                "subject_results":
                    [],
            },

            "semester_rank": {
                "rank":
                    "-",

                "total_students":
                    0,

                "ranking":
                    [],
            },
        }

    # -----------------------------------------------------
    # Build semester
    # -----------------------------------------------------

    result = (
        build_parent_semester_result(
            student=student,
            semester=semester,
            db=db,
        )
    )

    # Add monthly + semester rank
    attach_semester_rankings(
        student=student,
        result=result,
        db=db,
    )

    result.pop(
        "_raw_semester_result",
        None,
    )

    return {
        "student":
            student_info(
                student=student,
                db=db,
            ),

        **result,
    }


# =========================================================
# GET PARENT STUDENT MONTHLY RESULT
#
# GET
# /parents/results/{student_id}/semester/{semester}/month/{month}
# =========================================================

@router.get(
    "/results/{student_id}/semester/{semester}/month/{month}"
)
def get_parent_student_month_result(
    student_id: int,
    semester: int,
    month: int,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    if semester <= 0:

        raise HTTPException(
            status_code=400,
            detail="Invalid semester",
        )

    if (
        month < 1
        or month > 12
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Month must be between "
                "1 and 12"
            ),
        )

    parent = (
        get_parent_from_user(
            current_user=current_user,
            db=db,
        )
    )

    student = (
        verify_parent_student(
            parent_id=parent.id,
            student_id=student_id,
            db=db,
        )
    )

    # -----------------------------------------------------
    # Student monthly scores
    # -----------------------------------------------------

    score_rows = (
        db.query(Score)
        .filter(
            Score.student_id
            == student.id,

            Score.semester
            == semester,

            Score.score_type
            == "monthly",

            Score.month
            == month,
        )
        .order_by(
            Score.subject_id.asc(),
            Score.id.asc(),
        )
        .all()
    )

    total_score = sum(
        safe_float(
            score.total_score
        )
        for score in score_rows
    )

    total_max = sum(
        safe_float(
            score.max_score
        )
        for score in score_rows
    )

    subject_count = len(
        score_rows
    )

    average = (
        total_score
        / subject_count
        if subject_count > 0
        else 0.0
    )

    # -----------------------------------------------------
    # Monthly class ranking
    # -----------------------------------------------------

    month_rank = (
        build_month_class_ranking(
            student=student,
            semester=semester,
            month=month,
            db=db,
        )
    )

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return {
        "student":
            student_info(
                student=student,
                db=db,
            ),

        "semester":
            semester,

        "month":
            month,

        "month_name":
            MONTH_NAMES.get(
                month,
                str(month),
            ),

        "summary": {
            "total_score":
                round(
                    total_score,
                    2,
                ),

            "total_max":
                round(
                    total_max,
                    2,
                ),

            "subjects":
                subject_count,

            "average":
                round(
                    average,
                    2,
                ),

            "percentage":
                score_percentage(
                    total_score,
                    total_max,
                ),
        },

        # Monthly rank
        "rank":
            month_rank,

        "results": [
            serialize_score_item(
                score=score,
                db=db,
            )
            for score in score_rows
        ],
    }


# =========================================================
# GET PARENT SEMESTER EXAM RESULT
#
# GET
# /parents/results/{student_id}/semester/{semester}/exam
# =========================================================

@router.get(
    "/results/{student_id}/semester/{semester}/exam"
)
def get_parent_student_semester_exam(
    student_id: int,
    semester: int,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    if semester <= 0:

        raise HTTPException(
            status_code=400,
            detail="Invalid semester",
        )

    parent = (
        get_parent_from_user(
            current_user=current_user,
            db=db,
        )
    )

    student = (
        verify_parent_student(
            parent_id=parent.id,
            student_id=student_id,
            db=db,
        )
    )

    score_rows = (
        db.query(Score)
        .filter(
            Score.student_id
            == student.id,

            Score.semester
            == semester,

            Score.score_type
            == "semester_exam",
        )
        .order_by(
            Score.subject_id.asc(),
            Score.id.asc(),
        )
        .all()
    )

    total_score = sum(
        safe_float(
            score.total_score
        )
        for score in score_rows
    )

    total_max = sum(
        safe_float(
            score.max_score
        )
        for score in score_rows
    )

    subject_count = len(
        score_rows
    )

    average = (
        total_score
        / subject_count
        if subject_count > 0
        else 0.0
    )

    return {
        "student":
            student_info(
                student=student,
                db=db,
            ),

        "semester":
            semester,

        "score_type":
            "semester_exam",

        "summary": {
            "total_score":
                round(
                    total_score,
                    2,
                ),

            "total_max":
                round(
                    total_max,
                    2,
                ),

            "subjects":
                subject_count,

            "average":
                round(
                    average,
                    2,
                ),

            "percentage":
                score_percentage(
                    total_score,
                    total_max,
                ),
        },

        "results": [
            serialize_score_item(
                score=score,
                db=db,
            )
            for score in score_rows
        ],
    }


# =========================================================
# GET PARENT YEARLY RESULT
#
# GET /parents/results/{student_id}/yearly
# =========================================================

@router.get(
    "/results/{student_id}/yearly"
)
def get_parent_student_yearly_result(
    student_id: int,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    parent = (
        get_parent_from_user(
            current_user=current_user,
            db=db,
        )
    )

    student = (
        verify_parent_student(
            parent_id=parent.id,
            student_id=student_id,
            db=db,
        )
    )

    # -----------------------------------------------------
    # Available semesters
    # -----------------------------------------------------

    semester_rows = (
        db.query(
            Score.semester
        )
        .filter(
            Score.student_id
            == student.id
        )
        .distinct()
        .order_by(
            Score.semester.asc()
        )
        .all()
    )

    semesters = [
        row[0]
        for row in semester_rows
        if row[0] is not None
    ]

    semester_results = []

    raw_year_values = []

    # -----------------------------------------------------
    # Build semesters
    # -----------------------------------------------------

    for semester in semesters:

        result = (
            build_parent_semester_result(
                student=student,
                semester=semester,
                db=db,
            )
        )

        raw_result = (
            safe_float(
                result.get(
                    "_raw_semester_result",
                    0,
                )
            )
        )

        raw_year_values.append(
            raw_result
        )

        semester_rank = (
            build_semester_class_ranking(
                student=student,
                semester=semester,
                db=db,
            )
        )

        semester_results.append(
            {
                "semester":
                    semester,

                "monthly_average":
                    result[
                        "summary"
                    ][
                        "monthly_average"
                    ],

                "semester_exam_average":
                    result[
                        "summary"
                    ][
                        "semester_exam_average"
                    ],

                "semester_result":
                    result[
                        "summary"
                    ][
                        "semester_result"
                    ],

                "rank":
                    semester_rank[
                        "rank"
                    ],

                "total_students":
                    semester_rank[
                        "total_students"
                    ],
            }
        )

    # -----------------------------------------------------
    # Year average
    # -----------------------------------------------------

    yearly_average = (
        sum(
            raw_year_values
        )
        / len(
            raw_year_values
        )
        if raw_year_values
        else 0.0
    )

    # -----------------------------------------------------
    # Year ranking
    # -----------------------------------------------------

    yearly_rank = (
        build_year_class_ranking(
            student=student,
            db=db,
        )
    )

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return {
        "student":
            student_info(
                student=student,
                db=db,
            ),

        "yearly_summary": {
            "total_semesters":
                len(
                    semester_results
                ),

            "average":
                round(
                    yearly_average,
                    2,
                ),

            "rank":
                yearly_rank[
                    "rank"
                ],

            "total_students":
                yearly_rank[
                    "total_students"
                ],
        },

        "semester_results":
            semester_results,

        # Full class yearly ranking
        "ranking":
            yearly_rank[
                "ranking"
            ],
    }