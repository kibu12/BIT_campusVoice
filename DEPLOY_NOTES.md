# BIT CampusVoice — Deployment Notes & Operational Register

**Document Version:** 1.0.0  
**Date:** October 31, 2026  
**Auditor / Engineer:** Senior Application Security Engineer & Full-Stack Architect  

---

## 1. Scope & System Summary

This document records architectural decisions, configuration policies, git history security scan results, and items requiring explicit human action (such as external key generation, git history rewriting, and third-party credential acquisition) for the **BIT CampusVoice** platform.

---

## 2. Phase 1: Security Scrubbing & Git History Findings

### 2.1 Git History Security Scan Findings
A commit log inspection (`git log --all -p`) was conducted. The following sensitive items were identified in historical git commits:

1. **Commit `8cafa71` (Initial Commit Baseline):**
   - **Tracked Protected Files:** Confidential student lists (`backend/data/documents/BIT_StudentList.pdf`), faculty personal mobile directory (`backend/data/documents/BIT_Staffs_Contacts.pdf`), student database cache (`backend/data/students_cache.json`), and FAISS vector index files (`backend/data/vectorstore/index.faiss`, `index.pkl`) were initially committed to git tracking.
   - **Hardcoded Legacy Credentials:** Cleartext administrator credentials (`admin1` / `1admin`) were embedded in `HOW_TO_RUN.txt` and `README.md`.
   - **API Keys in Git History:** An active/historic Groq API key (`gsk_...`) was embedded in the initial commit history.

2. **Commit `8f02cf8` (Security Remediation Checkpoint):**
   - The sensitive PDFs (`BIT_StudentList.pdf`, `BIT_Staffs_Contacts.pdf`) were deleted from `documents/` in this commit, but remain present in the git object database of the previous commit.
   - `production.env.template` contained dummy template prefixes (`gsk_PRODUCTION_KEY_REPLACE`, `tvly-PRODUCTION_KEY_REPLACE`).

### 2.2 Working Tree Hardening Completed:
- `backend/.env` is strictly excluded from version control and confirmed untracked.
- `backend/.env.example` created with pure placeholder names (no real values).
- `backend/data/vectorstore/` removed from git tracking (`git rm -r --cached`).
- `backend/data/protected/` confirmed gitignored.
- `backend/data/campus_assistant.db` and `data/campus_assistant.db` confirmed gitignored and untracked.
- Stray `__pycache__` and `.pyc` files completely purged.
- Hardcoded secret strings and legacy credentials (`admin1`/`1admin`) removed from `README.md` and `HOW_TO_RUN.txt`.

---

## 3. Phase 2: Configuration & Database Architecture Decisions

### 3.1 Database Strategy Decision: SQLite with Single-Instance Volume Persistence
- **Decision:** SQLite (`sqlite+aiosqlite:///./data/campus_assistant.db`) is selected as the primary supported database for this standalone release.
- **Architectural Rationale:**
  - BIT CampusVoice couples relational ticketing and user state with disk-resident FAISS vector stores (`data/vectorstore/`) and local PDF documents.
  - A persistent Docker volume (`campus_data:/app/data`) provides zero-dependency, single-instance deployment without requiring an external database cluster.
  - SQLite with WAL mode (`PRAGMA journal_mode=WAL`) provides high read concurrency and ACID transaction safety for campus queries.
  - **Single-Instance Limitation:** SQLite databases cannot be concurrently shared across multiple scaled-out container replicas. For horizontal multi-instance scaling, a managed PostgreSQL instance and distributed vector store (e.g. pgvector or Milvus) must be adopted.
- **PostgreSQL Compatibility (`asyncpg`):**
  - Dialect-aware connection configuration was implemented in `backend/app/models/database.py`. If a `postgresql+asyncpg://` URL is provided, the query parameter `ssl=require` is automatically translated to `connect_args={"ssl": "require"}` to prevent `asyncpg` keyword errors.

### 3.2 Centralized Configuration Policy
- `backend/app/config.py` is established as the sole entry point for environment variable resolution. Direct calls to `os.getenv` or `os.environ` in routes, services, or entry scripts have been completely removed.
- **Fail-Fast Validation in Production:** When `ENVIRONMENT=production`, startup aborts immediately (`ValueError`) if `JWT_SECRET_KEY` ($\ge 32$ chars), `GROQ_API_KEY`, `DATABASE_URL`, or `ALLOWED_ORIGINS` are absent or empty.
- Pinned dependency manifest `backend/requirements.txt` with exact versions based on `pip freeze`, adding `gunicorn` and `asyncpg`.
- Replaced legacy `production.env.template` with `.env.production.example`.

---

## 4. Phase 3: Frontend API Layer Decoupling

