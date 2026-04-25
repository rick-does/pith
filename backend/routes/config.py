from __future__ import annotations

from fastapi import APIRouter, Request

from ..config import (
    load_config,
    save_config,
    push_recent_project,
    CONFIG_DIR,
)
from ..utils import (
    get_markdowns_dir,
    iter_md_files,
)

router = APIRouter()

PERSONAL_DIC = CONFIG_DIR / "personal.dic"


@router.get("/api/config")
async def get_config():
    cfg = load_config()
    return {
        "recent_projects": cfg.get("recent_projects", []),
        "prefs": cfg.get("prefs", {}),
    }


@router.get("/api/prefs")
async def get_prefs():
    cfg = load_config()
    return cfg.get("prefs", {})


@router.put("/api/prefs")
async def put_prefs(request: Request):
    data = await request.json()
    cfg = load_config()
    cfg.setdefault("prefs", {}).update(data)
    save_config(cfg)
    return cfg["prefs"]


@router.get("/api/personal-dictionary")
async def get_personal_dictionary():
    if not PERSONAL_DIC.exists():
        return {"words": []}
    words = [w.strip() for w in PERSONAL_DIC.read_text(encoding="utf-8").splitlines() if w.strip()]
    return {"words": words}


@router.post("/api/personal-dictionary")
async def add_personal_word(request: Request):
    data = await request.json()
    word = data.get("word", "").strip()
    if not word:
        return {"ok": False}
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    existing: set[str] = set()
    if PERSONAL_DIC.exists():
        existing = {w.strip() for w in PERSONAL_DIC.read_text(encoding="utf-8").splitlines() if w.strip()}
    if word not in existing:
        with PERSONAL_DIC.open("a", encoding="utf-8") as f:
            f.write(word + "\n")
    return {"ok": True}


@router.put("/api/config/last-project")
async def set_last_project(body: dict):
    project = body.get("project")
    if project:
        push_recent_project(project)
    return {"ok": True}


@router.get("/api/projects/{project}/file-count")
async def api_file_count(project: str):
    md_dir = get_markdowns_dir(project)
    if not md_dir.exists():
        return {"count": 0}
    count = sum(1 for _fp, _rel in iter_md_files(md_dir))
    return {"count": count}
