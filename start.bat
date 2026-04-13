@echo off

echo Building frontend...
cd frontend
call npm install
call node node_modules\vite\bin\vite.js build
cd ..

echo Setting up backend...
if not exist "backend\.venv" (
    python -m venv backend\.venv
)
call backend\.venv\Scripts\activate.bat
pip install -r backend\requirements.txt

echo Starting PiTH server on http://127.0.0.1:8002
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8002
