import os
from faster_whisper import WhisperModel
import tempfile

class TranscriptionService:
    def __init__(self, model_size="base"):
        # We use CPU by default for stability on all machines
        # "base" is a good balance between speed and accuracy
        try:
            self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
            print(f"Whisper Model '{model_size}' loaded successfully.")
        except Exception as e:
            print(f"Error loading Whisper model: {e}")
            self.model = None

    async def transcribe(self, audio_path: str) -> str:
        if self.model is None:
            return "Transcription service currently unavailable."
        
        try:
            # beam_size=5 is standard for good accuracy
            segments, info = self.model.transcribe(audio_path, beam_size=5)
            
            # Combine all segments into one string
            full_text = " ".join([segment.text for segment in segments])
            return full_text.strip()
        except Exception as e:
            print(f"Transcription error: {e}")
            return f"Error during transcription: {str(e)}"

# Singleton instance
transcription_service = TranscriptionService()
