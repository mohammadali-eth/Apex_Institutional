import os
import shutil
from typing import Tuple
from fastapi import UploadFile, HTTPException
from app.core.config import settings

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

class StorageService:
    def __init__(self):
        self.upload_dir = settings.STORAGE_DIR
        os.makedirs(self.upload_dir, exist_ok=True)

    def save_upload_file(self, file: UploadFile, subfolder: str = "syllabus") -> Tuple[str, str, int]:
        target_dir = os.path.join(self.upload_dir, subfolder)
        os.makedirs(target_dir, exist_ok=True)

        # Validate extension
        filename = file.filename or "uploaded_file"
        _, ext = os.path.splitext(filename)
        ext = ext.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type '{ext}'. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Generate unique storage filename
        import uuid
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        file_path = os.path.join(target_dir, unique_name)

        # Save file and calculate size
        size = 0
        try:
            with open(file_path, "wb") as buffer:
                while chunk := file.file.read(1024 * 1024):
                    size += len(chunk)
                    if size > MAX_FILE_SIZE_BYTES:
                        raise HTTPException(
                            status_code=400,
                            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES / (1024*1024)} MB"
                        )
                    buffer.write(chunk)
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e

        # URL path for serving
        file_url = f"/uploads/{subfolder}/{unique_name}"
        return file_url, filename, size

    def delete_file(self, file_url: str):
        if not file_url:
            return
        clean_path = file_url.lstrip("/uploads/")
        full_path = os.path.join(self.upload_dir, clean_path)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
            except OSError:
                pass

storage_service = StorageService()
