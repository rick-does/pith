from __future__ import annotations

import re
import shutil
import time
import webbrowser
from contextlib import asynccontextmanager
from pathlib import Path

import markdown
import frontmatter
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .models import CollectionStructure, DocusaurusImportRequest, FileNode
from .utils import (
    archive_file,
    archive_project,
    batch_update_frontmatter,
    infer_template_from_file,
    create_project,
    delete_project,
    import_markdowns,
    extract_title,
    flatten_paths,
    get_all_md_files,
    get_collection_file,
    get_hierarchy_backup_file,
    get_markdowns_dir,
    get_orphans,
    get_project_md,
    get_projects_dir,
    list_projects,
    load_collection,
    load_template,
    parse_frontmatter,
    rename_file,
    safe_path,
    save_collection,
    save_template,
    scan_compliance,
    iter_md_files,
    validate_file_links,
    validate_project_links,
    find_incoming_links,
    GOLDEN_DIR,
)
from .config import load_config, save_config, DEFAULT_ROOT_PATH
from .converters import (
    export_docusaurus,
    export_mkdocs,
    import_docusaurus,
    import_mkdocs,
)
from .stats import compute_stats
from .issues import compute_issues
from .structure import compute_structure
from .report import generate_report_html

@asynccontextmanager
async def lifespan(app: FastAPI):
    projects_dir = get_projects_dir()
    doc_md = projects_dir / "documentation" / "markdowns"
    golden_doc = GOLDEN_DIR / "documentation"
    if golden_doc.exists():
        doc_dir = projects_dir / "documentation"
        doc_dir.mkdir(parents=True, exist_ok=True)
        doc_md.mkdir(exist_ok=True)
        golden_tree = golden_doc / "tree.yaml"
        if golden_tree.exists():
            shutil.copy2(str(golden_tree), str(doc_dir / "tree.yaml"))
        for fp in (golden_doc / "markdowns").glob("*.md"):
            shutil.copy2(str(fp), str(doc_md / fp.name))
    yield


app = FastAPI(title="PiTH", lifespan=lifespan)

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

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
# Config / Roots
# ---------------------------------------------------------------------------

@app.get("/api/config")
async def get_config():
    cfg = load_config()
    return cfg


@app.get("/api/roots")
async def get_roots():
    cfg = load_config()
    return [
        {**root, "active": root["path"] == cfg["active_root"]}
        for root in cfg["roots"]
    ]


@app.post("/api/roots")
async def add_root(body: dict):
    path = body.get("path", "").strip()
    name = body.get("name", "").strip()
    description = body.get("description", "")
    create_dir = body.get("create_dir", False)

    if not path or not name:
        raise HTTPException(status_code=400, detail="path and name are required")

    root_path = Path(path)
    if create_dir:
        try:
            root_path.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not create directory: {e}")
    else:
        if not root_path.exists() or not root_path.is_dir():
            raise HTTPException(status_code=400, detail="Directory does not exist")

    pith_root_file = root_path / ".pith-project-root"
    pith_root_file.write_text(
        f"name: {name}\ndescription: {description}\n", encoding="utf-8"
    )

    cfg = load_config()
    existing_paths = [r["path"] for r in cfg["roots"]]
    abs_path = str(root_path.resolve())
    if abs_path in existing_paths:
        raise HTTPException(status_code=400, detail="This directory is already a project root")

    cfg["roots"].append({
        "path": abs_path,
        "name": name,
        "description": description,
        "last_project": None,
    })
    save_config(cfg)
    return {"path": abs_path, "name": name}


@app.delete("/api/roots")
async def remove_root(body: dict):
    path = body.get("path", "").strip()
    if not path:
        raise HTTPException(status_code=400, detail="path is required")
    if path == DEFAULT_ROOT_PATH:
        raise HTTPException(status_code=400, detail="Cannot remove the default root")

    cfg = load_config()
    cfg["roots"] = [r for r in cfg["roots"] if r["path"] != path]
    if cfg["active_root"] == path:
        cfg["active_root"] = DEFAULT_ROOT_PATH
    save_config(cfg)
    return {"ok": True}


@app.put("/api/roots/active")
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


