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
_PROTECTED_FACULTY_PDF = os.path.join(BASE_DIR, "data", "protected", "BIT_Staffs_Contacts.pdf")
FACULTY_PDF_PATH = _PROTECTED_FACULTY_PDF if os.path.exists(_PROTECTED_FACULTY_PDF) else os.path.join(BASE_DIR, "data", "documents", "BIT_Staffs_Contacts.pdf")
_PROTECTED_FACULTY_CACHE = os.path.join(BASE_DIR, "data", "protected", "faculty_cache.json")
CACHE_JSON_PATH = _PROTECTED_FACULTY_CACHE if os.path.exists(_PROTECTED_FACULTY_CACHE) else os.path.join(BASE_DIR, "data", "faculty_cache.json")

_FACULTY_LIST = []
_FACULTY_BY_EMAIL = {}


def _clean_text(s: str) -> str:
    if not s:
        return ""
    return re.sub(r'\s+', ' ', s).strip()


def _fix_split_word(s: str) -> str:
    """
    PDF tables sometimes split a word across lines producing artifacts like
    'Chandrasaker an M' (should be 'Chandrasekaran M') or
    'MANUFACTURI NG' (should be 'MANUFACTURING').
    This heuristic merges a short (<= 4 char) lowercase word that follows
    a longer word (and together they look like one word).
    """
    if not s:
        return s
    words = s.split()
    result = []
    i = 0
    while i < len(words):
        w = words[i]
        # If next word is very short AND current word is not an initial/abbreviation
        # AND they would form a plausible single word — merge
        if (
            i + 1 < len(words)
            and len(words[i+1]) <= 3
            and len(w) >= 4
            and words[i+1].isalpha()
            and w[-1].isalpha()
            # Don't merge salutation initials like "M" at the end
            and not (len(words[i+1]) == 1 and words[i+1].isupper())
            # Don't merge if the next token looks like a separate initial
            and i + 2 < len(words)  # not the very last word
        ):
            # Heuristic: if lowercase continuation → merge (PDF line-wrap artefact)
            if words[i+1][0].islower():
                result.append(w + words[i+1])
                i += 2
                continue
        result.append(w)
        i += 1
    return ' '.join(result)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

SALUTATIONS = {"Dr", "Mr", "Mrs", "Ms", "Prof"}

DESIGNATIONS_PATTERN = re.compile(
    r'(Asst\.?\s*Prof\.?\s*Level\s*(?:I{1,3}|IV)\s*(?:&|and)?\s*(?:Head)?|'
    r'Asst\.?\s*Prof\.?\s*(?:Level\s*(?:I{1,3}|IV))?|'
    r'Asso\.?\s*Prof\.?\s*(?:&|and)?\s*(?:Head)?|'
    r'Assoc\.?\s*Prof\.?\s*(?:&|and)?\s*(?:Head)?|'
    r'Sr\.?\s*Prof\.?|Senior Prof\.?|'
    r'Prof\.?\s*(?:&|and)\s*(?:Head|Dean|Director|Director In Charge)?|'
    r'Professor(?:\s*In\s*Charge)?|'
    r'Principal|'
    r'Professor In Charge\s*-\s*[^0-9]*|'
    r'IQAC\s*-\s*[^0-9]*|'
    r'Dean\s*-\s*[^0-9]*|'
    r'Prof\.?\s*Director|'
    r'Assistant Professor|'
    r'Lecturer|'
    r'Language Trainer[^0-9]*|'
    r'Prof\.|'
    r'Head|'
    r'Director|'
    r'Dean)',
    re.IGNORECASE
)

DEPT_MAP = {
    "AERO": "Aeronautical Engineering",
    "AUTO": "Automobile Engineering",
    "AGRI": "Agriculture Engineering",
    "BME": "Biomedical Engineering",
    "BT": "Biotechnology",
    "CIVIL": "Civil Engineering",
    "CSE": "Computer Science and Engineering",
    "CSBS": "Computer Science and Business Systems",
    "CSD": "Computer Science and Design",
    "CT": "Computer Technology",
    "ECE": "Electronics and Communication Engineering",
    "EEE": "Electrical and Electronics Engineering",
    "EIE": "Electrical and Instrumentation Engineering",
    "FD": "Food Technology",
    "FT": "Food Technology",
    "ISE": "Information Science and Engineering",
    "IT": "Information Technology",
    "MECH": "Mechanical Engineering",
    "MTRS": "Mechatronics",
    "AIDS": "Artificial Intelligence and Data Science",
    "AIML": "Artificial Intelligence and Machine Learning",
    "SMS": "School of Management Studies",
    "TXT": "Textile Technology",
    "PHY": "Physics",
    "CHE": "Chemistry",
    "MATH": "Mathematics",
    "HUM": "Humanities",
}

DEPT_HEADER_RE = re.compile(
    r'(?:ADMINISTRATION:|DMINISTRATION:|A?DMINISTRATION:)?'
    r'(?:Department of |School of |M-Team|Mechanical Engineering|Textile Technology|'
    r'General Engineering|Mechatronics|Food Technology|Automobile Engineering|Agriculture Engineering|Humanities)',
    re.IGNORECASE
)


def _extract_dept_from_header(line: str) -> str | None:
    """Extract department name from a section header line."""
    # Remove jump to navigation artefacts
    line = re.sub(r'Jump to.*', '', line).strip()

    patterns = [
        (r'Department of (.+)', lambda m: m.group(1).strip()),
        (r'School of Management Studies', lambda m: 'School of Management Studies'),
        (r'Mechanical Engineering', lambda m: 'Mechanical Engineering'),
        (r'Mechatronics', lambda m: 'Mechatronics'),
        (r'Textile Technology', lambda m: 'Textile Technology'),
        (r'General Engineering', lambda m: 'General Engineering'),
        (r'Food Technology', lambda m: 'Food Technology'),
        (r'Automobile Engineering', lambda m: 'Automobile Engineering'),
        (r'Agriculture Engineering', lambda m: 'Agriculture Engineering'),
        (r'Humanities', lambda m: 'Humanities'),
        (r'M-Team', lambda m: 'Administration & M-Team'),
        (r'SLABS:|Special labs', lambda m: 'Special Labs & Centers of Excellence'),
        (r'IQAC', lambda m: 'IQAC & Administration'),
    ]
    for pattern, fn in patterns:
        m = re.search(pattern, line, re.IGNORECASE)
        if m:
            return fn(m)
    return None


def _is_header_line(line: str) -> bool:
    """Detect if a line is a section header or table header, not data."""
    if re.search(r'Jump to navigation|Jump to search', line):
        return True
    if re.match(r'S\.?No\.?\s+Salutation', line, re.IGNORECASE):
        return True
    if re.match(r'S\.?No\.?\s+Faculty\s*name', line, re.IGNORECASE):
        return True
    if re.match(r'S\.?No\.?\s+Name', line, re.IGNORECASE):
        return True
    if re.match(r'Contents', line):
        return True
    if re.search(r'Objective:|Team Members|PIC Labs|Competition Team|PIC Training', line):
        return True
    if re.match(r'(I{1,4}|IV)\s+Year\s+Mentors?', line, re.IGNORECASE):
        return True
    if re.match(r'MENTOR:', line, re.IGNORECASE):
        return True
    if re.match(r'Year\s+Mentors', line, re.IGNORECASE):
        return True
    return False


def _starts_with_salutation(word: str) -> bool:
    return word.rstrip('.') in SALUTATIONS


# ─────────────────────────────────────────────────────────────
# PASS 1: Email directory (pages 40–53 typically)
#   Format:  <n>  Dr. FIRST LAST  DEPT  email@bitsathy.ac.in
# ─────────────────────────────────────────────────────────────

EMAIL_DIR_RE = re.compile(
    r'(?:\d+\s+)?'
    r'(Dr|Mr|Mrs|Ms|Prof)\.?\s+'
    r'([A-Z][A-Z\s\.\-]+?)\s+'
    r'([A-Z]{2,6})\s+'
    r'([a-zA-Z0-9._%+\-]+@bitsathy\.ac\.in)',
    re.IGNORECASE
)


