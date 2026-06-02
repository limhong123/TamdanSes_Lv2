from pydantic import BaseModel

class ClassTeacherCreate(BaseModel):
    class_id: int
    teacher_id: int
    subject_id: int