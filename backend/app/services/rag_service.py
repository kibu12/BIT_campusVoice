import os
import re
import glob
import json
try:
    import pymupdf as fitz
except ImportError:
    import fitz
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from app.services.llm_service import get_llm, AVAILABLE_MODELS
from app.services.seed_data import SEED_TEXT
from app.services.tavily_service import search_tavily
from app.services.faculty_service import get_faculty_directory, init_faculty_index, _FACULTY_LIST
import logging

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VECTORSTORE_DIR = os.path.join(BASE_DIR, "data", "vectorstore")
DOCUMENTS_DIR = os.path.join(BASE_DIR, "data", "documents")
GEOBITS_JSON_PATH = os.path.join(BASE_DIR, "..", "frontend", "src", "data", "geobits_extracted_data.json")

os.makedirs(VECTORSTORE_DIR, exist_ok=True)
DOCUMENTS_DIR = os.path.join(BASE_DIR, "data", "documents")
os.makedirs(DOCUMENTS_DIR, exist_ok=True)

# =========================================================================
# COMPREHENSIVE BIT CAMPUS ROOM & LANDMARK RESOLVER (Direct Indexing)
# =========================================================================
ROOM_ITEMS = []
LANDMARK_ITEMS = []

def _init_campus_room_index():
    global ROOM_ITEMS, LANDMARK_ITEMS
    ROOM_ITEMS = []
    LANDMARK_ITEMS = []
    
    # 1. Try loading from geobits_extracted_data.json
    data = {}
    if os.path.exists(GEOBITS_JSON_PATH):
        try:
            with open(GEOBITS_JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            logger.error(f"Error reading geobits_extracted_data.json: {e}")
            
    details = data.get("details", {})
    tags = data.get("tags", {})
    
    # Index all tags / landmarks
    for group_key, tag_list in tags.items():
        if isinstance(tag_list, list):
            for t in tag_list:
                tid = t.get('id', '')
                tname = t.get('name', '')
                if tid and tname:
                    clean_name = re.sub(r'[^\w\s]', '', tname).strip().lower()
                    LANDMARK_ITEMS.append({
                        'place_id': tid,
                        'name': tname,
                        'shortName': tname,
                        'building': tname,
                        'floor': None,
                        'tokens': set(re.findall(r'\w+', clean_name)),
                        'exact_str': clean_name,
                        'no_sp_str': clean_name.replace(' ', '')
                    })
                    
    # Index all detailed blocks, ribs, floors, and rooms
    for block_id, info in details.items():
        block_name = info.get('name', block_id)
        main_block = info.get('main', '')
        b_clean = re.sub(r'[^\w\s]', '', block_name).strip().lower()
        
        LANDMARK_ITEMS.append({
            'place_id': block_id,
            'name': block_name,
            'shortName': block_name,
            'building': main_block or block_name,
            'floor': None,
            'tokens': set(re.findall(r'\w+', b_clean)),
            'exact_str': b_clean,
            'no_sp_str': b_clean.replace(' ', '')
        })
        
        for fl in info.get('floors', []):
            fl_name = fl.get('name', 'Ground Floor')
            for rm in fl.get('rooms', []):
                clean_rm = re.sub(r'[^\w\s]', '', rm).strip()
                if not clean_rm:
                    continue
                rm_lower = clean_rm.lower()
                ROOM_ITEMS.append({
                    'room': clean_rm,
                    'place_id': block_id,
                    'block_name': block_name,
                    'main_block': main_block or block_name,
                    'floor': fl_name,
                    'description': f"Room {clean_rm} is located on the {fl_name} of {block_name} in {main_block}.",
                    'tokens': set(re.findall(r'\w+', rm_lower)),
                    'exact_str': rm_lower,
                    'no_sp_str': rm_lower.replace(' ', '')
                })

_init_campus_room_index()

def find_campus_location(query: str) -> dict | None:
    if not query:
        return None
    q_clean = re.sub(r'[^\w\s]', ' ', query).lower()
    q_tokens = set(re.findall(r'\w+', q_clean))
    norm_no_sp = "".join(q_clean.split())
    
    # 1. Match specific room by exact compacted string (e.g. 'ww102' in 'whereisww102')
    for r in ROOM_ITEMS:
        if r['no_sp_str'] in norm_no_sp and len(r['no_sp_str']) >= 3:
            return {"type": "room", **r}
            
    # 2. Match room by multi-token containment (e.g. 'seminar hall mech')
    for r in ROOM_ITEMS:
        if len(r['tokens']) >= 2 and r['tokens'].issubset(q_tokens):
            return {"type": "room", **r}
            
    # 3. Match landmark/rib by compacted string (e.g. 'ibrib9', 'sunflowerblock')
    for l in LANDMARK_ITEMS:
        if l['no_sp_str'] in norm_no_sp and len(l['no_sp_str']) >= 4:
            return {"type": "landmark", **l}
            
    # 4. Match landmark by multi-token containment (e.g. 'central library', 'sapphire hostel')
    for l in LANDMARK_ITEMS:
        if len(l['tokens']) >= 2 and l['tokens'].issubset(q_tokens):
            return {"type": "landmark", **l}
            
    return None

try:
    embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
except Exception as e:
    logger.error(f"Failed to load FastEmbed embeddings: {e}")
    embeddings = None

import hashlib

# Document-Level Access Control Policy (ACL)
DOCUMENT_ACL = {
    # Public documents: accessible to all students, faculty, staff, and visitors
    "BIT_Academic_Fee_and_Scholarships.pdf": {"classification": "public", "allowed_roles": ["student", "faculty", "hod", "staff", "admin", "guest"]},
    "BIT_Admissions_Guide_2026.pdf": {"classification": "public", "allowed_roles": ["student", "faculty", "hod", "staff", "admin", "guest"]},
    "bit_all_rooms_and_departments.txt": {"classification": "public", "allowed_roles": ["student", "faculty", "hod", "staff", "admin", "guest"]},
    "BIT_Alumni_and_News_Report (1).pdf": {"classification": "public", "allowed_roles": ["student", "faculty", "hod", "staff", "admin", "guest"]},
    "BIT_CSE_and_AI_Department.pdf": {"classification": "public", "allowed_roles": ["student", "faculty", "hod", "staff", "admin", "guest"]},
    "BIT_Extras.pdf": {"classification": "public", "allowed_roles": ["student", "faculty", "hod", "staff", "admin", "guest"]},
    "BIT_Hostels_and_Mess_Rules.pdf": {"classification": "public", "allowed_roles": ["student", "faculty", "hod", "staff", "admin", "guest"]},
    "BIT_Placements_and_Career_Report.pdf": {"classification": "public", "allowed_roles": ["student", "faculty", "hod", "staff", "admin", "guest"]},
    "BIT Official 2026 Seed Knowledge Base": {"classification": "public", "allowed_roles": ["student", "faculty", "hod", "staff", "admin", "guest"]},

    # Internal Faculty & Staff Directories:
    "BIT_Faculty_and_HOD_Directory.pdf": {"classification": "internal_faculty", "allowed_roles": ["faculty", "hod", "staff", "admin"]},
    "bit_faculty_and_hod_directory.txt": {"classification": "internal_faculty", "allowed_roles": ["faculty", "hod", "staff", "admin"]},
    "BIT_Staffs_Contacts.pdf": {"classification": "internal_faculty", "allowed_roles": ["faculty", "hod", "staff", "admin"]},

    # Confidential Student Records: strictly Admin only
    "BIT_StudentList.pdf": {"classification": "confidential_admin", "allowed_roles": ["admin"]},
    "students_cache.json": {"classification": "confidential_admin", "allowed_roles": ["admin"]}
}

def get_document_acl(filename: str) -> dict:
    base_name = os.path.basename(filename)
    if base_name in DOCUMENT_ACL:
        return DOCUMENT_ACL[base_name]
    return {"classification": "restricted", "allowed_roles": ["admin"]}

def _compute_sha256(filepath: str) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()

def _save_index_integrity(directory: str):
    pkl_file = os.path.join(directory, "index.pkl")
    if os.path.exists(pkl_file):
        digest = _compute_sha256(pkl_file)
        with open(os.path.join(directory, "index.pkl.sha256"), "w", encoding="utf-8") as f:
            f.write(digest)

def _verify_index_integrity(directory: str) -> bool:
    pkl_file = os.path.join(directory, "index.pkl")
    sha_file = os.path.join(directory, "index.pkl.sha256")
    if not os.path.exists(pkl_file):
        return False
    if not os.path.exists(sha_file):
        _save_index_integrity(directory)
        return True
    with open(sha_file, "r", encoding="utf-8") as f:
        expected = f.read().strip()
    return expected == _compute_sha256(pkl_file)

vectorstore = None

def get_vectorstore():
    global vectorstore
    if vectorstore is None:
        initialize_vectorstore()
    return vectorstore

def initialize_vectorstore():
    global vectorstore
    if os.path.exists(os.path.join(VECTORSTORE_DIR, "index.faiss")) and embeddings:
        try:
            logger.info("Loading existing FAISS vector store...")
            vectorstore = FAISS.load_local(VECTORSTORE_DIR, embeddings, allow_dangerous_deserialization=True)
            return
        except Exception as e:
            logger.warning(f"Failed to load existing index: {e}. Rebuilding...")

    rebuild_vectorstore()

def load_documents():
    docs = []
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)
    
    # 1. Official campus seed text (2026 accurate)
    seed_chunks = text_splitter.create_documents(
        texts=[SEED_TEXT],
        metadatas=[{"source": "BIT Official 2026 Seed Knowledge Base"}]
    )
    docs.extend(seed_chunks)
    
    # 2. Ingest official PDF documents
    pdf_files = glob.glob(os.path.join(DOCUMENTS_DIR, "*.pdf"))
    for pdf_path in pdf_files:
        try:
            doc = fitz.open(pdf_path)
            full_text = ""
            for page in doc:
                full_text += page.get_text() + "\n"
            
            if full_text.strip():
                pdf_chunks = text_splitter.create_documents(
                    texts=[full_text],
                    metadatas=[{"source": os.path.basename(pdf_path)}]
                )
                docs.extend(pdf_chunks)
                logger.info(f"Loaded {len(pdf_chunks)} chunks from {os.path.basename(pdf_path)}")
        except Exception as e:
            logger.error(f"Error loading PDF {pdf_path}: {e}")

    # 3. Ingest text room and campus directory files
    txt_files = glob.glob(os.path.join(DOCUMENTS_DIR, "*.txt"))
    for txt_path in txt_files:
        try:
            with open(txt_path, "r", encoding="utf-8") as f:
                txt_content = f.read()
            if txt_content.strip():
                txt_chunks = text_splitter.create_documents(
                    texts=[txt_content],
                    metadatas=[{"source": os.path.basename(txt_path)}]
                )
                docs.extend(txt_chunks)
                logger.info(f"Loaded {len(txt_chunks)} chunks from {os.path.basename(txt_path)}")
        except Exception as e:
            logger.error(f"Error loading TXT {txt_path}: {e}")
            
    return docs

