import os
import re
import uuid
import shutil
import hashlib
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Body, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
try:
    import pymupdf as fitz
except ImportError:
    import fitz

from app.models.database import get_db, User, ChatHistory, Issue, Document, SystemSetting
from app.models.schemas import AnalyticsResponse, DocumentResponse, SettingsUpdate, SettingsResponse, IssueResponse
from app.routes.auth import require_admin, AuthenticatedUser
from app.services.rag_service import load_and_index_pdf, rebuild_index, DOCUMENTS_DIR
from app.services.faculty_service import (
    get_all_contacts_raw, add_contact, update_contact,
    delete_contact, init_faculty_index
)

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(require_admin)])

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB limit


@router.get("/issues", response_model=List[IssueResponse])
async def get_all_issues(
    user_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to fetch all complaints/issues reported across all users."""
    query_stmt = select(Issue)
    if user_type:
        query_stmt = query_stmt.where(Issue.user_type == user_type)
    if status_filter:
        query_stmt = query_stmt.where(Issue.status == status_filter)
    result = await db.execute(query_stmt.order_by(Issue.created_at.desc()))
    return result.scalars().all()


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(db: AsyncSession = Depends(get_db)):
    """Administrative analytics and aggregation."""
    users_result = await db.execute(select(func.count(User.id)))
    total_users = users_result.scalar() or 0

    queries_result = await db.execute(select(func.count(ChatHistory.id)))
    total_queries = queries_result.scalar() or 0

    issues_result = await db.execute(select(Issue.status, func.count(Issue.id)).group_by(Issue.status))
    issues_by_status = {status: count for status, count in issues_result.all()}

    langs_result = await db.execute(select(ChatHistory.language, func.count(ChatHistory.id)).group_by(ChatHistory.language))
    top_languages = {lang: count for lang, count in langs_result.all()}

    return AnalyticsResponse(
        total_users=total_users,
        total_queries=total_queries,
        issues_by_status=issues_by_status,
        top_languages=top_languages
    )


@router.get("/chatlogs")
async def get_chatlogs(
    search: Optional[str] = None,
    language: Optional[str] = None,
    user_type: Optional[str] = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve chat audit logs with strict pagination to prevent memory exhaustion."""
    query_stmt = select(ChatHistory)
    if user_type:
        query_stmt = query_stmt.where(ChatHistory.user_type == user_type)
    if language:
        query_stmt = query_stmt.where(ChatHistory.language == language)
    if search:
        safe_search = f"%{search.strip()}%"
        query_stmt = query_stmt.where(
            (ChatHistory.message.ilike(safe_search)) |
            (ChatHistory.response.ilike(safe_search)) |
            (ChatHistory.user_name.ilike(safe_search))
        )
    query_stmt = query_stmt.order_by(ChatHistory.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query_stmt)
    return result.scalars().all()


@router.get("/settings")
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Retrieve administrative settings with sensitive secrets masked."""
    result = await db.execute(select(SystemSetting))
    settings_rows = result.scalars().all()
    settings_dict = {}

    for row in settings_rows:
        # Mask sensitive SMTP credentials to prevent exposure in frontend
        if "password" in row.key.lower() or "secret" in row.key.lower():
            settings_dict[row.key] = "********" if row.value else ""
        else:
            settings_dict[row.key] = row.value

    default_settings = {
        "temperature": "0.3",
        "system_prompt": "You are an AI Digital Human Assistant for Bannari Amman Institute of Technology (BIT), Sathyamangalam.",
        "smtp_server": "smtp.gmail.com",
        "smtp_port": "587",
        "smtp_username": "",
        "smtp_password": "",
        "notification_email": "",
        "dept_electrical": "electrical@bitsathy.ac.in",
        "dept_it": "itcell@bitsathy.ac.in",
        "dept_estate": "estate@bitsathy.ac.in"
    }
    default_settings.update(settings_dict)
    return {"settings": default_settings}


@router.post("/settings")
async def update_settings(payload: dict, db: AsyncSession = Depends(get_db)):
    """Update administrative settings securely."""
    for k, v in payload.items():
        if v == "********":
            # Skip masked password placeholders
            continue
        val_str = str(v) if v is not None else ""
        result = await db.execute(select(SystemSetting).where(SystemSetting.key == k))
        row = result.scalar_one_or_none()
        if row:
            row.value = val_str
        else:
            db.add(SystemSetting(key=k, value=val_str))
    await db.commit()
    return {"message": "Settings updated successfully."}


@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(db: AsyncSession = Depends(get_db)):
    """List indexed documents."""
    result = await db.execute(select(Document).order_by(Document.uploaded_at.desc()))
    return result.scalars().all()


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    access_level: Optional[str] = Form("public"),
    db: AsyncSession = Depends(get_db)
):
    """
    Hardened Administrative Document Upload.
    Enforces:
    - 10MB size limit
    - Strict MIME-type & magic bytes check (%PDF-)
    - PyMuPDF content & structure validation
    - Path traversal prevention
    - Random server-generated UUID filenames
    - Document ACL assignment
    """
    raw_filename = file.filename or "uploaded.pdf"
    clean_original_name = re.sub(r'[^a-zA-Z0-9_\-\. ]', '_', os.path.basename(raw_filename)).strip()
    if not clean_original_name.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File upload rejected: Only official PDF documents (.pdf) are permitted."
        )

    # 1. Content-Type Header Verification
    content_type = (file.content_type or "").lower()
    if content_type not in ["application/pdf", "application/x-pdf", "binary/octet-stream"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MIME type '{content_type}'. Expected 'application/pdf'."
        )

    # 2. Size Limit Check
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum upload size of 10MB (file size: {len(contents)} bytes)."
        )
    if len(contents) < 32:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty or too small to be a valid PDF."
        )

    # 3. Magic Bytes Signature Verification
    if not contents.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File signature validation failed. File content does not match genuine PDF magic bytes (%PDF-)."
        )

    # 4. PyMuPDF Structural Validation
    try:
        pdf_doc = fitz.open(stream=contents, filetype="pdf")
        page_count = len(pdf_doc)
        pdf_doc.close()
        if page_count == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded PDF contains zero pages.")
    except Exception as e:
        logger.warning(f"Corrupt PDF upload rejected: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF structure validation failed: document stream is corrupted or unreadable."
        )

    # 5. Canonical Path & Random Server Filename (Path Traversal Prevention)
    safe_server_name = f"doc_{uuid.uuid4().hex[:16]}.pdf"
    canonical_documents_dir = os.path.abspath(DOCUMENTS_DIR)
    canonical_dest_path = os.path.abspath(os.path.join(canonical_documents_dir, safe_server_name))

    if not canonical_dest_path.startswith(canonical_documents_dir):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Path traversal attempt detected.")

    # 6. Save File & Compute SHA-256 Hash
    file_sha256 = hashlib.sha256(contents).hexdigest()
    with open(canonical_dest_path, "wb") as buffer:
        buffer.write(contents)

    # 7. Index into FAISS Vectorstore
    safe_access = access_level if access_level in ["public", "faculty", "admin"] else "public"
    chunk_count = load_and_index_pdf(canonical_dest_path, access_level=safe_access)

    # 8. Persist Record
    doc = Document(
        filename=clean_original_name,
        filepath=canonical_dest_path,
        chunk_count=chunk_count,
        access_level=safe_access,
        sha256_hash=file_sha256
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return {
        "message": "Document validated, uploaded, and indexed successfully.",
        "id": doc.id,
        "filename": clean_original_name,
        "chunks": chunk_count,
        "access_level": safe_access,
        "sha256": file_sha256
    }


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    """
    Secure Document Deletion with Canonical Path Checking.
    """
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    canonical_documents_dir = os.path.abspath(DOCUMENTS_DIR)
    canonical_file_path = os.path.abspath(doc.filepath)

    if canonical_file_path.startswith(canonical_documents_dir) and os.path.exists(canonical_file_path):
        try:
            os.remove(canonical_file_path)
        except Exception as e:
            logger.warning(f"Failed to delete document file on disk: {e}")

    await db.delete(doc)
    await db.commit()
    return {"message": "Document deleted successfully."}


@router.post("/documents/reindex")
async def reindex_documents():
    """Admin endpoint to rebuild the FAISS vector index."""
    count = rebuild_index()
    return {"message": "FAISS vector index rebuilt successfully.", "total_chunks": count}


# ─────────────────────────────────────────────────────────────
# Faculty / Staff Directory — Admin CRUD
# ─────────────────────────────────────────────────────────────

@router.get("/contacts")
async def admin_list_contacts(
    search: Optional[str] = None,
    department: Optional[str] = None,
):
    """Admin: list all contacts with unmasked administrative details."""
    contacts = get_all_contacts_raw()

    if department and department != 'all':
        dept_lower = department.lower()
        contacts = [c for c in contacts if dept_lower in c.get('department', '').lower()]

    if search:
        s = search.lower().strip()
        contacts = [
            c for c in contacts
            if s in c.get('name', '').lower()
            or s in c.get('department', '').lower()
            or s in c.get('designation', '').lower()
            or s in c.get('email', '').lower()
            or s in c.get('mobile', '').lower()
        ]

    return {"total": len(contacts), "contacts": contacts}


@router.post("/contacts")
async def admin_add_contact(data: dict = Body(...)):
    """Admin: add a new faculty/staff contact."""
    if not data.get("name"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contact name is required.")
    contact = add_contact(data)
    return {"message": "Contact added successfully.", "contact": contact}


@router.put("/contacts/{contact_id}")
async def admin_update_contact(contact_id: str, data: dict = Body(...)):
    """Admin: update an existing contact by ID."""
    updated = update_contact(contact_id, data)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Contact '{contact_id}' not found.")
    return {"message": "Contact updated successfully.", "contact": updated}


@router.delete("/contacts/{contact_id}")
async def admin_delete_contact(contact_id: str):
    """Admin: delete a contact by ID."""
    ok = delete_contact(contact_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Contact '{contact_id}' not found.")
    return {"message": "Contact deleted successfully.", "deleted_id": contact_id}


@router.post("/contacts/reload")
async def admin_reload_contacts():
    """Admin: force re-parse the faculty PDF and rebuild the directory."""
    count = init_faculty_index(force_reload=True)
    return {"message": "Faculty directory reloaded from PDF.", "total_records": count}
