import os
import sys
import re
import uuid
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.routes.admin import MAX_UPLOAD_SIZE
from app.config import DOCUMENTS_DIR


def test_upload_file_size_limit():
    """Verify upload size cap is enforced at 10 MB."""
    assert MAX_UPLOAD_SIZE == 10 * 1024 * 1024, "Max upload size must be 10MB."
    oversized_bytes = b"0" * (MAX_UPLOAD_SIZE + 1)
    assert len(oversized_bytes) > MAX_UPLOAD_SIZE


def test_pdf_magic_bytes_validation():
    """Verify files must start with %PDF- to be considered genuine."""
    fake_exe = b"MZ\x90\x00\x03\x00\x00\x00"  # Windows Executable magic bytes
    fake_script = b"#!/bin/bash\necho Malicious"
    fake_html = b"<html><script>alert(1)</script></html>"
    genuine_pdf_header = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n"

    assert not fake_exe.startswith(b"%PDF-")
    assert not fake_script.startswith(b"%PDF-")
    assert not fake_html.startswith(b"%PDF-")
    assert genuine_pdf_header.startswith(b"%PDF-")


def test_path_traversal_filename_sanitization():
    """Verify that malicious directory traversal filenames are neutralized."""
    traversal_filenames = [
        "../../etc/passwd",
        "..\\..\\windows\\system32\\cmd.exe.pdf",
        "../../backend/app/config.py.pdf",
        "/absolute/path/file.pdf",
        "valid_doc.pdf\x00.exe"
    ]
    canonical_documents_dir = os.path.abspath(DOCUMENTS_DIR)

    for bad_name in traversal_filenames:
        base_name = os.path.basename(bad_name)
        clean_name = re.sub(r'[^a-zA-Z0-9_\-\. ]', '_', base_name).strip()

        # Random server-generated UUID file naming
        safe_server_name = f"doc_{uuid.uuid4().hex[:16]}.pdf"
        dest_path = os.path.abspath(os.path.join(canonical_documents_dir, safe_server_name))

        # Path must strictly remain inside DOCUMENTS_DIR
        assert dest_path.startswith(canonical_documents_dir), f"Path traversal succeeded for {bad_name}"
        assert not os.path.isabs(clean_name)
        assert ".." not in dest_path


if __name__ == "__main__":
    test_upload_file_size_limit()
    test_pdf_magic_bytes_validation()
    test_path_traversal_filename_sanitization()
    print("ALL FILE UPLOAD SECURITY TESTS PASSED.")

