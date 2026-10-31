# BIT CampusVoice — Multilingual AI Campus Assistant & Navigator

An intelligent, secure, multilingual AI campus assistant and turn-by-turn road navigator designed for the students, faculty, and administration of **Bannari Amman Institute of Technology (BIT)**, Sathyamangalam.

Powered by **FastAPI, LangChain RAG, FAISS Vector Embeddings, Argon2id Password Security, Google Workspace OpenID Connect SSO, Dijkstra Turn-by-Turn Campus Navigation, Microsoft Edge-TTS Neural Voice Synthesis, and React 19.**

---

## Architecture Overview

```
                                  [ Client Browser ]
                                          │
                        ┌─────────────────┴─────────────────┐
                        │       HTTP / HTTPS (Port 80/443)  │
                        ▼                                   ▼
             [ Nginx Reverse Proxy ]              [ Static React 19 SPA ]
            (deploy/nginx.conf / 10MB cap)       (TailwindCSS, Three.js 3D)
                        │
                        │ /api/* (Proxied with Security Headers)
                        ▼
             [ FastAPI Backend Gateway ]
           (Gunicorn + Uvicorn Workers)
                        │
       ┌────────────────┼────────────────────────┬────────────────┐
       ▼                ▼                        ▼                ▼
[ Auth Gateway ]  [ RAG Engine ]          [ Campus Router ] [ Voice Engine ]
- Google OIDC     - FAISS Vector Store    - GeoBITs Graph   - Edge-TTS Neural
  (@bitsathy.ac)    (SHA-256 Integrity)   - Dijkstra Path     (Tamil, Hindi,
- Argon2id Hash   - Pre-Retrieval ACLs      (241 segments)     Malayalam, En)
- RBAC Guard      - LLM (Groq / LLaMA 3)
       │                │
       ▼                ▼
[ SQLite Storage ] [ Storage Volumes ]
 (campus_assistant) (/app/data: docs,
  WAL Mode          vectorstore, DB)
```

---

## Key Capabilities

1. **Multilingual Neural Voice Assistant:** Real-time conversational responses in English, தமிழ் (Tamil), മലയാളം (Malayalam), and हिंदी (Hindi) with natural prosody and 3D avatar animations.
2. **Dijkstra Road & Corridor Navigator:** Shortest-path turn-by-turn routing across all 241 official campus road segments and corridor links across 12 IB ribs and 12 AS ribs.
3. **Institutional Security Boundaries:** Cryptographically verified Google OpenID Connect student authentication strictly restricted to `@bitsathy.ac.in`. Anti-IDOR grievance isolation and role-based faculty phone number protection.
4. **Isolated RAG Retrieval:** Document-level access control lists (ACLs) ensuring confidential student lists and faculty mobile directories are isolated from public student queries.

---

## Required Environment Variables

All configuration is centralized in `backend/app/config.py` and validated on startup:

| Variable Name | Required in Prod | Default (Dev) | Description |
| :--- | :---: | :---: | :--- |
| `ENVIRONMENT` | Yes | `development` | Runtime mode: `development` or `production`. |
| `JWT_SECRET_KEY` | **Yes** ($\ge 32$ chars) | Random Ephemeral | Cryptographic secret for signing JWT access tokens. |
| `GOOGLE_CLIENT_ID` | Yes (for SSO) | None | Google Cloud Console OAuth 2.0 Web Client ID. |
| `ADMIN_USERNAME` | Yes | `admin` | Administrator login username. |
| `ADMIN_PASSWORD_HASH` | **Yes** | None | Argon2id hash of the administrator password. |
| `GROQ_API_KEY` | **Yes** | None | Groq Cloud API key for LLaMA-3 inference. |
| `TAVILY_API_KEY` | Optional | None | Tavily API key for real-time web knowledge fallbacks. |
| `DATABASE_URL` | **Yes** | `sqlite+aiosqlite:///...` | SQLite or PostgreSQL async connection string. |
| `ALLOWED_ORIGINS` | **Yes** | Localhost Whitelist | Comma-separated list of trusted CORS origins. |
| `DOCUMENTS_DIR` | No | `./data/documents` | Directory containing public institutional PDFs. |
| `SMTP_SERVER` | Optional | `smtp.gmail.com` | SMTP host for automated grievance alerts. |
| `SMTP_PORT` | Optional | `587` | SMTP port (STARTTLS). |
| `SMTP_USERNAME` | Optional | None | Notification email address. |
| `SMTP_PASSWORD` | Optional | None | Google App Password (16 characters). |

