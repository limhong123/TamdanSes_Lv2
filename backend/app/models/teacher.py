from sqlalchemy import Column, Integer, String, ForeignKey
from app.database.db import Base

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    teacher_code = Column(String(20), unique=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))

    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    qualification = Column(String, nullable=True)