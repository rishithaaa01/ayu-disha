import os
from faster_whisper import WhisperModel


class TranscriptionService:
    def __init__(self, model_size="base"):
        self.model = None
        self.model_size = model_size

    def load_model(self):
        if self.model is None:
            print("Loading Whisper model...")
            self.model = WhisperModel(
                self.model_size,
                device="cpu",
                compute_type="int8"
            )
            print("Whisper model loaded.")

    async def transcribe(self, audio_path: str):
        try:
            self.load_model()

            segments, info = self.model.transcribe(
                audio_path,
                beam_size=5
            )

            return " ".join(segment.text for segment in segments)

        except Exception as e:
            print(e)
            return f"Error: {e}"


transcription_service = TranscriptionService()