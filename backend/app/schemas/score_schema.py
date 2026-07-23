from typing import Optional

from pydantic import BaseModel


class ScoreCreate(BaseModel):
    student_id: int
    class_id: int
    subject_id: int
    semester: int
    month: int
    score: float
    bonus: Optional[float] = 0
    remark: Optional[str] = None