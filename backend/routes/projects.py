from __future__ import annotations

import os
import shutil
import re
import string as _string
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

from ..utils import (
    archive_project,
    create_project,
    delete_project,
    restore_project,
    extract_title,
    project_exists,
    rename_project,
    read_project_md_body,
    list_projects,
)

router = APIRouter()


@router.get("/api/projects")
async def api_list_projects():
    return list_projects()


@router.post("/api/projects/import-files")
async def api_import_files(request: Request):
    """Copy specific .md files into an existing project's markdowns dir."""
    from ..utils import get_markdowns_dir, get_images_dir
    data = await request.json()
    project = data.get("project", "").strip()
    files = data.get("files", [])
    if not project:
        raise HTTPException(400, "project is required")
    if not files:
        raise HTTPException(400, "files list is required")
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    md_dir = get_markdowns_dir(project)
    md_dir.mkdir(parents=True, exist_ok=True)
    get_images_dir(project).mkdir(exist_ok=True)
    copied = []
    for src_str in files:
        src_file = Path(src_str)
        if not src_file.exists() or not src_file.name.lower().endswith(".md"):
            continue
        dest = md_dir / src_file.name
        used_idx = 0
        if dest.exists():
            stem = dest.stem
            suffix = dest.suffix
            idx = 1
            while dest.exists():
                dest = md_dir / f"{stem}-{idx}{suffix}"
                idx += 1
            used_idx = idx - 1
        shutil.copy2(str(src_file), str(dest))
        if used_idx > 0:
            content = dest.read_text(encoding="utf-8")
            title_match = re.search(r"^(#\s+.+)$", content, re.MULTILINE)
            if title_match:
                content = content.replace(title_match.group(1), f"{title_match.group(1)}-{used_idx}", 1)
                dest.write_text(content, encoding="utf-8")
        copied.append(dest.relative_to(md_dir).as_posix())
    if not copied:
        raise HTTPException(400, "No valid .md files found")
    return {"copied": copied, "count": len(copied)}


@router.post("/api/projects/{name}/external-files")
async def api_add_external_files(name: str, request: Request):
    from ..utils import add_unlinked_files, get_markdowns_dir, get_unlinked_files, load_collection, flatten_paths
    if not project_exists(name):
        raise HTTPException(404, "Project not found")
    data = await request.json()
    paths = [p for p in data.get("paths", []) if isinstance(p, str)]
    if not paths:
        raise HTTPException(400, "paths required")

    md_dir = get_markdowns_dir(name).resolve()
    existing = {Path(p).resolve() for p in get_unlinked_files(name)}
    existing.update(Path(p).resolve() for p in flatten_paths(load_collection(name).root))

    conflicts = []
    for p in paths:
        rp = Path(p).resolve()
        try:
            rp.relative_to(md_dir)
            conflicts.append(Path(p).name)
            continue
        except ValueError:
            pass
        if rp in existing:
            conflicts.append(Path(p).name)

    if conflicts:
        raise HTTPException(409, f"Already in project: {', '.join(conflicts)}")

    add_unlinked_files(name, paths)
    return {"status": "added"}


@router.post("/api/projects/{name}")
async def api_create_project(name: str, request: Request):
    data = await request.json()
    markdowns_dir = data.get("markdowns_dir", "").strip() or None
    tree_yaml = data.get("tree_yaml", "").strip() or None
    create_project(name, markdowns_dir, tree_yaml)
    return {"status": "created", "name": name}


@router.post("/api/projects/{name}/rename")
async def api_rename_project(name: str, request: Request):
    data = await request.json()
    new_name = data.get("new_name", "").strip()
    if not new_name:
        raise HTTPException(400, "new_name required")
    if not project_exists(name):
        raise HTTPException(404, "Project not found")
    if project_exists(new_name):
        raise HTTPException(409, "Target project already exists")
    try:
        rename_project(name, new_name)
    except ValueError as e:
        raise HTTPException(409, str(e))
    return {"status": "renamed", "name": new_name}


@router.post("/api/projects/{name}/archive")
async def api_archive_project(name: str):
    if not project_exists(name):
        raise HTTPException(404, "Project not found")
    archive_project(name)
    return {"status": "archived"}


@router.post("/api/projects/{name}/restore")
async def api_restore_project(name: str):
    if not project_exists(name):
        raise HTTPException(404, "Project not found")
    restore_project(name)
    return {"status": "restored"}


@router.delete("/api/projects/{name}")
async def api_delete_project(name: str):
    if not project_exists(name):
        raise HTTPException(404, "Project not found")
    delete_project(name)
    return {"status": "deleted"}


@router.get("/api/browse/start-dir")
async def api_browse_start_dir(project: str = ""):
    from ..utils import get_markdowns_dir
    if project:
        try:
            p = get_markdowns_dir(project)
            if p.exists():
                return {"path": str(p)}
        except (OSError, ValueError):
            pass
    return {"path": str(Path.home())}


@router.post("/api/browse/mkdir")
async def api_browse_mkdir(request: Request):
    data = await request.json()
    parent = data.get("parent", "").strip()
    name = data.get("name", "").strip()
    if not parent or not name:
        raise HTTPException(400, "parent and name required")
    if any(c in name for c in r'\/:*?"<>|'):
        raise HTTPException(400, "Invalid folder name")
    new_dir = Path(parent) / name
    new_dir.mkdir(parents=True, exist_ok=True)
    return {"path": str(new_dir)}


@router.get("/api/browse/dirs")
async def api_browse_dirs(path: str = "", file_ext: str = "md"):
    if not path:
        if os.name == "nt":
            drives = [f"{d}:\\" for d in _string.ascii_uppercase if os.path.exists(f"{d}:\\")]
            return {"path": "", "parent": None, "dirs": drives}
        path = "/"
    path = os.path.abspath(path)
    p_parent = os.path.dirname(path)
    if p_parent == path:
        parent = "" if os.name == "nt" else None
    else:
        parent = p_parent
    try:
        dirs = []
        files = []
        for e in os.scandir(path):
            if e.is_dir(follow_symlinks=False):
                dirs.append(os.path.join(path, e.name))
            elif file_ext in ("yaml", "yml"):
                if e.name.lower().endswith((".yaml", ".yml")):
                    files.append(e.name)
            elif e.name.lower().endswith(f".{file_ext}"):
                files.append(e.name)
        dirs.sort(key=lambda p: os.path.basename(p).lower())
        files.sort(key=str.lower)
    except (PermissionError, FileNotFoundError, NotADirectoryError):
        dirs = []
        files = []
    return {"path": path, "parent": parent, "dirs": dirs, "files": files}
