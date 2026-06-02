from sqlalchemy import Column, Integer, String
from app.database.db import Base

class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150))
    date = Column(String(30))