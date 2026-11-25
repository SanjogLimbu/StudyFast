import os
import stripe

from dotenv import load_dotenv

from fastapi import APIRouter, Depends, HTTPException, Request
from routers.auth import get_current_user

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import User

##

load_dotenv()

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

STRIPE_PRICE_ID = os.environ["STRIPE_PRICE_ID"]
STRIPE_WEBHOOK_SECRET = os.environ["STRIPE_WEBHOOK_SECRET"]
FRONTEND_URL = os.environ["FRONTEND_URL"]

router = APIRouter(
    prefix="/subscription"
)

##

@router.post("/checkout")
def checkout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.plan == "Pro":
        raise HTTPException(
            status_code=400,
            detail="You already have Pro"
        )

    customer = (
        {"customer": current_user.stripe_customer_id}
        if current_user.stripe_customer_id
        else {"customer_email": current_user.email}
    )

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[
            {
                "price": STRIPE_PRICE_ID,
                "quantity": 1
            }
        ],
        **customer,
        client_reference_id=str(current_user.id),
        subscription_data={
            "metadata": {
                "user_id": str(current_user.id)
            }
        },
        success_url=f"{FRONTEND_URL}/account?success=true",
        cancel_url=f"{FRONTEND_URL}/account?cancelled=true"
    )

    return {
        "url": session.url
    }

@router.post("/webhook")
async def webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            signature,
            STRIPE_WEBHOOK_SECRET
        )

    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(
            status_code=400,
            detail="Invalid webhook"
        )

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type in [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted"
    ]:
        # Retrieve the current subscription state
        subscription = stripe.Subscription.retrieve(
            data["id"]
        )

        user_id = subscription["metadata"].get("user_id")
        status = subscription["status"]

        valid_price = any(
            item["price"]["id"] == STRIPE_PRICE_ID
            for item in subscription["items"]["data"]
        )

        is_pro = (
            status in ["active", "trialing"]
            and valid_price
        )

        if user_id:
            user = db.scalar(
                select(User)
                .where(User.id == int(user_id))
            )

            if not user:
                return {"received": True}

            user.plan = "Pro" if is_pro else "Free"
            user.stripe_customer_id = subscription["customer"]
            user.stripe_subscription_id = subscription["id"]
            user.subscription_status = status

            db.commit()

    return {"received": True}

@router.get("/status")
def status(
    current_user: User = Depends(get_current_user),
):
    return {
        "plan": current_user.plan,
        "status": current_user.subscription_status
    }
