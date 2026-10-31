import logging
from app.config import GROQ_API_KEY

logger = logging.getLogger(__name__)

# Prioritized list of active Groq models
AVAILABLE_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.6-27b",
]

def get_llm(model_name: str = "openai/gpt-oss-120b"):
    """
    Returns an initialized LangChain ChatGroq instance.
    Uses ultra-fast Groq LPU inference.
    """
    if not GROQ_API_KEY or GROQ_API_KEY.strip() == "":
        logger.error("GROQ_API_KEY is not set in .env. LLM calls will fail.")
        return None

    clean_model = model_name.replace("groq:", "")
    
    try:
        from langchain_groq import ChatGroq
        llm = ChatGroq(
            model=clean_model,
            groq_api_key=GROQ_API_KEY,
            temperature=0.3,
            max_retries=2
        )
        return llm
    except Exception as e:
        logger.warning(f"Failed to initialize ChatGroq with model {clean_model}: {e}")
        return None


