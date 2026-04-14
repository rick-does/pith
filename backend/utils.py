from __future__ import annotations

import os
import re
import time
import shutil
from pathlib import Path

import yaml

from .models import FileNode, CollectionStructure

PROJECTS_DIR = Path("projects")


def get_projects_dir() -> Path:
    return PROJECTS_DIR


def get_markdowns_dir(project: str) -> Path:
    return PROJECTS_DIR / project / "markdowns"


def get_collection_file(project: str) -> Path:
    return PROJECTS_DIR / project / "tree.yaml"


def get_project_md(project: str) -> Path:
    return PROJECTS_DIR / project / ".pith-project"


def safe_path(project: str, rel_path: str) -> Path:
    base = get_markdowns_dir(project).resolve()
    target = (base / rel_path).resolve()
    if not str(target).startswith(str(base)):
        raise ValueError("Path traversal detected")
    return target


def extract_title(content: str) -> str:
    match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    return match.group(1).strip() if match else ""


def list_projects() -> list[dict]:
    projects_dir = get_projects_dir()
    if not projects_dir.exists():
        return []
    result = []
    for entry in sorted(projects_dir.iterdir()):
        if not entry.is_dir() or entry.name.startswith("_"):
            continue
        title = entry.name
        pmd = entry / ".pith-project"
        if pmd.exists():
            t = extract_title(pmd.read_text(encoding="utf-8"))
            if t:
                title = t
        result.append({"name": entry.name, "title": title})
    return result


def create_project(name: str) -> None:
    proj_dir = PROJECTS_DIR / name
    proj_dir.mkdir(parents=True, exist_ok=True)
    (proj_dir / "markdowns").mkdir(exist_ok=True)

    tree_file = get_collection_file(name)
    if not tree_file.exists():
        tree_file.write_text("root: []\n", encoding="utf-8")

    pmd = get_project_md(name)
    if not pmd.exists():
        pmd.write_text(f"# {name}\n", encoding="utf-8")


def get_all_md_files(project: str) -> list[dict]:
    md_dir = get_markdowns_dir(project)
    if not md_dir.exists():
        return []
    files = []
    for fp in md_dir.rglob("*.md"):
        rel = fp.relative_to(md_dir).as_posix()
        if "_archive" in rel.split("/"):
            continue
        title = extract_title(fp.read_text(encoding="utf-8"))
        if not title:
            title = fp.stem
        files.append({"path": rel, "title": title, "mtime": fp.stat().st_mtime})
    files.sort(key=lambda f: f["mtime"], reverse=True)
    return [{"path": f["path"], "title": f["title"]} for f in files]


def flatten_paths(nodes: list[FileNode]) -> set[str]:
    paths: set[str] = set()
    for node in nodes:
        paths.add(node.path)
        paths.update(flatten_paths(node.children))
    return paths


def sync_collection(project: str, collection: CollectionStructure) -> CollectionStructure:
    md_dir = get_markdowns_dir(project)

    def sync_nodes(nodes: list[FileNode]) -> list[FileNode]:
        result = []
        for node in nodes:
            fp = md_dir / node.path
            if not fp.exists():
                continue
            title = extract_title(fp.read_text(encoding="utf-8"))
            if not title:
                title = fp.stem
            node.title = title
            node.children = sync_nodes(node.children)
            result.append(node)
        return result

    collection.root = sync_nodes(collection.root)
    return collection


def load_collection(project: str) -> CollectionStructure:
    tree_file = get_collection_file(project)
    if not tree_file.exists():
        files = get_all_md_files(project)
        nodes = [
            FileNode(path=f["path"], title=f["title"], order=i)
            for i, f in enumerate(files)
        ]
        return CollectionStructure(root=nodes)
    data = yaml.safe_load(tree_file.read_text(encoding="utf-8"))
    if not data or "root" not in data:
        return CollectionStructure(root=[])
    collection = CollectionStructure(**data)
    return sync_collection(project, collection)


def save_collection(project: str, collection: CollectionStructure) -> None:
    tree_file = get_collection_file(project)
    tree_file.parent.mkdir(parents=True, exist_ok=True)
    data = {"root": [node.model_dump() for node in collection.root]}
    tree_file.write_text(yaml.dump(data, default_flow_style=False), encoding="utf-8")


def get_orphans(project: str, collection: CollectionStructure) -> list[dict]:
    all_files = get_all_md_files(project)
    known = flatten_paths(collection.root)
    return [f for f in all_files if f["path"] not in known]


