from pydantic import BaseModel
from typing import Optional


class SubmissionCreate(BaseModel):
    homework_id: int
    student_id: int
    answer_text: Optional[str] = None
    file_path: Optional[str] = None





class SubmissionReview(BaseModel):
    status: str
    score: Optional[float] = None
    bonus: Optional[float] = 0
    teacher_comment: Optional[str] = None