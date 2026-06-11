from pydantic import BaseModel, EmailStr
from typing import Optional


class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    phone: str

    email: Optional[EmailStr] = None
    password: Optional[str] = None

    class_id: int
    gender: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    address: Optional[str] = None