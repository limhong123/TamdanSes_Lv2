from sqlalchemy import Column, Integer, Float, String, ForeignKey
from app.database.db import Base


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("school_classes.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)

    semester = Column(Integer, nullable=False, default=1)  # 1 or 2
    month = Column(Integer, nullable=False, default=1)     # 1,2,3,4

    score = Column(Float, nullable=False)
    bonus = Column(Float, default=0)
    total_score = Column(Float, nullable=False)

    max_score = Column(Float, nullable=False, default=100)
    remark = Column(String(255), nullable=True)