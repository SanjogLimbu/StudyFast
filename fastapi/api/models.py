from datetime import datetime
from database import Base
from datetime import date

from sqlalchemy import Date, String, ForeignKey, DateTime, BigInteger, func, Text, JSON, Float, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

## 

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    email: Mapped[str] = mapped_column(
        String(320),
        unique=True,
        index=True,
        nullable=False
    )

    email_verified: Mapped[bool] = mapped_column(
        server_default="false",
        nullable=False
    )

    password_hash: Mapped[str | None] = mapped_column(
        String(128),

        # Users who signed up with Google OAUTH have no password.
        nullable=True
    )

    google_sub: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True
    )

    uploads: Mapped[int] = mapped_column(
        default=0,
        nullable=False        
    )

    last_upload: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    prompts: Mapped[int] = mapped_column(
        default=0,
        nullable=False
    )

    last_prompt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


    # User -< many Document
    documents: Mapped[list["Document"]] = relationship(
        back_populates="user"
    )


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    token_hash: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )
    
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )


class LoginSession(Base):
    __tablename__ = "login_sessions"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )


    # Only a hash of the cookie's token is stored, so a leaked database can't be used to log in.
    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )


class StudyDay(Base):
    __tablename__ = "study_days"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "day",
            name="user_study_day"
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    day: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )


class TopicMastery(Base):
    __tablename__ = "topic_mastery"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "topic_id",
            name="user_topic_mastery"
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    topic_id: Mapped[int] = mapped_column(
        ForeignKey("topics.id"),
        nullable=False
    )


    # Statuses - locked, unlocked
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="locked"
    )

    mastery: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0
    )


    # The quiz half of mastery. The other half is how well the topic's flashcards are remembered.
    quiz_mastery: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0,
        server_default="0"
    )

    topic: Mapped["Topic"] = relationship(
        back_populates="mastery_records"
    )

    round: Mapped["int"] = mapped_column(
        default=0,
        nullable=False
    )

    completed_flashcards: Mapped[bool] = mapped_column(
        default=False,
        nullable=False
    )

    # Set when the user finishes the lesson, so it only opens by itself on their first visit.
    lesson_read: Mapped[bool] = mapped_column(
        default=False,
        server_default="false",
        nullable=False
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )


    # Extracted at upload so the worker doesn't need access to the uploaded file.
    text: Mapped[str] = mapped_column(
        Text,
        nullable=False,

        # Deferred because text can reach 1M characters.
        deferred=True
    )

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    title: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Pending..."
    )


    # Source - file, prompt
    source: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="file",
        server_default="file"
    )


    # Statuses - pending, processing, ready, failed
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending"
    )


    # User -< Many Document
    user: Mapped["User"] = relationship(
        back_populates="documents"
    )


    # Document -< Many Topic
    # Ordered explicitly, as Postgres returns an updated row last without an ORDER BY.
    topics: Mapped[list["Topic"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="Topic.order_index"
    )


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id"),
        nullable=False
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    order_index: Mapped[int] = mapped_column(
        nullable=False
    )


    # Statuses - empty, pending, processing, ready, failed
    content_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="empty"
    )


    # The sections of the document text this topic's content is generated from.
    material: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        deferred=True
    )


    lesson: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        deferred=True
    )

    document: Mapped["Document"] = relationship(
        back_populates="topics"
    )


    # Topic -< Many Flashcards
    flashcards: Mapped[list["Flashcard"]] = relationship(
        back_populates="topic",
        cascade="all, delete-orphan"
    )


    # Topic -< Many Question
    questions: Mapped[list["Question"]] = relationship(
        back_populates="topic",
        cascade="all, delete-orphan"
    )


    # Topic -< Many TopicMastery Records
    mastery_records: Mapped[list["TopicMastery"]] = relationship(
        back_populates="topic",
        cascade="all, delete-orphan"
    )


    # Topic -< Many QuestionSession
    question_sessions: Mapped[list["QuestionSession"]] = relationship(
        back_populates="topic",
        cascade="all, delete-orphan"
    )


class QuestionSession(Base):
    __tablename__ = "question_sessions"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "topic_id",
            name="user_topic_question_session"
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    topic_id: Mapped[int] = mapped_column(
        ForeignKey("topics.id"),
        nullable=False
    )

    current_question_index: Mapped[int] = mapped_column(
        default=0,
        nullable=False
    )

    question_ids: Mapped[list[int]] = mapped_column(
        JSON,
        nullable=False
    )


    # Topic -< Many QuestionSession
    topic: Mapped["Topic"] = relationship(
        back_populates="question_sessions"
    )

    round: Mapped["int"] = mapped_column(
        default=0,
        nullable=False 
    )


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    topic_id: Mapped[int] = mapped_column(
        ForeignKey("topics.id"),
        nullable=False
    )

    front: Mapped[str] = mapped_column(
        Text, 
        nullable=False
    )

    back: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )


    # Topic -< Many Flashcard
    topic: Mapped["Topic"] = relationship(
        back_populates="flashcards"
    )


    # Flashcard -< Many FlashcardProgress
    flashcard_progress: Mapped[list["FlashcardProgress"]] = relationship(
        back_populates="flashcard",
        cascade="all, delete-orphan"
    )


class FlashcardProgress(Base):
    __tablename__ = "flashcard_progress"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "flashcard_id",
            name="user_flashcard_progress"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    flashcard_id: Mapped[int] = mapped_column(
        ForeignKey("flashcards.id")
    )

    fsrs_data: Mapped[str] = mapped_column(Text)

    flashcard: Mapped["Flashcard"] = relationship(
        back_populates="flashcard_progress"
    )


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    topic_id: Mapped[int] = mapped_column(
        ForeignKey("topics.id"),
        nullable=False
    )

    question: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    options: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False
    )

    answer: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )


    # Difficulties: easy, medium, hard
    difficulty: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )


    # Topic -< Many Question
    topic: Mapped["Topic"] = relationship(
        back_populates="questions"
    )

