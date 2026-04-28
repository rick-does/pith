from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

from ..config import PROJECTS_META_DIR, push_recent_project
from ..names import memorable_name
from ..utils import create_project, project_exists, get_collection_file

router = APIRouter()


@router.post("/api/quick-open/yaml")
async def api_quick_open_yaml(request: Request):
    data = await request.json()
    yaml_path = data.get("yaml_path", "").strip()
    if not yaml_path:
        raise HTTPException(400, "yaml_path required")

    p = Path(yaml_path)
    if not p.exists():
        raise HTTPException(404, "File not found")
    if p.suffix.lower() not in (".yaml", ".yml"):
        raise HTTPException(400, "File must be .yaml or .yml")

    resolved = str(p.resolve())
    if PROJECTS_META_DIR.exists():
        for entry in PROJECTS_META_DIR.iterdir():
            if entry.is_dir() and (entry / ".pith-project").exists():
                try:
                    if str(get_collection_file(entry.name).resolve()) == resolved:
                        push_recent_project(entry.name)
                        return {"project_name": entry.name}
                except Exception:
                    pass

    sibling = p.parent / "markdowns"
    markdowns_dir = str(sibling) if sibling.exists() else None

    name = memorable_name()
    while project_exists(name):
        name = memorable_name()

    create_project(name, markdowns_dir=markdowns_dir, tree_yaml=yaml_path)
    push_recent_project(name)
    return {"project_name": name}
