from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from pydantic import BaseModel
from typing import Optional
import io
import os
import re
import base64
import tempfile
import logging
import edge_tts

logger = logging.getLogger(__name__)

router = APIRouter()

# Whisper Singleton
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            logger.info("Initializing Faster-Whisper model on CPU (int8)...")
            # Using 'tiny' or 'base' for ultra-fast response on CPU
            _whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
            logger.info("Faster-Whisper model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Faster-Whisper model: {e}")
            _whisper_model = None
    return _whisper_model

# Edge-TTS Neural Voice Map
VOICE_MAP = {
    "ta": "ta-IN-PallaviNeural",       # Tamil (India) - Female
    "ta-IN": "ta-IN-PallaviNeural",
    "hi": "hi-IN-SwaraNeural",         # Hindi (India) - Female
    "hi-IN": "hi-IN-SwaraNeural",
    "ml": "ml-IN-SobhanaNeural",       # Malayalam (India) - Female
    "ml-IN": "ml-IN-SobhanaNeural",
    "en": "en-IN-NeerjaNeural",        # English (India) - Female
    "en-IN": "en-IN-NeerjaNeural",
    "en-US": "en-US-JennyNeural"
}

class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "en"
    voice: Optional[str] = None

class STTRequest(BaseModel):
    audio_base64: Optional[str] = None
    language: Optional[str] = None

def clean_text_for_speech(text: str) -> str:
    """Strip brackets, markdown symbols, URLs, and emojis so speech only reads words and numbers."""
    if not text:
        return ""
    # Remove markdown links [text](url) -> keep text only
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Remove URLs
    text = re.sub(r'https?://\S+', '', text)
    # Remove code blocks
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`[^`]*`', '', text)
    # Remove citation brackets like [1], [2]
    text = re.sub(r'\[\s*\d+(?:\s*,\s*\d+)*\s*\]', ' ', text)
    # Remove all bracket characters: (), [], {}, <>, 【】, 〔〕, （）, ［］, ｛｝, «», ‹›
    text = re.sub(r'[()\[\]{}<>【】〔〕（）［］｛｝«»‹›]', ' ', text)
    # Remove symbols and markdown: *, _, #, ~, `, |, ^, +, =, \, /, @, $, %, &, bullets, dashes, quotes
    text = re.sub(r'[*_#~`|^+=\\/@$%&•–—"“"\'`]', ' ', text)
    # Remove hyphens/dashes
    text = re.sub(r'[-]', ' ', text)
    # Replace colons not in time with pause comma
    text = re.sub(r'(?<!\d):|:(?!\d)', ', ', text)
    # Remove emojis and high unicode symbols
    text = re.sub(r'[\U00010000-\U0010ffff]', '', text)
    # Clean up whitespace and punctuation spacing
    text = re.sub(r'\s+([.,?!])', r'\1', text)
    text = re.sub(r'[.,]{2,}', '.', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

@router.post("/stt")
async def speech_to_text(file: Optional[UploadFile] = File(None), payload: Optional[dict] = Body(None)):
    """
    Speech-To-Text endpoint powered by Faster-Whisper.
    Supports audio file uploads (WAV, MP3, WebM, OGG) or base64 audio.
    Natively supports Tamil, Hindi, and English with auto-language detection.
    """
    try:
        audio_bytes = None
        if isinstance(file, UploadFile):
            audio_bytes = await file.read()
        elif hasattr(file, "read") and callable(getattr(file, "read")):
            audio_bytes = file.read()
        elif payload and "audio_base64" in payload:
            raw_b64 = payload["audio_base64"]
            # Strip data URI header if present
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            audio_bytes = base64.b64decode(raw_b64)
            
        if not audio_bytes or len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="No audio data provided")

        if len(audio_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Audio file exceeds maximum allowed size of 10MB.")

        model = get_whisper_model()
        if not model:
            raise HTTPException(status_code=500, detail="Faster-Whisper model not initialized")

        # Save to temporary file for faster-whisper/av processing
        suffix = ".wav"
        if isinstance(file, UploadFile) and file.filename:
            _, ext = os.path.splitext(file.filename)
            if ext:
                suffix = ext

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_audio:
            temp_audio.write(audio_bytes)
            temp_path = temp_audio.name

        try:
            req_lang = None
            if payload and payload.get("language"):
                lang_param = payload.get("language").split("-")[0].lower()
                if lang_param in ["ta", "hi", "en", "ml"]:
                    req_lang = lang_param

            segments, info = model.transcribe(
                temp_path,
                language=req_lang,
                beam_size=5,
                vad_filter=True
            )
            
            transcribed_text = " ".join([segment.text for segment in segments]).strip()
            detected_language = info.language if info else (req_lang or "en")
            
            return {
                "text": transcribed_text,
                "language": detected_language,
                "success": True
            }
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Faster-Whisper STT Error: {e}")
        return {
            "text": "",
            "language": "en",
            "success": False,
            "error": str(e)
        }

@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    if len(req.text or "") > 4000:
        raise HTTPException(status_code=400, detail="Text exceeds maximum limit of 4000 characters.")
    """
    Text-To-Speech endpoint powered by Microsoft Edge-TTS.
    Provides natural neural voices for Tamil, Hindi, Malayalam, and English.
    Returns base64 encoded MP3 audio stream for instant browser playback.
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    clean_text = clean_text_for_speech(req.text)
    if not clean_text:
        clean_text = req.text.strip()

    # Determine voice based on language or explicit voice selection
    lang_key = req.language.lower() if req.language else "en"
    if "-" in lang_key:
        short_lang = lang_key.split("-")[0]
    else:
        short_lang = lang_key

    # Check for Tamil, Hindi, or Malayalam script characters directly in the text
    if any('\u0B80' <= c <= '\u0BFF' for c in clean_text):
        selected_voice = VOICE_MAP["ta"]
        detected_lang = "ta"
    elif any('\u0900' <= c <= '\u097F' for c in clean_text):
        selected_voice = VOICE_MAP["hi"]
        detected_lang = "hi"
    elif any('\u0D00' <= c <= '\u0D7F' for c in clean_text):
        selected_voice = VOICE_MAP["ml"]
        detected_lang = "ml"
    elif req.voice:
        selected_voice = req.voice
        detected_lang = short_lang
    else:
        selected_voice = VOICE_MAP.get(lang_key, VOICE_MAP.get(short_lang, VOICE_MAP["en"]))
        detected_lang = short_lang

    try:
        communicate = edge_tts.Communicate(clean_text, selected_voice, rate="+25%")
        audio_stream = io.BytesIO()
        
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.write(chunk["data"])

        audio_bytes = audio_stream.getvalue()
        if len(audio_bytes) == 0:
            raise ValueError("Edge-TTS generated empty audio stream")

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        
        return {
            "audio_base64": audio_b64,
            "mime_type": "audio/mp3",
            "voice": selected_voice,
            "language": detected_lang,
            "success": True
        }
    except Exception as tts_err:
        logger.error(f"Edge-TTS synthesis error: {tts_err}")
        return {
            "audio_base64": None,
            "voice": selected_voice,
            "language": detected_lang,
            "message": "Fallback to browser SpeechSynthesis",
            "error": str(tts_err),
            "success": False
        }


