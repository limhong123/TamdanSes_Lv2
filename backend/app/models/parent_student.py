from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database.db import Base


class ParentStudent(Base):
    __tablename__ = "parent_students"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    parent_id = Column(
        Integer,
        ForeignKey(
            "parents.id",
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

    relationship_type = Column(
        String(30),
        nullable=True,
        default="guardian",
    )

    parent = relationship(
        "Parent",
        back_populates="students",
    )

    student = relationship(
        "Student",
        back_populates="parents",
    )

    __table_args__ = (
        UniqueConstraint(
            "parent_id",
            "student_id",
            name="uq_parent_student",
        ),
    )