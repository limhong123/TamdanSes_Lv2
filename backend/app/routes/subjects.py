from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.subject import Subject
from app.schemas.subject_schema import SubjectCreate

router = APIRouter(prefix="/subjects", tags=["Subjects"])

@router.post("/")
def create_subject(data: SubjectCreate, db: Session = Depends(get_db)):
    subject = Subject(**data.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

@router.get("/")
def get_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).all()