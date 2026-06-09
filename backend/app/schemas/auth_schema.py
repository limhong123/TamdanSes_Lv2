from pydantic import BaseModel, EmailStr
from typing import Optional

class AdminRegisterSchema(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    secret_key: str
class RegisterSchema(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: str


class LoginSchema(BaseModel):
    login_id: str
    password: str


class ForgotPasswordSchema(BaseModel):
    phone: str


class ResetPasswordSchema(BaseModel):
    phone: str
    otp: str
    new_password: str