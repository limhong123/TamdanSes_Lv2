from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.notification import Notification
from app.schemas.notification_schema import NotificationCreate

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.post("/")
def create_notification(data: NotificationCreate, db: Session = Depends(get_db)):
    notification = Notification(**data.model_dump())
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification

@router.get("/")
def get_notifications(db: Session = Depends(get_db)):
    return db.query(Notification).all()