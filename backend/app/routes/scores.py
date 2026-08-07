from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.class_teacher import ClassTeacher
from app.models.school_class import SchoolClass
from app.models.score import Score
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.user import User
from app.routes.profile import get_current_user
from app.schemas.score_schema import ScoreCreate


router = APIRouter(
    prefix="/scores",
    tags=["Scores"],
)


DEFAULT_MAX_SCORE = 100.0

# Change these if your school uses another formula.
MONTHLY_WEIGHT = 0.50
EXAM_WEIGHT = 0.50

PASS_SCORE = 50.0


def get_teacher_from_user(user: User, db: Session):
    teacher = (
        db.query(Teacher)
        .filter(Teacher.user_id == user.id)
        .first()
    )

    if not teacher:
        raise HTTPException(
            status_code=404,
            detail="Teacher profile not found",
        )

    return teacher


def check_teacher_permission(
    teacher: Teacher,
    class_id: int,
    subject_id: int,
    db: Session,
):
    relation = (
        db.query(ClassTeacher)
        .filter(
            ClassTeacher.teacher_id == teacher.id,
            ClassTeacher.class_id == class_id,
            ClassTeacher.subject_id == subject_id,
        )
        .first()
    )

    if not relation:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this class and subject",
        )


def score_response(score: Score, db: Session):
    student = (
        db.query(Student)
        .filter(Student.id == score.student_id)
        .first()
    )

    student_user = (
        db.query(User)
        .filter(User.id == student.user_id)
        .first()
        if student
        else None
    )

    teacher = (
        db.query(Teacher)
        .filter(Teacher.id == score.teacher_id)
        .first()
    )

    teacher_user = (
        db.query(User)
        .filter(User.id == teacher.user_id)
        .first()
        if teacher
        else None
    )

    subject = (
        db.query(Subject)
        .filter(Subject.id == score.subject_id)
        .first()
    )

    school_class = (
        db.query(SchoolClass)
        .filter(SchoolClass.id == score.class_id)
        .first()
    )

    return {
        "id": score.id,

        "student_id": score.student_id,
        "student_name": (
            f"{student_user.first_name} {student_user.last_name}"
            if student_user
            else "-"
        ),

        "class_id": score.class_id,
        "class_name": (
            f"{school_class.name} {school_class.section or ''}".strip()
            if school_class
            else "-"
        ),

        "subject_id": score.subject_id,
        "subject_name": (
            subject.name
            if subject
            else "-"
        ),

        "teacher_id": score.teacher_id,
        "teacher_name": (
            f"{teacher_user.first_name} {teacher_user.last_name}"
            if teacher_user
            else "-"
        ),

        "semester": score.semester,
        "month": score.month,

        "score_type": score.score_type,

        "score": float(score.score or 0),
        "bonus": float(score.bonus or 0),
        "total_score": float(score.total_score or 0),
        "max_score": float(score.max_score or DEFAULT_MAX_SCORE),

        "remark": score.remark,
    }


# ============================================================
# GET SCORES
# ============================================================

@router.get("/")
def get_scores(
    class_id: int | None = Query(None),
    semester: int | None = Query(None),
    month: int | None = Query(None),
    subject_id: int | None = Query(None),
    student_id: int | None = Query(None),
    score_type: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Score)

    if current_user.role == "teacher":
        teacher = get_teacher_from_user(
            current_user,
            db,
        )

        query = query.filter(
            Score.teacher_id == teacher.id
        )

    elif current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Permission denied",
        )

    if class_id is not None:
        query = query.filter(
            Score.class_id == class_id
        )

    if semester is not None:
        query = query.filter(
            Score.semester == semester
        )

    if month is not None:
        query = query.filter(
            Score.month == month
        )

    if subject_id is not None:
        query = query.filter(
            Score.subject_id == subject_id
        )

    if student_id is not None:
        query = query.filter(
            Score.student_id == student_id
        )

    if score_type is not None:
        query = query.filter(
            Score.score_type == score_type
        )

    records = (
        query
        .order_by(
            Score.semester.asc(),
            Score.month.asc().nullslast(),
            Score.student_id.asc(),
        )
        .all()
    )

    return [
        score_response(record, db)
        for record in records
    ]


# ============================================================
# CREATE / UPDATE SCORE
# ============================================================

