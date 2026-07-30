from sqlalchemy import (
    Column,
    Float,
    ForeignKey,
    Integer,
    String,
)

from app.database.db import Base


class Score(Base):
    __tablename__ = "scores"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False,
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

    semester = Column(
        Integer,
        nullable=False,
        default=1,
    )

    month = Column(
        Integer,
        nullable=False,
        default=1,
    )

    score = Column(
        Float,
        nullable=False,
    )

    bonus = Column(
        Float,
        nullable=False,
        default=0,
    )

    total_score = Column(
        Float,
        nullable=False,
        default=0,
    )

    max_score = Column(
        Float,
        nullable=False,
        default=100,
    )

    remark = Column(
        String(255),
        nullable=True,
    )