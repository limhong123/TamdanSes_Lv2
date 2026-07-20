from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db

from app.models.parent import Parent
from app.models.parent_student import ParentStudent
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User
from app.models.subject import Subject
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


# =========================================================
# Helper: Get parent profile from current user
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
# Helper: Verify that student belongs to parent
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
# Helper: Get user full name
# =========================================================

def get_user_full_name(user: User | None) -> str:
    if not user:
        return "-"

    full_name = (
        f"{getattr(user, 'first_name', '') or ''} "
        f"{getattr(user, 'last_name', '') or ''}"
    ).strip()

    if full_name:
        return full_name

    return (
        getattr(user, "full_name", None)
        or getattr(user, "username", None)
        or "-"
    )


# =========================================================
# Helper: Student response
# =========================================================

def student_info(
    student: Student,
    db: Session,
):
    student_user = (
        db.query(User)
        .filter(User.id == student.user_id)
        .first()
    )

    school_class = (
        db.query(SchoolClass)
        .filter(SchoolClass.id == student.class_id)
        .first()
    )

    class_name = "-"

    if school_class:
        class_name = (
            f"{getattr(school_class, 'name', '') or ''} "
            f"{getattr(school_class, 'section', '') or ''}"
        ).strip()

    return {
        "id": student.id,
        "student_code": student.student_code,
        "student_name": get_user_full_name(student_user),
        "class_id": student.class_id,
        "class_name": class_name or "-",
        "gender": getattr(student, "gender", None),
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
        "address": getattr(student, "address", None),
    }


# =========================================================
# Helper: Subject name
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

    return (
        getattr(subject, "name", None)
        or getattr(subject, "subject_name", None)
        or "-"
    )


# =========================================================
# Helper: Teacher name
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

        teacher_name = get_user_full_name(teacher_user)

        if teacher_name != "-":
            return teacher_name

    return (
        getattr(teacher, "full_name", None)
        or getattr(teacher, "name", None)
        or "-"
    )


# =========================================================
# GET Parent children
# URL: GET /parents/children
# =========================================================

@router.get("/children")
def get_parent_children(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    parent = get_parent_from_user(
        current_user=current_user,
        db=db,
    )

    relations = (
        db.query(ParentStudent)
        .filter(ParentStudent.parent_id == parent.id)
        .all()
    )

    children = []

    for relation in relations:
        student = (
            db.query(Student)
            .filter(
                Student.id == relation.student_id
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

    parent_name = (
        getattr(parent, "full_name", None)
        or getattr(parent, "name", None)
        or "-"
    )

    return {
        "parent": {
            "id": parent.id,
            "name": parent_name,
            "phone": getattr(parent, "phone", None),
        },
        "students": children,
    }


# =========================================================
# GET Parent dashboard
# URL: GET /parents/dashboard/{student_id}
# =========================================================

@router.get("/dashboard/{student_id}")
def get_parent_dashboard(
    student_id: int,
    current_user: User = Depends(get_current_user),
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
        .filter(Score.student_id == student.id)
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
    # Student scores
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
                Score.semester == latest_semester,
            )
            .all()
        )

    scores = []

    for score in score_rows:
        scores.append(
            {
                "id": score.id,
                "subject_id": score.subject_id,
                "subject_name": get_subject_name(
                    score.subject_id,
                    db,
                ),
                "total_score": float(
                    score.total_score or 0
                ),
                "max_score": float(
                    score.max_score or 0
                ),
                "month": score.month,
                "semester": score.semester,
            }
        )

    # =====================================================
    # Average
    # =====================================================

    total_score = sum(
        float(score.total_score or 0)
        for score in score_rows
    )

    total_max = sum(
        float(score.max_score or 0)
        for score in score_rows
    )

    total_subjects = len(score_rows)

    average = (
        total_score / total_subjects
        if total_subjects > 0
        else 0
    )

    # =====================================================
    # Rank in class
    # =====================================================

    ranking = []

    if (
        latest_month is not None
        and latest_semester is not None
    ):
        class_students = (
            db.query(Student)
            .filter(
                Student.class_id == student.class_id
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
                float(item.total_score or 0)
                for item in class_student_scores
            )

            class_total_max = sum(
                float(item.max_score or 0)
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
                    "total_max": class_total_max,
                }
            )

        ranking.sort(
            key=lambda item: item["average"],
            reverse=True,
        )

    student_rank = next(
        (
            index + 1
            for index, item in enumerate(ranking)
            if item["student_id"] == student.id
        ),
        "-",
    )

    # =====================================================
    # Homework
    # =====================================================

    homework_rows = (
        db.query(Homework)
        .filter(
            Homework.class_id == student.class_id
        )
        .order_by(Homework.id.desc())
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
                "submitted_at": getattr(
                    item,
                    "submitted_at",
                    None,
                ),
            }
        )

    # =====================================================
    # Schedules
    # =====================================================

    schedule_rows = (
        db.query(Schedule)
        .filter(
            Schedule.class_id == student.class_id
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
                "day": item.day,
                "start_time": item.start_time,
                "end_time": item.end_time,
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
            Attendance.student_id == student.id
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
                Schedule.id == item.schedule_id
            )
            .first()
        )

        attendance.append(
            {
                "id": item.id,
                "student_id": item.student_id,
                "schedule_id": item.schedule_id,
                "date": item.date,
                "status": item.status,
                "remark": item.remark,
                "subject_id": (
                    schedule.subject_id
                    if schedule
                    else None
                ),
                "teacher_id": (
                    schedule.teacher_id
                    if schedule
                    else None
                ),
            }
        )

    # =====================================================
    # Dashboard response
    # =====================================================

    return {
        "student": student_data,
        "rank": {
            "rank": student_rank,
            "total_students": len(ranking),
            "average": round(average, 2),
            "total_score": round(total_score, 2),
            "total_max": round(total_max, 2),
            "month": latest_month,
            "semester": latest_semester,
        },
        "homework": homework,
        "submissions": submissions,
        "scores": scores,
        "schedules": schedules,
        "attendance": attendance,
    }