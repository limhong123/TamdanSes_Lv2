from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:limhong@localhost/TamdanSes"
    SECRET_KEY: str = "mysecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int =10080
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""    
    CLOUDINARY_API_SECRET: str = ""
    ADMIN_SECRET_KEY: str=""
    PLASGATE_PRIVATE_KEY: str=""
    PLASGATE_SECRET: str=""
    PLASGATE_SENDER: str=""

    class Config:
        env_file = ".env"

settings = Settings()

DATABASE_URL = settings.DATABASE_URL
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
CLOUDINARY_CLOUD_NAME = settings.CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY = settings.CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET = settings.CLOUDINARY_API_SECRET
ADMIN_SECRET_KEY = settings.ADMIN_SECRET_KEY
PLASGATE_PRIVATE_KEY = settings.PLASGATE_PRIVATE_KEY
PLASGATE_SECRET = settings.PLASGATE_SECRET
PLASGATE_SENDER = settings.PLASGATE_SENDER