@router.post("/")
def create_score(
    data: ScoreCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=403,
            detail="Only teacher can add score",
        )

    teacher = get_teacher_from_user(
        current_user,
        db,
    )

    if data.semester not in [1, 2]:
        raise HTTPException(
            status_code=400,
            detail="Semester must be 1 or 2",
        )

    if data.score_type not in [
        "monthly",
        "semester_exam",
    ]:
        raise HTTPException(
            status_code=400,
            detail="score_type must be monthly or semester_exam",
        )

    if data.score_type == "monthly":
        if data.month is None:
            raise HTTPException(
                status_code=400,
                detail="Month is required for monthly score",
            )

        if data.month not in range(1, 13):
            raise HTTPException(
                status_code=400,
                detail="Month must be between 1 and 12",
            )

    check_teacher_permission(
        teacher=teacher,
        class_id=data.class_id,
        subject_id=data.subject_id,
        db=db,
    )

    student = (
        db.query(Student)
        .filter(Student.id == data.student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    if student.class_id != data.class_id:
        raise HTTPException(
            status_code=400,
            detail="Student is not in this class",
        )

    score_value = float(data.score)
    bonus_value = float(data.bonus or 0)

    total_score = score_value + bonus_value

    if total_score > DEFAULT_MAX_SCORE:
        total_score = DEFAULT_MAX_SCORE

    query = db.query(Score).filter(
        Score.student_id == data.student_id,
        Score.class_id == data.class_id,
        Score.subject_id == data.subject_id,
        Score.semester == data.semester,
        Score.score_type == data.score_type,
    )

    if data.score_type == "monthly":
        query = query.filter(
            Score.month == data.month
        )
    else:
        query = query.filter(
            Score.month.is_(None)
        )

    old_score = query.first()

    if old_score:
        old_score.score = score_value
        old_score.bonus = bonus_value
        old_score.total_score = total_score
        old_score.max_score = DEFAULT_MAX_SCORE
        old_score.remark = data.remark
        old_score.teacher_id = teacher.id

        if data.score_type == "monthly":
            old_score.month = data.month
        else:
            old_score.month = None

        db.commit()
        db.refresh(old_score)

        return score_response(
            old_score,
            db,
        )

    new_score = Score(
        student_id=data.student_id,
        class_id=data.class_id,
        subject_id=data.subject_id,
        teacher_id=teacher.id,

        semester=data.semester,
        month=(
            data.month
            if data.score_type == "monthly"
            else None
        ),

        score_type=data.score_type,

        score=score_value,
        bonus=bonus_value,
        total_score=total_score,
        max_score=DEFAULT_MAX_SCORE,

        remark=data.remark,
    )

    db.add(new_score)
    db.commit()
    db.refresh(new_score)

    return score_response(
        new_score,
        db,
    )


# ============================================================
# DELETE
# ============================================================

@router.delete("/{score_id}")
def delete_score(
    score_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    score = (
        db.query(Score)
        .filter(Score.id == score_id)
        .first()
    )

    if not score:
        raise HTTPException(
            status_code=404,
            detail="Score not found",
        )

    if current_user.role == "teacher":
        teacher = get_teacher_from_user(
            current_user,
            db,
        )

        if score.teacher_id != teacher.id:
            raise HTTPException(
                status_code=403,
                detail="Permission denied",
            )

    elif current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Permission denied",
        )

    db.delete(score)
    db.commit()

    return {
        "message": "Score deleted successfully",
    }


# ============================================================
# STUDENT SCORES
# ============================================================

@router.get("/student/me")
def my_scores(
    semester: int | None = Query(None),
    month: int | None = Query(None),
    score_type: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only student can view this",
        )

    student = (
        db.query(Student)
        .filter(
            Student.user_id == current_user.id
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    query = db.query(Score).filter(
        Score.student_id == student.id
    )

    if semester is not None:
        query = query.filter(
            Score.semester == semester
        )

    if month is not None:
        query = query.filter(
            Score.month == month
        )

    if score_type is not None:
        query = query.filter(
            Score.score_type == score_type
        )

    records = (
        query
        .order_by(
            Score.semester.asc(),
            Score.month.asc().nullslast(),
            Score.subject_id.asc(),
        )
        .all()
    )

    return [
        score_response(record, db)
        for record in records
    ]


# ============================================================
# STUDENT SEMESTER RESULT
# ============================================================

@router.get("/student/semester-result")
def student_semester_result(
    semester: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only student can view this",
        )

    if semester not in [1, 2]:
        raise HTTPException(
            status_code=400,
            detail="Semester must be 1 or 2",
        )

    student = (
        db.query(Student)
        .filter(Student.user_id == current_user.id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    subjects = (
        db.query(Subject)
        .join(
            Score,
            Score.subject_id == Subject.id,
        )
        .filter(
            Score.student_id == student.id,
            Score.semester == semester,
        )
        .distinct()
        .all()
    )

    results = []

    for subject in subjects:
        monthly_scores = (
            db.query(Score)
            .filter(
                Score.student_id == student.id,
                Score.subject_id == subject.id,
                Score.semester == semester,
                Score.score_type == "monthly",
            )
            .all()
        )

        exam = (
            db.query(Score)
            .filter(
                Score.student_id == student.id,
                Score.subject_id == subject.id,
                Score.semester == semester,
                Score.score_type == "semester_exam",
            )
            .first()
        )

        monthly_average = 0

        if monthly_scores:
            monthly_average = sum(
                float(item.total_score or 0)
                for item in monthly_scores
            ) / len(monthly_scores)

        exam_score = (
            float(exam.total_score or 0)
            if exam
            else 0
        )

        semester_result = (
            monthly_average * MONTHLY_WEIGHT
            + exam_score * EXAM_WEIGHT
        )

        results.append({
            "subject_id": subject.id,
            "subject_name": subject.name,

            "monthly_average": round(
                monthly_average,
                2,
            ),

            "exam_score": round(
                exam_score,
                2,
            ),

            "semester_result": round(
                semester_result,
                2,
            ),

            "months_count": len(
                monthly_scores
            ),
        })

    overall_average = (
        sum(
            item["semester_result"]
            for item in results
        ) / len(results)
        if results
        else 0
    )

    return {
        "semester": semester,
        "average": round(
            overall_average,
            2,
        ),
        "subjects": results,
    }


# ============================================================
# STUDENT YEAR RESULT
# ============================================================

def calculate_subject_semester(
    student_id: int,
    subject_id: int,
    semester: int,
    db: Session,
):
    monthly_scores = (
        db.query(Score)
        .filter(
            Score.student_id == student_id,
            Score.subject_id == subject_id,
            Score.semester == semester,
            Score.score_type == "monthly",
        )
        .all()
    )

    exam = (
        db.query(Score)
        .filter(
            Score.student_id == student_id,
            Score.subject_id == subject_id,
            Score.semester == semester,
            Score.score_type == "semester_exam",
        )
        .first()
    )

    if not monthly_scores and not exam:
        return None

    monthly_average = (
        sum(
            float(item.total_score or 0)
            for item in monthly_scores
        ) / len(monthly_scores)
        if monthly_scores
        else 0
    )

    exam_score = (
        float(exam.total_score or 0)
        if exam
        else 0
    )

    return (
        monthly_average * MONTHLY_WEIGHT
        + exam_score * EXAM_WEIGHT
    )


@router.get("/student/year-result")
def student_year_result(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only student can view this",
        )

    student = (
        db.query(Student)
        .filter(Student.user_id == current_user.id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    subject_ids = [
        item[0]
        for item in (
            db.query(Score.subject_id)
            .filter(
                Score.student_id == student.id
            )
            .distinct()
            .all()
        )
    ]

    results = []

    for subject_id in subject_ids:
        subject = (
            db.query(Subject)
            .filter(Subject.id == subject_id)
            .first()
        )

        semester_1 = calculate_subject_semester(
            student.id,
            subject_id,
            1,
            db,
        )

        semester_2 = calculate_subject_semester(
            student.id,
            subject_id,
            2,
            db,
        )

        available = [
            score
            for score in [
                semester_1,
                semester_2,
            ]
            if score is not None
        ]

        final_result = (
            sum(available) / len(available)
            if available
            else 0
        )

        results.append({
            "subject_id": subject_id,
            "subject_name": (
                subject.name
                if subject
                else "-"
            ),
            "semester_1": (
                round(semester_1, 2)
                if semester_1 is not None
                else None
            ),
            "semester_2": (
                round(semester_2, 2)
                if semester_2 is not None
                else None
            ),
            "final_result": round(
                final_result,
                2,
            ),
        })

    final_average = (
        sum(
            item["final_result"]
            for item in results
        ) / len(results)
        if results
        else 0
    )

    status = (
        "PASS"
        if final_average >= PASS_SCORE
        else "FAIL"
    )

    return {
        "final_average": round(
            final_average,
            2,
        ),
        "status": status,
        "subjects": results,
    }