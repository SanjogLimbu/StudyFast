from pathlib import Path
from uuid import uuid4
from rq import Retry

from job_queue import document_queue
from worker.tasks import process_document, process_topic

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from openai import APITimeoutError
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, selectinload

from datetime import datetime, timezone

from database import get_db
from models import Document, User, Topic, TopicMastery
from schemas import PromptRequest, HelpPrompt
from routers.auth import get_current_user
from services.document_processing import UPLOAD_PATH, UnreadableDocumentError, extract_text, generate_help_response

##

router = APIRouter(
    prefix="/documents",
    tags=["documents"]
)

MIN_FILE_SIZE = 1 * 1024 # 1 KB
MAX_FILE_SIZE = MIN_FILE_SIZE * 1024 * 35  # 35 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_DAILY_UPLOADS_FREE = 1
MAX_DAILY_UPLOADS_PAID = 5

##

def uploads_today(user):
    today = datetime.now(timezone.utc).date()

    if (user.last_upload.astimezone(timezone.utc).date() != today):
        return 0 


    return user.uploads


def get_topics_and_document_mastery(current_user, document):
    topics = []
    document_mastery = 0 

    for topic in document.topics:
        mastery_record = next(
            (
                record
                for record in topic.mastery_records
                if record.user_id == current_user.id
            ),
            None
        )


        if (not mastery_record):
            continue 


        mastery = mastery_record.mastery
        document_mastery += mastery 

        topics.append({
            "id": topic.id,
            "name": topic.name,
            "order_index": topic.order_index,
            "mastery": mastery,
            "status": mastery_record.status,
            "content_status": topic.content_status
        })


    if (document.topics):
        document_mastery = round(document_mastery / len(topics), 1)


    return topics, document_mastery
    

def generate_topic_content(
    document_id: int,
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Lock the topic so a double click can't queue its generation twice.
    query = (
        select(Topic)
        .join(Document)
        .where(
            Topic.id == topic_id,
            Topic.document_id == document_id,
            Document.user_id == current_user.id
        )
        .with_for_update(of=Topic)
    )

    topic = db.scalar(query)

    if (topic is None):
        raise HTTPException(
            status_code=404,
            detail="Topic not found."
        )


    mastery_record = db.scalar(
        select(TopicMastery)
        .where(
            TopicMastery.topic_id == topic.id,
            TopicMastery.user_id == current_user.id
        )
    )


    # Locked topics can't be generated so AI budget is only spent on topics the user has reached.
    if (mastery_record is None or mastery_record.status == "locked"):
        raise HTTPException(
            status_code=403,
            detail="Topic is locked."
        )


    if (topic.content_status not in ["empty", "failed"]):
        raise HTTPException(
            status_code=409,
            detail="Topic is already generated."
        )


    # User should see that their request actually went through and is processing.
    topic.content_status = "pending"
    db.commit()

    document_queue.enqueue(
        process_topic,
        topic.id,
        job_timeout=300,
        retry=Retry(
            max=3,
            interval=[10, 30, 60]
        )
    )


##

@router.post(
    "/prompt",
    status_code=status.HTTP_201_CREATED
)
def prompt(
    user_prompt: PromptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_uploads_today = uploads_today(current_user)

    if (user_uploads_today >= MAX_DAILY_UPLOADS_FREE):
        raise HTTPException(
            status_code=429,
            detail="You reached your daily upload limit."
        ) 


    text = user_prompt.user_prompt
    
    document = Document(
        user_id=current_user.id,
        original_filename="[Prompt]",
        text=text,
        source="prompt"
    )


    current_user.last_upload = datetime.now(timezone.utc)
    current_user.uploads = user_uploads_today + 1

    try:
        db.add(document)
        db.commit()
        db.refresh(document)

    except Exception:
        db.rollback()

        raise


    # Let AI Document processing be done in the background by a worker as it's expensive.
    document_queue.enqueue(
        process_document,
        document.id,
        job_timeout=300,
        retry=Retry(
            max=3,
            interval=[10, 30, 60]
        )
    )


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED
)
def upload(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if (not file.filename):
        raise HTTPException(
            status_code=400,
            detail="File must have a filename."
        )


    # Check that the file is of a valid file type (PDF, DOCX, TXT) before uploading.
    extension = Path(file.filename).suffix.lower()

    if (extension not in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail="File type is not supported."
        )


    db.refresh(current_user, with_for_update=True)
    user_uploads_today = uploads_today(current_user)

    if (user_uploads_today >= MAX_DAILY_UPLOADS_FREE):
        raise HTTPException(
            status_code=429,
            detail="You reached your daily upload limit."
        ) 


    # Stop users from uploading multiple files at once to help reduce server load / api load.
    query = (
        select(Document.id)
        .where(
            Document.user_id == current_user.id,
            Document.status.in_(["pending", "processing"])
        )
    ).limit(1)

    if (db.scalar(query)):
        raise HTTPException(
            status_code=429,
            detail="Wait for your previous upload to finish."
        )


    # Save the file temporarily under a folder named after the user id so its text can be extracted.
    # User folder must be dynamically created if it does not exist (first time uploading).
    # Github does not track empty folders so this is also needed to dynamically create "uploads" folder.
    user_directory = (
        UPLOAD_PATH / str(current_user.id)
    )

    user_directory.mkdir(
        parents=True,
        exist_ok=True
    )

    stored_filename = f"{uuid4()}{extension}"
    file_path = (user_directory / stored_filename)


    # Write the document in chunks of 1 MB to avoid storing entire document on memory.
    size = 0

    try:
        with (file_path.open("wb") as destination):
            while (chunk := file.file.read(1024 * 1024)):
                size += len(chunk)

                if (size > MAX_FILE_SIZE):
                    raise HTTPException(
                        status_code=413,
                        detail="File is too large."
                    )
                

                destination.write(chunk)


    except Exception:
        if (file_path.exists()):
            file_path.unlink()


        raise


    if (size < MIN_FILE_SIZE):
        file_path.unlink()

        raise HTTPException(
            status_code=422,
            detail="File is too small."
        )


    # Reject files without readable text (e.g. scanned PDFs) before they are queued.
    # Only the text is kept, so the file is deleted either way.
    try:
        text = extract_text(file_path)

    except UnreadableDocumentError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error)
        )

    finally:
        file_path.unlink()


    document = Document(
        user_id=current_user.id,
        original_filename=file.filename,
        text=text
    )


    current_user.last_upload = datetime.now(timezone.utc)
    current_user.uploads = user_uploads_today + 1

    try:
        db.add(document)
        db.commit()
        db.refresh(document)

    except Exception:
        db.rollback()

        raise


    # Let AI Document processing be done in the background by a worker as it's expensive.
    document_queue.enqueue(
        process_document,
        document.id,
        job_timeout=300,
        retry=Retry(
            max=3,
            interval=[10, 30, 60]
        )
    )


