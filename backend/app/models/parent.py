from sqlalchemy import Column, Integer, String, ForeignKey
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

    full_name = Column(String, nullable=False)

    phone = Column(
        String,
        nullable=False,
        unique=True,
        index=True,
    )

    user = relationship("User")
    students = relationship(
        "ParentStudent",
        back_populates="parent",
        cascade="all, delete-orphan",
    )