import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_

from app.models.database import get_db, Issue, User
from app.models.schemas import IssueCreate, IssueUpdate, IssueResponse
from app.routes.auth import get_current_user, require_roles, AuthenticatedUser
from app.services.email_service import send_complaint_email, send_resolution_email

logger = logging.getLogger(__name__)

router = APIRouter()


def check_department_alignment(hod_dept: Optional[str], creator_dept: Optional[str], location: Optional[str], category: Optional[str]) -> bool:
    """
    Validates whether an issue falls strictly within the departmental jurisdiction of the HOD.
    Prevents cross-department unauthorized access.
    """
    if not hod_dept:
        return False

    clean_hod = hod_dept.strip().lower()
    clean_creator = (creator_dept or "").strip().lower()
    clean_loc = (location or "").strip().lower()
    clean_cat = (category or "").strip().lower()

    # Exact or substring department matching
    if clean_hod in clean_creator or (clean_creator and clean_creator in clean_hod):
        return True
    if clean_hod in clean_loc or clean_hod in clean_cat:
        return True

    # Common department acronym mapping
    dept_acronyms = {
        "cse": "computer science",
        "it": "information technology",
        "ad": "artificial intelligence and data science",
        "aids": "artificial intelligence and data science",
        "aiml": "artificial intelligence and machine learning",
        "ece": "electronics and communication",
        "eee": "electrical and electronics",
        "mech": "mechanical",
        "mcts": "mechatronics",
        "civil": "civil",
        "bt": "biotechnology"
    }

    for acronym, full_form in dept_acronyms.items():
        if (acronym in clean_hod or full_form in clean_hod):
            if acronym in clean_creator or full_form in clean_creator:
                return True
            if acronym in clean_loc or full_form in clean_loc:
                return True
            if acronym in clean_cat or full_form in clean_cat:
                return True

    return False


