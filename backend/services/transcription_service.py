import os
from groq import AsyncGroq
from config import settings

class TranscriptionService:
    async def transcribe(self, audio_path: str) -> str:
        """
        Transcribes the audio file asynchronously using Groq API (Whisper model).
        This replaces the heavy local faster-whisper model to allow lightweight
        and fast server hosting (e.g. on Render free tier).
        """
        if not settings.groq_api_key:
            print("❌ Groq API key is missing in settings!")
            return "Error: Groq API key not configured on the server."
            
        try:
            client = AsyncGroq(api_key=settings.groq_api_key)
            
            # Extract base filename
            filename = os.path.basename(audio_path)
            
            print(f"📡 Sending audio {filename} to Groq API for transcription...")
            with open(audio_path, "rb") as file:
                transcription = await client.audio.transcriptions.create(
                    file=(filename, file.read()),
                    model="whisper-large-v3-turbo",
                    response_format="json",
                )
                
            print("✅ Transcription completed via Groq.")
            return transcription.text
            
        except Exception as e:
            print(f"❌ Groq Transcription Error: {e}")
            return f"Error transcribing audio: {str(e)}"

transcription_service = TranscriptionService()