def rebuild_vectorstore():
    global vectorstore
    if not embeddings:
        logger.error("Embeddings model not ready.")
        return 0
        
    docs = load_documents()
    if not docs:
        logger.warning("No documents found to build index.")
        return 0
        
    logger.info(f"Building FAISS vector index with {len(docs)} total chunks...")
    vectorstore = FAISS.from_documents(docs, embeddings)
    vectorstore.save_local(VECTORSTORE_DIR)
    return len(docs)

def rebuild_index():
    return rebuild_vectorstore()

def load_and_index_pdf(pdf_path: str) -> int:
    global vectorstore
    if not os.path.exists(pdf_path) or not embeddings:
        return 0
    try:
        doc = fitz.open(pdf_path)
        full_text = ""
        for page in doc:
            full_text += page.get_text() + "\n"
        if not full_text.strip():
            return 0
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)
        chunks = text_splitter.create_documents(
            texts=[full_text],
            metadatas=[{"source": os.path.basename(pdf_path)}]
        )
        if vectorstore is None:
            vectorstore = FAISS.from_documents(chunks, embeddings)
        else:
            vectorstore.add_documents(chunks)
        vectorstore.save_local(VECTORSTORE_DIR)
        return len(chunks)
    except Exception as e:
        logger.error(f"Error indexing PDF {pdf_path}: {e}")
        return 0