@router.post("", response_model=IssueResponse)
async def create_issue(
    issue_data: IssueCreate,
    background_tasks: BackgroundTasks,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a campus maintenance issue / ticket.
    Binds the ticket authoritatively to current_user.id to prevent IDOR and privilege escalation.
    """
    user_id = current_user.id if current_user.id and str(current_user.id) != "0" else None
    user_name = current_user.name or "BIT Member"
    user_email = current_user.email
    user_role = current_user.role or "student"

    if not user_email and current_user.roll_number:
        user_email = f"{current_user.roll_number.lower()}@bitsathy.ac.in"

    new_issue = Issue(
        user_id=user_id,
        user_name=user_name,
        user_type=user_role,
        user_email=user_email,
        user_phone=issue_data.user_phone,
        category=issue_data.category,
        location=issue_data.location,
        description=issue_data.description,
        priority=issue_data.priority or "medium",
        status="open"
    )
    db.add(new_issue)
    await db.commit()
    await db.refresh(new_issue)

    background_tasks.add_task(send_complaint_email, {
        "id": new_issue.id,
        "user_name": new_issue.user_name,
        "user_email": new_issue.user_email,
        "category": new_issue.category,
        "location": new_issue.location,
        "description": new_issue.description,
        "priority": new_issue.priority
    })

    return new_issue


@router.get("", response_model=List[IssueResponse])
async def list_issues(
    user_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List issues based on strict access control rules:
    - Students / Regular Users: Strictly limited to viewing their OWN submitted issues (Anti-IDOR).
    - HOD: Strictly restricted to issues within their OWN department. Cross-department viewing blocked.
    - Admin: Full visibility across all departments and tickets.
    """
    user_role = (current_user.role or "").lower()
    user_id = current_user.id

    query_stmt = select(Issue)

    # 1. Administrator Scope: All records across departments
    if user_role == "admin":
        if user_type:
            query_stmt = query_stmt.where(Issue.user_type == user_type)
        if status_filter:
            query_stmt = query_stmt.where(Issue.status == status_filter)
        result = await db.execute(query_stmt.order_by(Issue.created_at.desc()))
        return result.scalars().all()

    # 2. HOD Scope: Restricted to tickets submitted by users in their department or matching their department
    if user_role == "hod":
        hod_dept = current_user.department or ""
        # Join User to inspect submitter's department
        query_stmt = query_stmt.outerjoin(User, Issue.user_id == User.id)
        if hod_dept:
            query_stmt = query_stmt.where(
                or_(
                    User.department.ilike(f"%{hod_dept}%"),
                    Issue.location.ilike(f"%{hod_dept}%"),
                    Issue.category.ilike(f"%{hod_dept}%"),
                    Issue.description.ilike(f"%{hod_dept}%")
                )
            )
        if user_type:
            query_stmt = query_stmt.where(Issue.user_type == user_type)
        if status_filter:
            query_stmt = query_stmt.where(Issue.status == status_filter)

        result = await db.execute(query_stmt.order_by(Issue.created_at.desc()))
        return result.scalars().all()

    # 3. Student & Standard Member Scope: Anti-IDOR. Can ONLY view their own tickets
    if not user_id or str(user_id) == "0":
        return []

    query_stmt = query_stmt.where(Issue.user_id == user_id)
    if status_filter:
        query_stmt = query_stmt.where(Issue.status == status_filter)

    result = await db.execute(query_stmt.order_by(Issue.created_at.desc()))
    return result.scalars().all()


@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(
    issue_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve single issue ticket by ID with strict ownership and boundary validation.
    Prevents Insecure Direct Object Reference (IDOR) attacks.
    """
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue ticket not found.")

    user_role = (current_user.role or "").lower()
    user_id = current_user.id

    # 1. Admin: permitted
    if user_role == "admin":
        return issue

    # 2. HOD: permitted only within their department
    if user_role == "hod":
        creator_dept = ""
        if issue.user_id:
            user_res = await db.execute(select(User).where(User.id == issue.user_id))
            creator = user_res.scalar_one_or_none()
            if creator:
                creator_dept = creator.department or ""

        if not check_department_alignment(current_user.department, creator_dept, issue.location, issue.category):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: HODs are only authorized to view tickets within their own department."
            )
        return issue

    # 3. Student / Regular Member: Must be the ticket author
    if issue.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to view tickets submitted by other users."
        )

    return issue


@router.patch("/{issue_id}", response_model=IssueResponse)
async def update_issue(
    issue_id: int,
    update_data: IssueUpdate,
    background_tasks: BackgroundTasks,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update ticket status and resolution notes.
    Strictly restricted to HOD (for their own department) and Admin roles.
    Cross-department updates are rejected.
    """
    user_role = (current_user.role or "").lower()
    if user_role not in ["hod", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: Ticket status updates are strictly restricted to HODs and Administrators."
        )

    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue ticket not found.")

    # Department jurisdiction verification for HOD
    if user_role == "hod":
        creator_dept = ""
        if issue.user_id:
            user_res = await db.execute(select(User).where(User.id == issue.user_id))
            creator = user_res.scalar_one_or_none()
            if creator:
                creator_dept = creator.department or ""

        if not check_department_alignment(current_user.department, creator_dept, issue.location, issue.category):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-department authorization failure: HODs can only update issues within their own department."
            )

    was_not_resolved = issue.status != "resolved"

    if update_data.status:
        issue.status = update_data.status
        if update_data.status == "resolved":
            issue.resolved_at = datetime.utcnow()
    if update_data.admin_notes is not None:
        issue.admin_notes = update_data.admin_notes

    issue.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(issue)

    # Send resolution email if status transitioned to resolved
    if issue.status == "resolved" and was_not_resolved and update_data.send_email:
        background_tasks.add_task(send_resolution_email, {
            "id": issue.id,
            "user_name": issue.user_name,
            "user_email": issue.user_email,
            "category": issue.category,
            "location": issue.location,
            "description": issue.description,
            "admin_notes": issue.admin_notes or "The issue has been resolved by your department administration."
        })

    return issue


@router.delete("/{issue_id}")
async def delete_issue(
    issue_id: int,
    admin: AuthenticatedUser = Depends(require_roles(["admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an issue ticket. Restricted exclusively to Administrators.
    """
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found.")

    await db.delete(issue)
    await db.commit()
    return {"message": "Issue ticket deleted successfully."}
