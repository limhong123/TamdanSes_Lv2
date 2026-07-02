from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class FCMTokenSchema(BaseModel):
    token: str


class SendNotificationSchema(BaseModel):
    user_id: int
    title: str
    body: str


class NotificationCreate(BaseModel):
    title: str
    message: str


class NotificationUpdate(BaseModel):
    title: str
    message: str


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True