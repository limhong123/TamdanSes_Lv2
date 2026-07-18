from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.score import Score
from app.models.student import Student
from app.models.user import User
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.models.school_class import SchoolClass
from app.models.class_teacher import ClassTeacher
from app.models.notification import Notification
from app.schemas.score_schema import ScoreCreate
from app.routes.profile import get_current_user
from app.services.notification_service import send_push_notification

router = APIRouter(prefix="/scores", tags=["Scores"])


def score_response(score: Score, db: Session):
    student = db.query(Student).filter(
        Student.id == score.student_id
    ).first()

    student_user = (
        db.query(User).filter(User.id == student.user_id).first()
        if student
        else None
    )

    teacher = db.query(Teacher).filter(
        Teacher.id == score.teacher_id
    ).first()

    teacher_user = (
        db.query(User).filter(User.id == teacher.user_id).first()
        if teacher
        else None
    )

    subject = db.query(Subject).filter(
        Subject.id == score.subject_id
    ).first()

    school_class = db.query(SchoolClass).filter(
        SchoolClass.id == score.class_id
    ).first()

    return {
        "id": score.id,
        "student_id": score.student_id,
        "student_name": (
            f"{student_user.first_name} {student_user.last_name}"
            if student_user
            else "-"
        ),
        "gender": getattr(student, "gender", None) if student else None,
        "class_id": score.class_id,
        "class_name": (
            f"{school_class.name} {school_class.section or ''}".strip()
            if school_class
            else "-"
        ),
        "subject_id": score.subject_id,
        "subject_name": subject.name if subject else "-",
        "teacher_id": score.teacher_id,
        "teacher_name": (
            f"{teacher_user.first_name} {teacher_user.last_name}"
            if teacher_user
            else "-"
        ),
        "semester": score.semester,
        "month": score.month,
        "score": score.score,
        "bonus": score.bonus or 0,
        "total_score": score.total_score,
        "max_score": score.max_score,
        "remark": score.remark,
    }


def get_teacher_from_user(user: User, db: Session):
    teacher = db.query(Teacher).filter(
        Teacher.user_id == user.id
    ).first()

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
    relation = db.query(ClassTeacher).filter(
        ClassTeacher.teacher_id == teacher.id,
        ClassTeacher.class_id == class_id,
        ClassTeacher.subject_id == subject_id,
    ).first()

    if not relation:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this class and subject",
        )


