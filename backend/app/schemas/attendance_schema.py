from pydantic import BaseModel
from datetime import date
from typing import List, Optional


class AttendanceItem(BaseModel):
    student_id: int
    status: str
    remark: Optional[str] = None


class AttendanceSave(BaseModel):
    schedule_id: int
    date: date
    items: List[AttendanceItem]
