from sqlalchemy import Column, Integer, String, ForeignKey
from app.database.db import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(30))
    class_id = Column(Integer, ForeignKey("school_classes.id"))
    teacher_id = Column(Integer, ForeignKey("teachers.id"))