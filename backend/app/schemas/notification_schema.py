from datetime import datetime
from pydantic import BaseModel


class FCMTokenSchema(BaseModel):
    token: str


class SendNotificationSchema(BaseModel):
    user_id: int
    title: str
    body: str


class NotificationCreate(BaseModel):
    user_id: int
    title: str
    message: str


class NotificationUpdate(BaseModel):
    title: str
    message: str


class NotificationResponse(BaseModel):
    id: int
    user_id: int | None = None
    title: str
    message: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True