from datetime import date
from pydantic import BaseModel


class PermissionCreate(BaseModel):
    type: str
    start_date: date
    end_date: date
    reason: str


class PermissionAction(BaseModel):
    status: str