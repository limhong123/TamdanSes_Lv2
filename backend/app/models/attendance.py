from sqlalchemy import Column, Integer, String, Date, ForeignKey, UniqueConstraint
from app.database.db import Base

class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    class_id = Column(Integer, ForeignKey("school_classes.id"))
    date = Column(Date, nullable=False)
    status = Column(String(1), default="P")  # P or A

    __table_args__ = (
        UniqueConstraint("student_id", "date", name="unique_student_date"),
    )