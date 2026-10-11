import os
import secrets
import httpx

from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from fastapi.responses import RedirectResponse
from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from models import User, StudyDay, LoginSession
from schemas import RegisterRequest, LoginRequest
from hashing import hash_password, verify_password, hash_session_token
from datetime import datetime, timedelta, timezone

##

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

APP_URL = os.environ["APP_URL"]
IS_PRODUCTION = os.environ.get("IS_PRODUCTION") == "true"
GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
GOOGLE_CLIENT_SECRET = os.environ["GOOGLE_CLIENT_SECRET"]
GOOGLE_REDIRECT_URI = f"{APP_URL}/api/auth/google/callback"

# A session ends after this long without being used.
SESSION_LIFETIME = timedelta(days=30)

##

def start_session(response: Response, user_id: int, db: Session):
    token = secrets.token_urlsafe(32)

    db.add(
        LoginSession(
            user_id=user_id,
            token_hash=hash_session_token(token),
            expires_at=datetime.now(timezone.utc) + SESSION_LIFETIME
        )
    )

    db.commit()

    # The cookie outlives the session on purpose, as the session's expiry is checked on the server.
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        max_age=60*60*24*400
    )


@router.get("/google/login")
def google_login():
    state = secrets.token_urlsafe(32)

    params = urlencode({
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email",
        "state": state
    })

    response = RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        max_age=600
    )

    return response


@router.get("/google/callback")
def google_callback(
    code: str | None = None,
    state: str | None = None,
    oauth_state: str | None = Cookie(default=None),
    db: Session = Depends(get_db)
):
    # User cancelled on Google's screen, or the state doesn't match the one we issued.
    if (not code or not state or not oauth_state or not secrets.compare_digest(state, oauth_state)):
        return RedirectResponse(f"{APP_URL}/login")


    token_response = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
    )
    token_response.raise_for_status()

    profile = httpx.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {token_response.json()['access_token']}"}
    ).json()

    if (not profile.get("email_verified")):
        return RedirectResponse(f"{APP_URL}/login")


    # Check if user logged in via OAUTH before.
    user = db.scalar(
        select(User)
        .where(User.google_sub == profile["sub"])
    )


    # User hasn't logged in via OAuth before so we need to create an account or link their existing account to Google.
    if (user is None):
        email = profile["email"].lower()
        user = db.scalar(
            select(User)
            .where(User.email == email)
        )

        if (user is None):
            user = User(
                email=email,
                email_verified=True,
                google_sub=profile["sub"]
            )

            db.add(user)

        else:
            # Account is already linked to a different Google account.
            if (user.google_sub is not None):
                return RedirectResponse(f"{APP_URL}/login")

            
            # Existing password-created account.
            user.google_sub = profile["sub"]


            # Someone tried to create an account with the same email but they didn't verify it. Wipe the password and verify the email.
            if (not user.email_verified):
                user.password_hash = None
                user.email_verified = True


        db.commit()


    response = RedirectResponse(f"{APP_URL}/home")
    response.delete_cookie("oauth_state")
    start_session(response, user.id, db)

    return response


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    email = data.email.lower().strip()

    # Search for user with same email and reject request if a user is found.
    query = select(User).where(
        User.email == email
    )
    existing_user = db.scalar(query)

    if (existing_user):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )


    hashed_password = hash_password(data.password)

    user = User(
        email=email,
        password_hash=hashed_password
    )


    # Guard against concurrent account creations using same email.
    try:
        db.add(user)
        db.commit()
        db.refresh(user)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )


@router.post("/login",)
def login(
    data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    email = data.email.lower().strip()

    # Check if account with email exists first.
    query = select(User).where(
        User.email == email 
    )
    existing_user = db.scalar(query)

    # Accounts created with Google have no password to check.
    if (not existing_user or existing_user.password_hash is None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is not correct."
        )


    # Verify inputted password matches stored hash
    password_matches = verify_password(data.password, existing_user.password_hash)

    if (not password_matches):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is not correct."
        )


    start_session(response, existing_user.id, db)


def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db)
):
    if (access_token is None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is not authorized."
        )


    now =datetime.now(timezone.utc)

    session = db.scalar(
        select(LoginSession)
        .where(
            LoginSession.token_hash == hash_session_token(access_token),
            LoginSession.expires_at > now
        )
    )

    if (session is None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is not authorized."
        )


    # Using a session keeps it alive. It is extended at most once a day so most requests don't write.
    if (session.expires_at - now < SESSION_LIFETIME - timedelta(days=1)):
        session.expires_at = now + SESSION_LIFETIME
        db.commit()


    return db.get(User, session.user_id)


@router.get("/account")
def account(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email
    }


@router.post("/logout")
def logout(
    response: Response,
    access_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db)
):
    if (access_token is not None):
        db.execute(
            delete(LoginSession)
            .where(LoginSession.token_hash == hash_session_token(access_token))
        )

        db.commit()


    response.delete_cookie(
        key="access_token",
        path="/"
    )


@router.get("/activity")
def activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    days = db.scalars(
        select(StudyDay.day)
        .where(
            StudyDay.user_id == current_user.id
        )
        .order_by(StudyDay.day)
    ).all()

    return {
        "days": [day.isoformat() for day in days] 
    } 

