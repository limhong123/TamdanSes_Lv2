from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database.db import Base
from sqlalchemy.orm import relationship


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    avatar_url = Column(String(255), nullable=True)

    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)

    role = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)

    phone = Column(String(30), unique=True, nullable=True)

    reset_otp = Column(String(10), nullable=True)
    reset_otp_expire = Column(DateTime, nullable=True)

    fcm_token = Column(String, nullable=True)

    parent = relationship(
        "Parent",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )