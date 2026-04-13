#!/usr/bin/env bash
set -e

echo "Building frontend..."
cd frontend
npm install
node node_modules/vite/bin/vite.js build
cd ..

echo "Setting up backend..."
if [ ! -d "backend/.venv" ]; then
    python3 -m venv backend/.venv
fi
source backend/.venv/bin/activate
pip install -r backend/requirements.txt

echo "Starting PiTH server on http://127.0.0.1:8002"
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8002
