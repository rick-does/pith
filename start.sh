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

# Free port 8002 if something is already using it
lsof -ti:8002 | xargs kill -9 2>/dev/null || true

echo "Watching frontend for changes..."
(cd frontend && node node_modules/vite/bin/vite.js build --watch) &

echo "Starting PiTH server on http://127.0.0.1:8002"
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8002