def _build_email_map(reader) -> dict:
    """
    Returns dict: normalised_name -> email
    Scans ALL pages for email directory entries.
    """
    email_map = {}

    for page in reader.pages:
        text = page.extract_text() or ""
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        for line in lines:
            m = EMAIL_DIR_RE.search(line)
            if m:
                salut = m.group(1).lower().strip().rstrip('.')
                raw_name = _clean_text(m.group(2))
                email = m.group(4).lower().strip()
                norm = re.sub(r'[^a-z]', '', raw_name.lower())
                if norm:
                    email_map[norm] = email
                    email_map[f"{salut}{norm}"] = email
    return email_map


# ─────────────────────────────────────────────────────────────
# PASS 2: Special Labs table (pages 1–3 typically)
#   Format:  <n>  LAB NAME  Mr/Dr  First Last  email  phone
# ─────────────────────────────────────────────────────────────

def _parse_special_labs(reader, email_map: dict) -> list:
    """
    Parse the PIC Labs table at the start of the PDF.
    Handles multi-line lab names and split phone numbers.
    Scans the first 5 pages which contain the Special Labs table.
    """
    contacts = []

    # Collect first ~5 pages which contain Special Labs
    lab_pages_text = []
    for page in reader.pages[:6]:
        text = page.extract_text() or ""
        lab_pages_text.append(text)

    full_text = "\n".join(lab_pages_text)
    # Collapse all whitespace including newlines to single space for regex
    joined = re.sub(r'[\r\n]+', ' ', full_text)
    joined = re.sub(r'  +', ' ', joined)

    lab_entry_re = re.compile(
        r'(\d+)\s+'
        r'((?:[A-Z0-9][A-Z0-9\s&/()-]+?(?:CELL|LAB|TECHNOLOGY|SCIENCE|DRIVES|SECURITY|AUTOMATION|HACKATHON|AQUATECH|AQUATE|STUDIO|BLOCKCHAIN|BIOPROSPECTING|BIOPRODUCT|AGRICULTURE|FASHION|FOOD|BUILDING|STACK|CLOUD|XR|DATA|ARTIFICIAL|IOT|EMBEDDED|PRINTED|SENSORS|FIBRE|FIBER|COMPUTING|INNOVATION|SUSTAINABLE CIVIL|CIRCUIT BOARD|PCB)))\s+'
        r'(Dr|Mr|Mrs|Ms|Prof)\.?\s+'
        r'([A-Za-z][\w\s\.]+?)\s+'
        r'([a-zA-Z0-9._%+\-]+@bitsathy\.ac\.in)\s+'
        r'([\d\s]{8,14})',
        re.IGNORECASE
    )

    seen_labs = set()

    for m in lab_entry_re.finditer(joined):
        lab_name = re.sub(r'\s+', ' ', m.group(2)).strip().upper()
        # Strip any leading digits / noise that bled in from adjacent numbers (PDF artefact)
        lab_name = re.sub(r'^\d[\d\s]*', '', lab_name).strip()
        # Fix PDF word-break artifacts in lab names (e.g. "MANUFACTURI NG" -> "MANUFACTURING")
        lab_name = re.sub(r'([A-Z]{5,})\s+([A-Z]{2,4})(?=\s|$)', lambda lm: lm.group(1)+lm.group(2) if len(lm.group(2)) <= 3 else lm.group(0), lab_name)
        # Fix missing spaces before common words merged by PDF (e.g. "SENSORSAND" -> "SENSORS AND")
        lab_name = re.sub(r'([A-Z])AND\b', r'\1 AND', lab_name)
        lab_name = re.sub(r'([A-Z])FOR\b', r'\1 FOR', lab_name)
        lab_name = re.sub(r'([A-Z])CELL\b', r'\1 CELL', lab_name)
        lab_name = re.sub(r'\s+', ' ', lab_name).strip()
        salut = m.group(3)
        raw_name = _clean_text(m.group(4))
        # Fix PDF word-break artifacts in names (e.g. "Chandrasaker an M" -> "Chandrasekaran M")
        raw_name = _fix_split_word(raw_name)
        fac_name = f"{salut} {raw_name}"
        email = m.group(5).lower().strip()
        phone_raw = re.sub(r'[^\d]', '', m.group(6))
        phone = phone_raw[:10] if len(phone_raw) >= 10 else phone_raw

        key = lab_name
        if key in seen_labs:
            continue
        seen_labs.add(key)

        norm = re.sub(r'[^a-z]', '', fac_name.lower())
        if not email and norm in email_map:
            email = email_map[norm]

        contacts.append({
            "id": f"fac-{len(contacts)+1}",
            "name": fac_name,
            "designation": f"PIC Lab Incharge - {lab_name}",
            "department": "Special Labs & Centers of Excellence",
            "email": email,
            "mobile": phone,
            "intercom": "",
            "location": f"Special Labs Block"
        })

    # Fallback: line-by-line scan for labs we may have missed
    # Use simpler pattern on individual lines
    simple_lab_re = re.compile(
        r'(Dr|Mr|Mrs|Ms)\s+([A-Za-z\s\.]+?)\s+([a-zA-Z0-9._%+\-]+@bitsathy\.ac\.in)\s+(\d{10})',
        re.IGNORECASE
    )
    for page in reader.pages[:5]:
        text = page.extract_text() or ""
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        i = 0
        while i < len(lines):
            line = lines[i]
            m = simple_lab_re.search(line)
            if m:
                salut = m.group(1)
                name = f"{salut} {_clean_text(m.group(2))}"
                email = m.group(3).lower().strip()
                phone = m.group(4)
                norm = re.sub(r'[^a-z]', '', name.lower())
                # Only add if not already captured
                already = any(c.get('email') == email or c.get('mobile') == phone for c in contacts)
                if not already:
                    if not email and norm in email_map:
                        email = email_map[norm]
                    contacts.append({
                        "id": f"fac-{len(contacts)+1}",
                        "name": name,
                        "designation": "PIC Lab Incharge",
                        "department": "Special Labs & Centers of Excellence",
                        "email": email,
                        "mobile": phone,
                        "intercom": "",
                        "location": "Special Labs Block"
                    })
            i += 1

    return contacts


