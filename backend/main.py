from __future__ import annotations

import webbrowser
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import DEFAULT_ROOT_PATH
from .utils import ensure_default_template
from .routes.config import router as config_router
from .routes.projects import router as projects_router
from .routes.collection import router as collection_router
from .routes.files import router as files_router
from .routes.analysis import router as analysis_router
from .routes.export import router as export_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(DEFAULT_ROOT_PATH).mkdir(parents=True, exist_ok=True)
    ensure_default_template()
    yield


app = FastAPI(title="PiTH", lifespan=lifespan)


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


app.include_router(config_router)
app.include_router(projects_router)
app.include_router(collection_router)
app.include_router(files_router)
app.include_router(analysis_router)
app.include_router(export_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/open-url")
async def open_url(url: str):
    if not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Only https:// URLs are supported")
    webbrowser.open(url)
    return {"ok": True}


# ---------------------------------------------------------------------------
# SPA fallback — serve built frontend
# ---------------------------------------------------------------------------

_pkg_ui = Path(__file__).parent / "ui"
_source_dist = Path(__file__).parent.parent / "frontend" / "dist"
FRONTEND_DIST = _source_dist if _source_dist.exists() else _pkg_ui

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")
    if (FRONTEND_DIST / "dictionaries").exists():
        app.mount("/dictionaries", StaticFiles(directory=str(FRONTEND_DIST / "dictionaries")), name="dictionaries")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        index = FRONTEND_DIST / "index.html"
        if index.exists():
            return HTMLResponse(index.read_text(encoding="utf-8"), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
        raise HTTPException(404, "Frontend not built")
