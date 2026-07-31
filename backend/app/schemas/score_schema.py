from typing import Optional

from pydantic import BaseModel, Field


class ScoreCreate(BaseModel):
    student_id: int
    class_id: int
    subject_id: int
    semester: int
    month: int

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