import secrets
import math
from datetime import (
    date,
    datetime,
    timedelta,
)

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy.orm import Session

from app.database.db import get_db

from app.models.attendance import Attendance
from app.models.attendance_scan_session import (
    AttendanceScanSession,
)
from app.models.student import Student
from app.models.user import User
from app.models.teacher import Teacher
from app.models.schedule import Schedule
from app.models.subject import Subject
from app.models.permission_request import (
    PermissionRequest,
)
from app.models.school_class import SchoolClass
from app.models.notification import Notification

from app.schemas.attendance_schema import (
    AttendanceSave,
    AttendanceScanSessionCreate,
    AttendanceScanRequest,
)

from app.routes.profile import get_current_user

from app.services.notification_service import (
    send_push_notification,
)


router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"],
)


VALID_STATUSES = [
    "P",
    "A",
    "L",
    "E",
    "Permission",
]

# ============================================================
# LOCATION DISTANCE
# ============================================================

def calculate_distance_meters(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Calculate GPS distance using Haversine formula.
    Returns distance in meters.
    """

    earth_radius_m = 6371000

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)

    delta_phi = math.radians(
        lat2 - lat1
    )

    delta_lambda = math.radians(
        lon2 - lon1
    )

    a = (
        math.sin(delta_phi / 2) ** 2
        +
        math.cos(phi1)
        * math.cos(phi2)
        * math.sin(delta_lambda / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a),
    )

    return earth_radius_m * c

# ============================================================
# GET TEACHER FROM CURRENT USER
# ============================================================

def get_teacher_from_user(
    user: User,
    db: Session,
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
            detail="Teacher profile not found",
        )

    return teacher


# ============================================================
# GET SCHEDULE
# ============================================================

def get_schedule_or_404(
    schedule_id: int,
    db: Session,
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
            detail="Schedule not found",
        )

    return schedule


# ============================================================
# CHECK TEACHER SCHEDULE PERMISSION
# ============================================================

def check_teacher_schedule_permission(
    user: User,
    schedule: Schedule,
    db: Session,
):
    # Admin can manage all schedules
    if user.role == "admin":
        return True

    if user.role != "teacher":
        raise HTTPException(
            status_code=403,
            detail="Permission denied",
        )

    teacher = get_teacher_from_user(
        user,
        db,
    )

    # Teacher can manage only own schedule
    if schedule.teacher_id != teacher.id:
        raise HTTPException(
            status_code=403,
            detail=(
                "You can manage attendance "
                "only for your own schedule"
            ),
        )

    return True


# ============================================================
# ATTENDANCE RESPONSE
# ============================================================

def attendance_response(
    attendance: Attendance,
    db: Session,
):
    schedule = (
        db.query(Schedule)
        .filter(
            Schedule.id
            == attendance.schedule_id
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
                Subject.id
                == schedule.subject_id
            )
            .first()
        )

        school_class = (
            db.query(SchoolClass)
            .filter(
                SchoolClass.id
                == schedule.class_id
            )
            .first()
        )

        teacher = (
            db.query(Teacher)
            .filter(
                Teacher.id
                == schedule.teacher_id
            )
            .first()
        )

        teacher_user = None

        if teacher:
            teacher_user = (
                db.query(User)
                .filter(
                    User.id
                    == teacher.user_id
                )
                .first()
            )

        if teacher_user:
            teacher_name = (
                f"{teacher_user.first_name} "
                f"{teacher_user.last_name}"
            ).strip()

    class_name = "-"

    if school_class:
        class_name = (
            f"{school_class.name} "
            f"{school_class.section or ''}"
        ).strip()

    return {
        "id": attendance.id,

        "student_id":
            attendance.student_id,

        "schedule_id":
            attendance.schedule_id,

        "class_id": (
            schedule.class_id
            if schedule
            else None
        ),

        "class_name":
            class_name,

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

        "teacher_name":
            teacher_name,

        "date":
            str(attendance.date),

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

        "status":
            attendance.status,

        "remark": (
            getattr(
                attendance,
                "remark",
                None,
            )
            or "-"
        ),
    }


# ============================================================
# FIND PERMISSION
# ============================================================

def find_permission(
    student_id: int,
    schedule: Schedule,
    schedule_id: int,
    target_date: date,
    db: Session,
):
    permission = (
        db.query(PermissionRequest)
        .filter(
            PermissionRequest.student_id
            == student_id,

            PermissionRequest.class_id
            == schedule.class_id,

            PermissionRequest.status.in_(
                [
                    "pending",
                    "approved",
                ]
            ),

            PermissionRequest.start_date
            <= target_date,

            PermissionRequest.end_date
            >= target_date,

            (
                (
                    PermissionRequest.schedule_id
                    == schedule_id
                )
                |
                (
                    PermissionRequest.schedule_id
                    .is_(None)
                )
            ),
        )
        .first()
    )

    return permission


# ============================================================
# BUILD ATTENDANCE NOTIFICATION
# ============================================================

def build_attendance_notification(
    student: Student,
    schedule: Schedule,
    status: str,
    remark: str | None,
    attendance_date: date,
    db: Session,
):
    if status not in [
        "A",
        "Permission",
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

    if status == "A":
        title = "Attendance: Absent"

        message = (
            f"You were marked absent.\n"
            f"Subject: {subject_name}\n"
            f"Class: {class_name}\n"
            f"Date: {attendance_date}"
        )

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
        user_id=user.id,
        title=title,
        message=message,
    )

    db.add(notification)

    return {
        "user": user,
        "title": title,
        "message": message,
    }
# ============================================================
# SEND PUSH NOTIFICATIONS
# ============================================================

def send_attendance_push_notifications(
    push_items: list[dict],
):
    for item in push_items:
        user = item["user"]

        if not user.fcm_token:
            continue

        try:
            send_push_notification(
                token=user.fcm_token,
                title=item["title"],
                body=item["message"],
            )

        except Exception as error:
            print(
                "Attendance FCM error:",
                error,
            )


# ============================================================
# GET ATTENDANCE BY SCHEDULE
#
# Teacher/Admin
#
# GET /attendance/schedule/{schedule_id}
# ============================================================

@router.get(
    "/schedule/{schedule_id}"
)
def get_schedule_attendance(
    schedule_id: int,
    attendance_date: date,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):
    schedule = get_schedule_or_404(
        schedule_id,
        db,
    )

    check_teacher_schedule_permission(
        current_user,
        schedule,
        db,
    )

    students = (
        db.query(Student)
        .filter(
            Student.class_id
            == schedule.class_id
        )
        .all()
    )

    saved_count = (
        db.query(Attendance)
        .filter(
            Attendance.schedule_id
            == schedule_id,

            Attendance.date
            == attendance_date,
        )
        .count()
    )

    result = []

    for student in students:

        user = (
            db.query(User)
            .filter(
                User.id
                == student.user_id
            )
            .first()
        )

        attendance = (
            db.query(Attendance)
            .filter(
                Attendance.student_id
                == student.id,

                Attendance.schedule_id
                == schedule_id,

                Attendance.date
                == attendance_date,
            )
            .first()
        )

        permission = find_permission(
            student_id=student.id,
            schedule=schedule,
            schedule_id=schedule_id,
            target_date=attendance_date,
            db=db,
        )

        scanned = False

        # =====================================================
        # EXISTING ATTENDANCE
        # =====================================================

        if attendance:

            status = attendance.status

            remark = (
                getattr(
                    attendance,
                    "remark",
                    None,
                )
                or "-"
            )

            scanned = (
                str(remark)
                .strip()
                .lower()
                == "qr scan"
            )

        # =====================================================
        # PERMISSION
        # =====================================================

        elif permission:

            status = "Permission"

            remark = (
                permission.reason
                or "-"
            )

        # =====================================================
        # DEFAULT
        #
        # IMPORTANT:
        # Teacher attendance starts as Present.
        # QR scan is only confirmation.
        # =====================================================

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
                "student_id":
                    student.id,

                "student_name":
                    student_name,

                "gender":
                    student.gender,

                "permission_reason": (
                    permission.reason
                    if permission
                    else "-"
                ),

                "status":
                    status,

                "remark":
                    remark,

                "scanned":
                    scanned,

                "has_attendance":
                    attendance
                    is not None,
            }
        )

    return {
        "locked":
            False,

        "has_existing_records":
            saved_count > 0,

        "existing_records_count":
            saved_count,

        "all_students_saved":
            (
                len(students) > 0
                and
                saved_count >= len(students)
            ),

        "schedule": {
            "id":
                schedule.id,

            "class_id":
                schedule.class_id,

            "subject_id":
                schedule.subject_id,

            "teacher_id":
                schedule.teacher_id,

            "day":
                schedule.day,

            "start_time":
                str(
                    schedule.start_time
                ),

            "end_time":
                str(
                    schedule.end_time
                ),
        },

        "students":
            result,
    }

# ============================================================
# SAVE / UPDATE ATTENDANCE
#
# Teacher/Admin
#
# POST /attendance/save
#
# Supports:
# - new manual attendance
# - QR scanned attendance
# - teacher correction after scan
# ============================================================

@router.post("/save")
def save_attendance(
    data: AttendanceSave,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):
    schedule = get_schedule_or_404(
        data.schedule_id,
        db,
    )

    check_teacher_schedule_permission(
        current_user,
        schedule,
        db,
    )

    push_items = []

    # ========================================================
    # SAVE OR UPDATE EVERY STUDENT
    # ========================================================

    for item in data.items:

        # ----------------------------------------------------
        # Validate status
        # ----------------------------------------------------

        if item.status not in VALID_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Status must be one of "
                    "P, A, L, E, Permission"
                ),
            )

        # ----------------------------------------------------
        # Get student
        # ----------------------------------------------------

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
                ),
            )

        # ----------------------------------------------------
        # Student must belong to schedule class
        # ----------------------------------------------------

        if (
            student.class_id
            != schedule.class_id
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Student "
                    f"{item.student_id} "
                    f"does not belong "
                    f"to this class"
                ),
            )

        status = item.status

        remark = getattr(
            item,
            "remark",
            None,
        )

        permission = None

        # ====================================================
        # PERMISSION
        # ====================================================

        if status == "Permission":
            permission = find_permission(
                student_id=student.id,
                schedule=schedule,
                schedule_id=data.schedule_id,
                target_date=data.date,
                db=db,
            )

            if permission:
                remark = (
                    permission.reason
                    or "Permission"
                )

                permission.status = (
                    "approved"
                )

                if (
                    current_user.role
                    == "teacher"
                ):
                    teacher = (
                        get_teacher_from_user(
                            current_user,
                            db,
                        )
                    )

                    permission.teacher_id = (
                        teacher.id
                    )

            elif not remark:
                remark = "Permission"

        # ====================================================
        # FIND EXISTING ATTENDANCE
        #
        # This may already exist because student scanned QR.
        # ====================================================

        existing_attendance = (
            db.query(Attendance)
            .filter(
                Attendance.student_id
                == item.student_id,

                Attendance.schedule_id
                == data.schedule_id,

                Attendance.date
                == data.date,
            )
            .first()
        )

        # ====================================================
        # UPDATE EXISTING
        # ====================================================

        if existing_attendance:
            old_status = (
                existing_attendance.status
            )

            old_remark = (
                getattr(
                    existing_attendance,
                    "remark",
                    None,
                )
            )

            was_qr_scanned = (
                str(old_remark or "")
                .strip()
                .lower()
                == "qr scan"
            )

            # A QR-confirmed student is locked as Present.
            # Even a manually-crafted request cannot change it to Absent.
            if was_qr_scanned:
                status = "P"
                remark = "QR Scan"

            existing_attendance.status = status

            if was_qr_scanned:
                existing_attendance.remark = "QR Scan"

            elif (
                status == "P"
                and not remark
                and str(old_remark or "")
                .strip()
                .lower()
                == "qr scan"
            ):
                existing_attendance.remark = "QR Scan"

            else:
                existing_attendance.remark = remark

            attendance = (
                existing_attendance
            )

            changed = (
                old_status != status
                or old_remark
                != attendance.remark
            )

        # ====================================================
        # CREATE NEW
        # ====================================================

        else:
            attendance = Attendance(
                student_id=item.student_id,
                schedule_id=data.schedule_id,
                date=data.date,
                status=status,
                remark=remark,
            )

            db.add(attendance)

            changed = True

        # ====================================================
        # NOTIFICATION
        # Only notify when newly created or changed.
        # ====================================================

        if changed:
            push_item = (
                build_attendance_notification(
                    student=student,
                    schedule=schedule,
                    status=status,
                    remark=attendance.remark,
                    attendance_date=data.date,
                    db=db,
                )
            )

            if push_item:
                push_items.append(
                    push_item
                )

    # ========================================================
    # COMMIT
    # ========================================================

    try:
        db.commit()

    except Exception as error:
        db.rollback()

        print(
            "Attendance save error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save attendance"
            ),
        )

    # ========================================================
    # PUSH AFTER COMMIT
    # ========================================================

    send_attendance_push_notifications(
        push_items
    )

    return {
        "message":
            "Attendance saved successfully",
    }


# ============================================================
# STUDENT MY ATTENDANCE
#
# GET /attendance/me
# ============================================================

@router.get("/me")
def my_attendance(
    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail=(
                "Only student can view this"
            ),
        )

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
            detail=(
                "Student profile not found"
            ),
        )

    records = (
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

    return [
        attendance_response(
            record,
            db,
        )
        for record in records
    ]



# ============================================================
# TEACHER CREATE QR ATTENDANCE SESSION
#
# POST /attendance/scan-session
# ============================================================

@router.post("/scan-session")
def create_scan_session(
    data: AttendanceScanSessionCreate,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):
    # ========================================================
    # TEACHER ONLY
    # ========================================================

    if current_user.role != "teacher":
        raise HTTPException(
            status_code=403,
            detail=(
                "Only teacher can create "
                "QR attendance"
            ),
        )

    # ========================================================
    # GET SCHEDULE
    # ========================================================

    schedule = get_schedule_or_404(
        data.schedule_id,
        db,
    )

    check_teacher_schedule_permission(
        current_user,
        schedule,
        db,
    )

    # ========================================================
    # GET TEACHER
    # ========================================================

    teacher = get_teacher_from_user(
        current_user,
        db,
    )

    today = date.today()

    # ========================================================
    # TEACHER GPS
    #
    # Laptop/browser GPS may have lower accuracy.
    # We do NOT reject normal 100m / 150m accuracy.
    # Only reject extremely unreliable location.
    # ========================================================

    if (
        data.accuracy is not None
        and data.accuracy > 1000
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Teacher location could not "
                "be determined reliably. "
                "Please enable location "
                "and try again."
            ),
        )

    # ========================================================
    # CLOSE PREVIOUS ACTIVE QR
    # ========================================================

    old_sessions = (
        db.query(
            AttendanceScanSession
        )
        .filter(
            AttendanceScanSession.schedule_id
            == schedule.id,

            AttendanceScanSession.attendance_date
            == today,

            AttendanceScanSession.is_active
            == True,
        )
        .all()
    )

    for old_session in old_sessions:
        old_session.is_active = False

    # ========================================================
    # CREATE SECURE TOKEN
    # ========================================================

    token = secrets.token_urlsafe(
        32
    )

    expires_at = (
        datetime.utcnow()
        + timedelta(
            minutes=10
        )
    )

    # ========================================================
    # STORE TEACHER CURRENT LOCATION
    # ========================================================

    scan_session = AttendanceScanSession(
        schedule_id=
            schedule.id,

        teacher_id=
            teacher.id,

        attendance_date=
            today,

        token=
            token,

        expires_at=
            expires_at,

        is_active=
            True,

        teacher_latitude=
            data.latitude,

        teacher_longitude=
            data.longitude,

        teacher_accuracy=
            data.accuracy,

        radius_m=
            data.radius_m,
    )

    db.add(
        scan_session
    )

    try:
        db.commit()

    except Exception as error:
        db.rollback()

        print(
            "CREATE QR SESSION ERROR:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to create "
                "QR attendance session"
            ),
        )

    db.refresh(
        scan_session
    )

    print(
        "=================================="
    )

    print(
        "TEACHER QR LOCATION"
    )

    print(
        "LAT:",
        scan_session.teacher_latitude,
    )

    print(
        "LNG:",
        scan_session.teacher_longitude,
    )

    print(
        "ACCURACY:",
        scan_session.teacher_accuracy,
    )

    print(
        "RADIUS:",
        scan_session.radius_m,
    )

    print(
        "=================================="
    )

    return {
        "session_id":
            scan_session.id,

        "schedule_id":
            schedule.id,

        "teacher_id":
            teacher.id,

        "subject_id":
            schedule.subject_id,

        "class_id":
            schedule.class_id,

        "attendance_date":
            str(today),

        "token":
            token,

        "expires_at":
            expires_at
            .isoformat()
            + "Z",

        "expires_in_seconds":
            600,

        "location": {
            "latitude":
                scan_session
                .teacher_latitude,

            "longitude":
                scan_session
                .teacher_longitude,

            "accuracy":
                scan_session
                .teacher_accuracy,

            "radius_m":
                scan_session
                .radius_m,
        },
    }


# ============================================================
# STUDENT SCAN QR
#
# POST /attendance/scan
# ============================================================

@router.post("/scan")
def scan_attendance(
    data: AttendanceScanRequest,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):
    # ========================================================
    # STUDENT ONLY
    # ========================================================

    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail=(
                "Only student can "
                "scan attendance"
            ),
        )

    # ========================================================
    # STUDENT PROFILE
    # ========================================================

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
            detail=(
                "Student profile not found"
            ),
        )

    # ========================================================
    # FIND ACTIVE QR SESSION
    # ========================================================

    scan_session = (
        db.query(
            AttendanceScanSession
        )
        .filter(
            AttendanceScanSession.token
            == data.token,

            AttendanceScanSession.is_active
            == True,
        )
        .first()
    )

    if not scan_session:
        raise HTTPException(
            status_code=404,
            detail=(
                "QR attendance session "
                "not found"
            ),
        )

    # ========================================================
    # CHECK EXPIRATION
    # ========================================================

    if (
        datetime.utcnow()
        > scan_session.expires_at
    ):
        scan_session.is_active = False

        db.commit()

        raise HTTPException(
            status_code=400,
            detail=(
                "QR code has expired"
            ),
        )

    # ========================================================
    # GET SCHEDULE
    # ========================================================

    schedule = get_schedule_or_404(
        scan_session.schedule_id,
        db,
    )

    # ========================================================
    # CHECK QR TEACHER
    # ========================================================

    if (
        scan_session.teacher_id
        != schedule.teacher_id
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid attendance "
                "QR session"
            ),
        )

    # ========================================================
    # CHECK STUDENT CLASS
    # ========================================================

    if (
        student.class_id
        != schedule.class_id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "This QR code is not "
                "for your class"
            ),
        )

    # ========================================================
    # REQUIRE TEACHER LOCATION
    # ========================================================

    if (
        scan_session.teacher_latitude
        is None
        or
        scan_session.teacher_longitude
        is None
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Teacher location "
                "is unavailable"
            ),
        )

    # ========================================================
    # STUDENT GPS ACCURACY
    #
    # Student uses phone, so require better GPS accuracy.
    # ========================================================

    if (
        data.accuracy is not None
        and data.accuracy > 100
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Your GPS location is not "
                "accurate enough. "
                "Please enable precise "
                "location and try again."
            ),
        )

    # ========================================================
    # CALCULATE DISTANCE
    #
    # Teacher GPS
    #      ↓
    # Student GPS
    # ========================================================

    distance_m = (
        calculate_distance_meters(
            scan_session
            .teacher_latitude,

            scan_session
            .teacher_longitude,

            data.latitude,

            data.longitude,
        )
    )

    # ========================================================
    # DISTANCE CONFIG
    # ========================================================

    base_radius = (
        scan_session.radius_m
        or 50.0
    )

    teacher_accuracy = (
        scan_session.teacher_accuracy
        or 0.0
    )

    # Laptop may be inaccurate.
    # But never add more than 50m tolerance.
    extra_tolerance = min(
        teacher_accuracy,
        50.0,
    )

    allowed_radius = (
        base_radius
        + extra_tolerance
    )

    # ========================================================
    # DEBUG
    # ========================================================

    print(
        "=================================="
    )

    print(
        "ATTENDANCE LOCATION CHECK"
    )

    print(
        "TEACHER LAT:",
        scan_session.teacher_latitude,
    )

    print(
        "TEACHER LNG:",
        scan_session.teacher_longitude,
    )

    print(
        "TEACHER ACCURACY:",
        teacher_accuracy,
    )

    print(
        "STUDENT LAT:",
        data.latitude,
    )

    print(
        "STUDENT LNG:",
        data.longitude,
    )

    print(
        "STUDENT ACCURACY:",
        data.accuracy,
    )

    print(
        "DISTANCE:",
        distance_m,
    )

    print(
        "BASE RADIUS:",
        base_radius,
    )

    print(
        "ALLOWED RADIUS:",
        allowed_radius,
    )

    print(
        "=================================="
    )

    # ========================================================
    # STUDENT MUST BE NEAR TEACHER
    # ========================================================

    if distance_m > allowed_radius:
        raise HTTPException(
            status_code=403,
            detail=(
                f"You are too far from teacher. "
                f"Distance: {distance_m:.1f} meters. "
                f"Allowed: {allowed_radius:.0f} meters."
            ),
        )

    # ========================================================
    # FIND EXISTING ATTENDANCE
    # ========================================================

    existing = (
        db.query(Attendance)
        .filter(
            Attendance.student_id
            == student.id,

            Attendance.schedule_id
            == schedule.id,

            Attendance.date
            == scan_session.attendance_date,
        )
        .first()
    )

    # ========================================================
    # EXISTING ATTENDANCE
    # ========================================================

    if existing:
        existing_remark = (
            getattr(
                existing,
                "remark",
                None,
            )
            or ""
        )

        # -----------------------------------------------
        # ALREADY QR SCANNED
        # -----------------------------------------------

        if (
            existing_remark
            .strip()
            .lower()
            == "qr scan"
        ):
            return {
                "message":
                    "Attendance already recorded",

                "distance_m":
                    round(
                        distance_m,
                        2,
                    ),

                "allowed_radius_m":
                    round(
                        allowed_radius,
                        2,
                    ),

                "attendance":
                    attendance_response(
                        existing,
                        db,
                    ),
            }

        # -----------------------------------------------
        # PERMISSION REMAINS PERMISSION
        # -----------------------------------------------

        if (
            existing.status
            == "Permission"
        ):
            return {
                "message":
                    "Attendance already recorded",

                "distance_m":
                    round(
                        distance_m,
                        2,
                    ),

                "allowed_radius_m":
                    round(
                        allowed_radius,
                        2,
                    ),

                "attendance":
                    attendance_response(
                        existing,
                        db,
                    ),
            }

        # -----------------------------------------------
        # QR CONFIRMS PRESENT
        # -----------------------------------------------

        existing.status = "P"

        existing.remark = (
            "QR Scan"
        )

        existing.scan_latitude = (
            data.latitude
        )

        existing.scan_longitude = (
            data.longitude
        )

        existing.scan_accuracy = (
            data.accuracy
        )

        existing.scan_distance_m = (
            distance_m
        )

        try:
            db.commit()

        except Exception as error:
            db.rollback()

            print(
                "QR UPDATE ERROR:",
                error,
            )

            raise HTTPException(
                status_code=500,
                detail=(
                    "Failed to update "
                    "QR attendance"
                ),
            )

        db.refresh(
            existing
        )

        return {
            "message":
                "Attendance scanned successfully",

            "distance_m":
                round(
                    distance_m,
                    2,
                ),

            "allowed_radius_m":
                round(
                    allowed_radius,
                    2,
                ),

            "attendance":
                attendance_response(
                    existing,
                    db,
                ),
        }

    # ========================================================
    # CHECK PERMISSION
    # ========================================================

    permission = find_permission(
        student_id=
            student.id,

        schedule=
            schedule,

        schedule_id=
            schedule.id,

        target_date=
            scan_session
            .attendance_date,

        db=
            db,
    )

    if permission:
        status = "Permission"

        remark = (
            permission.reason
            or "Permission"
        )

    else:
        status = "P"
        remark = "QR Scan"

    # ========================================================
    # CREATE ATTENDANCE
    # ========================================================

    attendance = Attendance(
        student_id=
            student.id,

        schedule_id=
            schedule.id,

        date=
            scan_session
            .attendance_date,

        status=
            status,

        remark=
            remark,

        scan_latitude=
            data.latitude,

        scan_longitude=
            data.longitude,

        scan_accuracy=
            data.accuracy,

        scan_distance_m=
            distance_m,
    )

    db.add(
        attendance
    )

    try:
        db.commit()

    except Exception as error:
        db.rollback()

        print(
            "QR ATTENDANCE SAVE ERROR:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save "
                "QR attendance"
            ),
        )

    db.refresh(
        attendance
    )

    return {
        "message":
            "Attendance scanned successfully",

        "distance_m":
            round(
                distance_m,
                2,
            ),

        "allowed_radius_m":
            round(
                allowed_radius,
                2,
            ),

        "attendance":
            attendance_response(
                attendance,
                db,
            ),
    }


# ============================================================
# TEACHER CLOSE QR
#
# POST /attendance/scan-session/{session_id}/close
# ============================================================

@router.post(
    "/scan-session/{session_id}/close"
)
def close_scan_session(
    session_id: int,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=403,
            detail=(
                "Only teacher can close "
                "QR attendance"
            ),
        )

    teacher = get_teacher_from_user(
        current_user,
        db,
    )

    scan_session = (
        db.query(
            AttendanceScanSession
        )
        .filter(
            AttendanceScanSession.id
            == session_id
        )
        .first()
    )

    if not scan_session:
        raise HTTPException(
            status_code=404,
            detail=(
                "QR attendance session "
                "not found"
            ),
        )

    if (
        scan_session.teacher_id
        != teacher.id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "You cannot close "
                "this QR session"
            ),
        )

    scan_session.is_active = False

    db.commit()

    return {
        "message":
            "QR attendance closed",
    }


# ============================================================
# TEACHER GET CURRENT QR SESSION
#
# GET /attendance/scan-session/current/{schedule_id}
# ============================================================

@router.get(
    "/scan-session/current/{schedule_id}"
)
def get_current_scan_session(
    schedule_id: int,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=403,
            detail=(
                "Only teacher can view "
                "QR attendance session"
            ),
        )

    schedule = get_schedule_or_404(
        schedule_id,
        db,
    )

    check_teacher_schedule_permission(
        current_user,
        schedule,
        db,
    )

    today = date.today()

    scan_session = (
        db.query(
            AttendanceScanSession
        )
        .filter(
            AttendanceScanSession.schedule_id
            == schedule.id,

            AttendanceScanSession.attendance_date
            == today,

            AttendanceScanSession.is_active
            == True,
        )
        .order_by(
            AttendanceScanSession.id.desc()
        )
        .first()
    )

    if not scan_session:
        return {
            "active": False,
            "session": None,
        }

    if (
        datetime.utcnow()
        > scan_session.expires_at
    ):
        scan_session.is_active = False

        db.commit()

        return {
            "active": False,
            "session": None,
        }

    return {
        "active":
            True,

        "session": {
            "session_id":
                scan_session.id,

            "schedule_id":
                scan_session.schedule_id,

            "token":
                scan_session.token,

            "attendance_date":
                str(
                    scan_session
                    .attendance_date
                ),

            "expires_at":
                scan_session
                .expires_at
                .isoformat()
                + "Z",

            "location": {
                "latitude":
                    scan_session
                    .teacher_latitude,

                "longitude":
                    scan_session
                    .teacher_longitude,

                "accuracy":
                    scan_session
                    .teacher_accuracy,

                "radius_m":
                    scan_session
                    .radius_m,
            },
        },
    }