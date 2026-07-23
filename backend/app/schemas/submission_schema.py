from typing import Optional

from pydantic import BaseModel, Field


class SubmissionCreate(BaseModel):
    homework_id: int
    student_id: int
    answer_text: Optional[str] = None
    file_path: Optional[str] = None


class SubmissionReview(BaseModel):
    apply_bonus: bool = False

    bonus: float = Field(
        default=0,
        ge=0,
    )

    teacher_comment: Optional[str] = None