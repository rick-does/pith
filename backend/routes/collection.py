from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException, Request

from ..models import CollectionStructure, FileNode
from ..utils import (
    get_collection_file,
    get_hierarchy_backup_file,
    get_markdowns_dir,
    get_orphans,
    get_unlinked_nodes,
    iter_all_project_files,
    iter_md_files,
    load_collection,
    project_exists,
    save_collection,
    save_unlinked_nodes,
)

router = APIRouter()


@router.get("/api/projects/{project}/collection")
async def api_get_collection(project: str):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    collection = load_collection(project)
    return collection.model_dump()


@router.put("/api/projects/{project}/collection")
async def api_save_collection(project: str, request: Request):
    data = await request.json()
    coll_data = data.get("collection", data)
    collection = CollectionStructure(**coll_data)
    save_collection(project, collection)
    return {"status": "saved"}


@router.get("/api/projects/{project}/collection/yaml")
async def api_get_collection_yaml(project: str):
    tree_file = get_collection_file(project)
    if not tree_file.exists():
        return {"content": "root: []\n"}
    return {"content": tree_file.read_text(encoding="utf-8")}


@router.put("/api/projects/{project}/collection/yaml")
async def api_save_collection_yaml(project: str, request: Request):
    import yaml
    data = await request.json()
    content = data.get("content", "")
    try:
        yaml.safe_load(content)
    except yaml.YAMLError as e:
        raise HTTPException(400, f"Invalid YAML: {e}")
    tree_file = get_collection_file(project)
    tree_file.parent.mkdir(parents=True, exist_ok=True)
    tree_file.write_text(content, encoding="utf-8")
    return {"status": "saved"}


@router.post("/api/projects/{project}/flatten")
async def api_flatten_hierarchy(project: str):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    tree_file = get_collection_file(project)
    backup = get_hierarchy_backup_file(project)
    if tree_file.exists() and not backup.exists():
        backup.write_text(tree_file.read_text(encoding="utf-8"), encoding="utf-8")
    tree_file.write_text("root: []\n", encoding="utf-8")
    return {"ok": True}


@router.post("/api/projects/{project}/restore-hierarchy")
async def api_restore_hierarchy(project: str):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    backup = get_hierarchy_backup_file(project)
    if not backup.exists():
        raise HTTPException(404, "No saved hierarchy to restore")
    tree_file = get_collection_file(project)
    tree_file.write_text(backup.read_text(encoding="utf-8"), encoding="utf-8")
    backup.unlink()
    return {"ok": True}


@router.get("/api/projects/{project}/hierarchy-backup")
async def api_hierarchy_backup_exists(project: str):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    return {"exists": get_hierarchy_backup_file(project).exists()}


@router.get("/api/projects/{project}/orphans")
async def api_get_orphans(project: str):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    collection = load_collection(project)
    return get_orphans(project, collection)


@router.put("/api/projects/{project}/unlinked")
async def api_save_unlinked(project: str, request: Request):
    from ..models import FileNode
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    data = await request.json()
    nodes_data = data if isinstance(data, list) else data.get("nodes", [])
    nodes = [FileNode(path=n["path"], title=n.get("title", ""), children=[], order=0) for n in nodes_data]
    save_unlinked_nodes(project, nodes)
    return {"status": "saved"}


@router.get("/api/projects/{project}/search")
async def api_search(project: str, q: str = ""):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    query = q.strip().lower()
    if not query:
        return []
    results = []
    for fp, path_str in iter_all_project_files(project):
        try:
            content = fp.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        lines = content.split("\n")
        matches = []
        for i, line in enumerate(lines):
            if query in line.lower():
                matches.append({"line": i + 1, "text": line.strip()[:200]})
        if matches:
            title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
            title = title_match.group(1).strip() if title_match else fp.stem
            results.append({"path": path_str, "title": title, "matches": matches[:10]})
    results.sort(key=lambda r: len(r["matches"]), reverse=True)
    return results[:50]