---

## Creating the First Administrator Account

Administrative accounts are protected with Argon2id password hashing. To generate the password hash for your administrator account:

```bash
# Generate Argon2id hash using Python
python -c "from argon2 import PasswordHasher; ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, hash_len=32); print(ph.hash('YourComplexAdminPasswordHere'))"
```

Copy the generated hash string into `backend/.env`:
```ini
ADMIN_USERNAME=bit_campus_admin
ADMIN_PASSWORD_HASH=your_argon2id_hash_generated_above
```

---

## Local Development Setup

### Prerequisites
- **Python 3.10 or 3.11** — [python.org](https://www.python.org/)
- **Node.js LTS (v18+)** — [nodejs.org](https://nodejs.org/)

### Windows (One-Click Start)
Double-click `START.bat` in the repository root. It will initialize the virtual environment, install dependencies, verify configurations, and launch both services automatically.

### Manual Setup (macOS / Linux / Windows)

#### 1. Backend Setup:
```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install exact pinned dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Open .env and insert your GROQ_API_KEY, JWT_SECRET_KEY, and ADMIN_PASSWORD_HASH

# Start development API server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*API Documentation will be available at: `http://localhost:8000/docs`*

#### 2. Frontend Setup:
```bash
cd frontend
npm ci
cp .env.example .env
npm run dev
```
*Web application will be accessible at: `http://localhost:5173`*

---

## Production Deployment with Docker Compose

BIT CampusVoice is containerized using multi-stage Docker builds and unified under Docker Compose with Nginx reverse proxying:

```bash
# 1. Prepare production environment file
cp .env.production.example backend/.env
# Edit backend/.env with your production secrets (JWT_SECRET_KEY, GROQ_API_KEY, ADMIN_PASSWORD_HASH)

# 2. Build and launch containers in background
docker compose up --build -d

# 3. Verify health status
docker compose ps
curl http://localhost/api/health
```

The stack exposes:
- **Web Application & Reverse Proxy:** `http://localhost/` (Port 80)
- **Backend Health Check:** `http://localhost/api/health`
- **Persistent Data Volume:** `campus_data` volume preserves SQLite database and FAISS vector indices across container restarts.

---

## Running the Automated Security Test Suite

The repository includes a dedicated 5-suite security test runner verifying authentication, RBAC, RAG privacy, file upload protection, and API boundaries:

```bash
cd backend
python tests/security/run_all_security_tests.py
```

Expected output:
```
======================================================================
BIT CAMPUSVOICE -- PRODUCTION SECURITY VERIFICATION SUITE
======================================================================
 [PASS]   test_authentication.py
 [PASS]   test_authorization.py
 [PASS]   test_rag_security.py
 [PASS]   test_file_upload.py
 [PASS]   test_api_security.py
======================================================================
ALL SECURITY VALIDATION GATES PASSED (Exit Code: 0).
Verdict: Security verification complete. Ready for production.
```

---

## Security Documentation

- [**`SECURITY_AUDIT_REPORT.md`**](./SECURITY_AUDIT_REPORT.md): Complete security audit and vulnerability remediation findings.
- [**`VULNERABILITY_REGISTER.md`**](./VULNERABILITY_REGISTER.md): Formal register mapping all 13 security issues to CWE and CVSS scores.
- [**`SECURITY_DEPLOYMENT_CHECKLIST.md`**](./SECURITY_DEPLOYMENT_CHECKLIST.md): Production deployment pre-flight verification checklist.
- [**`DEPLOY_NOTES.md`**](./DEPLOY_NOTES.md): Operational log of architectural decisions, historical git scan findings, and human action items.
"# BIT_campusVoice" 
