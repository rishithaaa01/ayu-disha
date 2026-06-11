from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from services.transcription_service import transcription_service
from middleware.auth_middleware import get_current_user
from models.user import UserResponse
import os
import tempfile
import uuid
import time
from collections import defaultdict

router = APIRouter()

rate_limit_store = defaultdict(list)

def check_rate_limit(key: str, limit: int, window: int) -> bool:
    now = time.time()
    rate_limit_store[key] = [t for t in rate_limit_store[key] if now - t < window]
    if len(rate_limit_store[key]) >= limit:
        return False
    rate_limit_store[key].append(now)
    return True

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Endpoint for ASHA workers to upload audio recordings of field visits.
    Uses local faster-whisper to transcribe voice notes.
    """
    # Rate Limiting: 10 requests per minute per user
    rate_limit_key = f"voice_transcribe:{current_user.id}"
    if not check_rate_limit(rate_limit_key, limit=10, window=60):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.wav', '.mp3', '.m4a', '.ogg', '.webm', '.bin']:
        raise HTTPException(status_code=400, detail="Unsupported audio format")
        
    # MIME validation
    allowed_content_types = [
        "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3", 
        "audio/m4a", "audio/x-m4a", "audio/ogg", "audio/webm", 
        "video/webm", "application/octet-stream"
    ]
    if file.content_type not in allowed_content_types:
        raise HTTPException(status_code=400, detail="Invalid audio MIME type")

    # Generate secure random temp filename
    temp_dir = tempfile.gettempdir()
    temp_filename = f"upload_{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(temp_dir, temp_filename)
    
    try:
        # Enforce max upload size: 10MB
        MAX_FILE_SIZE = 10 * 1024 * 1024
        file_size = 0
        with open(temp_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB chunk
                if not chunk:
                    break
                file_size += len(chunk)
                if file_size > MAX_FILE_SIZE:
                    raise HTTPException(status_code=413, detail="File too large. Max allowed size is 10MB.")
                buffer.write(chunk)
        
        # Process transcription
        text = await transcription_service.transcribe(temp_path)
        return {"transcript": text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
