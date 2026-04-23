from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

from ..config import (
    load_config,
    save_config,
    update_root_marker_archived,
    DEFAULT_ROOT_PATH,
    CONFIG_DIR,
    get_project_meta_dir,
    get_root_meta_dir,
    get_default_template_path,
)
from ..utils import (
    list_projects,
    seed_new_project_guide_if_enabled,
    format_project_md,
    get_markdowns_dir,
    get_images_dir,
    iter_md_files,
)

router = APIRouter()

PERSONAL_DIC = CONFIG_DIR / "personal.dic"


@router.get("/api/config")
async def get_config():
    cfg = load_config()
    return {**cfg, "default_root": DEFAULT_ROOT_PATH}


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


@router.get("/api/roots")
async def get_roots():
    cfg = load_config()
    return [
        {
            **root,
            "active": root["path"] == cfg["active_root"],
            "is_default": root["path"] == DEFAULT_ROOT_PATH,
            "archived": root.get("archived", False),
        }
        for root in cfg["roots"]
    ]


@router.post("/api/roots")
async def add_root(body: dict):
    path = body.get("path", "").strip()
    description = body.get("description", "")
    create_dir = body.get("create_dir", False)

    if not path:
        raise HTTPException(status_code=400, detail="path is required")

    root_path = Path(path)
    name = root_path.name
    if not name:
        raise HTTPException(status_code=400, detail="path must have a directory name")
    if create_dir:
        try:
            root_path.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not create directory: {e}")
    else:
        if not root_path.exists() or not root_path.is_dir():
            raise HTTPException(status_code=400, detail="Directory does not exist")

    cfg = load_config()
    existing_paths = [r["path"] for r in cfg["roots"]]
    abs_path = str(root_path.resolve())
    if abs_path in existing_paths:
        raise HTTPException(status_code=400, detail="This directory is already a project root")

    root_meta = get_root_meta_dir(root_name=name)
    root_meta.mkdir(parents=True, exist_ok=True)
    (root_meta / ".pith-project-root").write_text(
        f"name: {name}\ndescription: {description}\npath: {abs_path}\narchived: false\n", encoding="utf-8"
    )

    stub_name = "new-project"
    content_dir = root_path.resolve() / stub_name
    md_dir = content_dir / "markdowns"
    md_dir.mkdir(parents=True, exist_ok=True)
    (content_dir / "images").mkdir(parents=True, exist_ok=True)

    meta_dir = get_project_meta_dir(stub_name, root_name=name)
    meta_dir.mkdir(parents=True, exist_ok=True)
    tree_file = meta_dir / "tree.yaml"
    seed_new_project_guide_if_enabled(md_dir, tree_file)
    (meta_dir / ".pith-project").write_text(
        format_project_md(
            body="# New Project\n",
            tree_yaml=tree_file,
            markdowns_dir=md_dir,
            template=get_default_template_path(),
        ),
        encoding="utf-8",
    )

    cfg["roots"].append({
        "path": abs_path,
        "name": name,
        "description": description,
        "last_project": stub_name,
    })
    save_config(cfg)
    return {"path": abs_path, "name": name}


@router.delete("/api/roots")
async def remove_root(body: dict):
    path = body.get("path", "").strip()
    if not path:
        raise HTTPException(status_code=400, detail="path is required")
    if path == DEFAULT_ROOT_PATH:
        raise HTTPException(status_code=400, detail="Cannot remove the default root")

    cfg = load_config()
    for r in cfg["roots"]:
        if r["path"] == path:
            r["archived"] = True
            update_root_marker_archived(Path(path).name, archived=True)
            break
    if cfg["active_root"] == path:
        cfg["active_root"] = DEFAULT_ROOT_PATH
    save_config(cfg)
    return {"ok": True}


@router.put("/api/roots/restore")
async def restore_root(body: dict):
    path = body.get("path", "").strip()
    if not path:
        raise HTTPException(status_code=400, detail="path is required")

    cfg = load_config()
    for r in cfg["roots"]:
        if r["path"] == path:
            r.pop("archived", None)
            update_root_marker_archived(Path(path).name, archived=False)
            break
    save_config(cfg)
    return {"ok": True}


@router.put("/api/roots/active")
async def set_active_root(body: dict):
    path = body.get("path", "").strip()
    if not path:
        raise HTTPException(status_code=400, detail="path is required")

    cfg = load_config()
    paths = [r["path"] for r in cfg["roots"]]
    if path not in paths:
        raise HTTPException(status_code=404, detail="Root not found")

    cfg["active_root"] = path
    save_config(cfg)
    ps = list_projects()
    root_entry = next((r for r in cfg["roots"] if r["path"] == path), None)
    last = root_entry.get("last_project") if root_entry else None
    first = ps[0]["name"] if ps else None
    active_project = last if (last and any(p["name"] == last for p in ps)) else first
    return {"active_project": active_project, "projects": ps}


@router.put("/api/config/last-project")
async def set_last_project(body: dict):
    project = body.get("project")
    cfg = load_config()
    for root in cfg["roots"]:
        if root["path"] == cfg["active_root"]:
            root["last_project"] = project
            break
    save_config(cfg)
    return {"ok": True}


@router.get("/api/projects/{project}/file-count")
async def api_file_count(project: str):
    md_dir = get_markdowns_dir(project)
    if not md_dir.exists():
        return {"count": 0}
    count = sum(1 for _fp, _rel in iter_md_files(md_dir))
    return {"count": count}
