from pydantic import BaseModel
from typing import Optional

class SubjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    class_id: Optional[int] = None
    teacher_id: Optional[int] = None