from __future__ import annotations

import json
import re
from pathlib import Path

import yaml

from .models import FileNode
from .utils import get_markdowns_dir, get_projects_dir


def _mkdocs_nav_to_nodes(nav: list, order_start: int = 0) -> list[FileNode]:
    nodes = []
    for i, item in enumerate(nav):
        if isinstance(item, str):
            path = item if item.endswith(".md") else f"{item}.md"
            title = Path(path).stem.replace("-", " ").replace("_", " ").title()
            nodes.append(FileNode(path=path, title=title, order=order_start + i))
        elif isinstance(item, dict):
            for label, value in item.items():
                if isinstance(value, str):
                    path = value if value.endswith(".md") else f"{value}.md"
                    nodes.append(FileNode(path=path, title=label, order=order_start + i))
                elif isinstance(value, list):
                    children = _mkdocs_nav_to_nodes(value)
                    page_children = [c for c in children if c.path.endswith(".md")]
                    if page_children:
                        first = page_children[0]
                        first.title = label
                        first.children = [c for c in children if c != first]
                        first.order = order_start + i
                        nodes.append(first)
                    else:
                        nodes.append(FileNode(
                            path=f"{label.lower().replace(' ', '-')}.md",
                            title=label,
                            order=order_start + i,
                            children=children,
                        ))
    return nodes


def import_mkdocs(project: str) -> list[FileNode]:
    mkdocs_file = get_projects_dir() / project / "mkdocs.yml"
    if not mkdocs_file.exists():
        raise FileNotFoundError("mkdocs.yml not found in project root")
    data = yaml.safe_load(mkdocs_file.read_text(encoding="utf-8"))
    nav = data.get("nav", [])
    return _mkdocs_nav_to_nodes(nav)


def _nodes_to_mkdocs_nav(nodes: list[FileNode]) -> list:
    nav = []
    for node in sorted(nodes, key=lambda n: n.order):
        if node.children:
            children_nav = _nodes_to_mkdocs_nav(node.children)
            nav.append({node.title: [node.path] + children_nav})
        else:
            nav.append({node.title: node.path})
    return nav


def export_mkdocs(project: str, nodes: list[FileNode]) -> str:
    nav = _nodes_to_mkdocs_nav(nodes)
    output = yaml.dump({"nav": nav}, default_flow_style=False)
    dest = get_projects_dir() / project / "mkdocs.yml"
    dest.write_text(output, encoding="utf-8")
    return str(dest)


def _docusaurus_to_nodes(items: list, order_start: int = 0) -> list[FileNode]:
    nodes = []
    for i, item in enumerate(items):
        if isinstance(item, str):
            path = item if item.endswith(".md") else f"{item}.md"
            title = Path(path).stem.replace("-", " ").replace("_", " ").title()
            nodes.append(FileNode(path=path, title=title, order=order_start + i))
        elif isinstance(item, dict):
            item_type = item.get("type", "doc")
            if item_type == "category":
                label = item.get("label", "Untitled")
                children = _docusaurus_to_nodes(item.get("items", []))
                link = item.get("link", {})
                if link.get("type") == "doc":
                    doc_id = link.get("id", "")
                    path = doc_id if doc_id.endswith(".md") else f"{doc_id}.md"
                    nodes.append(FileNode(
                        path=path, title=label,
                        order=order_start + i, children=children,
                    ))
                elif children:
                    nodes.append(FileNode(
                        path=f"{label.lower().replace(' ', '-')}.md",
                        title=label, order=order_start + i,
                        children=children,
                    ))
            elif item_type == "doc":
                doc_id = item.get("id", "")
                label = item.get("label", Path(doc_id).stem)
                path = doc_id if doc_id.endswith(".md") else f"{doc_id}.md"
                nodes.append(FileNode(path=path, title=label, order=order_start + i))
    return nodes


def import_docusaurus(project: str, filename: str | None = None) -> list[FileNode]:
    proj_dir = get_projects_dir() / project
    candidates = [filename] if filename else ["sidebars.js", "sidebars.ts"]
    sidebar_file = None
    for name in candidates:
        if name and (proj_dir / name).exists():
            sidebar_file = proj_dir / name
            break
    if not sidebar_file:
        raise FileNotFoundError("sidebars file not found in project root")

    content = sidebar_file.read_text(encoding="utf-8")
    content = re.sub(r"//.*$", "", content, flags=re.MULTILINE)
    content = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)
    match = re.search(r"(?:module\.exports\s*=|export\s+default)\s*(\{[\s\S]*\})\s*;?\s*$", content)
    if not match:
        raise ValueError("Could not parse sidebars file")

    json_str = match.group(1)
    json_str = re.sub(r"(\w+)\s*:", r'"\1":', json_str)
    json_str = re.sub(r",\s*([}\]])", r"\1", json_str)
    json_str = json_str.replace("'", '"')

    data = json.loads(json_str)
    all_nodes = []
    for _key, items in data.items():
        if isinstance(items, list):
            all_nodes.extend(_docusaurus_to_nodes(items))
    return all_nodes


def _nodes_to_docusaurus(nodes: list[FileNode]) -> list:
    items = []
    for node in sorted(nodes, key=lambda n: n.order):
        doc_id = node.path.removesuffix(".md")
        if node.children:
            items.append({
                "type": "category",
                "label": node.title,
                "link": {"type": "doc", "id": doc_id},
                "items": _nodes_to_docusaurus(node.children),
            })
        else:
            items.append({"type": "doc", "id": doc_id, "label": node.title})
    return items


def export_docusaurus(project: str, nodes: list[FileNode]) -> str:
    sidebar = _nodes_to_docusaurus(nodes)
    js_content = "module.exports = " + json.dumps({"docs": sidebar}, indent=2) + ";\n"
    dest = get_projects_dir() / project / "sidebars.js"
    dest.write_text(js_content, encoding="utf-8")
    return str(dest)
