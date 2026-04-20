from __future__ import annotations

import json
import logging
import os
import re
import time
import shutil
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)

from .models import FileNode, CollectionStructure
from .config import get_active_projects_dir

_pkg_golden = Path(__file__).parent / "golden"
GOLDEN_DIR = _pkg_golden if _pkg_golden.exists() else Path(__file__).parent.parent / "_golden"


def get_projects_dir() -> Path:
    return get_active_projects_dir()


def get_markdowns_dir(project: str) -> Path:
    return get_projects_dir() / project / "markdowns"


def get_images_dir(project: str) -> Path:
    return get_projects_dir() / project / "images"


def get_collection_file(project: str) -> Path:
    return get_projects_dir() / project / "tree.yaml"


def get_project_md(project: str) -> Path:
    return get_projects_dir() / project / ".pith-project"


def get_hierarchy_backup_file(project: str) -> Path:
    return get_projects_dir() / project / "tree-backup.yaml"


def safe_path(project: str, rel_path: str) -> Path:
    base = get_markdowns_dir(project).resolve()
    target = (base / rel_path).resolve()
    try:
        target.relative_to(base)
    except ValueError:
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
    proj_dir = get_projects_dir() / name
    proj_dir.mkdir(parents=True, exist_ok=True)
    (proj_dir / "markdowns").mkdir(exist_ok=True)
    (proj_dir / "images").mkdir(exist_ok=True)

    tree_file = get_collection_file(name)
    if not tree_file.exists():
        tree_file.write_text("root: []\n", encoding="utf-8")

    pmd = get_project_md(name)
    if not pmd.exists():
        pmd.write_text(f"# {name}\n", encoding="utf-8")


def iter_md_files(md_dir: Path):
    """Yield (Path, posix_rel_str) for every .md file under md_dir, excluding _archive."""
    md_dir_str = str(md_dir)
    for root, _dirs, files in os.walk(md_dir_str):
        for filename in files:
            if filename.lower().endswith(".md"):
                fp = Path(root) / filename
                rel = fp.relative_to(md_dir).as_posix()
                if "_archive" in rel.split("/"):
                    continue
                yield fp, rel


def get_all_md_files(project: str) -> list[dict]:
    md_dir = get_markdowns_dir(project)
    if not md_dir.exists():
        return []
    files = []
    for fp, rel in iter_md_files(md_dir):
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
    if collection.root:
        backup = get_hierarchy_backup_file(project)
        if backup.exists():
            backup.unlink()


def get_orphans(project: str, collection: CollectionStructure) -> list[dict]:
    all_files = get_all_md_files(project)
    known = flatten_paths(collection.root)
    return [f for f in all_files if f["path"] not in known]


def archive_file(project: str, rel_path: str) -> str:
    md_dir = get_markdowns_dir(project)
    src = safe_path(project, rel_path)
    rel = Path(rel_path)
    archive_dir = md_dir / "_archive" / rel.parent
    archive_dir.mkdir(parents=True, exist_ok=True)
    dest = archive_dir / rel.name
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
    src = get_projects_dir() / name
    archive_dir = get_projects_dir() / "_archive"
    archive_dir.mkdir(exist_ok=True)
    dest = archive_dir / name
    if dest.exists():
        dest = archive_dir / f"{name}-{int(time.time())}"
    shutil.move(str(src), str(dest))


def delete_project(name: str) -> None:
    proj_dir = get_projects_dir() / name
    if proj_dir.exists():
        shutil.rmtree(proj_dir)


def import_markdowns(path: str) -> str:
    """Copy all .md files from path into a new local project. Returns the project name."""
    src = Path(path).resolve()
    if not src.exists() or not src.is_dir():
        raise ValueError(f"Directory not found: {path}")

    base_name = re.sub(r"[^\w\-]", "-", src.name).strip("-") or "imported"
    base_name = base_name.lower()
    name = base_name
    i = 1
    while (get_projects_dir() / name).exists():
        name = f"{base_name}-{i}"
        i += 1

    md_dir = get_projects_dir() / name / "markdowns"
    md_dir.mkdir(parents=True, exist_ok=True)
    (get_projects_dir() / name / "images").mkdir(exist_ok=True)

    import glob as _glob
    pattern = os.path.join(str(src), "**", "*.md")
    found = _glob.glob(pattern, recursive=True)
    if not found:
        shutil.rmtree(str(get_projects_dir() / name))
        raise ValueError(f"No .md files found in: {src}")
    for src_file_str in found:
        src_file = Path(src_file_str)
        rel = src_file.relative_to(src)
        dest = md_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_file_str, str(dest))

    tree_file = get_collection_file(name)
    tree_file.write_text("root: []\n", encoding="utf-8")

    pmd = get_project_md(name)
    pmd.write_text(f"# {src.name}\n", encoding="utf-8")

    return name


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
    for fp, rel in iter_md_files(md_dir):
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
    for fp, rel in iter_md_files(md_dir):
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


DEFAULT_TEMPLATE = "---\nTitle: <add title>\n---\n\n# Title\n"


def get_template_path(project: str) -> Path:
    return get_projects_dir() / project / "template.md"


def load_unified_template(project: str) -> str:
    p = get_template_path(project)
    return p.read_text(encoding="utf-8") if p.exists() else DEFAULT_TEMPLATE


