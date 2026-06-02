from sqlalchemy import Column, Integer, String, Text
from app.database.db import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150))
    description = Column(Text)
    event_date = Column(String(30))