from sqlalchemy import Column, Integer, String, Date, ForeignKey, UniqueConstraint
from app.database.db import Base


class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False)

    date = Column(Date, nullable=False)
    status = Column(String(20), default="P")

    remark = Column(String(255), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "schedule_id",
            "date",
            name="unique_student_schedule_date",
        ),
    )