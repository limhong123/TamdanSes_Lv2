from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


class AttendanceItem(BaseModel):
    student_id: int
    status: str
    remark: Optional[str] = None


class AttendanceSave(BaseModel):
    schedule_id: int
    date: date
    items: List[AttendanceItem]


# ============================================================
# CREATE QR SESSION
# ============================================================

class AttendanceScanSessionCreate(BaseModel):
    schedule_id: int

    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
    )

    accuracy: Optional[float] = Field(
        default=None,
        ge=0,
    )

    radius_m: float = Field(
        default=50.0,
        ge=10,
        le=500,
    )


# ============================================================
# STUDENT SCAN QR
# ============================================================

class AttendanceScanRequest(BaseModel):
    token: str

    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
    )

    accuracy: Optional[float] = Field(
        default=None,
        ge=0,
    )