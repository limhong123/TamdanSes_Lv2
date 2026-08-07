from typing import Optional
from pydantic import BaseModel, Field


class ScoreCreate(BaseModel):
    student_id: int
    class_id: int
    subject_id: int

    semester: int

    # monthly | semester_exam
    score_type: str = "monthly"

    # monthly requires month
    # semester_exam uses None
    month: Optional[int] = None

    score: float = Field(
        ...,
        ge=0,
        le=100,
    )

    bonus: float = Field(
        default=0,
        ge=0,
    )

    remark: Optional[str] = None