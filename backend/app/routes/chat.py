import json
import logging
import re
from typing import Optional, List, Dict, Any, Tuple

from fastapi import APIRouter, Depends, Request, BackgroundTasks, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.models.database import get_db, ChatHistory, Issue
from app.models.schemas import ChatRequest, ChatResponse
from app.routes.auth import get_current_user, AuthenticatedUser
from app.services.rag_service import (
    get_vectorstore,
    find_campus_location,
    search_tavily,
    _is_contact_query,
    _faculty_context_for_query,
    AVAILABLE_MODELS,
    GREETINGS_EN,
    GREETINGS_TA,
    GREETINGS_HI,
    GREETINGS_ML,
    THANKS_WORDS,
    IDENTITY_QUESTIONS
)
from app.services.llm_service import get_llm
from app.services.complaint_service import detect_complaint
from app.services.language_service import detect_language
from app.services.email_service import send_complaint_email

logger = logging.getLogger(__name__)

router = APIRouter()

# =========================================================================
# PROMPT-INJECTION & PII EXFILTRATION GUARDS
# =========================================================================

PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules|guidelines)",
    r"disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|rules)",
    r"(reveal|print|show|output|leak|dump)\s+(your\s+)?(system\s+prompt|developer\s+instructions|base\s+prompt)",
    r"what\s+(is|are)\s+your\s+(initial\s+)?(system\s+prompt|core\s+instructions)",
    r"you\s+are\s+now\s+in\s+developer\s+mode",
    r"\bDAN\s+mode\b",
    r"override\s+(all\s+)?security\s+(filters|rules|constraints)",
    r"repeat\s+everything\s+(written\s+)?above",
    r"forget\s+(all\s+)?rules\s+and\s+constraints",
    r"roleplay\s+as\s+an\s+unfiltered\s+ai"
]

PII_EXFILTRATION_PATTERNS = [
    r"(dump|export|extract|give\s+me(\s+all)?|list\s+all|show\s+all)\s+(students?|candidates?|rolls?)",
    r"(all\s+student\s*(list|directory|database|records|numbers?|names?|emails?|rolls?))",
    r"students_cache(\.json)?",
    r"bit_studentlist(\.pdf)?",
    r"bit_staffs_contacts(\.pdf)?",
    r"48\d\d\s+students?",
    r"(dump|export|extract|list\s+all|show\s+all)\s+(faculty|staff|professors?|teachers?)\s+(phone|contact|mobile|number)s?",
    r"staff\s+(phone\s+directory|contacts?\s+list|mobile\s+database)",
    r"complete\s+(staff|faculty|student)\s+(phone|contact|mobile|record|list)\s+(directory|list)",
    r"give\s+me\s+every(one'?s?)?\s+(phone|mobile|contact|roll)\s+number"
]

RESTRICTED_FILES_STUDENT = [
    "bit_studentlist.pdf",
    "students_cache.json",
    "bit_staffs_contacts.pdf"
]

RESTRICTED_FILES_STAFF = [
    "bit_studentlist.pdf",
    "students_cache.json"
]


def evaluate_security_guardrails(message: str) -> Optional[str]:
    """
    Automated prompt-injection and PII-exfiltration inspection.
    Returns rejection message if an adversarial pattern or bulk data dump attempt is detected.
    """
    clean_msg = message.lower().strip()

    for pattern in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, clean_msg, re.IGNORECASE):
            logger.warning(f"Security Alert: Blocked prompt injection attempt matching pattern: {pattern}")
            return (
                "Security Policy Violation: Prompt injection and system directive override attempts "
                "are strictly prohibited by campus safety protocols."
            )

    for pattern in PII_EXFILTRATION_PATTERNS:
        if re.search(pattern, clean_msg, re.IGNORECASE):
            logger.warning(f"Security Alert: Blocked PII exfiltration attempt matching pattern: {pattern}")
            return (
                "Data Privacy Violation: Bulk extraction of institutional student records or staff phone directories "
                "is strictly prohibited under institutional data privacy policy."
            )

    return None


