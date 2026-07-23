from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database.db import Base, engine
from app.models import *
from app.models.permission_request import PermissionRequest

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
from app.routes import class_teachers
from app.routes import permissions
from app.routes import parents
from dotenv import load_dotenv

load_dotenv()



Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50);"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(10);"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expire TIMESTAMP;"))
    conn.commit()


app = FastAPI(title="TAM DAN SERS")


from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tamdan-ses-lv2.vercel.app",
        "https://tamdan-ses-lv2-psgjkbvt4-hongs-projects-75796329.vercel.app",
        "http://localhost:5173",
    ],
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
app.include_router(permissions.router)
app.include_router(parents.router)


@app.get("/")
def root():
    return {"message": "School Management API is running"}
