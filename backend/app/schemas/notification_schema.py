from pydantic import BaseModel

class NotificationCreate(BaseModel):
    title: str
    message: str
    target_role: str = "all"