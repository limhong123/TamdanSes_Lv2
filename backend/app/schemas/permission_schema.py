from typing import Optional
from pydantic import BaseModel


class PermissionCreate(BaseModel):
    request_type: str  # full_day | subject
    schedule_id: Optional[int] = None
    type: str
    reason: str


class PermissionAction(BaseModel):
    status: str