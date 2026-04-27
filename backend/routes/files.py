from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from ..models import FileNode
from ..utils import (
    archive_file,
    get_images_dir,
    get_markdowns_dir,
    get_project_md,
    get_unlinked_nodes,
    load_collection,
    load_unified_template,
    project_exists,
    rename_file,
    safe_path,
    save_collection,
    save_unlinked_nodes,
)

router = APIRouter()


@router.get("/api/projects/{project}/markdown/{file_path:path}")
async def api_get_markdown(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    content = fp.read_text(encoding="utf-8")
    return {"path": file_path, "content": content}


@router.post("/api/projects/{project}/markdown/{file_path:path}")
async def api_create_markdown(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if fp.exists():
        raise HTTPException(409, "File already exists")
    fp.parent.mkdir(parents=True, exist_ok=True)
    title = Path(file_path).stem.replace("-", " ").replace("_", " ").title()
    tmpl = load_unified_template(project)
    content = re.sub(r'^#\s+.+$', f'# {title}', tmpl, count=1, flags=re.MULTILINE)
    if not re.search(r'^#\s+', content, re.MULTILINE):
        content = f"# {title}\n{content}"
    fp.write_text(content, encoding="utf-8")
    return {"path": file_path, "status": "created"}


@router.put("/api/projects/{project}/markdown/{file_path:path}")
async def api_save_markdown(project: str, file_path: str, request: Request):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    data = await request.json()
    content = data.get("content", "")
    fp.write_text(content, encoding="utf-8")
    return {"path": file_path, "status": "saved"}


@router.delete("/api/projects/{project}/markdown/{file_path:path}")
async def api_delete_markdown(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    fp.unlink()
    return {"path": file_path, "status": "deleted"}


@router.post("/api/projects/{project}/archive-markdown/{file_path:path}")
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
    save_unlinked_nodes(project, [n for n in get_unlinked_nodes(project) if n.path != file_path])
    return {"path": file_path, "archived_as": new_path}


@router.post("/api/projects/{project}/rename/{file_path:path}")
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


@router.get("/api/projects/{project}/project-md")
async def api_get_project_md(project: str):
    pmd = get_project_md(project)
    if not pmd.exists():
        return {"content": ""}
    return {"content": pmd.read_text(encoding="utf-8")}


@router.put("/api/projects/{project}/project-md")
async def api_save_project_md(project: str, request: Request):
    from ..utils import parse_frontmatter, format_project_md, get_collection_file
    pmd = get_project_md(project)
    pmd.parent.mkdir(parents=True, exist_ok=True)
    data = await request.json()
    new_content = data.get("content", "")
    if pmd.exists():
        meta, _ = parse_frontmatter(pmd.read_text(encoding="utf-8"))
        if meta:
            from pathlib import Path as _Path
            _, new_body = parse_frontmatter(new_content)
            tree_yaml_val = meta.get("tree_yaml")
            markdowns_dir_val = meta.get("markdowns_dir")
            template_val = meta.get("template")
            new_content = format_project_md(
                body=new_body,
                tree_yaml=_Path(str(tree_yaml_val)) if tree_yaml_val else get_collection_file(project),
                markdowns_dir=_Path(str(markdowns_dir_val)) if markdowns_dir_val else get_markdowns_dir(project),
                template=_Path(str(template_val)) if template_val else None,
                archived=bool(meta.get("archived", False)),
            )
    pmd.write_text(new_content, encoding="utf-8")
    return {"status": "saved"}


@router.get("/api/projects/{project}/images")
async def api_list_images(project: str):
    images_dir = get_images_dir(project)
    if not images_dir.exists():
        return []
    result = []
    for fp in sorted(images_dir.iterdir()):
        if fp.is_file() and fp.suffix.lower() in {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"}:
            result.append({"name": fp.name, "size": fp.stat().st_size})
    return result


@router.get("/api/projects/{project}/image/{filename:path}")
async def api_get_image(project: str, filename: str):
    images_dir = get_images_dir(project).resolve()
    target = (images_dir / filename).resolve()
    try:
        target.relative_to(images_dir)
    except ValueError:
        raise HTTPException(400, "Invalid path")
    if not target.exists():
        raise HTTPException(404, "Image not found")
    return FileResponse(str(target))


@router.post("/api/projects/{project}/images")
async def api_upload_images(project: str, files: list[UploadFile] = File(...)):
    images_dir = get_images_dir(project)
    images_dir.mkdir(exist_ok=True)
    uploaded = []
    for file in files:
        filename = Path(file.filename or "image").name
        dest = images_dir / filename
        content = await file.read()
        dest.write_bytes(content)
        uploaded.append(filename)
    return {"uploaded": uploaded}


@router.delete("/api/projects/{project}/image/{filename}")
async def api_delete_image(project: str, filename: str):
    images_dir = get_images_dir(project).resolve()
    target = (images_dir / filename).resolve()
    try:
        target.relative_to(images_dir)
    except ValueError:
        raise HTTPException(400, "Invalid path")
    if not target.exists():
        raise HTTPException(404, "Image not found")
    target.unlink()
    return {"status": "deleted"}


@router.get("/api/projects/{project}/images/open-folder")
async def api_open_images_folder(project: str):
    images_dir = get_images_dir(project)
    images_dir.mkdir(exist_ok=True)
    path = str(images_dir.resolve())
    if sys.platform == "win32":
        subprocess.Popen(["explorer", path])
    elif sys.platform == "darwin":
        subprocess.Popen(["open", path])
    else:
        subprocess.Popen(["xdg-open", path])
    return {"ok": True}
