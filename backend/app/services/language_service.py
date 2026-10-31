import logging
import re

logger = logging.getLogger(__name__)

try:
    from langdetect import detect, detect_langs
except ImportError:
    detect = None
    detect_langs = None


def detect_language(text: str) -> str:
    """
    Detects language of input text supporting English (en), Tamil (ta),
    Hindi (hi), and Malayalam (ml).
    Uses high-speed Unicode script range matching as the primary fast-path,
    falling back to statistical n-gram detection via langdetect.
    """
    if not text or not text.strip():
        return 'en'

    clean_text = text.strip()

    # Fast-Path: Direct Unicode script range inspection (100% precision)
    if any('\u0B80' <= c <= '\u0BFF' for c in clean_text):
        return 'ta'
    if any('\u0900' <= c <= '\u097F' for c in clean_text):
        return 'hi'
    if any('\u0D00' <= c <= '\u0D7F' for c in clean_text):
        return 'ml'

    # Fallback: Statistical detection using langdetect
    if detect is not None:
        try:
            detected = detect(clean_text)
            if detected in ['ta', 'hi', 'ml', 'en']:
                return detected
        except Exception as e:
            logger.debug(f"Statistical language detection fallback notice: {e}")

    return 'en'
