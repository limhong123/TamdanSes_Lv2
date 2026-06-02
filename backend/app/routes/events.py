from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.event import Event
from app.schemas.event_schema import EventCreate

router = APIRouter(prefix="/events", tags=["Events"])


def event_response(event: Event):
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "date": event.event_date,
    }


@router.post("/")
def create_event(data: EventCreate, db: Session = Depends(get_db)):
    event = Event(
        title=data.title,
        description=data.description,
        event_date=data.event_date,
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return event_response(event)


@router.get("/")
def get_events(db: Session = Depends(get_db)):
    events = db.query(Event).order_by(Event.event_date.desc()).all()
    return [event_response(event) for event in events]


@router.put("/{event_id}")
def update_event(event_id: int, data: EventCreate, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.title = data.title
    event.description = data.description
    event.event_date = data.event_date

    db.commit()
    db.refresh(event)

    return event_response(event)


@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(event)
    db.commit()

    return {"message": "Event deleted successfully"}