def authorized_similarity_search(query_str: str, user_role: str, k: int = 8) -> list:
    global vectorstore
    if vectorstore is None:
        initialize_vectorstore()
    if not vectorstore:
        return []

    candidates = vectorstore.similarity_search(query_str, k=k * 3)
    authorized = []
    clean_role = (user_role or "student").lower()

    for doc in candidates:
        acl_roles = doc.metadata.get("allowed_roles")
        if acl_roles is None:
            acl = get_document_acl(doc.metadata.get("source", ""))
            acl_roles = acl.get("allowed_roles", ["admin"])

        if clean_role == "admin" or clean_role in acl_roles:
            authorized.append(doc)
            if len(authorized) >= k:
                break

    return authorized

# Conversational Greetings & Small Talk Handler
GREETINGS_EN = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "howdy", "sup", "hlo", "hi aura"]
GREETINGS_TA = ["vanakkam", "vanakam"]
GREETINGS_HI = ["namaste", "namaskar"]
GREETINGS_ML = ["namaskaram", "namaskar"]
THANKS_WORDS = ["thanks", "thank you", "thx", "thanks a lot", "thank u", "ty"]
IDENTITY_QUESTIONS = ["who are you", "what are you", "what is your name", "tell me about yourself", "introduce yourself", "what can you do"]