# ─────────────────────────────────────────────────────────────
# PASS 3: Competition Team (page 4)
# ─────────────────────────────────────────────────────────────

def _parse_competition_team(reader, email_map: dict) -> list:
    contacts = []
    comp_re = re.compile(
        r'(\d+)\s+(Dr|Mr|Mrs|Ms)\s+([A-Za-z\s\.]+?)\s+([a-zA-Z0-9._%+\-]+@bitsathy\.ac\.in)\s+(\d{10})',
        re.IGNORECASE
    )
    for page in reader.pages[:6]:
        text = page.extract_text() or ""
        if "Competition Team" not in text and "Team Members" not in text:
            continue
        for m in comp_re.finditer(text):
            salut = m.group(2)
            name = f"{salut} {_clean_text(m.group(3))}"
            email = m.group(4).lower()
            phone = m.group(5)
            already = any(c.get('mobile') == phone for c in contacts)
            if not already:
                contacts.append({
                    "id": f"fac-{len(contacts)+1}",
                    "name": name,
                    "designation": "Competition Team Member",
                    "department": "Administration & M-Team",
                    "email": email,
                    "mobile": phone,
                    "intercom": "",
                    "location": "Administration Block"
                })
    return contacts


# ─────────────────────────────────────────────────────────────
# PASS 4: Department staff tables (pages 4 onwards)
#   Format per row (possibly wrapped):
#   <n>  Salutation  Name  Designation  [Intercom]  Mobile
# ─────────────────────────────────────────────────────────────

PHONE_RE = re.compile(r'[6-9]\d{9}')
INTERCOM_RE = re.compile(r'\b(6\d{3}|6\d{2})\b')


