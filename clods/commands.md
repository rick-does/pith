# PiTH — Commands

Start everything (installs deps, builds frontend, kills port 8002, starts Vite --watch + uvicorn --reload):
- Windows: `start.bat`
- Mac/Linux: `./start.sh`

Frontend only: `cd frontend && npm run dev`
Backend only: `uvicorn backend.main:app --reload --port 8002`
Build frontend: `cd frontend && npm run build`
Build wheel: `python build_pkg.py && python -m build`

No test suite. CI only checks `/health` and `/api/projects` endpoints.
