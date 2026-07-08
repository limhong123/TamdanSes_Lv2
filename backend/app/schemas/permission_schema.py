from pydantic import BaseModel


class PermissionCreate(BaseModel):
    schedule_id: int
    type: str
    reason: str


class PermissionAction(BaseModel):
    status: str