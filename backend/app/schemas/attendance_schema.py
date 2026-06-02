from pydantic import BaseModel
from datetime import date
from typing import List

class AttendanceItem(BaseModel):
    student_id: int
    status: str

class AttendanceSave(BaseModel):
    class_id: int
    date: date
    items: List[AttendanceItem]