from pydantic import BaseModel
from typing import Optional

class ClassCreate(BaseModel):
    name: str
    section: Optional[str] = None
    teacher_id: Optional[int] = None