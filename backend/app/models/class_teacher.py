from sqlalchemy import Column, Integer, ForeignKey
from app.database.db import Base

class ClassTeacher(Base):
    __tablename__ = "class_teachers"

    id = Column(Integer, primary_key=True, index=True)

    class_id = Column(Integer, ForeignKey("school_classes.id"))
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))