@app.put("/api/config/last-project")
async def set_last_project(body: dict):
    project = body.get("project")
    cfg = load_config()
    for root in cfg["roots"]:
        if root["path"] == cfg["active_root"]:
            root["last_project"] = project
            break
    save_config(cfg)
    return {"ok": True}


@app.get("/api/projects/{project}/file-count")
async def api_file_count(project: str):
    md_dir = get_markdowns_dir(project)
    if not md_dir.exists():
        return {"count": 0}
    count = sum(1 for _fp, _rel in iter_md_files(md_dir))
    return {"count": count}

# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

@app.get("/api/projects")
async def api_list_projects():
    return list_projects()


@app.post("/api/projects/import-markdowns")
async def api_import_markdowns(request: Request):
    data = await request.json()
    path = data.get("path", "").strip()
    if not path:
        raise HTTPException(400, "Path is required")
    try:
        name = import_markdowns(path)
    except ValueError as e:
        raise HTTPException(400, str(e))
    title = name
    pmd = get_project_md(name)
    if pmd.exists():
        t = extract_title(pmd.read_text(encoding="utf-8"))
        if t:
            title = t
    return {"name": name, "title": title}


@app.post("/api/projects/import-files")
async def api_import_files(request: Request):
    """Copy specific .md files into an existing project's markdowns dir."""
    data = await request.json()
    project = data.get("project", "").strip()
    files = data.get("files", [])
    if not project:
        raise HTTPException(400, "project is required")
    if not files:
        raise HTTPException(400, "files list is required")
    proj_dir = get_projects_dir() / project
    if not proj_dir.exists():
        raise HTTPException(404, "Project not found")
    md_dir = get_markdowns_dir(project)
    md_dir.mkdir(parents=True, exist_ok=True)
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


@app.post("/api/projects/{name}")
async def api_create_project(name: str):
    create_project(name)
    return {"status": "created", "name": name}


@app.post("/api/projects/{name}/rename")
async def api_rename_project(name: str, request: Request):
    data = await request.json()
    new_name = data.get("new_name", "").strip()
    if not new_name:
        raise HTTPException(400, "new_name required")
    src = get_projects_dir() / name
    dest = get_projects_dir() / new_name
    if not src.exists():
        raise HTTPException(404, "Project not found")
    if dest.exists():
        raise HTTPException(409, "Target project already exists")
    src.rename(dest)
    pmd = dest / ".pith-project"
    if pmd.exists():
        pmd.write_text(f"# {new_name}\n", encoding="utf-8")
    return {"status": "renamed", "name": new_name}


@app.post("/api/projects/{name}/archive")
async def api_archive_project(name: str):
    if not (get_projects_dir() / name).exists():
        raise HTTPException(404, "Project not found")
    archive_project(name)
    return {"status": "archived"}


@app.delete("/api/projects/{name}")
async def api_delete_project(name: str):
    if not (get_projects_dir() / name).exists():
        raise HTTPException(404, "Project not found")
    delete_project(name)
    return {"status": "deleted"}

# ---------------------------------------------------------------------------
# Collection (hierarchy)
# ---------------------------------------------------------------------------

@app.get("/api/projects/{project}/collection")
async def api_get_collection(project: str):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    collection = load_collection(project)
    return collection.model_dump()


@app.put("/api/projects/{project}/collection")
async def api_save_collection(project: str, request: Request):
    data = await request.json()
    coll_data = data.get("collection", data)
    collection = CollectionStructure(**coll_data)
    save_collection(project, collection)
    return {"status": "saved"}


@app.get("/api/projects/{project}/collection/yaml")
async def api_get_collection_yaml(project: str):
    tree_file = get_collection_file(project)
    if not tree_file.exists():
        return {"content": "root: []\n"}
    return {"content": tree_file.read_text(encoding="utf-8")}


@app.put("/api/projects/{project}/collection/yaml")
async def api_save_collection_yaml(project: str, request: Request):
    data = await request.json()
    content = data.get("content", "")
    import yaml
    parsed = CollectionStructure(**yaml.safe_load(content))
    save_collection(project, parsed)
    return {"status": "saved"}

# ---------------------------------------------------------------------------
# Directory browsing (New Project from Markdowns, Add File from Markdown)
# ---------------------------------------------------------------------------