@router.get("")
def get_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Polled every second while a document is processing, so mastery is averaged in the database instead of loading every topic and mastery row.
    query = (
        select(
            Document.id,
            Document.title,
            Document.status,
            func.avg(TopicMastery.mastery).label("mastery")
        )
        .select_from(Document)
        .outerjoin(Topic)
        .outerjoin(
            TopicMastery,
            and_(
                TopicMastery.topic_id == Topic.id,
                TopicMastery.user_id == current_user.id
            )
        )
        .where(Document.user_id == current_user.id)
        .group_by(Document.id)
        .order_by(Document.uploaded_at.desc())
    )

    documents_data = []

    for document in db.execute(query):
        data = {
            "id": document.id,
            "title": document.title,
            "status": document.status,

            # A document without topics has no mastery to average.
            "mastery": round(document.mastery or 0.0, 1)
        }

        documents_data.append(data)


    return documents_data 


@router.get("/{document_id}")
def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        select(Document)
        .options(
            selectinload(Document.topics)
            .selectinload(Topic.mastery_records)
        )
        .where(
            Document.user_id == current_user.id,
            Document.id == document_id
        )
    )

    document = db.scalar(query)

    if (document is None):
        raise HTTPException(
            status_code=404,
            detail="Document not found."
        )


    topics, document_mastery = get_topics_and_document_mastery(current_user, document)

    return {
        "title": document.title,
        "topics": topics,
        "mastery": document_mastery
    }


@router.get("/{document_id}/topics/{topic_id}/lesson")
def get_lesson(
    document_id: int,
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        select(Topic)
        .join(Document)
        .where(
            Topic.id == topic_id,
            Topic.document_id == document_id,
            Document.user_id == current_user.id
        )
    )

    topic = db.scalar(query)

    if (topic is None):
        raise HTTPException(
            status_code=404,
            detail="Topic not found."
        )


    topic_mastery = db.scalar(
        select(TopicMastery)
        .where(
            TopicMastery.topic_id == topic.id,
            TopicMastery.user_id == current_user.id
        )
    )

    return {
        "name": topic.name,
        "lesson": topic.lesson,
        "read": topic_mastery is not None and topic_mastery.lesson_read
    }


@router.post("/{document_id}/topics/{topic_id}/lesson/read")
def read_lesson(
    document_id: int,
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        select(TopicMastery)
        .join(Topic)
        .join(Document)
        .where(
            Topic.id == topic_id,
            Topic.document_id == document_id,
            Document.user_id == current_user.id,
            TopicMastery.user_id == current_user.id
        )
    )

    topic_mastery = db.scalar(query)

    if (topic_mastery is None):
        raise HTTPException(
            status_code=404,
            detail="Topic not found."
        )


    topic_mastery.lesson_read = True

    db.commit()


@router.delete("/{document_id}")
def deleteDocument(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        select(Document)
        .where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )

    document = db.scalar(query)

    if (document is None):
        raise HTTPException(
            status_code=404,
            detail="Document not found."
        )


    db.delete(document)
    db.commit()


@router.post("/{document_id}/topics/{topic_id}/help")
def help(
    document_id: int,
    topic_id: int,
    request: HelpPrompt,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        select(Topic)
        .join(Document)
        .where(
            Topic.id == topic_id,
            Document.user_id == user.id
        )
    )

    topic = db.scalar(query)

    if (topic is None or not topic.lesson):
        raise HTTPException(
            status_code=403,
            detail="Topic not found."
        )

    # The answer is about whatever the learner has on screen.
    if (request.flashcard):
        context = (
            "The flashcard the learner is studying:\n"
            f"Front: {request.flashcard.front}\n"
            f"Back: {request.flashcard.back}"
        )

    elif (request.question):
        options = "\n".join(f"- {option}" for option in request.question.options)

        context = (
            "The multiple-choice question the learner is answering:\n"
            f"{request.question.question}\n\n"
            f"Options:\n{options}"
        )

        if (request.question.answer):
            context += f"\n\nThe learner has answered it. The correct answer is: {request.question.answer}"

    else:
        context = "The lesson the learner is reading:\n" + topic.lesson


    try:
        return generate_help_response(request.user_prompt, context)

    except APITimeoutError:
        raise HTTPException(
            status_code=504,
            detail="The answer took too long. Please try again."
        )
