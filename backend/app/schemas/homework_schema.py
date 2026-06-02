from pydantic import BaseModel
from typing import Optional


class HomeworkCreate(BaseModel):
    title: str
    description: Optional[str] = None
    class_id: int
    subject_id: int
    teacher_id: int
    due_date: str
    file_path: Optional[str] = None