@app.get("/api/browse/start-dir")
async def api_browse_start_dir(project: str = ""):
    """Return a sensible starting directory for the folder browser."""
    from pathlib import Path as _Path
    if project:
        try:
            p = get_markdowns_dir(project).parent
            if p.exists():
                return {"path": str(p)}
        except Exception:
            pass
    return {"path": str(_Path.home())}


@app.get("/api/browse/dirs")
async def api_browse_dirs(path: str = ""):
    """List subdirectories at a path for the folder browser UI. Returns full paths."""
    import os
    import string as _string
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
            elif e.name.lower().endswith(".md"):
                files.append(e.name)
        dirs.sort(key=lambda p: os.path.basename(p).lower())
        files.sort(key=str.lower)
    except PermissionError:
        dirs = []
        files = []
    return {"path": path, "parent": parent, "dirs": dirs, "files": files}



@app.post("/api/projects/{project}/flatten")
async def api_flatten_hierarchy(project: str):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    tree_file = get_collection_file(project)
    backup = get_hierarchy_backup_file(project)
    if tree_file.exists() and not backup.exists():
        backup.write_text(tree_file.read_text(encoding="utf-8"), encoding="utf-8")
    tree_file.write_text("root: []\n", encoding="utf-8")
    return {"ok": True}


@app.post("/api/projects/{project}/restore-hierarchy")
async def api_restore_hierarchy(project: str):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    backup = get_hierarchy_backup_file(project)
    if not backup.exists():
        raise HTTPException(404, "No saved hierarchy to restore")
    tree_file = get_collection_file(project)
    tree_file.write_text(backup.read_text(encoding="utf-8"), encoding="utf-8")
    backup.unlink()
    return {"ok": True}


@app.get("/api/projects/{project}/hierarchy-backup")
async def api_hierarchy_backup_exists(project: str):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    return {"exists": get_hierarchy_backup_file(project).exists()}

# ---------------------------------------------------------------------------
# Orphans
# ---------------------------------------------------------------------------

@app.get("/api/projects/{project}/orphans")
async def api_get_orphans(project: str):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    collection = load_collection(project)
    return get_orphans(project, collection)

# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

@app.get("/api/projects/{project}/search")
async def api_search(project: str, q: str = ""):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    query = q.strip().lower()
    if not query:
        return []
    md_dir = get_markdowns_dir(project)
    if not md_dir.exists():
        return []
    results = []
    for fp, rel in iter_md_files(md_dir):
        try:
            content = fp.read_text(encoding="utf-8")
        except Exception:
            continue
        lines = content.split("\n")
        matches = []
        for i, line in enumerate(lines):
            if query in line.lower():
                matches.append({
                    "line": i + 1,
                    "text": line.strip()[:200],
                })
        if matches:
            title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
            title = title_match.group(1).strip() if title_match else fp.stem
            results.append({
                "path": rel,
                "title": title,
                "matches": matches[:10],
            })
    results.sort(key=lambda r: len(r["matches"]), reverse=True)
    return results[:50]

# ---------------------------------------------------------------------------
# Frontmatter template
# ---------------------------------------------------------------------------

@app.get("/api/projects/{project}/frontmatter-template")
async def api_get_template(project: str):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    return load_template(project)


@app.put("/api/projects/{project}/frontmatter-template")
async def api_save_template(project: str, request: Request):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    data = await request.json()
    save_template(project, data)
    return {"status": "saved"}


@app.post("/api/projects/{project}/frontmatter-template/from-file/{file_path:path}")
async def api_infer_template(project: str, file_path: str):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    template = infer_template_from_file(project, file_path)
    save_template(project, template)
    return template


