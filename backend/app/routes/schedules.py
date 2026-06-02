from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.schedule import Schedule
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.user import User
from app.models.student import Student
from app.schemas.schedule_schema import ScheduleCreate
from app.routes.profile import get_current_user

router = APIRouter(prefix="/schedules", tags=["Schedules"])


def schedule_response(s: Schedule, db: Session):
    school_class = db.query(SchoolClass).filter(SchoolClass.id == s.class_id).first()
    subject = db.query(Subject).filter(Subject.id == s.subject_id).first()
    teacher = db.query(Teacher).filter(Teacher.id == s.teacher_id).first()

    teacher_name = "-"
    if teacher:
        user = db.query(User).filter(User.id == teacher.user_id).first()
        if user:
            teacher_name = f"{user.first_name} {user.last_name}"

    return {
        "id": s.id,
        "class_id": s.class_id,
        "class_name": f"{school_class.name} {school_class.section or ''}" if school_class else "-",
        "subject_id": s.subject_id,
        "subject_name": subject.name if subject else "-",
        "teacher_id": s.teacher_id,
        "teacher_name": teacher_name,
        "day": s.day,
        "start_time": str(s.start_time),
        "end_time": str(s.end_time),
    }


def check_conflict(data: ScheduleCreate, db: Session, schedule_id: int = None):
    query = db.query(Schedule).filter(
        Schedule.day == data.day,
        Schedule.start_time < data.end_time,
        Schedule.end_time > data.start_time,
    )

    if schedule_id:
        query = query.filter(Schedule.id != schedule_id)

    schedules = query.all()

    for s in schedules:
        if s.teacher_id == data.teacher_id:
            raise HTTPException(
                status_code=400,
                detail="Teacher already has schedule at this time",
            )

        if s.class_id == data.class_id:
            raise HTTPException(
                status_code=400,
                detail="Class already has schedule at this time",
            )

        if data.room and s.room == data.room:
            raise HTTPException(
                status_code=400,
                detail="Room already used at this time",
            )


@router.get("/")
def get_schedules(db: Session = Depends(get_db)):
    schedules = db.query(Schedule).all()
    return [schedule_response(s, db) for s in schedules]


@router.post("/")
def create_schedule(data: ScheduleCreate, db: Session = Depends(get_db)):
    check_conflict(data, db)

    schedule = Schedule(**data.model_dump())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    return schedule_response(schedule, db)


@router.put("/{schedule_id}")
def update_schedule(
    schedule_id: int,
    data: ScheduleCreate,
    db: Session = Depends(get_db),
):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    check_conflict(data, db, schedule_id)

    for key, value in data.model_dump().items():
        setattr(schedule, key, value)

    db.commit()
    db.refresh(schedule)

    return schedule_response(schedule, db)


@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    db.delete(schedule)
    db.commit()

    return {"message": "Schedule deleted successfully"}


@router.get("/teacher/me")
def teacher_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teacher can view this")

    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    schedules = db.query(Schedule).filter(Schedule.teacher_id == teacher.id).all()

    return [schedule_response(s, db) for s in schedules]


@router.get("/student/me")
def student_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only student can view this")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    schedules = db.query(Schedule).filter(Schedule.class_id == student.class_id).all()

    return [schedule_response(s, db) for s in schedules]