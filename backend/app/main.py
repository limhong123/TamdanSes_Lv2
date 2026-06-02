from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.db import Base, engine
from app.models import *
from app.routes import profile
from app.routes import auth
from app.routes import admin
from app.routes import teachers
from app.routes import students
from app.routes import classes
from app.routes import subjects
from app.routes import schedules
from app.routes import attendance
from app.routes import scores
from app.routes import homework
from app.routes import submissions
from app.routes import notifications
from app.routes import events
from app.routes import holidays
from fastapi.staticfiles import StaticFiles
from app.routes import class_teachers

Base.metadata.create_all(bind=engine)
app = FastAPI(title="TAM DAN SES")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(profile.router)
app.include_router(teachers.router)
app.include_router(students.router)
app.include_router(classes.router)
app.include_router(subjects.router)
app.include_router(schedules.router)
app.include_router(class_teachers.router)
app.include_router(attendance.router)
app.include_router(scores.router)
app.include_router(homework.router)
app.include_router(submissions.router)
app.include_router(notifications.router)
app.include_router(events.router)
app.include_router(holidays.router)

@app.get("/")
def root():
    return {"message": "School Management API is running"}