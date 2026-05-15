from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from services.transcription_service import transcription_service
from middleware.auth_middleware import get_current_user
from models.user import UserResponse
import os
import tempfile
import shutil

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Endpoint for ASHA workers to upload audio recordings of field visits.
    Uses local faster-whisper to transcribe voice notes.
    """
    if not file.filename.endswith(('.wav', '.mp3', '.m4a', '.ogg')):
        raise HTTPException(status_code=400, detail="Unsupported audio format")

    # Save temporary file
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"upload_{current_user.id}_{file.filename}")
    
    # Log incoming request
    file_size = os.fstat(file.file.fileno()).st_size
    print(f"DEBUG: Receiving audio file: {file.filename}, Size: {file_size} bytes")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process transcription
        text = await transcription_service.transcribe(temp_path)
        
        # Cleanup
        os.remove(temp_path)
        
        return {"transcript": text}
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {str(e)}")