def _parse_department_staff(reader, email_map: dict, existing_phones: set) -> list:
    """
    Parse department staff tables from pages 4 onwards.
    Handles multi-line entries by merging continuation lines.
    """
    contacts = []
    current_dept = "Administration & M-Team"

    for page_no, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        lines = [l.strip() for l in text.split('\n') if l.strip()]

        # Merge continuation lines: if a line doesn't start with a number + salutation,
        # it may be a continuation of the previous line.
        merged_lines = []
        i = 0
        while i < len(lines):
            line = lines[i]
            # Check for section headers
            dept = _extract_dept_from_header(line)
            if dept:
                merged_lines.append(("DEPT_HEADER", dept))
                i += 1
                continue
            if _is_header_line(line):
                i += 1
                continue

            # Check if this line starts a new data row
            # Data rows start with: optional number, salutation
            row_start = re.match(
                r'^(?:\d+\s+)?(Dr|Mr|Mrs|Ms|Prof)\.?\s+\S',
                line
            )
            if row_start:
                # Start a new accumulated row
                acc = line
                # Peek ahead for continuation lines
                j = i + 1
                while j < len(lines):
                    nxt = lines[j]
                    if _is_header_line(nxt):
                        break
                    if _extract_dept_from_header(nxt):
                        break
                    # Continuation: doesn't start with number+salutation, doesn't have a phone
                    next_row_start = re.match(
                        r'^(?:\d+\s+)?(Dr|Mr|Mrs|Ms|Prof)\.?\s+\S',
                        nxt
                    )
                    if next_row_start:
                        break
                    # If next line starts with a digit followed by salutation — new row
                    if re.match(r'^\d+\s+(Dr|Mr|Mrs|Ms|Prof)', nxt):
                        break
                    # Merge
                    acc = acc + " " + nxt
                    j += 1
                merged_lines.append(("DATA", acc))
                i = j
            else:
                i += 1

        # Now parse merged lines
        for kind, content in merged_lines:
            if kind == "DEPT_HEADER":
                current_dept = content
                continue

            # Parse data line
            entry = _parse_staff_line(content, current_dept, email_map)
            if entry:
                phone = entry.get('mobile', '')
                if phone and phone in existing_phones:
                    continue
                if phone:
                    existing_phones.add(phone)
                contacts.append(entry)

    return contacts


def _parse_staff_line(line: str, department: str, email_map: dict) -> dict | None:
    """
    Parse a single (possibly merged multi-line) staff entry.
    Returns a dict or None.
    """
    line = _clean_text(line)

    # Strip leading row number
    line = re.sub(r'^\d+\s+', '', line).strip()

    # Must start with salutation
    sal_match = re.match(r'^(Dr|Mr|Mrs|Ms|Prof)\.?\s+', line, re.IGNORECASE)
    if not sal_match:
        return None

    salutation = sal_match.group(1)
    rest = line[sal_match.end():]

    # Extract phone (10-digit mobile)
    phone_match = PHONE_RE.search(rest)
    phone = phone_match.group(0) if phone_match else ""

    # Extract intercom (4-digit starting with 6)
    intercom = ""
    # Look for 4-digit intercom that comes BEFORE phone
    if phone_match:
        before_phone = rest[:phone_match.start()]
        ic_match = re.search(r'\b(6\d{3})\b', before_phone)
        if ic_match:
            intercom = ic_match.group(1)

    # Extract email if present in this line
    email_in_line = ""
    email_match = re.search(r'[a-zA-Z0-9._%+\-]+@bitsathy\.ac\.in', rest, re.IGNORECASE)
    if email_match:
        email_in_line = email_match.group(0).lower().strip()

    # Extract designation — it appears between name and intercom/phone
    desig_match = DESIGNATIONS_PATTERN.search(rest)
    if not desig_match:
        return None

    designation_raw = desig_match.group(0)
    # Name is everything before designation
    name_part = rest[:desig_match.start()].strip()
    # Clean trailing dots, spaces
    name_part = re.sub(r'[\.\s]+$', '', name_part).strip()
    # Fix PDF word-break artifacts in names
    name_part = _fix_split_word(name_part)

    if not name_part:
        return None

    name = f"{salutation} {name_part}"

    # Normalise designation
    designation = _clean_text(designation_raw)

    # Look up email from email_map
    norm_name_part = re.sub(r'[^a-z]', '', name_part.lower())
    norm_name = re.sub(r'[^a-z]', '', name.lower())
    email = email_in_line or email_map.get(norm_name_part, "") or email_map.get(norm_name, "")

    # If no email found, try partial matches (first name only)
    if not email and name_part:
        parts = name_part.split()
        if parts:
            # Try first word of name
            first_word_norm = re.sub(r'[^a-z]', '', parts[0].lower())
            # Find best match in email_map
            for k, v in email_map.items():
                if k.startswith(first_word_norm) and len(first_word_norm) >= 4:
                    # Also check last name initial
                    if len(parts) > 1:
                        last_init = parts[-1][0].lower() if parts[-1] else ''
                        if last_init and last_init in k[len(first_word_norm):]:
                            email = v
                            break
                    else:
                        email = v
                        break

    # Skip if we have no phone AND no email (fully empty record)
    if not phone and not email:
        return None

    dept_display = department
    if dept_display.startswith("Department of "):
        dept_display = dept_display.replace("Department of ", "")

    return {
        "id": "",  # will be assigned later
        "name": name,
        "designation": designation,
        "department": dept_display,
        "email": email,
        "mobile": phone,
        "intercom": intercom,
        "location": f"{dept_display} Block"
    }


