import cloudinary
import cloudinary.uploader
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)

def upload_file_to_cloudinary(file, folder="tamdan/homework"):
    result = cloudinary.uploader.upload(
        file.file,
        folder=folder,
        resource_type="auto"
    )
    return result["secure_url"]