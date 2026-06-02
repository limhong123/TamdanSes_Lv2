from sqlalchemy import Column, Integer, String, Text
from app.database.db import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150))
    message = Column(Text)
    target_role = Column(String(20), default="all")