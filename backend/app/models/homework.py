from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database.db import Base


def utc_now():
    return datetime.now(timezone.utc)


class Homework(Base):
    __tablename__ = "homework"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    title = Column(
        String(150),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    file_path = Column(
        String(500),
        nullable=True,
    )

    class_id = Column(
        Integer,
        ForeignKey("school_classes.id"),
        nullable=False,
    )

    subject_id = Column(
        Integer,
        ForeignKey("subjects.id"),
        nullable=False,
    )

    teacher_id = Column(
        Integer,
        ForeignKey("teachers.id"),
        nullable=False,
    )

    due_date = Column(
        String(50),
        nullable=False,
    )

    is_bonus = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    max_bonus = Column(
        Integer,
        nullable=False,
        default=0,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    submissions = relationship(
        "HomeworkSubmission",
        back_populates="homework",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )