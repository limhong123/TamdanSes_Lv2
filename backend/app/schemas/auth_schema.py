from pydantic import BaseModel
from typing import Optional


class RegisterSchema(BaseModel):
    first_name: str
    last_name: str
    email: str
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