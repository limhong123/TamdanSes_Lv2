from sqlalchemy import Column, Integer, String, ForeignKey
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