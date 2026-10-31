import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.routes.auth import AuthenticatedUser, require_authorized_record_access
from app.routes.issues import check_department_alignment
from app.routes.faculty import PRIVILEGED_CONTACT_ROLES


def test_idor_record_ownership():
    """Verify that users can only access their own records unless authorized as admin."""
    student_1 = AuthenticatedUser(id=101, name="Student One", email="s1@bitsathy.ac.in", role="student")
    student_2 = AuthenticatedUser(id=102, name="Student Two", email="s2@bitsathy.ac.in", role="student")
    admin_user = AuthenticatedUser(id=0, name="Admin", email="admin@bitsathy.ac.in", role="admin")

    # Student 1 accessing their own record -> Allowed
    assert require_authorized_record_access(record_owner_id=101, current_user=student_1) is True

    # Student 1 accessing Student 2's record -> DENIED (IDOR blocked)
    assert require_authorized_record_access(record_owner_id=102, current_user=student_1) is False

    # Student 2 accessing Student 1's record -> DENIED (IDOR blocked)
    assert require_authorized_record_access(record_owner_id=101, current_user=student_2) is False

    # Admin accessing Student 1's record -> Allowed
    assert require_authorized_record_access(record_owner_id=101, current_user=admin_user) is True


def test_faculty_privileged_contact_roles():
    """Verify that student role is strictly excluded from privileged contact phone number access."""
    student = AuthenticatedUser(id=1, name="Student", email="st@bitsathy.ac.in", role="student")
    guest = AuthenticatedUser(id=2, name="Guest", email="guest@bitsathy.ac.in", role="guest")
    faculty = AuthenticatedUser(id=3, name="Faculty", email="fac@bitsathy.ac.in", role="faculty")
    hod = AuthenticatedUser(id=4, name="HOD", email="hod@bitsathy.ac.in", role="hod")
    admin = AuthenticatedUser(id=0, name="Admin", email="admin@bitsathy.ac.in", role="admin")

    assert (student.role in PRIVILEGED_CONTACT_ROLES) is False, "Students must not have privileged contact access."
    assert (guest.role in PRIVILEGED_CONTACT_ROLES) is False, "Guests must not have privileged contact access."
    assert (faculty.role in PRIVILEGED_CONTACT_ROLES) is True
    assert (hod.role in PRIVILEGED_CONTACT_ROLES) is True
    assert (admin.role in PRIVILEGED_CONTACT_ROLES) is True


def test_hod_department_boundary_isolation():
    """Verify that HODs are strictly blocked from cross-department ticket updates/visibility."""
    # HOD of IT checking IT issue -> Allowed
    assert check_department_alignment(
        hod_dept="Information Technology",
        creator_dept="Information Technology",
        location="IT Lab 3",
        category="Lab Network"
    ) is True

    # HOD of IT checking Mechanical issue -> DENIED (Cross-department privilege escalation blocked)
    assert check_department_alignment(
        hod_dept="Information Technology",
        creator_dept="Mechanical Engineering",
        location="Mechanical Workshop",
        category="Lathe Machine"
    ) is False

    # HOD of CSE checking Civil issue -> DENIED
    assert check_department_alignment(
        hod_dept="Computer Science and Engineering",
        creator_dept="Civil Engineering",
        location="Surveying Lab",
        category="Equipment"
    ) is False

    # HOD with acronym checking full name department -> Allowed
    assert check_department_alignment(
        hod_dept="CSE",
        creator_dept="Computer Science and Engineering",
        location="IB 204",
        category="General"
    ) is True


if __name__ == "__main__":
    test_idor_record_ownership()
    test_faculty_privileged_contact_roles()
    test_hod_department_boundary_isolation()
    print("ALL AUTHORIZATION TESTS PASSED.")

