from pydantic import BaseModel
from typing import Optional

class TeacherCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None
    qualification: Optional[str] = None

class TeacherUpdate(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    qualification: Optional[str] = None