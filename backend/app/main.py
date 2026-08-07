import os
import secrets
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from sqlalchemy import text

from app.database.db import Base, engine
from app.models import *
from app.models.permission_request import PermissionRequest

from app.routes import profile
from app.routes import auth
from app.routes import admin
from app.routes import permissions
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


# --- បិទ docs default, នឹងបើកម្តងទៀតដោយផ្ទាល់ខ្លួនតាម Basic Auth ---
app = FastAPI(
    title="TAM DAN SERS",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

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

# --- Basic Auth សម្រាប់ docs ---
security = HTTPBasic()

DOCS_USERNAME = os.getenv("DOCS_USERNAME", "admin")
DOCS_PASSWORD = os.getenv("DOCS_PASSWORD", "change_this_password")

def verify_docs_user(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, DOCS_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, DOCS_PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

@app.get("/docs", include_in_schema=False)
async def get_docs(username: str = Depends(verify_docs_user)):
    return get_swagger_ui_html(openapi_url="/openapi.json", title="TAM DAN SERS - Docs")

@app.get("/openapi.json", include_in_schema=False)
async def get_open_api_endpoint(username: str = Depends(verify_docs_user)):
    return get_openapi(
        title=app.title,
        version="0.1.0",
        routes=app.routes,
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