def filter_documents_by_role(docs: list, role: str) -> list:
    """
    Role-aware context isolation.
    Dynamically strips restricted source files from vector retrieval results based on caller's role.
    """
    allowed_docs = []
    user_role = (role or "student").lower()

    for d in docs:
        source_name = (d.metadata.get("source") or "").lower()

        if user_role == "student" or user_role == "guest":
            # Students and guests cannot access student lists, student caches, or staff contact PDFs
            if any(restricted in source_name for restricted in RESTRICTED_FILES_STUDENT):
                logger.info(f"Stripping restricted source '{source_name}' from student retrieval context.")
                continue
        elif user_role in ["faculty", "hod", "staff"]:
            # Faculty/staff cannot view bulk student lists or student cache data
            if any(restricted in source_name for restricted in RESTRICTED_FILES_STAFF):
                logger.info(f"Stripping administrative source '{source_name}' from faculty retrieval context.")
                continue
        # Admin retains access to all files

        allowed_docs.append(d)

    return allowed_docs


# =========================================================================
# SECURE RAG QUERY ENGINE
# =========================================================================

async def execute_secure_rag(
    question: str,
    chat_history: str,
    language: str,
    user_role: str
) -> Tuple[str, List[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Executes role-isolated RAG retrieval and synthesis with PII guards.
    """
    q_clean = question.strip().lower().rstrip("!.,?")

    # 1. Direct Instant Greeting & Small Talk Handling
    is_greeting = q_clean in GREETINGS_EN or q_clean in GREETINGS_TA or q_clean in GREETINGS_HI or q_clean in GREETINGS_ML
    if is_greeting:
        if language == 'ta':
            return "Vanakkam! I'm Aura, your AI Campus Companion for BIT Sathyamangalam. Ask me about admissions, departments, placements, or hostel!", [], None
        elif language == 'hi':
            return "Namaste! Main Aura hoon, BIT Sathyamangalam ka AI sahayak. Pravesh, vibhag, placement ke baare mein poochein!", [], None
        elif language == 'ml':
            return "Namaskaram! Njan Aura, BIT Sathyamangalam AI assistant. Admission, department, placement ennivaye kurichu chodhikkoo!", [], None
        else:
            return "Hello! I'm Aura, your AI Campus Companion for Bannari Amman Institute of Technology (BIT). Ask me about admissions, departments, placements, hostel, or campus navigation!", [], None

    if any(q_clean == id_q or q_clean.startswith(id_q) for id_q in IDENTITY_QUESTIONS):
        return (
            "I am Aura, the official AI Digital Companion for Bannari Amman Institute of Technology (BIT), Sathyamangalam. "
            "I can help you with admissions, departments, placements, hostel facilities, campus navigation, and campus issues.",
            [],
            None
        )

    if any(q_clean == tw or q_clean.startswith(tw) for tw in THANKS_WORDS):
        return "You're welcome! Feel free to ask anytime if you need more help with BIT campus information.", [], None

    # 2. Campus Room or Landmark Resolver
    loc_match = find_campus_location(question)
    matched_route = None
    direct_loc_context = ""
    if loc_match:
        target_name = loc_match.get("room") or loc_match.get("name")
        block_title = loc_match.get("block_name") or loc_match.get("name")
        main_bldg = loc_match.get("main_block") or loc_match.get("building")
        floor_title = loc_match.get("floor") or "Ground Floor"
        place_id = loc_match.get("place_id") or "ib-block"

        direct_loc_context = (
            f"\n\n[OFFICIAL BIT CAMPUS DIRECTORY & MAP VERIFIED RECORD]:\n"
            f"- Room / Location: {target_name}\n"
            f"- Wing / Rib: {block_title} (ID: {place_id})\n"
            f"- Main Block: {main_bldg}\n"
            f"- Floor: {floor_title}\n"
            f"- Verified Location: Room {target_name} is on the {floor_title} of {block_title} in {main_bldg}.\n"
            f"- Navigation: From Main Gate 1, proceed along the central avenue past Admin Office and Central Library towards {main_bldg}. Enter {block_title} and head to the {floor_title}.\n"
        )

        matched_route = {
            "id": place_id,
            "place_id": place_id,
            "name": f"{block_title}" + (f" ({target_name})" if loc_match.get("room") else ""),
            "shortName": target_name or block_title,
            "building": main_bldg,
            "floor": floor_title
        }

    # 3. Retrieve from Vector Store with Dynamic Security Filtering
    vectorstore = get_vectorstore()
    retrieval_query = question
    retrieval_query = re.sub(r'\bhodd\b', 'hod head of department', retrieval_query, flags=re.IGNORECASE)
    retrieval_query = re.sub(r'\baids\b', 'artificial intelligence and data science ai&ds', retrieval_query, flags=re.IGNORECASE)
    retrieval_query = re.sub(r'\bmax(?:imum)?\s*package\b', 'highest placement package salary lpa', retrieval_query, flags=re.IGNORECASE)
    retrieval_query = re.sub(r'\bfees?\b', 'tuition fee cost admission charges', retrieval_query, flags=re.IGNORECASE)

    if chat_history and len(question.split()) <= 6:
        retrieval_query = f"{retrieval_query} {chat_history[-250:]}"

    raw_docs = []
    if vectorstore:
        try:
            raw_docs = vectorstore.similarity_search(retrieval_query, k=10)
        except Exception as e:
            logger.error(f"Error querying FAISS vector store: {e}")

    # Dynamic Role-Based Document Exclusion
    isolated_docs = filter_documents_by_role(raw_docs, user_role)

    local_context = "\n\n".join([d.page_content for d in isolated_docs])
    sources = [{"source": d.metadata.get("source", "Local Document"), "content": d.page_content[:200]} for d in isolated_docs]

    # 4. Tavily Live Web Search
    web_context, web_sources = await search_tavily(question)
    if web_sources:
        sources.extend(web_sources)

    # 5. Hybrid Context Assembly
    combined_context = f"[CAMPUS DOCUMENTS]:\n{direct_loc_context}\n{local_context}"
    if web_context:
        combined_context += f"\n\n[LIVE WEB SEARCH RESULTS (bitsathy.ac.in)]:\n{web_context}"

    # 6. Faculty Directory Context Injection
    is_privileged_role = user_role in ["faculty", "hod", "staff", "admin"]
    if _is_contact_query(question, chat_history):
        # Students receive faculty directory lookups with masked phone numbers
        faculty_ctx = _faculty_context_for_query(question, is_verified_user=is_privileged_role, chat_history=chat_history)
        if faculty_ctx:
            combined_context = faculty_ctx + "\n\n" + combined_context

    # 7. Language and Privacy Directives
    if language == 'ta':
        lang_instruction = "LANGUAGE: Respond in fluent, conversational Tamil. Keep it natural and clear for voice readback."
    elif language == 'hi':
        lang_instruction = "LANGUAGE: Respond in fluent, conversational Hindi. Keep it natural and clear for voice readback."
    elif language == 'ml':
        lang_instruction = "LANGUAGE: Respond in fluent, conversational Malayalam. Keep it natural and clear for voice readback."
    else:
        lang_instruction = "Respond in clear, natural English."

    if not is_privileged_role:
        privacy_policy = (
            "CONFIDENTIALITY RULE: The user is a STUDENT. "
            "Do NOT share personal mobile numbers or extension numbers of faculty or staff. "
            "Provide their official email, department, and office location. "
            "If asked directly for a phone number, state: 'Faculty mobile numbers are protected and accessible only to verified staff and faculty. You can reach them via their official BIT email.'"
        )
    else:
        privacy_policy = (
            "ACCESS VERIFIED: The user is a VERIFIED Faculty/HOD/Staff/Admin member. "
            "You may share official contact numbers and extensions listed in the directory."
        )

    prompt = PromptTemplate.from_template(
        """You are Aura, the AI Campus Companion for Bannari Amman Institute of Technology (BIT), Sathyamangalam.

CRITICAL RULES:
1. ANSWER THE SPECIFIC QUESTION ASKED. Do NOT give a general campus overview unless explicitly asked.
2. CONVERSATIONAL MEMORY & CONTINUITY:
   - Carefully review the Recent Chat History. Resolve pronouns ('he', 'she', 'his', 'her', 'their', 'them') and follow-ups.
3. Keep answers CONCISE - 2 to 4 sentences max. Your response will be read aloud by a voice assistant.
4. For CONTACT questions:
   - Always prioritize official email and department office location.
   - NEVER hallucinate or invent phone numbers.
5. Location/navigation: state the building, floor, and wing clearly.
6. {privacy_policy}

OFFICIAL DIRECTORY QUICK REFERENCE:
- Principal: Dr. C. Palanisamy
- AI&DS HOD: Dr. Gomathi R (Prof & Head, AI&DS Dept)
- CSE HOD: Dr. Sasikala D (Prof & Head, CSE Dept)
- AI&ML HOD: Dr. Bharathi A (Prof & Head, AI&ML Dept)
- IT HOD: Dr. Naveena S (Prof & Head, IT Dept)
- CT HOD / Senior Professor: Dr. Thanga Parvathi B (Prof., CT Dept)
- ECE HOD: Dr. Prakash S P (Prof & Head, ECE Dept)
- EEE HOD: Dr. Maheswari K T (Prof & Head, EEE Dept)
- MECH HOD: Dr. Ravi Kumar M (Prof & Head, Mechanical Dept)
- Placement Officers: Mr. Nirmal Kumar R & Dr. Mathan Kumar P (IB Block, Ground Floor)
- Highest Package: Rs. 44 LPA (2024-25 cycle)
- Campus Emergency Medical Centre: 04295-226108
- Security Control: 04295-226100

{lang_instruction}

Recent Chat History:
{chat_history}

Verified Campus Context:
{context}

User Question: {question}

Aura's Response:"""
    )

    for model_name in AVAILABLE_MODELS:
        llm = get_llm(model_name)
        if not llm:
            continue
        try:
            chain = prompt | llm | StrOutputParser()
            response_text = await chain.ainvoke({
                "context": combined_context,
                "question": question,
                "chat_history": chat_history,
                "lang_instruction": lang_instruction,
                "privacy_policy": privacy_policy
            })

            if "<think>" in response_text and "</think>" in response_text:
                response_text = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL).strip()
            response_text = response_text.strip().strip('"').strip()

            # Extra privacy layer: If student, mask any 10-digit mobile numbers starting with 6-9
            if not is_privileged_role:
                def mask_mobile(m):
                    num = m.group(0)
                    if num in ['04295226000', '04295226108', '04295226100', '04295226086']:
                        return num
                    if len(num) == 10 and num[0] in '6789':
                        return f"{num[:2]}******{num[-2:]}"
                    return num
                response_text = re.sub(r'\b[6-9]\d{9}\b', mask_mobile, response_text)

            return response_text, sources, matched_route
        except Exception as e:
            logger.warning(f"Model {model_name} invocation failed: {e}. Trying next model...")
            continue

    # Fallback response
    if loc_match:
        target_name = loc_match.get("room") or loc_match.get("name")
        block_title = loc_match.get("block_name") or loc_match.get("name")
        main_bldg = loc_match.get("main_block") or loc_match.get("building")
        floor_title = loc_match.get("floor") or "Ground Floor"
        return f"{target_name} is located on the {floor_title} of {block_title} in {main_bldg}.", sources, matched_route

    return (
        "Based on verified BIT campus records, please contact the campus enquiry office at 04295-226000 or visit bitsathy.ac.in for official information.",
        sources,
        None
    )


