from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from datetime import datetime
from app.database.db import Base


class PermissionRequest(Base):
    __tablename__ = "permission_requests"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("school_classes.id"), nullable=False)

    # Optional: use schedule_id when the permission is only for one subject/period.
    # If schedule_id is null, the permission applies to the whole class/day range.
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=True)

    type = Column(String(50), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(String(255), nullable=False)

    status = Column(String(20), default="pending")  # pending, approved, rejected
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)

    requested_by_role = Column(
    String(20),
    nullable=True,
    default="student",
)

    requested_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    created_at = Column(DateTime, default=datetime.utcnow)
