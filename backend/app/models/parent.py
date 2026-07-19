from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database.db import Base


class Parent(Base):
    __tablename__ = "parents"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    full_name = Column(
        String(100),
        nullable=False,
    )

    phone = Column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )

    # False = Parent មិនទាន់បង្កើត Password
    # True = Parent បានបង្កើត Password រួច
    password_created = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="parent",
    )

    students = relationship(
        "ParentStudent",
        back_populates="parent",
        cascade="all, delete-orphan",
    )