def archive_file(project: str, rel_path: str) -> str:
    md_dir = get_markdowns_dir(project)
    src = safe_path(project, rel_path)
    archive_dir = md_dir / "_archive"
    archive_dir.mkdir(exist_ok=True)
    dest_name = Path(rel_path).name
    dest = archive_dir / dest_name
    if dest.exists():
        stem = dest.stem
        dest = archive_dir / f"{stem}-{int(time.time())}{dest.suffix}"
    shutil.move(str(src), str(dest))
    return dest.relative_to(md_dir).as_posix()


def rename_file(project: str, old_path: str, new_path: str) -> None:
    src = safe_path(project, old_path)
    dest = safe_path(project, new_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dest))


def archive_project(name: str) -> None:
    src = PROJECTS_DIR / name
    archive_dir = PROJECTS_DIR / "_archive"
    archive_dir.mkdir(exist_ok=True)
    dest = archive_dir / name
    if dest.exists():
        dest = archive_dir / f"{name}-{int(time.time())}"
    shutil.move(str(src), str(dest))


def delete_project(name: str) -> None:
    proj_dir = PROJECTS_DIR / name
    if proj_dir.exists():
        shutil.rmtree(proj_dir)


LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")


def extract_internal_links(content: str) -> list[dict]:
    """Extract all markdown links from content. Returns list of {text, target, line}."""
    links = []
    for i, line in enumerate(content.split("\n")):
        for match in LINK_RE.finditer(line):
            target = match.group(2)
            if target.startswith("http://") or target.startswith("https://") or target.startswith("#"):
                continue
            target = target.split("#")[0].split("?")[0]
            if not target:
                continue
            links.append({
                "text": match.group(1),
                "target": target,
                "line": i + 1,
            })
    return links


def validate_file_links(project: str, rel_path: str) -> list[dict]:
    """Check all internal links in a single file. Returns broken links."""
    fp = safe_path(project, rel_path)
    if not fp.exists():
        return []
    content = fp.read_text(encoding="utf-8")
    md_dir = get_markdowns_dir(project)
    links = extract_internal_links(content)
    broken = []
    for link in links:
        target_path = (md_dir / Path(rel_path).parent / link["target"]).resolve()
        if not target_path.exists():
            broken.append(link)
    return broken


def validate_project_links(project: str) -> list[dict]:
    """Scan all files in a project for broken internal links."""
    md_dir = get_markdowns_dir(project)
    if not md_dir.exists():
        return []
    results = []
    for fp in md_dir.rglob("*.md"):
        rel = fp.relative_to(md_dir).as_posix()
        if "_archive" in rel.split("/"):
            continue
        broken = validate_file_links(project, rel)
        if broken:
            title = extract_title(fp.read_text(encoding="utf-8")) or fp.stem
            results.append({
                "path": rel,
                "title": title,
                "broken_links": broken,
            })
    results.sort(key=lambda r: len(r["broken_links"]), reverse=True)
    return results


def find_incoming_links(project: str, target_path: str) -> list[dict]:
    """Find all files that link to a given path."""
    md_dir = get_markdowns_dir(project)
    if not md_dir.exists():
        return []
    results = []
    for fp in md_dir.rglob("*.md"):
        rel = fp.relative_to(md_dir).as_posix()
        if "_archive" in rel.split("/"):
            continue
        content = fp.read_text(encoding="utf-8")
        links = extract_internal_links(content)
        matching = [l for l in links if l["target"] == target_path or
                    (md_dir / Path(rel).parent / l["target"]).resolve() == (md_dir / target_path).resolve()]
        if matching:
            title = extract_title(content) or fp.stem
            results.append({
                "path": rel,
                "title": title,
                "links": matching,
            })
    return results


def get_template_file(project: str) -> Path:
    return PROJECTS_DIR / project / "frontmatter.yaml"


def load_template(project: str) -> dict:
    tf = get_template_file(project)
    if not tf.exists():
        return {"fields": []}
    data = yaml.safe_load(tf.read_text(encoding="utf-8"))
    return data if data else {"fields": []}


def save_template(project: str, template: dict) -> None:
    tf = get_template_file(project)
    tf.write_text(yaml.dump(template, default_flow_style=False), encoding="utf-8")


