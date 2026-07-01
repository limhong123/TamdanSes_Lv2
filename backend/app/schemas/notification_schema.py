from pydantic import BaseModel

class FCMTokenSchema(BaseModel):
    token: str


class SendNotificationSchema(BaseModel):
    user_id: int
    title: str
    body: str