# ─────────────────────────────────────────────────────────────
# PASS 5: Email-only records (faculty in email directory
#          but NOT in phone directory)
# ─────────────────────────────────────────────────────────────

def _add_email_only_records(reader, email_map: dict, existing_phones: set, existing_emails: set) -> list:
    """
    For faculty who appear only in email directory pages (no phone number),
    add them with email only and no mobile.
    """
    contacts = []

    email_dir_re = re.compile(
        r'(?:\d+\s+)'
        r'(Dr|Mr|Mrs|Ms|Prof)\.?\s+'
        r'([A-Z][A-Z\s\.\-]+?)\s+'
        r'([A-Z]{2,6})\s+'
        r'([a-zA-Z0-9._%+\-]+@bitsathy\.ac\.in)',
        re.IGNORECASE
    )

    for page_no, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if "@bitsathy.ac.in" not in text:
            continue

        lines = [l.strip() for l in text.split('\n') if l.strip()]
        for line in lines:
            m = email_dir_re.search(line)
            if not m:
                continue
            salut = m.group(1)
            raw_name = _clean_text(m.group(2))
            dept_code = m.group(3).upper()
            email = m.group(4).lower().strip()

            if email in existing_emails:
                continue

            name = f"{salut} {raw_name}"
            dept = DEPT_MAP.get(dept_code, dept_code)

            existing_emails.add(email)
            contacts.append({
                "id": "",
                "name": name,
                "designation": "Faculty Member",
                "department": dept,
                "email": email,
                "mobile": "",  # No phone in email directory
                "intercom": "",
                "location": f"{dept} Block"
            })

    return contacts


# ─────────────────────────────────────────────────────────────
# Main init function
# ─────────────────────────────────────────────────────────────

