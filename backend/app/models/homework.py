from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.db import Base


class Homework(Base):
    __tablename__ = "homework"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(255), nullable=True)

    class_id = Column(Integer, ForeignKey("school_classes.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)

    due_date = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    submissions = relationship(
        "HomeworkSubmission",
        back_populates="homework",
        cascade="all, delete"
    )