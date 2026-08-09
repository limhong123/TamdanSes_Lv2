# app/schemas/attendance_schema.py

from datetime import date
from typing import List, Optional
from pydantic import BaseModel


class AttendanceItem(BaseModel):
    student_id: int
    status: str
    remark: Optional[str] = None


class AttendanceSave(BaseModel):
    schedule_id: int
    date: date
    items: List[AttendanceItem]


# ============================================================
# QR ATTENDANCE
# ============================================================

class AttendanceScanSessionCreate(BaseModel):
    schedule_id: int


class AttendanceScanRequest(BaseModel):
    token: str