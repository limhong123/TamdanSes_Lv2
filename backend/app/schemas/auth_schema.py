from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterSchema(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["admin", "teacher", "student", "parent"]


class AdminRegisterSchema(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    secret_key: str


class LoginSchema(BaseModel):
    login_id: str
    password: str


class ForgotPasswordSchema(BaseModel):
    phone: str


class ResetPasswordSchema(BaseModel):
    phone: str
    otp: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=6)


class ParentRequestOtpSchema(BaseModel):
    student_code: str = Field(min_length=1)
    parent_phone: str = Field(min_length=8)




class ParentVerifyOtpSchema(BaseModel):
    student_code: str = Field(min_length=1)
    parent_phone: str = Field(min_length=8)
    otp: str = Field(min_length=6, max_length=6)


class ParentCreatePasswordSchema(BaseModel):
    setup_token: str
    new_password: str = Field(min_length=6)
    confirm_password: str = Field(min_length=6)


class ParentPasswordLoginSchema(BaseModel):
    student_code: str = Field(min_length=1)
    password: str = Field(min_length=6)