- **Hardcoded URLs Removed:** Replaced all hardcoded instances of `http://localhost:8000` and `http://${host}:8000` in `frontend/src/pages/AdminPage.jsx`, `frontend/src/services/api.js`, and `frontend/src/context/AuthContext.jsx`.
- **Dynamic Base URL:** Implemented `API_BASE_URL` resolved from `import.meta.env.VITE_API_BASE_URL || '/api'`, enabling zero-configuration reverse proxy support behind Nginx.
- **Documentation:** Created `frontend/.env.example` documenting `VITE_API_BASE_URL`.
- **Build Verification:** Verified `npm run build` succeeds (1.22s, 0 errors) and validated static output with `npx vite preview` (returned HTTP 200).

---

## 5. Phase 4: Containerization & Reverse Proxy Architecture

- **`backend/Dockerfile`:** Built from `python:3.11-slim`, installs system libraries for PyMuPDF, creates unprivileged user `appuser` (UID 1000), mounts persistent volume at `/app/data`, and runs production `gunicorn` with `uvicorn.workers.UvicornWorker` across 2 workers.
- **`frontend/Dockerfile`:** Multi-stage build (Node 20 Alpine stage compiles Vite assets with `npm ci && npm run build`; Nginx Alpine stage serves static files and applies reverse proxy routing).
- **`nginx.conf`:** Top-level reverse proxy serving frontend on `/` and proxying `/api/` to `backend:8000/api/` with 10MB body limit, WebSocket upgrades, HSTS, CSP, and TLS placeholders.
- **`docker-compose.yml`:** Unifies `backend`, `frontend`, and `nginx` services with persistent named volume `campus_data`. Validated cleanly via `docker compose config`.

---

## 6. Items Requiring Human Action & Decisions

The following items cannot be automated by code remediation and require explicit human administrative action:

1. **Git History Rewriting (Confidential PII & Secret Purge):**
   Historical commits (`8cafa71`) contain tracked copies of `BIT_StudentList.pdf`, `BIT_Staffs_Contacts.pdf`, and legacy credentials. The repository owner must execute a git history rewrite using `git-filter-repo` before publishing or transferring the repository:
   ```bash
   pip install git-filter-repo
   git filter-repo --path backend/data/documents/BIT_StudentList.pdf --invert-paths --force
   git filter-repo --path backend/data/documents/BIT_Staffs_Contacts.pdf --invert-paths --force
   git filter-repo --path backend/data/students_cache.json --invert-paths --force
   git filter-repo --path backend/data/vectorstore/ --invert-paths --force
   ```

2. **External Credential Revocation & Re-Issuance:**
   - **Groq Cloud API Key:** Any historical Groq API key present in git history must be revoked at [console.groq.com](https://console.groq.com/) and replaced with a newly generated production key.
   - **Tavily API Key:** Revoke any prior search keys at [app.tavily.com](https://app.tavily.com/) and issue a new key for production.

3. **Google OpenID Connect Client ID Setup:**
   An authorized IT administrator must configure an OAuth 2.0 Web Client ID in the college Google Cloud project:
   - Restrict JavaScript Origins to `https://campusvoice.bitsathy.ac.in`
   - Set `GOOGLE_CLIENT_ID` in `backend/.env` and `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`.

4. **Production Administrator Password Generation:**
   Generate the initial administrator Argon2id password hash using:
   ```bash
   python -c "from argon2 import PasswordHasher; ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, hash_len=32); print(ph.hash('YourStrongPassword'))"
   ```
   Save the resulting string into `ADMIN_PASSWORD_HASH` in `backend/.env`.

5. **Docker Daemon Activation:**
   `docker compose config` was verified and passed. To launch the full container stack, the local administrator must start the Docker Desktop service and execute `docker compose up --build -d`.

---

## 7. Automated Security Test Results Summary

| Test Suite | Purpose | Execution Time | Result |
| :--- | :--- | :---: | :---: |
| `test_authentication.py` | JWT length, Argon2id, Google OIDC token validation, domain restriction | 3.304s | **PASS** |
| `test_authorization.py` | IDOR prevention, record ownership, HOD department boundaries | 2.949s | **PASS** |
| `test_rag_security.py` | Prompt injection defense, PII bulk exfiltration blocking, ACL isolation | 4.605s | **PASS** |
| `test_file_upload.py` | 10MB size cap, %PDF- magic bytes, path traversal sanitization | 4.680s | **PASS** |
| `test_api_security.py` | Security headers, admin route 403, settings secret masking, SQLi resilience | 6.241s | **PASS** |

**Total Suite Execution Time:** 21.779s  
**Overall Status:** **100% Passing (Exit Code: 0)**
