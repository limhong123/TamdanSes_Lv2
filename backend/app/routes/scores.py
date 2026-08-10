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

# ============================================================
# RESULT FORMULA
# ============================================================
#
# Semester Result =
# Monthly Average 50%
# + Semester Exam 50%
#
# Change this later if your school uses another formula.
#
MONTHLY_WEIGHT = 0.50
EXAM_WEIGHT = 0.50

PASS_SCORE = 50.0


# ============================================================
# HELPERS
# ============================================================

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


def get_student_from_user(user: User, db: Session):
    student = (
        db.query(Student)
        .filter(Student.user_id == user.id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    return student


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
        "max_score": float(
            score.max_score or DEFAULT_MAX_SCORE
        ),

        "remark": score.remark or "",
    }


def calculate_semester_summary(
    student_id: int,
    semester: int,
    db: Session,
):
    monthly_scores = (
        db.query(Score)
        .filter(
            Score.student_id == student_id,
            Score.semester == semester,
            Score.score_type == "monthly",
            Score.month.isnot(None),
        )
        .order_by(
            Score.month.asc(),
            Score.subject_id.asc(),
        )
        .all()
    )

    month_map = {}

    for item in monthly_scores:
        month = int(item.month)

        if month not in month_map:
            month_map[month] = {
                "month": month,
                "total_score": 0.0,
                "total_subjects": 0,
            }

        month_map[month]["total_score"] += float(
            item.total_score or 0
        )
        month_map[month]["total_subjects"] += 1

    months = []

    for month in sorted(month_map):
        item = month_map[month]
        average = (
            item["total_score"] / item["total_subjects"]
            if item["total_subjects"] > 0
            else 0
        )

        months.append({
            "month": month,
            "total_score": round(item["total_score"], 2),
            "total_subjects": item["total_subjects"],
            "average": round(average, 2),
        })

    monthly_average = (
        sum(item["average"] for item in months) / len(months)
        if months
        else 0
    )

    exam_scores = (
        db.query(Score)
        .filter(
            Score.student_id == student_id,
            Score.semester == semester,
            Score.score_type == "semester_exam",
        )
        .all()
    )

    exam_average = (
        sum(float(item.total_score or 0) for item in exam_scores)
        / len(exam_scores)
        if exam_scores
        else None
    )

    # A semester result is final only after the student has both
    # monthly scores and semester exam scores.
    semester_result = None

    if months and exam_average is not None:
        semester_result = (
            monthly_average * MONTHLY_WEIGHT
            + exam_average * EXAM_WEIGHT
        )

    return {
        "semester": semester,
        "months": months,
        "monthly_average": round(monthly_average, 2),
        "exam_average": (
            round(exam_average, 2)
            if exam_average is not None
            else None
        ),
        "semester_result": (
            round(semester_result, 2)
            if semester_result is not None
            else None
        ),
        "exam_subjects_count": len(exam_scores),
        "has_exam": len(exam_scores) > 0,
    }


# ============================================================
# GET SCORES
# Teacher/Admin
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
            Score.subject_id.asc(),
        )
        .all()
    )

    return [
        score_response(record, db)
        for record in records
    ]