# ---------------------------------------------------------------------------
# CONTACT INTENT KEYWORDS
# ---------------------------------------------------------------------------
_CONTACT_INTENT_WORDS = [
    'contact', 'phone', 'number', 'email', 'mobile', 'reach', 'call',
    'hod', 'hodd', 'head', 'professor', 'prof', 'dr', 'faculty', 'staff', 'teacher',
    'who is', 'mail', 'extension', 'ext', 'intercom', 'cabin', 'office', 'details', 'info'
]

def _is_contact_query(q: str, chat_history: str = "") -> bool:
    q_l = q.lower()
    if any(w in q_l for w in _CONTACT_INTENT_WORDS):
        return True
    # If the question asks for "his", "her", "their", "details" and history mentions contact/faculty
    if any(pronoun in q_l for pronoun in ['his', 'her', 'their', 'him', 'them']):
        hist_l = chat_history.lower()
        if any(w in hist_l for w in _CONTACT_INTENT_WORDS):
            return True
    return False

def _faculty_context_for_query(question: str, is_verified_user: bool, chat_history: str = "") -> str:
    """
    Look up real faculty data from the directory that matches the question and conversation history.
    Returns a formatted string to inject into the LLM prompt context.
    """
    if not _FACULTY_LIST:
        try:
            init_faculty_index()
        except Exception:
            return ""

    q_lower = question.lower()
    combined_text = f"{chat_history}\n{question}".lower()

    # Comprehensive Department Aliases
    dept_aliases = {
        'ct': 'computer technology',
        'it': 'information technology',
        'bt': 'biotechnology',
        'ft': 'food technology',
        'fd': 'fashion technology',
        'cse': 'computer science and engineering',
        'cs': 'computer science and engineering',
        'csbs': 'computer science and business systems',
        'csd': 'computer science and design',
        'ise': 'information science and engineering',
        'ece': 'electronics and communication engineering',
        'eee': 'electrical and electronics engineering',
        'eie': 'electrical and instrumentation engineering',
        'mech': 'mechanical engineering',
        'mcts': 'mechatronics',
        'aero': 'aeronautical engineering',
        'agri': 'agriculture engineering',
        'bme': 'biomedical engineering',
        'civil': 'civil engineering',
        'textile': 'textile technology',
        'fashion': 'fashion technology',
        'aiml': 'artificial intelligence and machine learning',
        'ai ml': 'artificial intelligence and machine learning',
        'ai&ml': 'artificial intelligence and machine learning',
        'aids': 'artificial intelligence and data science',
        'ai ds': 'artificial intelligence and data science',
        'ai&ds': 'artificial intelligence and data science',
        'sms': 'school of management studies',
        'mba': 'school of management studies',
        'maths': 'mathematics',
        'math': 'mathematics',
        'physics': 'physics',
        'chem': 'chemistry',
        'chemistry': 'chemistry',
    }

    # Detect HOD Intent
    is_hod_query = bool(re.search(r'\b(hod|hodd|head|head of department|chairperson|in charge)\b', combined_text))

    # Detect target department: Check question first, then chat history
    target_dept = None
    for abbr, full in dept_aliases.items():
        if re.search(rf'\b{re.escape(abbr)}\b', q_lower) or full in q_lower:
            target_dept = full
            break
    if not target_dept and chat_history:
        for abbr, full in dept_aliases.items():
            if re.search(rf'\b{re.escape(abbr)}\b', chat_history.lower()) or full in chat_history.lower():
                target_dept = full
                break

    # Extract important keywords from question and history
    stop_words = {'the', 'of', 'in', 'at', 'is', 'a', 'an', 'and', 'or',
                  'what', 'who', 'how', 'give', 'me', 'tell', 'need', 'want',
                  'can', 'i', 'my', 'contact', 'number', 'phone', 'email',
                  'mobile', 'reach', 'call', 'please', 'department', 'for', 'you',
                  'her', 'his', 'him', 'she', 'he', 'their', 'them', 'about', 'get'}
    
    q_words = [w for w in re.findall(r'\b\w+\b', q_lower) if w not in stop_words and len(w) > 2]

    # Gather matching faculty records
    matched = []
    for fac in _FACULTY_LIST:
        score = 0
        fac_dept = fac.get('department', '').lower()
        fac_name = fac.get('name', '').lower()
        fac_desig = fac.get('designation', '').lower()

        # Department Match
        if target_dept and (target_dept in fac_dept or fac_dept in target_dept):
            score += 20
            if is_hod_query:
                if 'head' in fac_desig:
                    score += 100
                elif fac_desig.startswith('prof') and 'asst' not in fac_desig and 'assoc' not in fac_desig:
                    # Full Professor acts as Head/Senior for department (e.g. Dr Thanga Parvathi B for CT)
                    score += 85
                elif 'assoc' in fac_desig:
                    score += 30
                else:
                    score += 10

        # Faculty name matching from question
        for w in q_words:
            if w in fac_name:
                score += 60
            elif w in fac_desig:
                score += 15

        # Faculty name matching from history
        if chat_history:
            for w in re.findall(r'\b\w+\b', chat_history.lower()):
                if len(w) > 3 and w not in stop_words and w in fac_name:
                    score += 30

        if score > 0:
            matched.append((score, fac))

    if not matched:
        return ""

    # Sort by relevance score, take top 5
    matched.sort(key=lambda x: x[0], reverse=True)
    top = [m[1] for m in matched[:5]]

    lines = ["\n[LIVE FACULTY DIRECTORY LOOKUP RESULTS]:"]
    for fac in top:
        phone = fac.get('mobile', '').strip()
        email = fac.get('email', '').strip()
        intercom = fac.get('intercom', '').strip()
        intercom_str = f" | Intercom Ext: {intercom}" if intercom else ""
        
        if not is_verified_user:
            if phone:
                phone_info = "Phone: (Protected - Only verified logged-in students can view phone numbers)"
            else:
                phone_info = "Phone: None (Email-only directory record)"
        else:
            if phone:
                phone_info = f"Phone: {phone}"
            else:
                phone_info = "Phone: None (This faculty has only email listed in the directory, no contact number)"
        
        email_info = f"Email: {email}" if email else "Email: (None listed)"
        
        lines.append(
            f"  - Name: {fac.get('name')} | Designation: {fac.get('designation')} | Department: {fac.get('department')} | {email_info} | {phone_info}{intercom_str}"
        )
    lines.append("[FACULTY CONTACT RULES: If a faculty record has ONLY an email, provide ONLY the email and clearly state no contact number is listed. If a faculty record has BOTH phone number and email, provide BOTH. If a mobile number is listed above, always state that exact verified number. NEVER invent, guess, or hallucinate phone numbers. Unverified guests cannot see phone numbers.]")    
    return "\n".join(lines)


