from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, Field

##

class RegisterRequest(BaseModel):
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    code: str
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


class DocumentOrder(BaseModel):
    document_ids: list[int] = Field(max_length=1000)


class HelpFlashcard(BaseModel):
    front: str = Field(max_length=2000)
    back: str = Field(max_length=2000)


class HelpQuestion(BaseModel):
    question: str = Field(max_length=2000)
    options: list[Annotated[str, Field(max_length=1000)]] = Field(max_length=4)

    # Only sent once the learner has answered, because the page doesn't know it before then.
    answer: str | None = Field(default=None, max_length=1000)


class HelpPrompt(BaseModel):
    user_prompt: str = Field(
        min_length = 5,
        max_length = 10000
    )

    # What the learner is looking at. The lesson is used when neither is sent.
    flashcard: HelpFlashcard | None = None
    question: HelpQuestion | None = None

