from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database.db import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    student_code = Column(String(20), unique=True)
    class_id = Column(Integer, ForeignKey("school_classes.id"))
    gender = Column(String(20))
    guardian_name = Column(String(100))
    guardian_phone = Column(String(30))
    address = Column(String(255))

    parent_login_otp = Column(String, nullable=True)

    parent_login_otp_expire = Column(
        DateTime,
        nullable=True,
    )

    # 👇 បន្ថែមមួយនេះ
    parents = relationship(
        "ParentStudent",
        back_populates="student",
        cascade="all, delete-orphan",
    )