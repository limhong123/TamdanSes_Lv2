from pydantic import BaseModel
from typing import Optional


class ScoreCreate(BaseModel):
    student_id: int
    class_id: int
    subject_id: int
    semester: int
    month: int
    score: float
    bonus: Optional[float] = 0
    max_score: float = 100
    remark: Optional[str] = None