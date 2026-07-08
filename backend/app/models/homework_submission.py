from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.db import Base


class HomeworkSubmission(Base):
    __tablename__ = "homework_submissions"

    id = Column(Integer, primary_key=True, index=True)

    homework_id = Column(Integer, ForeignKey("homework.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)

    answer_text = Column(Text, nullable=True)

    file_path = Column(String(255), nullable=True)
    file_paths = Column(Text, nullable=True)

    status = Column(String(50), default="submitted")
    score = Column(Float, nullable=True)
    bonus = Column(Float, default=0)
    teacher_comment = Column(Text, nullable=True)

    submitted_at = Column(DateTime, default=datetime.utcnow)

    homework = relationship("Homework", back_populates="submissions")