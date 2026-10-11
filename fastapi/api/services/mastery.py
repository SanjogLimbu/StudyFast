from fsrs import Card
from sqlalchemy import select

from models import FlashcardProgress

##

# A flashcard counts as fully learned once its memory is expected to last this many days.
LEARNED_DAYS = 7

##

# Half of a topic's mastery is how well its flashcards are remembered, and half is its quiz score.
def update_mastery(db, topic_mastery):
    flashcard_ids = [
        flashcard.id
        for flashcard in topic_mastery.topic.flashcards
    ]


    # A topic without flashcards is scored on its quiz alone.
    if (not flashcard_ids):
        topic_mastery.mastery = round(topic_mastery.quiz_mastery, 1)

        return


    progress_records = db.scalars(
        select(FlashcardProgress)
        .where(
            FlashcardProgress.user_id == topic_mastery.user_id,
            FlashcardProgress.flashcard_id.in_(flashcard_ids)
        )
    ).all()

    learned = 0

    # A flashcard that was never reviewed has no progress record, so it adds nothing.
    for progress in progress_records:
        stability = Card.from_json(progress.fsrs_data).stability
        learned += min(stability / LEARNED_DAYS, 1)


    memory = learned / len(flashcard_ids) * 100

    topic_mastery.mastery = round((memory + topic_mastery.quiz_mastery) / 2, 1)
