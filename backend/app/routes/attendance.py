from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from app.database.db import get_db
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.user import User
from app.models.teacher import Teacher
from app.models.schedule import Schedule
from app.models.subject import Subject
from app.models.permission_request import PermissionRequest
from app.models.school_class import SchoolClass
from app.models.notification import Notification

from app.schemas.attendance_schema import AttendanceSave
from app.routes.profile import get_current_user
from app.services.notification_service import send_push_notification


router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)


VALID_STATUSES = [
    "P",
    "A",
    "L",
    "E",
    "Permission"
]


# =========================================================
# GET TEACHER FROM CURRENT USER
# =========================================================

def get_teacher_from_user(
    user: User,
    db: Session
):
    teacher = (
        db.query(Teacher)
        .filter(
            Teacher.user_id == user.id
        )
        .first()
    )

    if not teacher:
        raise HTTPException(
            status_code=404,
            detail="Teacher profile not found"
        )

    return teacher


# =========================================================
# GET SCHEDULE
# =========================================================

def get_schedule_or_404(
    schedule_id: int,
    db: Session
):
    schedule = (
        db.query(Schedule)
        .filter(
            Schedule.id == schedule_id
        )
        .first()
    )

    if not schedule:
        raise HTTPException(
            status_code=404,
            detail="Schedule not found"
        )

    return schedule


# =========================================================
# CHECK TEACHER PERMISSION
# =========================================================

def check_teacher_schedule_permission(
    user: User,
    schedule: Schedule,
    db: Session
):
    # Admin can manage everything
    if user.role == "admin":
        return True

    # Only teacher or admin can manage attendance
    if user.role != "teacher":
        raise HTTPException(
            status_code=403,
            detail="Permission denied"
        )

    teacher = get_teacher_from_user(
        user,
        db
    )

    # Teacher can manage only own schedule
    if schedule.teacher_id != teacher.id:
        raise HTTPException(
            status_code=403,
            detail="You can manage attendance only for your own schedule"
        )

    return True


# =========================================================
# ATTENDANCE RESPONSE
# =========================================================

def attendance_response(
    attendance: Attendance,
    db: Session
):
    schedule = (
        db.query(Schedule)
        .filter(
            Schedule.id == attendance.schedule_id
        )
        .first()
    )

    subject = None
    school_class = None
    teacher_name = "-"

    if schedule:
        subject = (
            db.query(Subject)
            .filter(
                Subject.id == schedule.subject_id
            )
            .first()
        )

        school_class = (
            db.query(SchoolClass)
            .filter(
                SchoolClass.id == schedule.class_id
            )
            .first()
        )

        teacher = (
            db.query(Teacher)
            .filter(
                Teacher.id == schedule.teacher_id
            )
            .first()
        )

        teacher_user = None

        if teacher:
            teacher_user = (
                db.query(User)
                .filter(
                    User.id == teacher.user_id
                )
                .first()
            )

        if teacher_user:
            teacher_name = (
                f"{teacher_user.first_name} "
                f"{teacher_user.last_name}"
            )

    class_name = "-"

    if school_class:
        class_name = (
            f"{school_class.name} "
            f"{school_class.section or ''}"
        ).strip()

    return {
        "id": attendance.id,

        "student_id": attendance.student_id,

        "schedule_id": attendance.schedule_id,

        "class_id": (
            schedule.class_id
            if schedule
            else None
        ),

        "class_name": class_name,

        "subject_id": (
            schedule.subject_id
            if schedule
            else None
        ),

        "subject_name": (
            subject.name
            if subject
            else "-"
        ),

        "teacher_id": (
            schedule.teacher_id
            if schedule
            else None
        ),

        "teacher_name": teacher_name,

        "date": str(
            attendance.date
        ),

        "day": (
            schedule.day
            if schedule
            else "-"
        ),

        "start_time": (
            str(schedule.start_time)
            if schedule
            else "-"
        ),

        "end_time": (
            str(schedule.end_time)
            if schedule
            else "-"
        ),

        "status": attendance.status,

        "remark": (
            getattr(
                attendance,
                "remark",
                None
            )
            or "-"
        )
    }


# =========================================================
# FIND STUDENT PERMISSION REQUEST
# =========================================================

def find_permission(
    student_id: int,
    schedule: Schedule,
    schedule_id: int,
    target_date: date,
    db: Session
):
    permission = (
        db.query(PermissionRequest)
        .filter(
            PermissionRequest.student_id == student_id,

            PermissionRequest.class_id == schedule.class_id,

            PermissionRequest.status.in_(
                [
                    "pending",
                    "approved"
                ]
            ),

            PermissionRequest.start_date <= target_date,

            PermissionRequest.end_date >= target_date,

            (
                (
                    PermissionRequest.schedule_id
                    == schedule_id
                )
                |
                (
                    PermissionRequest.schedule_id.is_(
                        None
                    )
                )
            )
        )
        .first()
    )

    return permission


