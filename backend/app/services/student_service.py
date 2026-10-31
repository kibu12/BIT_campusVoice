import os
import re
import json
import logging

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import fitz
except ImportError:
    fitz = None

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_PROTECTED_PDF = os.path.join(BASE_DIR, "data", "protected", "BIT_StudentList.pdf")
STUDENT_PDF_PATH = _PROTECTED_PDF if os.path.exists(_PROTECTED_PDF) else os.path.join(BASE_DIR, "data", "documents", "BIT_StudentList.pdf")
_PROTECTED_CACHE = os.path.join(BASE_DIR, "data", "protected", "students_cache.json")
CACHE_JSON_PATH = _PROTECTED_CACHE if os.path.exists(_PROTECTED_CACHE) else os.path.join(BASE_DIR, "data", "students_cache.json")

# In-memory student lookup
_STUDENTS_BY_ROLL = {}
_STUDENTS_BY_NAME = {}
_STUDENTS_LIST = []

def _normalize_name(name: str) -> str:
    if not name:
        return ""
    # Remove punctuation, extra spaces, uppercase
    return re.sub(r'[^a-zA-Z0-9\s]', '', name).strip().upper()

def init_student_index(force_reload=False):
    global _STUDENTS_BY_ROLL, _STUDENTS_BY_NAME, _STUDENTS_LIST
    
    if _STUDENTS_LIST and not force_reload:
        return len(_STUDENTS_LIST)

    # 1. Try loading from cache JSON first for instant server startups
    if not force_reload and os.path.exists(CACHE_JSON_PATH):
        try:
            with open(CACHE_JSON_PATH, "r", encoding="utf-8") as f:
                cached_data = json.load(f)
                if isinstance(cached_data, list) and len(cached_data) > 0:
                    _STUDENTS_LIST = cached_data
                    _STUDENTS_BY_ROLL = {s['roll_number'].upper(): s for s in _STUDENTS_LIST}
                    _STUDENTS_BY_NAME = {}
                    for s in _STUDENTS_LIST:
                        norm = _normalize_name(s['name'])
                        if norm:
                            _STUDENTS_BY_NAME.setdefault(norm, []).append(s)
                    logger.info(f"Loaded {len(_STUDENTS_LIST)} students from cache JSON.")
                    return len(_STUDENTS_LIST)
        except Exception as e:
            logger.warning(f"Failed to read student cache json: {e}")

    # 2. Extract from BIT_StudentList.pdf
    if not os.path.exists(STUDENT_PDF_PATH):
        logger.warning(f"Student list PDF not found at {STUDENT_PDF_PATH}")
        return 0

    try:
        reader = pypdf.PdfReader(STUDENT_PDF_PATH)
        students = []
        current_dept = "Engineering & Technology"
        
        dept_name_map = {
            'AD': 'Artificial Intelligence and Data Science',
            'CS': 'Computer Science and Engineering',
            'AL': 'Artificial Intelligence and Machine Learning',
            'IT': 'Information Technology',
            'EC': 'Electronics and Communication Engineering',
            'EE': 'Electrical and Electronics Engineering',
            'ME': 'Mechanical Engineering',
            'MT': 'Mechatronics Engineering',
            'MZ': 'Mechatronics Engineering',
            'BT': 'Biotechnology',
            'BM': 'Biomedical Engineering',
            'CE': 'Civil Engineering',
            'AG': 'Agricultural Engineering',
            'FT': 'Fashion Technology',
            'FD': 'Food Technology',
            'EI': 'Electronics and Instrumentation Engineering',
            'IS': 'Information Science and Engineering',
            'CT': 'Computer Technology',
            'CB': 'Computer Science and Business Systems'
        }

        for p_idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            
            for line in lines:
                # Detect department headers
                if any(k in line.upper() for k in ['DEPARTMENT', 'ENGINEERING', 'TECHNOLOGY', 'SCIENCE', 'MANAGEMENT']) and not re.search(r'\d{7,}', line):
                    if len(line) < 80 and not line.startswith(('YEAR', 'ROLL', 'PAGE', 'S.NO')):
                        current_dept = line.title()

                # Match patterns like: IV 7376232AD110 ARIKRISHNAN R or 7376222CS101 JOHN DOE
                m = re.search(r'(?:(I|II|III|IV|V)\s+)?(7376[0-9A-Z]{7,9})\s+([A-Za-z\s\.\'\-]+)', line)
                if m:
                    year_val = m.group(1) or ""
                    roll = m.group(2).strip().upper()
                    st_name = m.group(3).strip()
                    
                    # Clean student name (remove trailing numbers/artifacts)
                    st_name = re.sub(r'\s+\d+$', '', st_name).strip()
                    if not st_name:
                        continue
                        
                    # Auto infer dept if code is in roll
                    dept = current_dept
                    for code, dname in dept_name_map.items():
                        if code in roll:
                            dept = dname
                            break

                    student_record = {
                        "roll_number": roll,
                        "name": st_name,
                        "year": year_val or "UG",
                        "department": dept,
                        "email": f"{roll.lower()}@bitsathy.ac.in"
                    }
                    students.append(student_record)

        # Deduplicate by roll number
        unique_map = {}
        for s in students:
            unique_map[s['roll_number']] = s

        _STUDENTS_LIST = list(unique_map.values())
        _STUDENTS_BY_ROLL = {s['roll_number'].upper(): s for s in _STUDENTS_LIST}
        _STUDENTS_BY_NAME = {}
        for s in _STUDENTS_LIST:
            norm = _normalize_name(s['name'])
            if norm:
                _STUDENTS_BY_NAME.setdefault(norm, []).append(s)

        # Save to cache JSON
        try:
            with open(CACHE_JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(_STUDENTS_LIST, f, indent=2)
            logger.info(f"Saved {len(_STUDENTS_LIST)} students to cache file {CACHE_JSON_PATH}")
        except Exception as e:
            logger.warning(f"Could not save student cache: {e}")

        logger.info(f"Initialized {len(_STUDENTS_LIST)} students from PDF.")
        return len(_STUDENTS_LIST)
    except Exception as e:
        logger.error(f"Error parsing BIT_StudentList.pdf: {e}")
        return 0

def find_student(query: str):
    """
    Search by roll number or student name.
    Returns matched student dictionary or None.
    """
    if not _STUDENTS_LIST:
        init_student_index()

    if not query or not query.strip():
        return None

    clean_q = query.strip()
    
    # 1. Check if email provided (e.g. 7376232ad110@bitsathy.ac.in)
    if "@" in clean_q:
        prefix = clean_q.split("@")[0].upper()
        if prefix in _STUDENTS_BY_ROLL:
            return _STUDENTS_BY_ROLL[prefix]

    # 2. Check exact Roll Number match
    roll_upper = clean_q.upper().replace(" ", "")
    if roll_upper in _STUDENTS_BY_ROLL:
        return _STUDENTS_BY_ROLL[roll_upper]

    # 3. Check exact normalized Name match
    norm_q = _normalize_name(clean_q)
    if norm_q in _STUDENTS_BY_NAME and _STUDENTS_BY_NAME[norm_q]:
        return _STUDENTS_BY_NAME[norm_q][0]

    # 4. Check partial / substring name match
    # Prioritize startswith, then contains
    tokens = [t for t in norm_q.split() if len(t) > 1]
    if not tokens:
        return None

    best_match = None
    best_score = 0

    for s in _STUDENTS_LIST:
        s_norm = _normalize_name(s['name'])
        if norm_q == s_norm:
            return s
        if norm_q in s_norm or s_norm in norm_q:
            return s
        
        # Token overlap score
        matches = sum(1 for t in tokens if t in s_norm)
        if matches > best_score:
            best_score = matches
            best_match = s

    if best_score >= max(1, len(tokens)):
        return best_match

    return None

def verify_student(identifier: str, provided_name: str = None):
    """
    Returns (is_verified: bool, student_data: dict)
    """
    # 1. Try finding by identifier (roll number or email or name)
    st = find_student(identifier)
    if st:
        return True, st

    # 2. Try finding by provided_name if given
    if provided_name:
        st = find_student(provided_name)
        if st:
            return True, st

    return False, None

def search_students_autocomplete(query: str, limit: int = 8):
    if not _STUDENTS_LIST:
        init_student_index()
    if not query or len(query.strip()) < 2:
        return []
    
    q_lower = query.strip().lower()
    q_roll = query.strip().upper()
    
    results = []
    for s in _STUDENTS_LIST:
        if q_roll in s['roll_number'] or q_lower in s['name'].lower():
            results.append(s)
            if len(results) >= limit:
                break
    return results

# Initialize on module load
try:
    init_student_index()
except Exception:
    pass
