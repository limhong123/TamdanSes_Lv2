from pydantic import BaseModel

class HolidayCreate(BaseModel):
    name: str
    date: str