from __future__ import annotations

import frontmatter
import markdown

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse

from ..models import CollectionStructure
from ..utils import (
    extract_title,
    get_markdowns_dir,
    load_collection,
    project_exists,
    read_project_md_body,
    safe_path,
    save_collection,
)
from ..converters import (
    export_docusaurus,
    export_mkdocs,
    import_docusaurus,
    import_mkdocs,
)
from ..report import generate_report_html

router = APIRouter()


@router.get("/api/projects/{project}/html/{file_path:path}")
async def api_html_preview(project: str, file_path: str):
    fp = safe_path(project, file_path)
    if not fp.exists():
        raise HTTPException(404, "File not found")
    raw = fp.read_text(encoding="utf-8")
    post = frontmatter.loads(raw)
    html = markdown.markdown(post.content, extensions=["fenced_code", "tables", "toc"])
    return HTMLResponse(html)


@router.post("/api/projects/{project}/import/mkdocs")
async def api_import_mkdocs(project: str):
    try:
        nodes = import_mkdocs(project)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    collection = CollectionStructure(root=nodes)
    save_collection(project, collection)
    return collection.model_dump()


@router.post("/api/projects/{project}/import/docusaurus")
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


@router.post("/api/projects/{project}/export/mkdocs")
async def api_export_mkdocs(project: str):
    collection = load_collection(project)
    path = export_mkdocs(project, collection.root)
    return {"path": path}


@router.post("/api/projects/{project}/export/docusaurus")
async def api_export_docusaurus(project: str):
    collection = load_collection(project)
    path = export_docusaurus(project, collection.root)
    return {"path": path}


@router.get("/api/projects/{project}/export/html")
async def api_export_html(project: str):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    collection = load_collection(project)
    md_dir = get_markdowns_dir(project)
    project_title = project
    _t = extract_title(read_project_md_body(project))
    if _t:
        project_title = _t

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


@router.get("/api/projects/{project}/report/html")
async def api_report_html(project: str):
    if not project_exists(project):
        raise HTTPException(404, "Project not found")
    html = generate_report_html(project)
    return HTMLResponse(content=html)
