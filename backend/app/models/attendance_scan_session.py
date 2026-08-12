from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)

from app.database.db import Base


class AttendanceScanSession(Base):
    __tablename__ = "attendance_scan_sessions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    schedule_id = Column(
        Integer,
        ForeignKey("schedules.id"),
        nullable=False,
    )

    teacher_id = Column(
        Integer,
        ForeignKey("teachers.id"),
        nullable=False,
    )

    attendance_date = Column(
        Date,
        nullable=False,
    )

    token = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    expires_at = Column(
        DateTime,
        nullable=False,
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Teacher location when QR is generated
    teacher_latitude = Column(
        Float,
        nullable=True,
    )

    teacher_longitude = Column(
        Float,
        nullable=True,
    )

    teacher_accuracy = Column(
        Float,
        nullable=True,
    )

    # Normal classroom distance
    radius_m = Column(
        Float,
        default=50.0,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )