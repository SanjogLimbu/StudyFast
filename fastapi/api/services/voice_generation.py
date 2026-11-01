from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from services.document_processing import UPLOAD_PATH

import os
import random

##

load_dotenv()

elevenlabs = ElevenLabs(
  api_key=os.getenv("ELEVENLABS_API_KEY"),
)

voice_ids = ["zfc8CJQpe8Kqyl0vvCzo", "IJxm2BPzAbIAYPy6kY6Q"]

TTS_PATH = UPLOAD_PATH / "tts"

##

def generate_voice(text):
    audio = elevenlabs.text_to_speech.convert(
        text=text,
        voice_id=voice_ids[random.randint(0, len(voice_ids) - 1)],
        model_id="eleven_v4",
        output_format="mp3_44100_128",
    )

    return b"".join(audio)
