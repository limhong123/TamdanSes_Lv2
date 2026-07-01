from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.user import User
from app.schemas.notification_schema import FCMTokenSchema, SendNotificationSchema
from app.core.security import get_current_user
from app.services.notification_service import send_push_notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/fcm-token")
def save_fcm_token(
    data: FCMTokenSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.fcm_token = data.token
    db.commit()

    return {"message": "FCM token saved"}


@router.post("/send")
def send_notification(
    data: SendNotificationSchema,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == data.user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.fcm_token:
        raise HTTPException(status_code=400, detail="User has no FCM token")

    response = send_push_notification(
        token=user.fcm_token,
        title=data.title,
        body=data.body,
    )

    return {
        "message": "Notification sent",
        "firebase_response": response,
    }