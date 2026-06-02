from sqlalchemy import Column, Integer, String, ForeignKey
from app.database.db import Base

class SchoolClass(Base):
    __tablename__ = "school_classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), nullable=False)
    section = Column(String(20))
    teacher_id = Column(Integer, ForeignKey("teachers.id"))