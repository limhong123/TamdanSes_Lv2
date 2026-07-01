from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification_schema import (
    FCMTokenSchema,
    SendNotificationSchema,
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse,
)
from app.core.security import get_current_user
from app.services.notification_service import send_push_notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    return db.query(Notification).order_by(Notification.id.desc()).all()


@router.post("", response_model=NotificationResponse)
def create_notification(
    data: NotificationCreate,
    db: Session = Depends(get_db),
):
    notification = Notification(
        title=data.title,
        message=data.message,
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


@router.put("/{notification_id}", response_model=NotificationResponse)
def update_notification(
    notification_id: int,
    data: NotificationUpdate,
    db: Session = Depends(get_db),
):
    notification = db.query(Notification).filter(Notification.id == notification_id).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.title = data.title
    notification.message = data.message

    db.commit()
    db.refresh(notification)

    return notification


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
):
    notification = db.query(Notification).filter(Notification.id == notification_id).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()

    return {"message": "Notification deleted"}


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