@echo off
title BIT Campus Voice - Local Development Startup
color 0A
cls

echo.
echo ============================================================
echo     BIT CAMPUS VOICE - Multilingual AI Campus Assistant
echo     Bannari Amman Institute of Technology, Sathyamangalam
echo ============================================================
echo.

:: 1. CHECK PYTHON
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Python is NOT installed!
    echo  Please download and install Python 3.10 or 3.11 from:
    echo  https://www.python.org/downloads/
    echo  IMPORTANT: Check "Add Python to PATH" during installation!
    echo.
    pause
    start https://www.python.org/downloads/
    exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo  [OK] Python %PYVER% found.

:: 2. CHECK NODE
echo [2/5] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Node.js is NOT installed!
    echo  Please download and install Node.js LTS from:
    echo  https://nodejs.org/
    echo.
    pause
    start https://nodejs.org/
    exit /b 1
)
for /f "tokens=1" %%v in ('node --version 2^>^&1') do set NODEVER=%%v
echo  [OK] Node.js %NODEVER% found.

:: 3. SETUP LOCAL CONFIGURATION TEMPLATES
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo  Creating backend\.env from template...
        copy "backend\.env.example" "backend\.env" >nul
    )
)

if not exist "frontend\.env" (
    if exist "frontend\.env.example" (
        echo  Creating frontend\.env from template...
        copy "frontend\.env.example" "frontend\.env" >nul
    )
)

:: 4. SETUP VENV & BACKEND DEPS
echo [3/5] Setting up Python virtual environment...
if not exist "backend\venv\" (
    echo  Creating virtual environment (first time only)...
    python -m venv backend\venv
)
echo  [OK] Virtual environment ready.

echo [4/5] Checking backend dependencies...
call backend\venv\Scripts\activate.bat
pip install -r backend\requirements.txt -q --disable-pip-version-check
echo  [OK] Backend packages ready.

:: 5. INSTALL FRONTEND DEPS
echo [5/5] Checking frontend dependencies...
if not exist "frontend\node_modules\" (
    echo  Installing node_modules (first time only)...
    cd frontend && npm install --silent && cd ..
) else (
    echo  [OK] node_modules already present.
)

:: 6. LAUNCH SERVICES
echo.
echo ============================================================
echo  Starting Backend API on http://localhost:8000 ...
start "BIT Backend API" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul

echo  Starting Frontend Dev Server on http://localhost:5173 ...
start "BIT Frontend UI" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo ============================================================
echo  BIT CAMPUS VOICE IS NOW RUNNING!
echo.
echo  Web Application:   http://localhost:5173
echo  API Documentation: http://localhost:8000/docs
echo.
echo  To stop: close the two black terminal windows.
echo ============================================================
start http://localhost:5173
pause