def init_faculty_index(force_reload=False):
    global _FACULTY_LIST, _FACULTY_BY_EMAIL

    if _FACULTY_LIST and not force_reload:
        return len(_FACULTY_LIST)

    # 1. Try loading from cache JSON
    if not force_reload and os.path.exists(CACHE_JSON_PATH):
        try:
            with open(CACHE_JSON_PATH, "r", encoding="utf-8") as f:
                cached_data = json.load(f)
                if isinstance(cached_data, list) and len(cached_data) > 50:
                    _FACULTY_LIST = cached_data
                    _FACULTY_BY_EMAIL = {f['email'].lower(): f for f in _FACULTY_LIST if f.get('email')}
                    logger.info(f"Loaded {len(_FACULTY_LIST)} faculty records from cache JSON.")
                    return len(_FACULTY_LIST)
        except Exception as e:
            logger.warning(f"Failed to read faculty cache json: {e}")

    # 2. Extract from PDF
    if not os.path.exists(FACULTY_PDF_PATH):
        logger.warning(f"Faculty contacts PDF not found at {FACULTY_PDF_PATH}")
        return 0

    if pypdf is None:
        logger.error("pypdf not installed — cannot parse faculty PDF")
        return 0

    try:
        reader = pypdf.PdfReader(FACULTY_PDF_PATH)
        logger.info(f"Parsing {len(reader.pages)}-page faculty PDF...")

        all_contacts = []
        seen_phones = set()
        seen_emails = set()

        # PASS 1: Build email map from email directory pages
        email_map = _build_email_map(reader)
        logger.info(f"Built email map with {len(email_map)} entries.")

        # PASS 2: Special Labs
        lab_contacts = _parse_special_labs(reader, email_map)
        for c in lab_contacts:
            p = c.get('mobile', '')
            e = c.get('email', '').lower()
            if p:
                seen_phones.add(p)
            if e:
                seen_emails.add(e)
        all_contacts.extend(lab_contacts)
        logger.info(f"Special Labs: {len(lab_contacts)} entries")

        # PASS 3: Competition Team
        comp_contacts = _parse_competition_team(reader, email_map)
        for c in comp_contacts:
            p = c.get('mobile', '')
            e = c.get('email', '').lower()
            if p and p not in seen_phones:
                seen_phones.add(p)
                seen_emails.add(e) if e else None
                all_contacts.append(c)
        logger.info(f"Competition Team: {len(comp_contacts)} entries")

        # PASS 4: Department staff
        dept_contacts = _parse_department_staff(reader, email_map, seen_phones)
        for c in dept_contacts:
            e = c.get('email', '').lower()
            if e:
                seen_emails.add(e)
        all_contacts.extend(dept_contacts)
        logger.info(f"Department Staff: {len(dept_contacts)} entries")

        # PASS 5: Email-only faculty
        email_only = _add_email_only_records(reader, email_map, seen_phones, seen_emails)
        all_contacts.extend(email_only)
        logger.info(f"Email-only Faculty: {len(email_only)} entries")

        # Assign sequential IDs
        for idx, c in enumerate(all_contacts):
            c['id'] = f"fac-{idx+1}"

        _FACULTY_LIST = all_contacts
        _FACULTY_BY_EMAIL = {f['email'].lower(): f for f in _FACULTY_LIST if f.get('email')}

        # Save to cache JSON
        try:
            os.makedirs(os.path.dirname(CACHE_JSON_PATH), exist_ok=True)
            with open(CACHE_JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(_FACULTY_LIST, f, indent=2, ensure_ascii=False)
            logger.info(f"Saved {len(_FACULTY_LIST)} faculty records to cache.")
        except Exception as e:
            logger.warning(f"Could not save faculty cache: {e}")

        logger.info(f"Total faculty parsed: {len(_FACULTY_LIST)}")
        return len(_FACULTY_LIST)

    except Exception as e:
        logger.error(f"Error parsing BIT_Staffs_Contacts.pdf: {e}", exc_info=True)
        return 0


def get_faculty_directory(is_verified_user: bool = True, department: str = None, search: str = None):
    """
    Returns list of faculty.
    If is_verified_user is False (Guest), masks mobile phone numbers.
    """
    if not _FACULTY_LIST:
        init_faculty_index()

    results = []
    search_lower = search.lower().strip() if search else ""
    dept_lower = department.lower().strip() if department and department != 'all' else ""

    for f in _FACULTY_LIST:
        # Dept filter
        if dept_lower and dept_lower not in f['department'].lower():
            continue

        # Search filter
        if search_lower:
            text_match = (
                search_lower in f['name'].lower() or
                search_lower in f['department'].lower() or
                search_lower in f['designation'].lower() or
                search_lower in f.get('email', '').lower()
            )
            if not text_match:
                continue

        # Clone and mask phone if unverified guest
        item = dict(f)
        if not is_verified_user:
            ph = item.get('mobile', '')
            if len(ph) == 10:
                item['mobile'] = f"{ph[:2]}******{ph[-2:]}"
                item['is_masked'] = True
            elif ph:
                item['mobile'] = "Locked (Verification Required)"
                item['is_masked'] = True
            else:
                item['is_masked'] = False
        else:
            item['is_masked'] = False

        results.append(item)

    return results


def find_faculty_by_email(email: str):
    if not _FACULTY_LIST:
        init_faculty_index()
    if not email:
        return None
    clean_mail = email.lower().strip()
    return _FACULTY_BY_EMAIL.get(clean_mail)


def is_faculty_email(email: str) -> bool:
    """
    Determines if an email belongs to a teacher/staff member vs a student.
    """
    if not email or not email.endswith('@bitsathy.ac.in'):
        return False
    prefix = email.split('@')[0].lower()
    if re.search(r'7376\d+', prefix):
        return False
    return True


# ─────────────────────────────────────────────────────────────
# Admin CRUD — Add / Update / Delete contacts
# ─────────────────────────────────────────────────────────────

def _save_cache():
    """Persist current _FACULTY_LIST to JSON cache."""
    try:
        os.makedirs(os.path.dirname(CACHE_JSON_PATH), exist_ok=True)
        with open(CACHE_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(_FACULTY_LIST, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.warning(f"Could not save faculty cache: {e}")


def _rebuild_email_index():
    global _FACULTY_BY_EMAIL
    _FACULTY_BY_EMAIL = {f['email'].lower(): f for f in _FACULTY_LIST if f.get('email')}


def add_contact(data: dict) -> dict:
    """
    Add a new contact to the in-memory list and persist to cache.
    Returns the new contact dict with assigned ID.
    """
    global _FACULTY_LIST
    if not _FACULTY_LIST:
        init_faculty_index()

    # Assign a unique ID
    existing_ids = {c.get('id', '') for c in _FACULTY_LIST}
    idx = len(_FACULTY_LIST) + 1
    new_id = f"fac-{idx}"
    while new_id in existing_ids:
        idx += 1
        new_id = f"fac-{idx}"

    contact = {
        "id": new_id,
        "name": _clean_text(data.get("name", "")),
        "designation": _clean_text(data.get("designation", "")),
        "department": _clean_text(data.get("department", "")),
        "email": data.get("email", "").lower().strip(),
        "mobile": re.sub(r'[^0-9]', '', data.get("mobile", "")),
        "intercom": re.sub(r'[^0-9]', '', data.get("intercom", "")),
        "location": _clean_text(data.get("location", "")),
    }

    _FACULTY_LIST.append(contact)
    _rebuild_email_index()
    _save_cache()
    logger.info(f"Added contact: {contact['name']} [{new_id}]")
    return contact


def update_contact(contact_id: str, data: dict) -> dict | None:
    """
    Update an existing contact by ID.
    Returns updated contact or None if not found.
    """
    global _FACULTY_LIST
    if not _FACULTY_LIST:
        init_faculty_index()

    for i, c in enumerate(_FACULTY_LIST):
        if c.get('id') == contact_id:
            updated = dict(c)
            if "name" in data:
                updated["name"] = _clean_text(data["name"])
            if "designation" in data:
                updated["designation"] = _clean_text(data["designation"])
            if "department" in data:
                updated["department"] = _clean_text(data["department"])
            if "email" in data:
                updated["email"] = data["email"].lower().strip()
            if "mobile" in data:
                updated["mobile"] = re.sub(r'[^0-9]', '', data["mobile"])
            if "intercom" in data:
                updated["intercom"] = re.sub(r'[^0-9]', '', data["intercom"])
            if "location" in data:
                updated["location"] = _clean_text(data["location"])
            _FACULTY_LIST[i] = updated
            _rebuild_email_index()
            _save_cache()
            logger.info(f"Updated contact: {updated['name']} [{contact_id}]")
            return updated
    return None


def delete_contact(contact_id: str) -> bool:
    """
    Delete a contact by ID.
    Returns True if deleted, False if not found.
    """
    global _FACULTY_LIST
    if not _FACULTY_LIST:
        init_faculty_index()

    original_len = len(_FACULTY_LIST)
    _FACULTY_LIST = [c for c in _FACULTY_LIST if c.get('id') != contact_id]
    if len(_FACULTY_LIST) < original_len:
        _rebuild_email_index()
        _save_cache()
        logger.info(f"Deleted contact [{contact_id}]")
        return True
    return False


def get_all_contacts_raw() -> list:
    """Return raw contact list (unmasked) for admin use."""
    if not _FACULTY_LIST:
        init_faculty_index()
    return list(_FACULTY_LIST)


# Initialize on module load
try:
    init_faculty_index()
except Exception:
    pass

