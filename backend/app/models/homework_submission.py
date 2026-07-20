from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database.db import Base


def utc_now():
    return datetime.now(timezone.utc)


class HomeworkSubmission(Base):
    __tablename__ = "homework_submissions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    homework_id = Column(
        Integer,
        ForeignKey(
            "homework.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    student_id = Column(
        Integer,
        ForeignKey(
            "students.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    answer_text = Column(
        Text,
        nullable=True,
    )

    # First uploaded file, kept for compatibility
    file_path = Column(
        String(500),
        nullable=True,
    )

    # JSON string containing all uploaded files
    file_paths = Column(
        Text,
        nullable=True,
    )

    # submitted | checked
    status = Column(
        String(50),
        nullable=False,
        default="submitted",
        index=True,
    )

    score = Column(
        Float,
        nullable=True,
        default=0,
    )

    bonus = Column(
        Float,
        nullable=False,
        default=0,
    )

    teacher_comment = Column(
        Text,
        nullable=True,
    )

    submitted_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    reviewed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    homework = relationship(
        "Homework",
        back_populates="submissions",
    )

    __table_args__ = (
        UniqueConstraint(
            "homework_id",
            "student_id",
            name="uq_homework_student_submission",
        ),
    )