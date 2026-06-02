from pydantic import BaseModel
from datetime import time
from typing import Optional

class ScheduleCreate(BaseModel):
    class_id: int
    subject_id: int
    teacher_id: int
    day: str
    start_time: time
    end_time: time