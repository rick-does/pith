from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from ..utils import (
    apply_unified_template,
    batch_apply_unified_template,
    find_incoming_links,
    load_unified_template,
    parse_frontmatter,
    project_exists,
    safe_path,
    save_unified_template,
    scan_unified_compliance,
    validate_file_links,
    validate_project_links,
)
from ..stats import compute_stats
from ..issues import compute_issues
from ..structure import compute_structure

router = APIRouter()


@router.get("/api/projects/{project}/template")
async def api_get_template(project: str):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    return {"content": load_unified_template(project)}


@router.put("/api/projects/{project}/template")
async def api_save_template(project: str, request: Request):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    data = await request.json()
    save_unified_template(project, data["content"])
    return {"status": "saved"}


@router.get("/api/projects/{project}/template/compliance")
async def api_template_compliance(project: str):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    return scan_unified_compliance(project)


@router.post("/api/projects/{project}/template/apply/{file_path:path}")
async def api_apply_template(project: str, file_path: str, request: Request):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    try:
        data = await request.json()
        remove_extra = bool(data.get("remove_extra", False))
        apply_fm = bool(data.get("apply_fm", True))
        append_body = bool(data.get("append_body", True))
    except (ValueError, KeyError):
        remove_extra = False
        apply_fm = True
        append_body = True
    content = apply_unified_template(project, file_path, remove_extra=remove_extra,
                                     apply_fm=apply_fm, append_body=append_body)
    return {"content": content}


@router.post("/api/projects/{project}/template/batch-apply")
async def api_batch_apply_template(project: str, request: Request):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    data = await request.json()
    remove_extra = bool(data.get("remove_extra", False))
    apply_fm = bool(data.get("apply_fm", True))
    append_body = bool(data.get("append_body", True))
    updated = batch_apply_unified_template(project, data.get("files", []), remove_extra=remove_extra,
                                           apply_fm=apply_fm, append_body=append_body)
    return {"updated": updated, "count": len(updated)}


@router.post("/api/projects/{project}/template/from-file/{file_path:path}")
async def api_template_from_file(project: str, file_path: str, request: Request):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    try:
        data = await request.json()
        content = data.get("content") if isinstance(data, dict) else None
    except ValueError:
        content = None
    if content is None:
        fp = safe_path(project, file_path)
        if not fp.exists():
            raise HTTPException(404, "File not found")
        content = fp.read_text(encoding="utf-8")
    save_unified_template(project, content)
    return {"content": content}


@router.get("/api/projects/{project}/frontmatter/{file_path:path}")
async def api_get_file_frontmatter(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    content = fp.read_text(encoding="utf-8")
    meta, _ = parse_frontmatter(content)
    return {"path": file_path, "frontmatter": meta}


@router.get("/api/projects/{project}/stats/{file_path:path}")
async def api_stats(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    return compute_stats(fp)


@router.get("/api/projects/{project}/structure/{file_path:path}")
async def api_structure(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    return compute_structure(fp)


@router.get("/api/projects/{project}/issues/{file_path:path}")
async def api_issues(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    return compute_issues(fp)


@router.get("/api/projects/{project}/links/validate")
async def api_validate_links(project: str):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    return validate_project_links(project)


@router.get("/api/projects/{project}/links/validate/{file_path:path}")
async def api_validate_file_links(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    return validate_file_links(project, file_path)


@router.get("/api/projects/{project}/links/incoming/{file_path:path}")
async def api_incoming_links(project: str, file_path: str):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    return find_incoming_links(project, file_path)
