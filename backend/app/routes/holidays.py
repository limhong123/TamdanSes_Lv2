from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.holiday import Holiday
from app.schemas.holiday_schema import HolidayCreate

router = APIRouter(prefix="/holidays", tags=["Holidays"])

@router.post("/")
def create_holiday(data: HolidayCreate, db: Session = Depends(get_db)):
    holiday = Holiday(**data.model_dump())
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday

@router.get("/")
def get_holidays(db: Session = Depends(get_db)):
    return db.query(Holiday).all()