@app.get("/api/projects/{project}/frontmatter/{file_path:path}")
async def api_get_file_frontmatter(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    content = fp.read_text(encoding="utf-8")
    meta, _ = parse_frontmatter(content)
    return {"path": file_path, "frontmatter": meta}


@app.get("/api/projects/{project}/frontmatter-compliance")
async def api_compliance(project: str):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    template = load_template(project)
    return scan_compliance(project, template)


@app.post("/api/projects/{project}/frontmatter-batch-update")
async def api_batch_update(project: str, request: Request):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    data = await request.json()
    template = load_template(project)
    updated = batch_update_frontmatter(
        project, template,
        add_defaults=data.get("add_defaults", True),
        strip_extra=data.get("strip_extra", False),
        only_files=data.get("files"),
    )
    return {"updated": updated, "count": len(updated)}


@app.post("/api/projects/documentation/restore-structure")
async def api_restore_structure():
    """Restore the documentation project's tree.yaml from the bundled golden copy."""
    golden = GOLDEN_DIR / "documentation" / "tree.yaml"
    target = get_projects_dir() / "documentation" / "tree.yaml"
    if not golden.exists():
        raise HTTPException(404, "Golden copy not found")
    shutil.copy2(str(golden), str(target))
    return {"status": "restored", "scope": "structure"}


@app.post("/api/projects/documentation/restore-all")
async def api_restore_all():
    """Restore the documentation project's tree.yaml and all markdown files from the bundled golden copy."""
    golden_dir = GOLDEN_DIR / "documentation"
    if not golden_dir.exists():
        raise HTTPException(404, "Golden copy not found")
    shutil.copy2(
        str(golden_dir / "tree.yaml"),
        str(get_projects_dir() / "documentation" / "tree.yaml"),
    )
    golden_md = golden_dir / "markdowns"
    target_md = get_projects_dir() / "documentation" / "markdowns"
    for fp in golden_md.glob("*.md"):
        shutil.copy2(str(fp), str(target_md / fp.name))
    return {"status": "restored", "scope": "all"}

# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@app.get("/api/projects/{project}/stats/{file_path:path}")
async def api_stats(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    return compute_stats(fp)


@app.get("/api/projects/{project}/structure/{file_path:path}")
async def api_structure(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    return compute_structure(fp)


@app.get("/api/projects/{project}/issues/{file_path:path}")
async def api_issues(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    return compute_issues(fp)

# ---------------------------------------------------------------------------
# Link validation
# ---------------------------------------------------------------------------

@app.get("/api/projects/{project}/links/validate")
async def api_validate_links(project: str):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    return validate_project_links(project)


@app.get("/api/projects/{project}/links/validate/{file_path:path}")
async def api_validate_file_links(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    return validate_file_links(project, file_path)


@app.get("/api/projects/{project}/links/incoming/{file_path:path}")
async def api_incoming_links(project: str, file_path: str):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    return find_incoming_links(project, file_path)

# ---------------------------------------------------------------------------
# Markdown files
# ---------------------------------------------------------------------------

@app.get("/api/projects/{project}/markdown/{file_path:path}")
async def api_get_markdown(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    content = fp.read_text(encoding="utf-8")
    return {"path": file_path, "content": content}


@app.post("/api/projects/{project}/markdown/{file_path:path}")
async def api_create_markdown(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if fp.exists():
        raise HTTPException(409, "File already exists")
    fp.parent.mkdir(parents=True, exist_ok=True)
    title = Path(file_path).stem.replace("-", " ").replace("_", " ").title()
    fp.write_text(f"# {title}\n", encoding="utf-8")
    return {"path": file_path, "status": "created"}


@app.put("/api/projects/{project}/markdown/{file_path:path}")
async def api_save_markdown(project: str, file_path: str, request: Request):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    data = await request.json()
    content = data.get("content", "")
    fp.write_text(content, encoding="utf-8")
    return {"path": file_path, "status": "saved"}


@app.delete("/api/projects/{project}/markdown/{file_path:path}")
async def api_delete_markdown(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    fp.unlink()
    return {"path": file_path, "status": "deleted"}


@app.post("/api/projects/{project}/archive-markdown/{file_path:path}")
async def api_archive_markdown(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    new_path = archive_file(project, file_path)
    collection = load_collection(project)

    def remove_from(nodes: list[FileNode]) -> list[FileNode]:
        return [
            FileNode(
                path=n.path, title=n.title, order=n.order,
                children=remove_from(n.children),
            )
            for n in nodes if n.path != file_path
        ]

    collection.root = remove_from(collection.root)
    save_collection(project, collection)
    return {"path": file_path, "archived_as": new_path}


@app.post("/api/projects/{project}/rename/{file_path:path}")
async def api_rename_markdown(project: str, file_path: str, request: Request):
    data = await request.json()
    new_path = data.get("new_path", "").strip()
    if not new_path:
        raise HTTPException(400, "new_path required")
    rename_file(project, file_path, new_path)

    collection = load_collection(project)

    def update_paths(nodes: list[FileNode]) -> list[FileNode]:
        result = []
        for n in nodes:
            path = new_path if n.path == file_path else n.path
            result.append(FileNode(
                path=path, title=n.title, order=n.order,
                children=update_paths(n.children),
            ))
        return result

    collection.root = update_paths(collection.root)
    save_collection(project, collection)
    return {"old_path": file_path, "new_path": new_path}

# ---------------------------------------------------------------------------
# Project metadata (project.md)
# ---------------------------------------------------------------------------

@app.get("/api/projects/{project}/project-md")
async def api_get_project_md(project: str):
    pmd = get_project_md(project)
    if not pmd.exists():
        return {"content": ""}
    return {"content": pmd.read_text(encoding="utf-8")}


@app.put("/api/projects/{project}/project-md")
async def api_save_project_md(project: str, request: Request):
    pmd = get_project_md(project)
    data = await request.json()
    pmd.write_text(data.get("content", ""), encoding="utf-8")
    return {"status": "saved"}

# ---------------------------------------------------------------------------
# HTML preview
# ---------------------------------------------------------------------------

@app.get("/api/projects/{project}/html/{file_path:path}")
async def api_html_preview(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    raw = fp.read_text(encoding="utf-8")
    post = frontmatter.loads(raw)
    html = markdown.markdown(post.content, extensions=["fenced_code", "tables", "toc"])
    return HTMLResponse(html)

# ---------------------------------------------------------------------------
# Import / Export
# ---------------------------------------------------------------------------

@app.post("/api/projects/{project}/import/mkdocs")
async def api_import_mkdocs(project: str):
    try:
        nodes = import_mkdocs(project)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    collection = CollectionStructure(root=nodes)
    save_collection(project, collection)
    return collection.model_dump()


@app.post("/api/projects/{project}/import/docusaurus")
async def api_import_docusaurus(project: str, request: Request):
    data = await request.json() if request.headers.get("content-length", "0") != "0" else {}
    filename = data.get("filename")
    try:
        nodes = import_docusaurus(project, filename)
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(400, str(e))
    collection = CollectionStructure(root=nodes)
    save_collection(project, collection)
    return collection.model_dump()


@app.post("/api/projects/{project}/export/mkdocs")
async def api_export_mkdocs(project: str):
    collection = load_collection(project)
    path = export_mkdocs(project, collection.root)
    return {"path": path}


@app.post("/api/projects/{project}/export/docusaurus")
async def api_export_docusaurus(project: str):
    collection = load_collection(project)
    path = export_docusaurus(project, collection.root)
    return {"path": path}

# ---------------------------------------------------------------------------
# Collection export (single HTML)
# ---------------------------------------------------------------------------

@app.get("/api/projects/{project}/export/html")
async def api_export_html(project: str):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    collection = load_collection(project)
    md_dir = get_markdowns_dir(project)
    project_title = project

    pmd = get_project_md(project)
    if pmd.exists():
        import re as _re
        _m = _re.search(r"^#\s+(.+)$", pmd.read_text(encoding="utf-8"), _re.MULTILINE)
        if _m:
            project_title = _m.group(1).strip()

    toc_entries: list[dict] = []
    body_sections: list[str] = []
    section_id = 0

    def render_nodes(nodes: list, depth: int = 0):
        nonlocal section_id
        for node in sorted(nodes, key=lambda n: n.order):
            fp = md_dir / node.path
            if not fp.exists():
                continue
            raw = fp.read_text(encoding="utf-8")
            post = frontmatter.loads(raw)
            html = markdown.markdown(
                post.content,
                extensions=["fenced_code", "tables", "toc", "codehilite"],
            )
            sid = f"section-{section_id}"
            section_id += 1
            toc_entries.append({"title": node.title, "id": sid, "depth": depth})
            body_sections.append(
                f'<section id="{sid}" class="doc-section depth-{depth}">'
                f"\n{html}\n</section>"
            )
            if node.children:
                render_nodes(node.children, depth + 1)

    render_nodes(collection.root)

    toc_html = '<nav class="toc"><h2>Table of Contents</h2><ul>\n'
    for entry in toc_entries:
        indent = "  " * entry["depth"]
        toc_html += f'{indent}<li class="toc-depth-{entry["depth"]}"><a href="#{entry["id"]}">{entry["title"]}</a></li>\n'
    toc_html += "</ul></nav>\n"

    html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{project_title}</title>
<style>
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 24px;
    color: #1a1a1a;
    line-height: 1.7;
  }}
  h1 {{ font-size: 1.8em; border-bottom: 2px solid #1a6fa8; padding-bottom: 0.3em; color: #1a6fa8; }}
  h2 {{ font-size: 1.4em; border-bottom: 1px solid #ddd; padding-bottom: 0.2em; }}
  h3 {{ font-size: 1.2em; }}
  code {{
    background: #f5f5f5;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 0.9em;
  }}
  pre {{
    background: #f5f5f5;
    padding: 16px;
    border-radius: 6px;
    overflow-x: auto;
    border: 1px solid #e0e0e0;
  }}
  pre code {{ background: none; padding: 0; }}
  blockquote {{
    border-left: 4px solid #1a6fa8;
    padding-left: 16px;
    color: #555;
    margin: 1em 0;
  }}
  table {{ border-collapse: collapse; width: 100%; margin: 1em 0; }}
  th, td {{ border: 1px solid #ddd; padding: 8px 12px; text-align: left; }}
  th {{ background: #f5f5f5; }}
  a {{ color: #1a6fa8; }}
  img {{ max-width: 100%; }}
  .toc {{
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 16px 24px;
    margin-bottom: 40px;
  }}
  .toc h2 {{ margin-top: 0; font-size: 1.2em; color: #1a6fa8; }}
  .toc ul {{ list-style: none; padding: 0; margin: 0; }}
  .toc li {{ margin: 4px 0; }}
  .toc-depth-1 {{ padding-left: 20px; }}
  .toc-depth-2 {{ padding-left: 40px; }}
  .toc-depth-3 {{ padding-left: 60px; }}
  .toc a {{ text-decoration: none; }}
  .toc a:hover {{ text-decoration: underline; }}
  .doc-section {{
    margin-bottom: 48px;
    page-break-inside: avoid;
  }}
  .doc-section.depth-1 {{ margin-left: 20px; }}
  .doc-section.depth-2 {{ margin-left: 40px; }}
  .doc-section h1 {{ font-size: 1.5em; }}
  .doc-section.depth-1 h1 {{ font-size: 1.3em; }}
  .doc-section.depth-2 h1 {{ font-size: 1.1em; }}
  .cover {{
    text-align: center;
    padding: 60px 0 40px;
    border-bottom: 2px solid #1a6fa8;
    margin-bottom: 40px;
  }}
  .cover h1 {{ font-size: 2.4em; border: none; color: #1a6fa8; }}
  .cover p {{ color: #666; font-size: 1.1em; }}

  @media print {{
    .toc {{ page-break-after: always; }}
    .doc-section {{ page-break-inside: avoid; }}
    a {{ color: #1a6fa8; text-decoration: none; }}
  }}
</style>
</head>
<body>
<div class="cover">
  <h1>{project_title}</h1>
  <p>Generated by PiTH</p>
</div>
{toc_html}
{chr(10).join(body_sections)}
</body>
</html>"""

    return HTMLResponse(content=html_doc)

# ---------------------------------------------------------------------------
# Batch report (stats + issues + structure across all project files)
# ---------------------------------------------------------------------------

@app.get("/api/projects/{project}/report/html")
async def api_report_html(project: str):
    if not (get_projects_dir() / project).exists():
        raise HTTPException(404, "Project not found")
    html = generate_report_html(project)
    return HTMLResponse(content=html)

# ---------------------------------------------------------------------------
# SPA fallback — serve built frontend
# ---------------------------------------------------------------------------

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        index = FRONTEND_DIST / "index.html"
        if index.exists():
            return HTMLResponse(index.read_text(encoding="utf-8"))
        raise HTTPException(404, "Frontend not built")