def notify_student_score(score: Score, db: Session):
    student = db.query(Student).filter(
        Student.id == score.student_id
    ).first()

    if not student:
        return

    user = db.query(User).filter(
        User.id == student.user_id
    ).first()

    if not user:
        return

    subject = db.query(Subject).filter(
        Subject.id == score.subject_id
    ).first()

    subject_name = subject.name if subject else "Subject"

    title = f"Score: {subject_name}"

    message = (
        f"Your score has been updated.\n"
        f"Subject: {subject_name}\n"
        f"Score: {score.total_score}/{score.max_score}\n"
        f"Semester: {score.semester}\n"
        f"Month: {score.month}"
    )

    notification = Notification(
        title=title,
        message=message,
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    if user.fcm_token:
        try:
            send_push_notification(
                token=user.fcm_token,
                title=title,
                body=message,
            )
        except Exception as e:
            print("Score notification error:", e)


@router.get("/")
def get_scores(
    class_id: int | None = Query(None),
    semester: int | None = Query(None),
    month: int | None = Query(None),
    student_id: int | None = Query(None),
    subject_id: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Score)

    if current_user.role == "teacher":
        teacher = get_teacher_from_user(current_user, db)

        query = query.filter(
            Score.teacher_id == teacher.id
        )

    elif current_user.role == "admin":
        pass

    else:
        raise HTTPException(
            status_code=403,
            detail="Permission denied",
        )

    if class_id:
        query = query.filter(
            Score.class_id == class_id
        )

    if semester:
        if semester not in [1, 2]:
            raise HTTPException(
                status_code=400,
                detail="Semester must be 1 or 2",
            )

        query = query.filter(
            Score.semester == semester
        )

    if month:
        if month not in range(1, 13):
            raise HTTPException(
                status_code=400,
                detail="Month must be between 1 and 12",
            )

        query = query.filter(
            Score.month == month
        )

    if student_id:
        query = query.filter(
            Score.student_id == student_id
        )

    if subject_id:
        query = query.filter(
            Score.subject_id == subject_id
        )

    scores = query.order_by(
        Score.class_id.asc(),
        Score.student_id.asc(),
        Score.subject_id.asc(),
    ).all()

    return [
        score_response(score, db)
        for score in scores
    ]


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

    if data.month not in range(1, 13):
        raise HTTPException(
            status_code=400,
            detail="Month must be between 1 and 12",
        )

    if data.max_score <= 0:
        raise HTTPException(
            status_code=400,
            detail="Max score must be greater than 0",
        )

    check_teacher_permission(
        teacher=teacher,
        class_id=data.class_id,
        subject_id=data.subject_id,
        db=db,
    )

    student = db.query(Student).filter(
        Student.id == data.student_id
    ).first()

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

    if data.score < 0 or data.score > data.max_score:
        raise HTTPException(
            status_code=400,
            detail=f"Score must be between 0 and {data.max_score}",
        )

    bonus = data.bonus or 0

    if bonus < 0:
        raise HTTPException(
            status_code=400,
            detail="Bonus cannot be negative",
        )

    total_score = data.score + bonus

    if total_score > data.max_score:
        total_score = data.max_score

    old_score = db.query(Score).filter(
        Score.student_id == data.student_id,
        Score.class_id == data.class_id,
        Score.subject_id == data.subject_id,
        Score.semester == data.semester,
        Score.month == data.month,
    ).first()

    if old_score:
        old_score.score = data.score
        old_score.bonus = bonus
        old_score.total_score = total_score
        old_score.max_score = data.max_score
        old_score.remark = data.remark
        old_score.teacher_id = teacher.id

        db.commit()
        db.refresh(old_score)

        notify_student_score(
            old_score,
            db,
        )

        return score_response(
            old_score,
            db,
        )

    score = Score(
        student_id=data.student_id,
        class_id=data.class_id,
        subject_id=data.subject_id,
        teacher_id=teacher.id,
        semester=data.semester,
        month=data.month,
        score=data.score,
        bonus=bonus,
        total_score=total_score,
        max_score=data.max_score,
        remark=data.remark,
    )

    db.add(score)
    db.commit()
    db.refresh(score)

    notify_student_score(
        score,
        db,
    )

    return score_response(
        score,
        db,
    )


@router.delete("/{score_id}")
def delete_score(
    score_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    score = db.query(Score).filter(
        Score.id == score_id
    ).first()

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


@router.get("/student/me")
def my_scores(
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

    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()

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

    scores = query.order_by(
        Score.semester.asc(),
        Score.month.asc(),
    ).all()

    return [
        score_response(score, db)
        for score in scores
    ]


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

    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    if month is None:
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

        if not latest_score:
            return {
                "student_id": student.id,
                "rank": "-",
                "total_students": 0,
                "average": 0,
                "total_score": 0,
                "total_max": 0,
                "month": None,
                "semester": None,
            }

        month = latest_score.month
        semester = latest_score.semester

    if semester is None:
        semester = 1 if month <= 6 else 2

    class_students = db.query(Student).filter(
        Student.class_id == student.class_id
    ).all()

    ranking = []

    for st in class_students:
        scores = db.query(Score).filter(
            Score.student_id == st.id,
            Score.semester == semester,
            Score.month == month,
        ).all()

        total_score = sum(
            float(score.total_score or 0)
            for score in scores
        )

        total_max = sum(
            float(score.max_score or 0)
            for score in scores
        )

        total_subject = len(scores)

        average = (
            total_score / total_subject
            if total_subject > 0
            else 0
        )

        ranking.append(
            {
                "student_id": st.id,
                "average": average,
                "total_score": total_score,
                "total_max": total_max,
            }
        )

    ranking.sort(
        key=lambda item: item["average"],
        reverse=True,
    )

    rank = next(
        (
            index + 1
            for index, item in enumerate(ranking)
            if item["student_id"] == student.id
        ),
        "-",
    )

    my_result = next(
        item
        for item in ranking
        if item["student_id"] == student.id
    )

    return {
        "student_id": student.id,
        "rank": rank,
        "total_students": len(ranking),
        "average": round(my_result["average"], 2),
        "total_score": my_result["total_score"],
        "total_max": my_result["total_max"],
        "month": month,
        "semester": semester,
    }


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

    students = db.query(Student).filter(
        Student.class_id == class_id
    ).all()

    ranking = []

    for student in students:
        user = db.query(User).filter(
            User.id == student.user_id
        ).first()

        query = db.query(Score).filter(
            Score.student_id == student.id,
            Score.class_id == class_id,
        )

        if semester:
            query = query.filter(
                Score.semester == semester
            )

        if month:
            query = query.filter(
                Score.month == month
            )

        scores = query.all()

        total_score = sum(
            float(score.total_score or 0)
            for score in scores
        )

        total_subjects = len(scores)

        average = (
            total_score / total_subjects
            if total_subjects > 0
            else 0
        )

        ranking.append(
            {
                "student_id": student.id,
                "student_code": student.student_code,
                "student_name": (
                    f"{user.first_name} {user.last_name}"
                    if user
                    else "-"
                ),
                "gender": student.gender,
                "total_score": total_score,
                "total_subjects": total_subjects,
                "average": round(average, 2),
            }
        )

    ranking.sort(
        key=lambda item: item["average"],
        reverse=True,
    )

    for index, item in enumerate(ranking):
        item["rank"] = index + 1

    return ranking


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
            detail="Only admin can view ranking months",
        )

    query = db.query(Score.month).filter(
        Score.class_id == class_id
    )

    if semester:
        query = query.filter(
            Score.semester == semester
        )

    months = (
        query
        .distinct()
        .order_by(Score.month.asc())
        .all()
    )

    return [
        {"month": month[0]}
        for month in months
    ]