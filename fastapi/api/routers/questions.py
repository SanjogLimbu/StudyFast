from fastapi import APIRouter, Depends, HTTPException 
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from datetime import datetime, timezone, timedelta, date

import random

from database import get_db
from models import User, Topic, Question, Document, TopicMastery, QuestionSession, StudyDay
from schemas import UserAnswer
from routers.auth import get_current_user
from services.mastery import update_mastery

##

router = APIRouter(
    prefix="/questions",
    tags=["questions"]
)

##

def construct_question_set(questions):
    cleaned_questions = []
    
    for question in questions:
        options = random.sample(question.options, k=len(question.options))

        cleaned_questions.append(
            {
                "id": question.id,
                "question": question.question,
                "options": options,
                "difficulty": question.difficulty
            }
        )


    return cleaned_questions


def generate_questions(db, current_user, topic_id):
    query = (
        select(Question)
        .join(Topic)
        .join(Document)
        .where(
            Document.user_id == current_user.id,
            Topic.id == topic_id
        )
    )

    questions = db.scalars(query).all()

    if (not questions):
        raise HTTPException(
            status_code=404,
            detail="Questions not found."
        )


    questions_copy = questions.copy()
    random.shuffle(questions_copy)

    return questions_copy[:5]

    
@router.get("/{topic_id}")
def get_questions(
    topic_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_query = (
        select(QuestionSession)
        .join(Topic)
        .where(
            Topic.id == topic_id,
            QuestionSession.user_id == current_user.id 
        )
    )
    
    session = db.scalar(session_query)

    topic_mastery = db.scalar(
        select(TopicMastery)
        .where(
            TopicMastery.topic_id == topic_id,
            TopicMastery.user_id == current_user.id
        )
    )

    if (topic_mastery and topic_mastery.status == "locked"):
        raise HTTPException(
            status_code=403,
            detail="Topic is locked."
        )


    if (session):
        questions = None

        if (topic_mastery):
            if (session.round < topic_mastery.round):
                # Session is old - generate new session.
                questions = generate_questions(db, current_user, topic_id)

                session.question_ids = [
                    question.id
                    for question in questions
                ]

                session.current_question_index = 0
                session.round = topic_mastery.round 

                db.commit()

            elif (session.current_question_index >= len(session.question_ids)):
                raise HTTPException(
                    status_code=409,
                    detail="Session is already completed."
                )


        if (not questions):
            # Continuing uncompleted session.
            questions = db.scalars(
                select(Question)
                .where(Question.id.in_(session.question_ids))
            ).all()


        # Reconstruct correct order of questions.
        questions_by_id = {
            question.id: question
            for question in questions
        }

        questions = [
            questions_by_id[question_id]
            for question_id in session.question_ids
        ]

        cleaned_questions = construct_question_set(questions)

        return {
            "questions": cleaned_questions,
            "current_question_index": session.current_question_index
        } 


    # User's first time doing questions for this topic - generate session.
    questions = generate_questions(db, current_user, topic_id)
    cleaned_questions = construct_question_set(questions)

    ids = [question["id"] for question in cleaned_questions]
    session = QuestionSession(
        user_id=current_user.id,
        topic_id=topic_id,
        current_question_index=0,
        question_ids=ids,
        round=topic_mastery.round if topic_mastery else 0
    )


    db.add(session)
    db.commit()

    return {
        "questions": cleaned_questions,
        "current_question_index": session.current_question_index
    }


@router.post("/{topic_id}/{question_id}/answer")
def answer_question(
    question_id: int,
    topic_id: int,
    user_answer: UserAnswer,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.scalar((
        select(QuestionSession)
        .where(
            QuestionSession.topic_id == topic_id,
            QuestionSession.user_id == current_user.id
        )
    ))

    if (not session):
        raise HTTPException(
            status_code=404,
            detail="Question session for topic was not found."
        )


    topic_mastery = db.scalar(
        select(TopicMastery)
        .join(Topic)
        .where(
            TopicMastery.topic_id == topic_id,
            TopicMastery.user_id == current_user.id
        )
    )

    if (topic_mastery is None):
        raise HTTPException(
            status_code=404,
            detail="Topic mastery was not found."
        )


    if (topic_mastery and topic_mastery.status == "locked"):
        raise HTTPException(
            status_code=403,
            detail="Topic is locked."
        )

    
    # Session is from an earlier round; GET /questions regenerates it once the flashcards are completed again.
    if (session.round < topic_mastery.round):
        raise HTTPException(
            status_code=409,
            detail="Question session is outdated."
        )
    
        
    question_ids = session.question_ids
    current_question_index = session.current_question_index

    if (current_question_index >= len(question_ids)):
        raise HTTPException(
            status_code=409,
            detail="Question session is finished."
        )

    
    # User is trying to answer a random/wrong question.
    if (question_ids[current_question_index] != question_id):
        raise HTTPException(
            status_code=400,
            detail="Answering incorrect question."
        )


    question = db.scalar((
        select(Question)
        .where(
            Question.topic_id == topic_id,
            Question.id == question_id
        )
    ))


    if (not question):
        raise HTTPException(
            status_code=404,
            detail="Question not found."
        )


    session.current_question_index += 1
    finished = session.current_question_index >= len(question_ids)
    correct = user_answer.user_answer == question.answer

    # Each question is worth its share of the topic, so answering every question correctly once fills the quiz half of mastery.
    step = 100 / db.scalar(
        select(func.count())
        .select_from(Question)
        .where(Question.topic_id == topic_id)
    )

    if (correct):
        topic_mastery.quiz_mastery = min(
            topic_mastery.quiz_mastery + step,
            100
        )

    else:
        topic_mastery.quiz_mastery = max(
            topic_mastery.quiz_mastery - step,
            0
        )


    update_mastery(db, topic_mastery)


    if (finished):
        # Add a new streak day to the user. Model constraints ensure uniqueness so a check is not needed.
        db.execute(
            insert(StudyDay)
            .values(
                user_id=current_user.id,
                day=datetime.now(timezone.utc).date()
            )
            .on_conflict_do_nothing()
        )


        # Unlock the next topic if user has finished doing the question task for current topic.
        next_topic_mastery = db.scalar(
            select(TopicMastery)
            .join(Topic)
            .where(
                TopicMastery.user_id == current_user.id,
                Topic.document_id == topic_mastery.topic.document_id,
                Topic.order_index == topic_mastery.topic.order_index + 1
            )
        )


        if (next_topic_mastery and next_topic_mastery.status != "unlocked"):
            next_topic_mastery.status = "unlocked"


    db.commit()

    if (finished):
        return {
            "correct": correct,
            "answer": question.answer,
            "finished": True
        }


    else:
        
        return {
            "correct": correct,
            "answer": question.answer,
        }

