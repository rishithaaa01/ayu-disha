import os
from groq import AsyncGroq
from config import settings
from services.local_ai_service import local_ai

class TranscriptionService:
    async def transcribe(self, audio_path: str, client_type: str = "web") -> str:
        """
        Transcribes the audio file asynchronously.
        Routes to local open-source whisper for mobile, and Groq for web.
        """
        if client_type == "mobile":
            print(f"📡 Sending audio to LOCAL AI (Whisper) for transcription...")
            try:
                # Use local_ai_service which runs whisper-tiny
                text = local_ai.transcribe_audio(audio_path)
                print("✅ Transcription completed via Local AI.")
                return text
            except Exception as e:
                print(f"❌ Local Transcription Error: {e}")
                return f"Error transcribing audio locally: {str(e)}"
                
        # WEB FLOW: Use Groq
        if not settings.groq_api_key:
            print("❌ Groq API key is missing in settings!")
            return "Error: Groq API key not configured on the server."
            
        try:
            client = AsyncGroq(api_key=settings.groq_api_key)
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