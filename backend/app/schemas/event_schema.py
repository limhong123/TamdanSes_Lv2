from pydantic import BaseModel
from typing import Optional

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: str