# =========================================================
# BUILD ATTENDANCE NOTIFICATION
# =========================================================

def build_attendance_notification(
    student: Student,
    schedule: Schedule,
    status: str,
    remark: str | None,
    attendance_date: date,
    db: Session
):
    # Send notification only for
    # Absent and Permission
    if status not in [
        "A",
        "Permission"
    ]:
        return None

    user = (
        db.query(User)
        .filter(
            User.id == student.user_id
        )
        .first()
    )

    if not user:
        return None

    subject = (
        db.query(Subject)
        .filter(
            Subject.id == schedule.subject_id
        )
        .first()
    )

    school_class = (
        db.query(SchoolClass)
        .filter(
            SchoolClass.id == schedule.class_id
        )
        .first()
    )

    subject_name = (
        subject.name
        if subject
        else "Subject"
    )

    if school_class:
        class_name = (
            f"{school_class.name} "
            f"{school_class.section or ''}"
        ).strip()
    else:
        class_name = "Class"

    # -------------------------
    # ABSENT
    # -------------------------

    if status == "A":
        title = "Attendance: Absent"

        message = (
            f"You were marked absent.\n"
            f"Subject: {subject_name}\n"
            f"Class: {class_name}\n"
            f"Date: {attendance_date}"
        )

    # -------------------------
    # PERMISSION
    # -------------------------

    else:
        title = "Attendance: Permission"

        message = (
            f"You were marked as permission.\n"
            f"Subject: {subject_name}\n"
            f"Class: {class_name}\n"
            f"Date: {attendance_date}\n"
            f"Reason: {remark or '-'}"
        )

    notification = Notification(
        title=title,
        message=message
    )

    db.add(notification)

    return {
        "user": user,
        "title": title,
        "message": message
    }


# =========================================================
# SEND PUSH NOTIFICATION
# =========================================================

def send_attendance_push_notifications(
    push_items: list[dict]
):
    for item in push_items:
        user = item["user"]

        # Student doesn't have FCM token
        if not user.fcm_token:
            continue

        try:
            send_push_notification(
                token=user.fcm_token,
                title=item["title"],
                body=item["message"]
            )

        except Exception as e:
            print(
                "Attendance FCM error:",
                e
            )


# =========================================================
# GET ATTENDANCE BY SCHEDULE
#
# Teacher/Admin use this endpoint
# =========================================================

@router.get("/schedule/{schedule_id}")
def get_schedule_attendance(
    schedule_id: int,
    attendance_date: date,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    )
):
    # Get schedule
    schedule = get_schedule_or_404(
        schedule_id,
        db
    )

    # Check teacher permission
    check_teacher_schedule_permission(
        current_user,
        schedule,
        db
    )

    # Get all students in this class
    students = (
        db.query(Student)
        .filter(
            Student.class_id
            == schedule.class_id
        )
        .all()
    )

    # Check whether attendance
    # was already saved
    saved_count = (
        db.query(Attendance)
        .filter(
            Attendance.schedule_id
            == schedule_id,

            Attendance.date
            == attendance_date
        )
        .count()
    )

    locked = saved_count > 0

    result = []

    # =====================================================
    # LOOP STUDENTS
    # =====================================================

    for student in students:
        user = (
            db.query(User)
            .filter(
                User.id
                == student.user_id
            )
            .first()
        )

        # Check existing attendance
        attendance = (
            db.query(Attendance)
            .filter(
                Attendance.student_id
                == student.id,

                Attendance.schedule_id
                == schedule_id,

                Attendance.date
                == attendance_date
            )
            .first()
        )

        # Check permission request
        permission = find_permission(
            student_id=student.id,
            schedule=schedule,
            schedule_id=schedule_id,
            target_date=attendance_date,
            db=db
        )

        # -------------------------
        # Existing attendance
        # -------------------------

        if attendance:
            status = attendance.status

            remark = (
                getattr(
                    attendance,
                    "remark",
                    None
                )
                or "-"
            )

        # -------------------------
        # Permission
        # -------------------------

        elif permission:
            status = "Permission"

            remark = (
                permission.reason
                or "-"
            )

        # -------------------------
        # Default present
        # -------------------------

        else:
            status = "P"
            remark = "-"

        student_name = "-"

        if user:
            student_name = (
                f"{user.first_name} "
                f"{user.last_name}"
            ).strip()

        result.append(
            {
                "student_id": student.id,

                "student_name": student_name,

                "gender": student.gender,

                "permission_reason": (
                    permission.reason
                    if permission
                    else "-"
                ),

                "status": status,

                "remark": remark
            }
        )

    # =====================================================
    # RETURN
    # =====================================================

    return {
        "locked": locked,

        "schedule": {
            "id": schedule.id,

            "class_id": (
                schedule.class_id
            ),

            "subject_id": (
                schedule.subject_id
            ),

            "teacher_id": (
                schedule.teacher_id
            ),

            "day": (
                schedule.day
            ),

            "start_time": str(
                schedule.start_time
            ),

            "end_time": str(
                schedule.end_time
            )
        },

        "students": result
    }