# =========================================================================
# ROUTE ENDPOINTS
# =========================================================================

@router.post("", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticated chat endpoint.
    Strictly verifies JWT credentials via get_current_user. Never trusts client-supplied user_id or role.
    Blocks prompt injection and bulk PII exfiltration, and dynamically isolates retrieval context.
    """
    # 1. Authoritative identity extraction from validated token claims
    user_id = current_user.id
    user_role = current_user.role
    user_name = current_user.name
    user_email = current_user.email

    # 2. Automated Prompt Injection & PII Exfiltration Guards
    guard_violation = evaluate_security_guardrails(req.message)
    if guard_violation:
        return ChatResponse(
            response=guard_violation,
            sources=[],
            language=req.language or "en",
            is_complaint=False,
            route=None
        )

    # 3. Detect Language
    lang = req.language if req.language else detect_language(req.message)

    # 4. Check if message represents a complaint / maintenance ticket
    complaint_result = await detect_complaint(req.message)
    response_text = ""
    sources = []
    matched_route = None

    if complaint_result.get("is_complaint"):
        cat = complaint_result.get("category", "General")
        loc = complaint_result.get("location", "Campus")
        desc = complaint_result.get("description", req.message)

        # Auto-create maintenance issue bound strictly to authenticated identity
        issue = Issue(
            user_id=user_id if user_id and str(user_id) != "0" else None,
            user_name=user_name,
            user_type=user_role,
            user_email=user_email,
            category=cat,
            location=loc,
            description=desc,
            priority="medium",
            status="open"
        )
        db.add(issue)
        await db.commit()
        await db.refresh(issue)

        background_tasks.add_task(send_complaint_email, {
            "id": issue.id,
            "user_name": user_name,
            "user_email": user_email,
            "category": cat,
            "location": loc,
            "description": desc,
            "priority": "medium"
        })

        response_text = f"Your campus maintenance issue has been registered (Ticket #{issue.id} - {cat} at {loc}). The campus maintenance team has been notified."

    elif complaint_result.get("is_intent"):
        response_text = (
            "I'd be glad to help you log your campus issue or maintenance ticket! Please specify:\n\n"
            "1. **What is the issue?**\n"
            "2. **Where is it located?** *(e.g. IB Block 204, CSE Lab, Emerald Hostel)*\n\n"
            "Once you provide the details, I will file a ticket for the campus maintenance team."
        )

    else:
        # Build conversational history
        formatted_turns = []
        if req.history and len(req.history) > 0:
            for h in req.history[-8:]:
                if isinstance(h, dict):
                    if 'user' in h or 'ai' in h:
                        if h.get('user'):
                            formatted_turns.append(f"User: {h.get('user')}")
                        if h.get('ai'):
                            formatted_turns.append(f"AI: {h.get('ai')}")
                    elif 'role' in h:
                        sender = 'User' if h.get('role') in ['user', 'human'] else 'AI'
                        formatted_turns.append(f"{sender}: {h.get('content', '')}")
                    else:
                        sender = 'AI' if h.get('isAI') else 'User'
                        formatted_turns.append(f"{sender}: {h.get('text', '')}")
            history_text = "\n".join(formatted_turns)
        else:
            hist_result = await db.execute(
                select(ChatHistory)
                .where(ChatHistory.session_id == req.session_id)
                .order_by(ChatHistory.created_at.desc())
                .limit(5)
            )
            history_records = hist_result.scalars().all()
            history_text = "\n".join([f"User: {h.message}\nAI: {h.response}" for h in reversed(history_records)])

        # Execute role-isolated secure RAG
        response_text, sources, matched_route = await execute_secure_rag(
            question=req.message,
            chat_history=history_text,
            language=lang,
            user_role=user_role
        )

    # 5. Persist Chat History with authoritative user linkage
    chat_log = ChatHistory(
        user_id=user_id if user_id and str(user_id) != "0" else None,
        user_name=user_name,
        user_type=user_role,
        session_id=req.session_id,
        message=req.message,
        response=response_text,
        sources=sources,
        language=lang
    )
    db.add(chat_log)
    await db.commit()

    return ChatResponse(
        response=response_text,
        sources=sources,
        language=lang,
        is_complaint=complaint_result.get("is_complaint", False),
        route=matched_route
    )


@router.get("/history")
async def get_chat_history(
    session_id: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get chat history.
    Strictly isolated: authenticated users can only view their own chat history.
    """
    user_id = current_user.id
    user_role = current_user.role

    query_stmt = select(ChatHistory)

    if user_role == "admin":
        if session_id:
            query_stmt = query_stmt.where(ChatHistory.session_id == session_id)
    else:
        # Enforce user boundary
        if user_id and str(user_id) != "0":
            query_stmt = query_stmt.where(ChatHistory.user_id == user_id)
        elif session_id:
            query_stmt = query_stmt.where(ChatHistory.session_id == session_id)
        else:
            return []

    query_stmt = query_stmt.order_by(ChatHistory.created_at.desc()).limit(limit)
    result = await db.execute(query_stmt)
    records = result.scalars().all()

    return [
        {
            "id": r.id,
            "message": r.message,
            "response": r.response,
            "language": r.language,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "session_id": r.session_id
        }
        for r in reversed(records)
    ]