def save_unified_template(project: str, content: str) -> None:
    get_template_path(project).write_text(content, encoding="utf-8")


def delete_unified_template(project: str) -> None:
    p = get_template_path(project)
    if p.exists():
        p.unlink()


def extract_for_use_as_template(content: str) -> str:
    """Extract file as a template: FM keys with empty values, h1 normalized, h2+ with body text."""
    meta, body = parse_frontmatter(content)
    lines: list[str] = []
    if meta:
        lines.append("---")
        for key in meta.keys():
            lines.append(f"{key}:")
        lines.append("---")
        lines.append("")
    parts = re.split(r'(^#{1,}\s+.+$)', body, flags=re.MULTILINE)
    i = 1
    while i < len(parts):
        heading = parts[i].strip()
        section_body = parts[i + 1].strip() if i + 1 < len(parts) else ""
        m = re.match(r'^(#+)\s+', heading)
        if m:
            if len(m.group(1)) == 1:
                lines.append("# Title")
            else:
                lines.append(heading)
                if section_body:
                    lines.append("")
                    lines.append(section_body)
        lines.append("")
        i += 2
    return "\n".join(lines).strip() + "\n"


def scan_unified_compliance(project: str) -> list[dict]:
    """Scan all files against template.md. Returns per-file missing/extra frontmatter keys and missing headings."""
    template_content = load_unified_template(project)
    tm_meta, tm_body = parse_frontmatter(template_content)
    expected_keys = set(tm_meta.keys())
    required_headings = [m.group(1).strip() for m in re.finditer(r'^#{2,}\s+(.+)$', tm_body, re.MULTILINE)]

    if not expected_keys and not required_headings:
        return []

    md_dir = get_markdowns_dir(project)
    if not md_dir.exists():
        return []

    results = []
    for fp, rel in iter_md_files(md_dir):
        content = fp.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(content)
        file_keys = set(meta.keys())
        missing_keys = sorted(expected_keys - file_keys)
        extra_keys = sorted(file_keys - expected_keys) if expected_keys else sorted(file_keys)
        file_headings = {m.group(1).strip() for m in re.finditer(r'^#{2,}\s+(.+)$', body, re.MULTILINE)}
        missing_headings = [h for h in required_headings if h not in file_headings]
        if missing_keys or extra_keys or missing_headings:
            results.append({
                "path": rel,
                "title": extract_title(content) or fp.stem,
                "missing_keys": missing_keys,
                "extra_keys": extra_keys,
                "missing_headings": missing_headings,
            })
    results.sort(key=lambda r: len(r["missing_keys"]) + len(r["extra_keys"]) + len(r["missing_headings"]), reverse=True)
    return results


def _extract_template_sections(template_body: str) -> dict:
    """Return {heading_title: full_section_text} for each h2+ heading in template body."""
    sections = {}
    # Split on h2+ headings; capturing group means parts alternates [pre, heading, body, heading, body, ...]
    parts = re.split(r'(^#{2,}\s+.+$)', template_body, flags=re.MULTILINE)
    # parts[0] is pre-heading text; headings start at index 1 and step by 2
    i = 1
    while i < len(parts):
        heading_line = parts[i].strip()
        m = re.match(r'^#{2,}\s+(.+)$', heading_line)
        if not m:
            i += 2
            continue
        title = m.group(1).strip()
        body_part = parts[i + 1].strip() if i + 1 < len(parts) else ""
        if body_part:
            sections[title] = heading_line + "\n\n" + body_part + "\n"
        else:
            sections[title] = heading_line + "\n"
        i += 2
    return sections


def apply_unified_template(project: str, rel_path: str, remove_extra: bool = False,
                           apply_fm: bool = True, append_body: bool = True) -> str:
    fp = safe_path(project, rel_path)
    content = fp.read_text(encoding="utf-8")
    template_content = load_unified_template(project)
    tm_meta, tm_body = parse_frontmatter(template_content)

    original = content

    if apply_fm:
        meta, _ = parse_frontmatter(content)
        changed = False
        for key, default_val in tm_meta.items():
            if key not in meta:
                meta[key] = default_val
                changed = True
        if remove_extra and tm_meta:
            for k in [k for k in list(meta.keys()) if k not in tm_meta]:
                del meta[k]
                changed = True
        if changed:
            content = set_frontmatter(content, meta)

    if append_body:
        body_to_append = re.sub(r'^#[^#][^\n]*\n?', '', tm_body.lstrip('\n'), count=1).strip()
        if body_to_append:
            content = content.rstrip() + "\n\n---\n\n*Template content begins here*\n\n" + body_to_append + "\n"

    if content != original:
        fp.write_text(content, encoding="utf-8")
    return content


def batch_apply_unified_template(project: str, files: list[str], remove_extra: bool = False,
                                 apply_fm: bool = True, append_body: bool = True) -> list[str]:
    updated = []
    for rel_path in files:
        try:
            apply_unified_template(project, rel_path, remove_extra=remove_extra,
                                   apply_fm=apply_fm, append_body=append_body)
            updated.append(rel_path)
        except (OSError, ValueError) as e:
            logger.warning("batch apply failed for %s: %s", rel_path, e)
    return updated


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
    except yaml.YAMLError:
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