# =========================================================
# SAVE ATTENDANCE
#
# Teacher/Admin use this endpoint
# =========================================================

@router.post("/save")
def save_attendance(
    data: AttendanceSave,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    )
):
    # =====================================================
    # GET SCHEDULE
    # =====================================================

    schedule = get_schedule_or_404(
        data.schedule_id,
        db
    )

    # =====================================================
    # CHECK TEACHER PERMISSION
    # =====================================================

    check_teacher_schedule_permission(
        current_user,
        schedule,
        db
    )

    # =====================================================
    # CHECK IF ALREADY SAVED
    # =====================================================

    old_attendance = (
        db.query(Attendance)
        .filter(
            Attendance.schedule_id
            == data.schedule_id,

            Attendance.date
            == data.date
        )
        .first()
    )

    if old_attendance:
        raise HTTPException(
            status_code=400,
            detail=(
                "Attendance already submitted "
                "for this schedule and date"
            )
        )

    # Push notifications
    push_items = []

    # =====================================================
    # SAVE EACH STUDENT
    # =====================================================

    for item in data.items:

        # -------------------------------------------------
        # VALIDATE STATUS
        # -------------------------------------------------

        if item.status not in VALID_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Status must be one of "
                    "P, A, L, E, Permission"
                )
            )

        # -------------------------------------------------
        # GET STUDENT
        # -------------------------------------------------

        student = (
            db.query(Student)
            .filter(
                Student.id
                == item.student_id
            )
            .first()
        )

        if not student:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Student "
                    f"{item.student_id} "
                    f"not found"
                )
            )

        # -------------------------------------------------
        # CHECK STUDENT CLASS
        # -------------------------------------------------

        if student.class_id != schedule.class_id:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Student "
                    f"{item.student_id} "
                    f"does not belong "
                    f"to this class"
                )
            )

        status = item.status

        remark = getattr(
            item,
            "remark",
            None
        )

        permission = None

        # =================================================
        # PERMISSION
        # =================================================

        if status == "Permission":

            permission = find_permission(
                student_id=student.id,

                schedule=schedule,

                schedule_id=data.schedule_id,

                target_date=data.date,

                db=db
            )

            # Existing permission request
            if permission:

                remark = (
                    permission.reason
                    or "Permission"
                )

                # Auto approve permission
                permission.status = "approved"

                # Admin may save attendance too
                if current_user.role == "teacher":
                    teacher = get_teacher_from_user(
                        current_user,
                        db
                    )

                    permission.teacher_id = teacher.id

            # Manual Permission
            elif not remark:

                remark = "Permission"

        # =================================================
        # CREATE ATTENDANCE
        # =================================================

        attendance = Attendance(
            student_id=item.student_id,

            schedule_id=data.schedule_id,

            date=data.date,

            status=status,

            remark=remark
        )

        db.add(attendance)

        # =================================================
        # CREATE NOTIFICATION
        # =================================================

        push_item = (
            build_attendance_notification(
                student=student,

                schedule=schedule,

                status=status,

                remark=remark,

                attendance_date=data.date,

                db=db
            )
        )

        if push_item:
            push_items.append(
                push_item
            )

    # =====================================================
    # SAVE TO DATABASE
    # =====================================================

    try:
        db.commit()

    except Exception as e:
        db.rollback()

        print(
            "Attendance save error:",
            e
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to save attendance"
        )

    # =====================================================
    # SEND PUSH AFTER DATABASE COMMIT
    # =====================================================

    send_attendance_push_notifications(
        push_items
    )

    return {
        "message": (
            "Attendance saved successfully"
        )
    }


# =========================================================
# STUDENT - MY ATTENDANCE
#
# GET /attendance/me
# =========================================================

@router.get("/me")
def my_attendance(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    )
):
    # =====================================================
    # ONLY STUDENT
    # =====================================================

    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only student can view this"
        )

    # =====================================================
    # FIND STUDENT PROFILE FROM LOGIN USER
    # =====================================================

    student = (
        db.query(Student)
        .filter(
            Student.user_id
            == current_user.id
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found"
        )

    # =====================================================
    # GET THIS STUDENT ATTENDANCE
    # =====================================================

    records = (
        db.query(Attendance)
        .filter(
            Attendance.student_id
            == student.id
        )
        .order_by(
            Attendance.date.desc(),
            Attendance.id.desc()
        )
        .all()
    )

    # =====================================================
    # RETURN RESULT
    # =====================================================

    return [
        attendance_response(
            record,
            db
        )
        for record in records
    ]