@echo off

echo Building frontend...
cd frontend
call npm install
set VITE_CLEAN=1
call node node_modules\vite\bin\vite.js build
set VITE_CLEAN=
cd ..

echo Setting up backend...
if not exist "backend\.venv" (
    python -m venv backend\.venv
)
call backend\.venv\Scripts\activate.bat
pip install -r backend\requirements.txt

REM Free port 8002 if something is already using it
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8002 "') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo Watching frontend for changes...
start /b cmd /c "cd frontend && node node_modules\vite\bin\vite.js build --watch >nul 2>&1"

echo Starting PiTH server on http://127.0.0.1:8002
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8002
