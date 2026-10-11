from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from database import get_db
from datetime import datetime, timezone
from models import Topic, Document, User, Flashcard, FlashcardProgress, TopicMastery
from schemas import ReviewRequest
from routers.auth import get_current_user
from services.mastery import update_mastery
from fsrs import Scheduler, Card, Rating, State

##

router = APIRouter(
    prefix="/flashcards",
    tags=["flashcards"]
)

scheduler = Scheduler()

##

@router.get("/{topic_id}")
def get_flashcard(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        select(Topic)
        .options(
            selectinload(Topic.flashcards)
        )
        .join(Document)
        .where(
            Topic.id == topic_id,
            Document.user_id == current_user.id
        )
    )

    topic = db.scalar(query)

    if (topic is None):
        raise HTTPException(
            status_code=404,
            detail="Topic not found."
        )


    if (topic.content_status != "ready"):
        raise HTTPException(
            status_code=409,
            detail="Topic has not been generated."
        )


    if (not topic.flashcards):
        return {
            "state": "complete"
        }
    

    topic_mastery = next(
        (
            record
            for record in topic.mastery_records
            if record.user_id == current_user.id
        ),
        None
    )

    if (topic_mastery is None):
        raise HTTPException(
            status_code=404,
            detail="Topic mastery not found."
        )


    if (topic_mastery and topic_mastery.status == "locked"):
        raise HTTPException(
            status_code=403,
            detail="Topic is locked."
        )

    
    now = datetime.now(timezone.utc)
    new_card = None
    soonest_due = None 
    completed_cards = 0 

    # Show due cards first before showing new cards.
    # Give user flashcards until all cards are in "Review" state.
    for flashcard in topic.flashcards:
        progress = db.scalar(
            select(FlashcardProgress)
            .where(
                FlashcardProgress.user_id == current_user.id,
                FlashcardProgress.flashcard_id == flashcard.id
            )
        )

        if (not progress):
            if (not new_card):
                new_card = {
                    "state": "card",
                    "id": flashcard.id,
                    "front": flashcard.front,
                    "back": flashcard.back
                }
                

            continue


        card = Card.from_json(progress.fsrs_data)

        if (card.due <= now):
            if (topic_mastery.completed_flashcards):
                topic_mastery.completed_flashcards = False

                db.commit()


            return {
                "state": "card",
                "id": flashcard.id,
                "front": flashcard.front,
                "back": flashcard.back
            }

        else:
            if (soonest_due is None or card.due < soonest_due):
                soonest_due = card.due 


            # User finished initial learning of the card for current study session.
            if (card.state == State.Review or card.state == State.Relearning):
                completed_cards += 1 


    if (new_card):
        if (topic_mastery.completed_flashcards):
            topic_mastery.completed_flashcards = False

            db.commit()


        return new_card


    completion = round(completed_cards / len(topic.flashcards) * 100, 1)

    # User should move onto doing practice questions after learning all the cards.
    if (completion == 100):
        if (not topic_mastery.completed_flashcards):
            topic_mastery.completed_flashcards = True 
            topic_mastery.round += 1

            db.commit()


        return {
            "state": "complete"
        }


    # All cards are now on cooldown in one of the short learning steps - This is a "break period".
    # User needs to see their flashcard review completion % and how long their "break" actually is.
    # Browser calculates break time left instead of server to avoid polling every second.
    return {
        "state": "break",
        "completion": completion,
        "seconds_left": (soonest_due - now).total_seconds()
    } 


@router.post("/{flashcard_id}/review")
def review(
    review: ReviewRequest,
    flashcard_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        select(Flashcard)
        .join(Topic)
        .join(Document)
        .where(
            Flashcard.id == flashcard_id,
            Document.user_id == current_user.id
        )
    )

    flashcard = db.scalar(query)

    if (flashcard is None):
        raise HTTPException(
            status_code=404,
            detail="Flashcard not found."
        )


    progress = db.scalar(
        select(FlashcardProgress)
        .where(
            FlashcardProgress.user_id == current_user.id,
            FlashcardProgress.flashcard_id == flashcard.id
        )
    )


    if (progress is None):
        card = Card()

        progress = FlashcardProgress(
            user_id=current_user.id,
            flashcard_id=flashcard.id
        )

        db.add(progress)

    else:
        card = Card.from_json(progress.fsrs_data)


    if (card and card.due > datetime.now(timezone.utc)):
        raise HTTPException(
            status_code=409,
            detail="Card is on cooldown."
        )


    rating = (
        Rating.Again
        if review.response == "again"
        else Rating.Good
    )

    card, review_log = scheduler.review_card(
        card,
        rating
    )

    progress.fsrs_data = card.to_json()

    topic_mastery = db.scalar(
        select(TopicMastery)
        .where(
            TopicMastery.topic_id == flashcard.topic_id,
            TopicMastery.user_id == current_user.id
        )
    )

    if (topic_mastery):
        # Autoflush is off, so a new progress record must be flushed before mastery is recalculated from it.
        db.flush()
        update_mastery(db, topic_mastery)


    db.commit()

