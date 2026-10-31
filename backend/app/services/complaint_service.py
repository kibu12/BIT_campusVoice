from app.services.llm_service import get_llm
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import json
import logging

logger = logging.getLogger(__name__)

from app.services.llm_service import get_llm, AVAILABLE_MODELS

async def detect_complaint(message: str) -> dict:
    """
    Uses Gemini to classify if the message is a complaint or an intent to report an issue.
    """
    prompt = PromptTemplate.from_template(
        """
        You are a campus issue assistant for Bannari Amman Institute of Technology (BIT).
        Analyze the user's message:
        "{message}"
        
        Determine if:
        1. It is an ACTUAL complaint with details (e.g. "the light in emerald hostel 204 is broken", "no water in lab restroom", "wifi not working in library").
        2. OR it is an INTENT / statement wanting to report an issue or give feedback (e.g. "i have a feedback report", "i want to report an issue", "i want to file a complaint", "how to submit feedback").
        3. OR it is a regular informational question (e.g. "how to apply for admissions", "who is the cse hod", "what is the fee").
        
        Respond ONLY with a JSON object:
        {{
            "is_complaint": true/false (true ONLY if actual problem details are provided),
            "is_intent": true/false (true if user mentions wanting to report/complain/give feedback but hasn't given full details yet),
            "category": "Electrical" | "Plumbing" | "Hostel" | "Labs" | "Wifi" | "Cafeteria" | "General",
            "location": "extracted location or Unknown",
            "description": "brief description of problem"
        }}
        """
    )
    
    for model_name in AVAILABLE_MODELS:
        llm = get_llm(model_name)
        if not llm:
            continue
        try:
            chain = prompt | llm | StrOutputParser()
            content = await chain.ainvoke({"message": message})
            content = content.strip()
            
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()
                
            result = json.loads(content)
            return result
        except Exception as e:
            logger.warning(f"Complaint detection model {model_name} failed: {e}")
            continue

    # Quick keyword check fallback if models exhausted
    msg_lower = message.lower()
    if any(w in msg_lower for w in ["feedback", "report", "complain", "complaint", "issue", "broken", "not working", "leak"]):
        return {"is_intent": True, "is_complaint": False}
    return {"is_complaint": False, "is_intent": False}
