from typing import Literal

from pydantic import BaseModel, EmailStr, Field

##

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(
        min_length=5,
        max_length=128,

        # No whitespace anywhere in the password.
        pattern=r"^\S+$"
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ReviewRequest(BaseModel):
    response: Literal["again", "good"]


class UserAnswer(BaseModel):
    user_answer: str


class PromptRequest(BaseModel):
    user_prompt: str = Field(
        min_length=5,
        max_length=100000
    )