# ============================================================
# CREATE / UPDATE SCORE
# Teacher
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

    # ----------------------------------------
    # Validate semester
    # ----------------------------------------

    if data.semester not in [1, 2]:
        raise HTTPException(
            status_code=400,
            detail="Semester must be 1 or 2",
        )

    # ----------------------------------------
    # Validate score type
    # ----------------------------------------

    if data.score_type not in [
        "monthly",
        "semester_exam",
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "score_type must be "
                "monthly or semester_exam"
            ),
        )

    # ----------------------------------------
    # Validate month
    # ----------------------------------------

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

    # ----------------------------------------
    # Check teacher subject assignment
    # ----------------------------------------

    check_teacher_permission(
        teacher=teacher,
        class_id=data.class_id,
        subject_id=data.subject_id,
        db=db,
    )

    # ----------------------------------------
    # Check student
    # ----------------------------------------

    student = (
        db.query(Student)
        .filter(
            Student.id == data.student_id
        )
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

    # ----------------------------------------
    # Calculate score
    # ----------------------------------------

    score_value = float(data.score)
    bonus_value = float(data.bonus or 0)

    total_score = (
        score_value + bonus_value
    )

    if total_score > DEFAULT_MAX_SCORE:
        total_score = DEFAULT_MAX_SCORE

    # ----------------------------------------
    # Find existing score
    # ----------------------------------------

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

    # ----------------------------------------
    # Update existing score
    # ----------------------------------------

    if old_score:
        old_score.teacher_id = teacher.id

        old_score.score = score_value
        old_score.bonus = bonus_value

        old_score.total_score = total_score
        old_score.max_score = DEFAULT_MAX_SCORE

        old_score.remark = data.remark

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

    # ----------------------------------------
    # Create new score
    # ----------------------------------------

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
# DELETE SCORE
# Teacher/Admin
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
# STUDENT MY SCORES
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

    student = get_student_from_user(
        current_user,
        db,
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
# STUDENT MONTHLY RANK
# Used by Student Dashboard
# ============================================================

@router.get("/student/rank")
def my_rank(
    semester: int | None = Query(None),
    month: int | None = Query(None),

    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only student can view this",
        )

    student = get_student_from_user(
        current_user,
        db,
    )

    # ----------------------------------------
    # If frontend does not send month,
    # find student's latest monthly score.
    # ----------------------------------------

    if month is None:
        latest_score = (
            db.query(Score)
            .filter(
                Score.student_id == student.id,
                Score.score_type == "monthly",
                Score.month.isnot(None),
            )
            .order_by(
                Score.semester.desc(),
                Score.month.desc(),
                Score.id.desc(),
            )
            .first()
        )

        if not latest_score:
            return {
                "student_id": student.id,

                "rank": "-",
                "total_students": 0,

                "average": 0,
                "total_score": 0,
                "total_max": 0,
                "total_subjects": 0,

                "month": None,
                "semester": None,
            }

        month = latest_score.month
        semester = latest_score.semester

    # ----------------------------------------
    # If month exists but no semester
    # ----------------------------------------

    if semester is None:
        semester = (
            1
            if month <= 6
            else 2
        )

    if semester not in [1, 2]:
        raise HTTPException(
            status_code=400,
            detail="Semester must be 1 or 2",
        )

    if month not in range(1, 13):
        raise HTTPException(
            status_code=400,
            detail="Month must be between 1 and 12",
        )

    # ----------------------------------------
    # Get classmates
    # ----------------------------------------

    class_students = (
        db.query(Student)
        .filter(
            Student.class_id == student.class_id
        )
        .all()
    )

    ranking = []

    for class_student in class_students:
        scores = (
            db.query(Score)
            .filter(
                Score.student_id == class_student.id,
                Score.class_id == student.class_id,

                Score.semester == semester,
                Score.month == month,

                Score.score_type == "monthly",
            )
            .all()
        )

        total_score = sum(
            float(item.total_score or 0)
            for item in scores
        )

        total_max = sum(
            float(
                item.max_score
                or DEFAULT_MAX_SCORE
            )
            for item in scores
        )

        total_subjects = len(scores)

        average = (
            total_score / total_subjects
            if total_subjects > 0
            else 0
        )

        ranking.append({
            "student_id": class_student.id,

            "average": average,

            "total_score": total_score,
            "total_max": total_max,

            "total_subjects": total_subjects,
        })

    # Do not rank students with no score.
    ranking_with_scores = [
        item
        for item in ranking
        if item["total_subjects"] > 0
    ]

    ranking_with_scores.sort(
        key=lambda item: item["average"],
        reverse=True,
    )

    rank = next(
        (
            index + 1

            for index, item
            in enumerate(
                ranking_with_scores
            )

            if item["student_id"]
            == student.id
        ),
        "-",
    )

    my_result = next(
        (
            item
            for item in ranking

            if item["student_id"]
            == student.id
        ),
        {
            "average": 0,
            "total_score": 0,
            "total_max": 0,
            "total_subjects": 0,
        },
    )

    return {
        "student_id": student.id,

        "rank": rank,
        "total_students": len(
            ranking_with_scores
        ),

        "average": round(
            my_result["average"],
            2,
        ),

        "total_score": my_result[
            "total_score"
        ],

        "total_max": my_result[
            "total_max"
        ],

        "total_subjects": my_result[
            "total_subjects"
        ],

        "month": month,
        "semester": semester,
    }


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

    student = get_student_from_user(
        current_user,
        db,
    )

    return calculate_semester_summary(
        student_id=student.id,
        semester=semester,
        db=db,
    )


# ============================================================
# STUDENT SEMESTER RANK
# Rank students in the same class by semester result.
# ============================================================

@router.get("/student/semester-rank")
def student_semester_rank(
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

    student = get_student_from_user(
        current_user,
        db,
    )

    class_students = (
        db.query(Student)
        .filter(
            Student.class_id == student.class_id
        )
        .all()
    )

    ranking = []

    for class_student in class_students:
        result = calculate_semester_summary(
            student_id=class_student.id,
            semester=semester,
            db=db,
        )

        semester_result = result[
            "semester_result"
        ]

        # Do not rank an incomplete semester.
        if semester_result is None:
            continue

        ranking.append({
            "student_id": class_student.id,
            "semester_result": float(
                semester_result
            ),
            "monthly_average": float(
                result["monthly_average"] or 0
            ),
            "exam_average": (
                float(result["exam_average"])
                if result["exam_average"]
                is not None
                else None
            ),
        })

    # Highest semester result = rank 1
    ranking.sort(
        key=lambda item: item[
            "semester_result"
        ],
        reverse=True,
    )

    my_rank = "-"
    my_result = None

    for index, item in enumerate(
        ranking,
        start=1,
    ):
        if item["student_id"] == student.id:
            my_rank = index
            my_result = item
            break

    if my_result is None:
        return {
            "student_id": student.id,
            "semester": semester,
            "rank": "-",
            "total_students": len(ranking),
            "semester_result": None,
            "monthly_average": None,
            "exam_average": None,
            "complete": False,
        }

    return {
        "student_id": student.id,
        "semester": semester,
        "rank": my_rank,
        "total_students": len(ranking),
        "semester_result": round(
            my_result["semester_result"],
            2,
        ),
        "monthly_average": round(
            my_result["monthly_average"],
            2,
        ),
        "exam_average": (
            round(
                my_result["exam_average"],
                2,
            )
            if my_result["exam_average"]
            is not None
            else None
        ),
        "complete": True,
    }


# ============================================================
# STUDENT YEAR RESULT
# ============================================================

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

    student = get_student_from_user(
        current_user,
        db,
    )

    semester_1 = calculate_semester_summary(
        student_id=student.id,
        semester=1,
        db=db,
    )

    semester_2 = calculate_semester_summary(
        student_id=student.id,
        semester=2,
        db=db,
    )

    semester_1_result = semester_1["semester_result"]
    semester_2_result = semester_2["semester_result"]

    # Final year result requires both completed semesters.
    final_average = None

    if (
        semester_1_result is not None
        and semester_2_result is not None
    ):
        final_average = (
            semester_1_result + semester_2_result
        ) / 2

    status = "-"

    if final_average is not None:
        status = (
            "PASS"
            if final_average >= PASS_SCORE
            else "FAIL"
        )

    return {
        "semester_1": semester_1,
        "semester_2": semester_2,
        "semesters": [semester_1, semester_2],
        "final_average": (
            round(final_average, 2)
            if final_average is not None
            else None
        ),
        "status": status,
        "complete": final_average is not None,
    }
# ============================================================
# STUDENT YEARLY RANK
# Rank students in the same class by final yearly average.
# ============================================================

@router.get("/student/year-rank")
def student_year_rank(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only student can view this",
        )

    student = get_student_from_user(
        current_user,
        db,
    )

    class_students = (
        db.query(Student)
        .filter(
            Student.class_id == student.class_id
        )
        .all()
    )

    ranking = []

    for class_student in class_students:
        semester_1 = calculate_semester_summary(
            student_id=class_student.id,
            semester=1,
            db=db,
        )

        semester_2 = calculate_semester_summary(
            student_id=class_student.id,
            semester=2,
            db=db,
        )

        semester_1_result = semester_1[
            "semester_result"
        ]

        semester_2_result = semester_2[
            "semester_result"
        ]

        # Do not rank incomplete yearly results.
        if (
            semester_1_result is None
            or semester_2_result is None
        ):
            continue

        final_average = (
            semester_1_result
            + semester_2_result
        ) / 2

        ranking.append(
            {
                "student_id": class_student.id,
                "final_average": round(
                    final_average,
                    2,
                ),
                "semester_1_result": (
                    semester_1_result
                ),
                "semester_2_result": (
                    semester_2_result
                ),
            }
        )

    # Highest final average = rank 1
    ranking.sort(
        key=lambda item: item[
            "final_average"
        ],
        reverse=True,
    )

    my_rank = "-"
    my_result = None

    for index, item in enumerate(
        ranking,
        start=1,
    ):
        if item["student_id"] == student.id:
            my_rank = index
            my_result = item
            break

    if my_result is None:
        return {
            "student_id": student.id,
            "rank": "-",
            "total_students": len(ranking),
            "final_average": None,
            "semester_1_result": None,
            "semester_2_result": None,
            "complete": False,
        }

    return {
        "student_id": student.id,

        "rank": my_rank,

        "total_students": len(
            ranking
        ),

        "final_average": (
            my_result[
                "final_average"
            ]
        ),

        "semester_1_result": (
            my_result[
                "semester_1_result"
            ]
        ),

        "semester_2_result": (
            my_result[
                "semester_2_result"
            ]
        ),

        "complete": True,
    }

# ============================================================
# ADMIN MONTHLY CLASS RANKING
# ============================================================

@router.get("/ranking")
def class_ranking(
    class_id: int = Query(...),
    semester: int | None = Query(None),
    month: int | None = Query(None),

    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can view ranking",
        )

    if semester is not None:
        if semester not in [1, 2]:
            raise HTTPException(
                status_code=400,
                detail="Semester must be 1 or 2",
            )

    if month is not None:
        if month not in range(1, 13):
            raise HTTPException(
                status_code=400,
                detail="Month must be between 1 and 12",
            )

    students = (
        db.query(Student)
        .filter(
            Student.class_id == class_id
        )
        .all()
    )

    ranking = []

    for student in students:
        user = (
            db.query(User)
            .filter(
                User.id == student.user_id
            )
            .first()
        )

        query = db.query(Score).filter(
            Score.student_id == student.id,
            Score.class_id == class_id,

            # Important:
            # monthly ranking must not include exam
            Score.score_type == "monthly",
        )

        if semester is not None:
            query = query.filter(
                Score.semester == semester
            )

        if month is not None:
            query = query.filter(
                Score.month == month
            )

        scores = query.all()

        if len(scores) == 0:
            continue

        total_score = sum(
            float(
                score.total_score or 0
            )
            for score in scores
        )

        total_max = sum(
            float(
                score.max_score
                or DEFAULT_MAX_SCORE
            )
            for score in scores
        )

        total_subjects = len(scores)

        average = (
            total_score
            / total_subjects

            if total_subjects > 0
            else 0
        )

        ranking.append({
            "student_id": student.id,

            "student_code": getattr(
                student,
                "student_code",
                None,
            ),

            "student_name": (
                f"{user.first_name} {user.last_name}"
                if user
                else "-"
            ),

            "gender": student.gender,

            "total_score": round(
                total_score,
                2,
            ),

            "total_max": round(
                total_max,
                2,
            ),

            "total_subjects": (
                total_subjects
            ),

            "average": round(
                average,
                2,
            ),
        })

    ranking.sort(
        key=lambda item: item["average"],
        reverse=True,
    )

    for index, item in enumerate(
        ranking,
        start=1,
    ):
        item["rank"] = index

    return ranking


# ============================================================
# ADMIN MONTHS THAT HAVE SCORE
# ============================================================

@router.get("/ranking-months")
def ranking_months(
    class_id: int = Query(...),
    semester: int | None = Query(None),

    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail=(
                "Only admin can view "
                "ranking months"
            ),
        )

    if semester is not None:
        if semester not in [1, 2]:
            raise HTTPException(
                status_code=400,
                detail="Semester must be 1 or 2",
            )

    query = (
        db.query(Score.month)
        .filter(
            Score.class_id == class_id,

            Score.score_type == "monthly",

            Score.month.isnot(None),
        )
    )

    if semester is not None:
        query = query.filter(
            Score.semester == semester
        )

    months = (
        query
        .distinct()
        .order_by(
            Score.month.asc()
        )
        .all()
    )

    return [
        {
            "month": item[0],
        }
        for item in months
        if item[0] is not None
    ]