async def query(question: str, chat_history: str = "", language: str = "en", is_verified_user: bool = False) -> tuple[str, list, dict | None]:
    """
    Main RAG query function.
    Returns: (response_text, sources_list, matched_route_dict_or_None)
    """
    global vectorstore
    
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
        return "I am Aura, the official AI Digital Companion for Bannari Amman Institute of Technology (BIT), Sathyamangalam. I can help you with admissions, departments, placements, hostel facilities, campus navigation, and report campus issues.", [], None
        
    if any(q_clean == tw or q_clean.startswith(tw) for tw in THANKS_WORDS):
        return "You're welcome! Feel free to ask anytime if you need more help with BIT campus information.", [], None

    # 2. Check for direct campus room or landmark match
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

    if vectorstore is None:
        initialize_vectorstore()
        
    # 3. Retrieve Local Documents from FAISS
    retrieval_query = question
    # Normalize common student slang & typos
    retrieval_query = re.sub(r'\bhodd\b', 'hod head of department', retrieval_query, flags=re.IGNORECASE)
    retrieval_query = re.sub(r'\baids\b', 'artificial intelligence and data science ai&ds', retrieval_query, flags=re.IGNORECASE)
    retrieval_query = re.sub(r'\bmax(?:imum)?\s*package\b', 'highest placement package salary lpa', retrieval_query, flags=re.IGNORECASE)
    retrieval_query = re.sub(r'\bfees?\b', 'tuition fee cost admission charges', retrieval_query, flags=re.IGNORECASE)

    if chat_history and len(question.split()) <= 6:
        retrieval_query = f"{retrieval_query} {chat_history[-250:]}"

    retriever = vectorstore.as_retriever(search_kwargs={"k": 8})
    docs = retriever.invoke(retrieval_query)
    
    local_context = "\n\n".join([d.page_content for d in docs])
    sources = [{"source": d.metadata.get("source", "Local Document"), "content": d.page_content[:200]} for d in docs]
    
    # 4. Retrieve Live Web Context via Tavily Search (if configured)
    web_context, web_sources = await search_tavily(question)
    if web_sources:
        sources.extend(web_sources)

    # 5. Synthesize Hybrid Context
    combined_context = f"[CAMPUS DOCUMENTS]:\n{direct_loc_context}\n{local_context}"
    if web_context:
        combined_context += f"\n\n[LIVE WEB SEARCH RESULTS (bitsathy.ac.in)]:\n{web_context}"
    
    # 5b. Inject live faculty directory context for contact-related questions
    if _is_contact_query(question, chat_history):
        faculty_ctx = _faculty_context_for_query(question, is_verified_user, chat_history)
        if faculty_ctx:
            combined_context = faculty_ctx + "\n\n" + combined_context


    # Audio-optimized Language Rules
    q_lower = question.lower()
    q_words = set(re.findall(r'\b\w+\b', q_lower))
    
    has_tamil_script = any('\u0B80' <= c <= '\u0BFF' for c in question)
    has_hindi_script = any('\u0900' <= c <= '\u097F' for c in question)
    has_malayalam_script = any('\u0D00' <= c <= '\u0D7F' for c in question)

    has_tanglish = bool(q_words.intersection({'enna', 'seranum', 'adhukku', 'pannanum', 'yaaru', 'epdi', 'eppadi', 'irukku', 'iruka', 'solla', 'solunga', 'enga', 'yenna', 'enakku', 'romba', 'theriyuma', 'kedaikuma', 'evlo', 'evalo'}))
    has_hinglish = bool(q_words.intersection({'kya', 'kaise', 'hoga', 'karna', 'kitna', 'batao', 'mujhe', 'chahiye', 'kahan', 'karo', 'bolo', 'padega', 'milega', 'kaun'}))
    has_manglish = bool(q_words.intersection({'entha', 'ethraya', 'enganeyanu', 'aaranu', 'cheyyenda', 'njan', 'enikku', 'ivide', 'evideya', 'parayamo'}))

    if language == 'ta' or has_tamil_script or (has_tanglish and language != 'en'):
        lang_instruction = "LANGUAGE: Respond in fluent, conversational Tamil. Keep it natural and clear for voice readback."
    elif language == 'hi' or has_hindi_script or (has_hinglish and language != 'en'):
        lang_instruction = "LANGUAGE: Respond in fluent, conversational Hindi. Keep it natural and clear for voice readback."
    elif language == 'ml' or has_malayalam_script or (has_manglish and language != 'en'):
        lang_instruction = "LANGUAGE: Respond in fluent, conversational Malayalam. Keep it natural and clear for voice readback."
    else:
        lang_instruction = "Respond in clear, natural English."
    
    # Privacy & Access Control Policy for Faculty Contacts in Chat
    privacy_policy = ""
    if not is_verified_user:
        privacy_policy = (
            "CONFIDENTIALITY & ACCESS RULE: The current user is an UNVERIFIED GUEST. "
            "Do NOT share personal mobile numbers or personal phone numbers of faculty, HODs, or staff. "
            "If asked for a professor's, HOD's, or staff member's phone number, provide their official email, office location/department, "
            "and explain politely: 'Faculty phone numbers are protected and accessible only to verified BIT students and staff members (@bitsathy.ac.in). Please log in with your BIT student ID or institutional account to view contact numbers.' "
            "Public campus hotlines (04295-226000, 04295-226108, 04295-226100) may be shared."
        )
    else:
        privacy_policy = (
            "ACCESS VERIFIED: The user is a VERIFIED BIT Student / Faculty member. "
            "You MAY provide official faculty contact numbers, mobile numbers, emails, and office locations from the verified records."
        )

    prompt = PromptTemplate.from_template(
        """You are Aura, the AI Campus Companion for Bannari Amman Institute of Technology (BIT), Sathyamangalam.

CRITICAL RULES:
1. ANSWER THE SPECIFIC QUESTION ASKED. Do NOT give a general campus overview unless explicitly asked.
2. CONVERSATIONAL MEMORY & CONTINUITY:
   - Carefully review the Recent Chat History. Resolve pronouns ('he', 'she', 'his', 'her', 'their', 'them') and follow-up requests ('what about the mobile number', 'her email', 'which department', 'what is the hod name') based on what was discussed in previous turns.
   - If the user previously asked who the HOD was, or discussed a specific department or person, and now asks for contact details or phone number, answer directly for that person/department!
   - NEVER hallucinate or invent phone numbers. Rely strictly on the [LIVE FACULTY DIRECTORY LOOKUP RESULTS] section.
3. Keep answers CONCISE - 2 to 4 sentences max. Your response will be read aloud by a voice assistant.
4. For CONTACT questions: ALWAYS look in the [LIVE FACULTY DIRECTORY LOOKUP RESULTS] section first.
   - If a faculty member has ONLY an email listed (Phone: None), provide ONLY their email and clearly state that no direct contact number is listed in the official directory. Never invent a phone number.
   - If a faculty member has BOTH contact number and email in the records, provide BOTH clearly with their department and designation.
   - If the user is unverified / guest, remind them that contact numbers are protected and only available to logged-in students.
5. For location/navigation questions: state the building, floor, and wing clearly.
6. Speak naturally like a friendly campus mentor. Use first person ("Our campus has...", "You can find them at...").
7. {privacy_policy}

OFFICIAL DIRECTORY QUICK REFERENCE (use live lookup above for actual phone numbers):
- Principal: Dr. C. Palanisamy
- AI&DS HOD: Dr. Gomathi R (Prof & Head, AI&DS Dept)
- CSE HOD: Dr. Sasikala D (Prof & Head, CSE Dept)
- AI&ML HOD: Dr. Bharathi A (Prof & Head, AI&ML Dept)
- IT HOD: Dr. Naveena S (Prof & Head, IT Dept)
- CT (Computer Technology) HOD / Senior Professor: Dr. Thanga Parvathi B (Prof., CT Dept) - Mobile: 9443870561
- ECE HOD: Dr. Prakash S P (Prof & Head, ECE Dept)
- EEE HOD: Dr. Maheswari K T (Prof & Head, EEE Dept)
- MECH HOD: Dr. Ravi Kumar M (Prof & Head, Mechanical Dept)
- Biotechnology HOD: Dr. Balakrishnaraja R (Prof & Head, BT Dept) - Mobile: 9488570421
- Biomedical HOD: Dr. Deepa D (Prof & Head, BME Dept) - Mobile: 9942912613
- Information Science HOD: Dr. Eswaramoorthy V (Prof & Head, ISE Dept) - Mobile: 9865240619
- Mechatronics HOD: Dr. Bharathiraja M (Prof & Head, MCTS Dept) - Mobile: 9965175377
- Placement Officers: Mr. Nirmal Kumar R & Dr. Mathan Kumar P (IB Block, Ground Floor)
- Highest Package: Rs. 44 LPA (2024-25 cycle)
- B.E. Fees (Govt Quota): Rs. 55,000 - 75,000/year
- B.E. Fees (Mgmt Quota): Rs. 1,25,000 - 1,45,000/year
- Hostel & Mess: Rs. 75,000 - 85,000/year
- Medical Centre: 04295-226108 (24x7)
- Security: 04295-226100
- Admissions: 04295-226086

{lang_instruction}

Recent Chat History:

{chat_history}

Verified Campus Context:
{context}

Student Question: {question}

Aura's Response (concise, direct, voice-friendly):"""
    )

    # Try models with automatic fallback
    for model_name in AVAILABLE_MODELS:
        llm = get_llm(model_name)
        if not llm:
            continue
        try:
            chain = prompt | llm | StrOutputParser()
            response = await chain.ainvoke({
                "context": combined_context,
                "question": question,
                "chat_history": chat_history,
                "lang_instruction": lang_instruction,
                "privacy_policy": privacy_policy
            })
            # Clean reasoning/thinking tags if model outputs them
            if "<think>" in response and "</think>" in response:
                response = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL).strip()
            # Remove any leading/trailing quotes or whitespace
            response = response.strip().strip('"').strip()

            # Extra privacy layer: If unverified guest, mask any 10-digit mobile numbers starting with 6-9
            if not is_verified_user:
                # Mask 10-digit mobile numbers e.g. 9842581719 -> 98******19
                def mask_mobile(m):
                    num = m.group(0)
                    if num in ['04295226000', '04295226108', '04295226100', '04295226086']:
                        return num
                    if len(num) == 10 and num[0] in '6789':
                        return f"{num[:2]}******{num[-2:]}"
                    return num
                response = re.sub(r'\b[6-9]\d{9}\b', mask_mobile, response)

            return response, sources, matched_route
        except Exception as e:
            logger.warning(f"Model {model_name} failed ({e}), attempting next model...")
            continue
            
    # Graceful fallback if all models exhausted
    if loc_match:
        target_name = loc_match.get("room") or loc_match.get("name")
        block_title = loc_match.get("block_name") or loc_match.get("name")
        main_bldg = loc_match.get("main_block") or loc_match.get("building")
        floor_title = loc_match.get("floor") or "Ground Floor"
        return f"{target_name} is located on the {floor_title} of {block_title} in {main_bldg}. I've highlighted the location on the campus map below for you!", sources, matched_route
        
    if combined_context and len(combined_context.strip()) > 50:
        return f"Based on BIT campus records:\n\n{combined_context[:400]}...\n\nFor more details, contact the campus helpline at 04295-226000.", sources, matched_route
    else:
        return "I'm currently unable to retrieve specific records for this request. Please contact the BIT Admissions Office at 04295-226000 or visit bitsathy.ac.in.", [], None
