import logging
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, Query, HTTPException, status

from app.routes.auth import get_current_user, require_roles, AuthenticatedUser
from app.services.faculty_service import (
    get_all_contacts_raw,
    _FACULTY_LIST,
    init_faculty_index
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Privileged roles permitted to access restricted personal mobile numbers & extensions
PRIVILEGED_CONTACT_ROLES = ["faculty", "hod", "staff", "admin"]


@router.get("/directory")
async def get_directory(
    department: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns faculty directory with rigorous role-based PII segregation:
    - Public data: name, designation, department, cabin location, and official email.
    - Restricted data: personal mobile numbers and extension intercoms.
    Strictly restricts viewing of sensitive phone numbers to verified faculty, hod, staff, and admin roles.
    """
    user_role = (current_user.role or "").lower()
    can_view_sensitive = user_role in PRIVILEGED_CONTACT_ROLES

    if not _FACULTY_LIST:
        init_faculty_index()

    raw_contacts = get_all_contacts_raw()
    dept_filter = department.lower().strip() if department and department != 'all' else ""
    search_filter = search.lower().strip() if search else ""

    sanitized_directory: List[Dict[str, Any]] = []

    for f in raw_contacts:
        f_dept = (f.get("department") or "").lower()
        f_name = (f.get("name") or "").lower()
        f_desig = (f.get("designation") or "").lower()
        f_email = (f.get("email") or "").lower()

        # Apply department filtering
        if dept_filter and dept_filter not in f_dept:
            continue

        # Apply multi-field search filtering
        if search_filter:
            matches_search = (
                search_filter in f_name or
                search_filter in f_dept or
                search_filter in f_desig or
                search_filter in f_email
            )
            if not matches_search:
                continue

        # 1. Public Data Elements (accessible to all verified users including students)
        sanitized_item: Dict[str, Any] = {
            "id": f.get("id"),
            "name": f.get("name"),
            "designation": f.get("designation"),
            "department": f.get("department"),
            "email": f.get("email", ""),
            "location": f.get("location") or "Faculty Cabins, BIT Campus"
        }

        # 2. Restricted Data Elements (personal mobile numbers & extensions)
        if can_view_sensitive:
            sanitized_item["mobile"] = f.get("mobile", "")
            sanitized_item["intercom"] = f.get("intercom", "")
            sanitized_item["is_restricted"] = False
        else:
            # Student or restricted role: Redact and mask phone and extension
            sanitized_item["mobile"] = "[Protected - Staff Only]" if f.get("mobile") else ""
            sanitized_item["intercom"] = None
            sanitized_item["is_restricted"] = True

        sanitized_directory.append(sanitized_item)

    return {
        "is_verified_user": True,
        "role": user_role,
        "can_view_sensitive": can_view_sensitive,
        "total": len(sanitized_directory),
        "faculty": sanitized_directory
    }


@router.get("/contact-search")
async def contact_search(
    q: str = Query(""),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Search faculty contacts by query keyword.
    Applies the same role-based contact data segregation to protect personal mobile numbers.
    """
    user_role = (current_user.role or "").lower()
    can_view_sensitive = user_role in PRIVILEGED_CONTACT_ROLES

    if not _FACULTY_LIST:
        init_faculty_index()

    raw_contacts = get_all_contacts_raw()
    search_term = q.lower().strip() if q else ""

    results: List[Dict[str, Any]] = []

    for f in raw_contacts:
        if search_term:
            f_name = (f.get("name") or "").lower()
            f_dept = (f.get("department") or "").lower()
            f_desig = (f.get("designation") or "").lower()
            f_email = (f.get("email") or "").lower()

            if not (
                search_term in f_name or
                search_term in f_dept or
                search_term in f_desig or
                search_term in f_email
            ):
                continue

        item: Dict[str, Any] = {
            "id": f.get("id"),
            "name": f.get("name"),
            "designation": f.get("designation"),
            "department": f.get("department"),
            "email": f.get("email", ""),
            "location": f.get("location") or "Faculty Cabins, BIT Campus"
        }

        if can_view_sensitive:
            item["mobile"] = f.get("mobile", "")
            item["intercom"] = f.get("intercom", "")
            item["is_restricted"] = False
        else:
            item["mobile"] = "[Protected - Staff Only]" if f.get("mobile") else ""
            item["intercom"] = None
            item["is_restricted"] = True

        results.append(item)
        if len(results) >= 10:
            break

    return {
        "is_verified_user": True,
        "role": user_role,
        "can_view_sensitive": can_view_sensitive,
        "results": results
    }


@router.get("/departments")
async def get_departments():
    """
    Return distinct list of campus departments.
    """
    if not _FACULTY_LIST:
        init_faculty_index()

    depts = sorted(list({f.get("department") for f in _FACULTY_LIST if f.get("department")}))
    return {
        "departments": depts
    }


@router.post("/reload")
async def reload_faculty_index(
    admin: AuthenticatedUser = Depends(require_roles(["admin"]))
):
    """
    Force reload the faculty directory from source document.
    Strictly restricted to Administrators to prevent unauthorized CPU exhaustion.
    """
    count = init_faculty_index(force_reload=True)
    return {
        "status": "reloaded",
        "total_records": count
    }