def infer_template_from_file(project: str, rel_path: str) -> dict:
    """Infer a frontmatter template from an existing file's frontmatter."""
    fp = safe_path(project, rel_path)
    content = fp.read_text(encoding="utf-8")
    meta, _ = parse_frontmatter(content)
    fields = []
    for key, value in meta.items():
        if isinstance(value, bool):
            fields.append({"key": key, "type": "boolean", "default": value})
        elif isinstance(value, list):
            fields.append({"key": key, "type": "list", "default": value})
        elif isinstance(value, (int, float)):
            fields.append({"key": key, "type": "string", "default": str(value)})
        else:
            fields.append({"key": key, "type": "string", "default": value if value else ""})
    return {"fields": fields}


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter from markdown content. Returns (metadata, body).
    Handles both standard (---/---) and Jekyll-style (no opening ---) formats."""
    import frontmatter as fm

    # Standard format: starts with ---
    post = fm.loads(content)
    if post.metadata:
        return dict(post.metadata), post.content

    # Jekyll-style: key: value lines at top, terminated by ---
    lines = content.split("\n")
    if not lines or not re.match(r"^\w[\w\s]*:", lines[0]):
        return {}, content

    end_idx = -1
    for i, line in enumerate(lines):
        if line.strip() == "---":
            end_idx = i
            break
    if end_idx < 0:
        return {}, content

    yaml_block = "\n".join(lines[:end_idx])
    try:
        meta = yaml.safe_load(yaml_block)
        if not isinstance(meta, dict):
            return {}, content
        body = "\n".join(lines[end_idx + 1:])
        return meta, body
    except Exception:
        return {}, content


def set_frontmatter(content: str, metadata: dict) -> str:
    """Replace or add YAML frontmatter in markdown content."""
    lines = content.split("\n")
    body_start = 0

    # Standard format
    if lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                body_start = i + 1
                break
    # Jekyll-style: key: value at top, terminated by ---
    elif re.match(r"^\w[\w\s]*:", lines[0]):
        for i, line in enumerate(lines):
            if line.strip() == "---":
                body_start = i + 1
                break

    body = "\n".join(lines[body_start:])
    yaml_lines = []
    for key, value in metadata.items():
        if isinstance(value, list):
            yaml_lines.append(f"{key}: [{', '.join(str(v) for v in value)}]")
        elif isinstance(value, bool):
            yaml_lines.append(f"{key}: {str(value).lower()}")
        elif value is None:
            yaml_lines.append(f"{key}:")
        else:
            yaml_lines.append(f"{key}: {value}")
    yaml_str = "\n".join(yaml_lines)
    return f"---\n{yaml_str}\n---\n{body}"


def scan_compliance(project: str, template: dict) -> list[dict]:
    """Scan all files against the template. Returns per-file compliance reports."""
    fields = template.get("fields", [])
    if not fields:
        return []
    expected_keys = {f["key"] for f in fields}
    md_dir = get_markdowns_dir(project)
    if not md_dir.exists():
        return []

    results = []
    for fp in md_dir.rglob("*.md"):
        rel = fp.relative_to(md_dir).as_posix()
        if "_archive" in rel.split("/"):
            continue
        try:
            content = fp.read_text(encoding="utf-8")
        except Exception:
            continue
        meta, _ = parse_frontmatter(content)
        file_keys = set(meta.keys())
        missing = sorted(expected_keys - file_keys)
        extra = sorted(file_keys - expected_keys)
        if missing or extra:
            results.append({
                "path": rel,
                "title": extract_title(content) or fp.stem,
                "missing": missing,
                "extra": extra,
            })
    results.sort(key=lambda r: len(r["missing"]) + len(r["extra"]), reverse=True)
    return results


def batch_update_frontmatter(project: str, template: dict, add_defaults: bool = True, strip_extra: bool = False, only_files: list[str] | None = None) -> list[str]:
    """Apply template to files: add missing keys with defaults, optionally strip extra keys.
    If only_files is provided, only update those specific files."""
    fields = template.get("fields", [])
    if not fields:
        return []
    field_map = {f["key"]: f for f in fields}
    expected_keys = set(field_map.keys())
    md_dir = get_markdowns_dir(project)
    if not md_dir.exists():
        return []

    updated = []
    for fp in md_dir.rglob("*.md"):
        rel = fp.relative_to(md_dir).as_posix()
        if "_archive" in rel.split("/"):
            continue
        if only_files is not None and rel not in only_files:
            continue
        try:
            content = fp.read_text(encoding="utf-8")
        except Exception:
            continue
        meta, _ = parse_frontmatter(content)
        changed = False

        if add_defaults:
            for key in (f["key"] for f in fields):
                if key not in meta:
                    f = field_map[key]
                    default = f.get("default")
                    if f["type"] == "list" and default is None:
                        default = []
                    elif f["type"] == "boolean" and default is None:
                        default = False
                    elif default is None:
                        default = ""
                    meta[key] = default
                    changed = True

        if strip_extra:
            for key in list(meta.keys()):
                if key not in expected_keys:
                    del meta[key]
                    changed = True

        if changed:
            # Rebuild in template order: template keys first, then any extras
            ordered = {}
            for f in fields:
                if f["key"] in meta:
                    ordered[f["key"]] = meta[f["key"]]
            for key in meta:
                if key not in ordered:
                    ordered[key] = meta[key]
            new_content = set_frontmatter(content, ordered)
            fp.write_text(new_content, encoding="utf-8")
            updated.append(rel)

    return updated
