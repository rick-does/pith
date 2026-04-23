from __future__ import annotations

import logging
import os
import re
import time
import shutil
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)

from .models import FileNode, CollectionStructure
from .config import get_active_projects_dir, get_project_meta_dir, get_root_meta_dir, get_default_template_path, load_config

_pkg_golden = Path(__file__).parent / "golden"
_source_golden = Path(__file__).parent.parent / "_golden"
GOLDEN_DIR = _source_golden if _source_golden.exists() else _pkg_golden


def get_projects_dir() -> Path:
    """Active root path — where project content (markdowns, images) lives."""
    return get_active_projects_dir()


def _read_project_meta(project: str) -> dict:
    """Read frontmatter from .pith-project. Returns {} if missing or malformed."""
    pmd = get_project_meta_dir(project) / ".pith-project"
    if not pmd.exists():
        return {}
    try:
        meta, _ = parse_frontmatter(pmd.read_text(encoding="utf-8"))
        return meta or {}
    except (OSError, ValueError):
        return {}


def get_markdowns_dir(project: str) -> Path:
    meta = _read_project_meta(project)
    override = meta.get("markdowns_dir")
    if override:
        return Path(str(override))
    return get_projects_dir() / project / "markdowns"


def get_images_dir(project: str) -> Path:
    return get_projects_dir() / project / "images"


def get_collection_file(project: str) -> Path:
    meta = _read_project_meta(project)
    override = meta.get("tree_yaml")
    if override:
        return Path(str(override))
    return get_project_meta_dir(project) / "tree.yaml"


def get_project_md(project: str) -> Path:
    return get_project_meta_dir(project) / ".pith-project"


def get_hierarchy_backup_file(project: str) -> Path:
    return get_project_meta_dir(project) / "tree-backup.yaml"


def project_exists(project: str) -> bool:
    return get_project_meta_dir(project).exists()


def read_project_md_body(project: str) -> str:
    """Return the markdown body of .pith-project (without YAML frontmatter). Empty if missing."""
    pmd = get_project_md(project)
    if not pmd.exists():
        return ""
    _meta, body = parse_frontmatter(pmd.read_text(encoding="utf-8"))
    return body


def format_project_md(body: str, tree_yaml: Path, markdowns_dir: Path, template: Path | None = None) -> str:
    body = body.lstrip("\n")
    fm_lines = [
        f"tree_yaml: {tree_yaml}",
        f"markdowns_dir: {markdowns_dir}",
    ]
    if template is not None:
        fm_lines.append(f"template: {template}")
    return "---\n" + "\n".join(fm_lines) + "\n---\n" + body


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
    """Enumerate projects registered under the active root's meta dir.

    Does NOT scan the content dir — a project exists only when it has been
    explicitly created (meta dir with .pith-project). This keeps a project root
    strictly as a target location; existing directories there are ignored.
    """
    meta_root = get_root_meta_dir()
    if not meta_root.exists():
        return []
    result = []
    for entry in sorted(meta_root.iterdir(), key=lambda p: p.name):
        if not entry.is_dir() or entry.name.startswith("_"):
            continue
        pmd = entry / ".pith-project"
        if not pmd.exists():
            continue
        title = entry.name
        _meta, body = parse_frontmatter(pmd.read_text(encoding="utf-8"))
        t = extract_title(body)
        if t:
            title = t
        result.append({"name": entry.name, "title": title})
    return result


def create_project(name: str) -> None:
    meta_dir = get_project_meta_dir(name)
    meta_dir.mkdir(parents=True, exist_ok=True)

    content_dir = get_projects_dir() / name
    md_dir = content_dir / "markdowns"
    md_dir.mkdir(parents=True, exist_ok=True)
    (content_dir / "images").mkdir(exist_ok=True)

    tree_file = meta_dir / "tree.yaml"
    if not tree_file.exists():
        seed_new_project_guide_if_enabled(md_dir, tree_file)

    pmd = get_project_md(name)
    if not pmd.exists():
        pmd.write_text(
            format_project_md(
                body=f"# {name}\n",
                tree_yaml=tree_file,
                markdowns_dir=md_dir,
                template=get_default_template_path(),
            ),
            encoding="utf-8",
        )


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
    ts = int(time.time())
    content_src = get_projects_dir() / name
    if content_src.exists():
        archive_dir = get_projects_dir() / "_archive"
        archive_dir.mkdir(exist_ok=True)
        dest = archive_dir / name
        if dest.exists():
            dest = archive_dir / f"{name}-{ts}"
        shutil.move(str(content_src), str(dest))

    meta_src = get_project_meta_dir(name)
    if meta_src.exists():
        meta_archive = get_root_meta_dir() / "_archive"
        meta_archive.mkdir(exist_ok=True)
        meta_dest = meta_archive / name
        if meta_dest.exists():
            meta_dest = meta_archive / f"{name}-{ts}"
        shutil.move(str(meta_src), str(meta_dest))


def delete_project(name: str) -> None:
    content_dir = get_projects_dir() / name
    if content_dir.exists():
        shutil.rmtree(content_dir)
    meta_dir = get_project_meta_dir(name)
    if meta_dir.exists():
        shutil.rmtree(meta_dir)


def rename_project(old_name: str, new_name: str) -> None:
    meta_src = get_project_meta_dir(old_name)
    content_src = get_projects_dir() / old_name
    meta_dest = get_project_meta_dir(new_name)
    content_dest = get_projects_dir() / new_name

    if meta_dest.exists() or content_dest.exists():
        raise ValueError("Target project already exists")

    if content_src.exists():
        content_src.rename(content_dest)
    if meta_src.exists():
        meta_src.rename(meta_dest)

    pmd = meta_dest / ".pith-project"
    if pmd.exists():
        meta, body = parse_frontmatter(pmd.read_text(encoding="utf-8"))
        old_tree = str(meta_src / "tree.yaml")
        old_md = str(content_src / "markdowns")
        if str(meta.get("tree_yaml", "")) in (old_tree, ""):
            meta["tree_yaml"] = str(meta_dest / "tree.yaml")
        if str(meta.get("markdowns_dir", "")) in (old_md, ""):
            meta["markdowns_dir"] = str(content_dest / "markdowns")
        template_val = meta.get("template")
        pmd.write_text(
            format_project_md(
                body=body,
                tree_yaml=Path(str(meta["tree_yaml"])),
                markdowns_dir=Path(str(meta["markdowns_dir"])),
                template=Path(str(template_val)) if template_val else None,
            ),
            encoding="utf-8",
        )


def import_markdowns(path: str) -> str:
    """Copy all .md files from path into a new local project. Returns the project name."""
    src = Path(path).resolve()
    if not src.exists() or not src.is_dir():
        raise ValueError(f"Directory not found: {path}")

    base_name = re.sub(r"[^\w\-]", "-", src.name).strip("-") or "imported"
    base_name = base_name.lower()
    name = base_name
    i = 1
    while project_exists(name):
        name = f"{base_name}-{i}"
        i += 1

    content_dir = get_projects_dir() / name
    md_dir = content_dir / "markdowns"
    md_dir.mkdir(parents=True, exist_ok=True)
    (content_dir / "images").mkdir(exist_ok=True)

    import glob as _glob
    pattern = os.path.join(str(src), "**", "*.md")
    found = _glob.glob(pattern, recursive=True)
    if not found:
        shutil.rmtree(str(content_dir))
        raise ValueError(f"No .md files found in: {src}")
    for src_file_str in found:
        src_file = Path(src_file_str)
        rel = src_file.relative_to(src)
        dest = md_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_file_str, str(dest))

    meta_dir = get_project_meta_dir(name)
    meta_dir.mkdir(parents=True, exist_ok=True)
    tree_file = meta_dir / "tree.yaml"
    tree_file.write_text("root: []\n", encoding="utf-8")

    pmd = get_project_md(name)
    pmd.write_text(
        format_project_md(
            body=f"# {src.name}\n",
            tree_yaml=tree_file,
            markdowns_dir=md_dir,
            template=get_default_template_path(),
        ),
        encoding="utf-8",
    )

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
    meta = _read_project_meta(project)
    override = meta.get("template")
    if override:
        return Path(str(override))
    return get_default_template_path()


def ensure_default_template() -> None:
    """Seed ~/.pith/templates/default-template.md from DEFAULT_TEMPLATE if missing."""
    p = get_default_template_path()
    if p.exists():
        return
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(DEFAULT_TEMPLATE, encoding="utf-8")


def seed_new_project_guide_if_enabled(md_dir: Path, tree_file: Path) -> None:
    """Seed tree.yaml and copy the new-project-guide.md from the golden stub into
    md_dir when the show_new_project_file pref is enabled; otherwise write an
    empty tree.
    """
    include_guide = load_config().get("prefs", {}).get("show_new_project_file", True)
    golden_stub = GOLDEN_DIR / "new-project"
    golden_tree = golden_stub / "tree.yaml"
    golden_md = golden_stub / "markdowns"
    if include_guide and golden_tree.exists():
        shutil.copy2(str(golden_tree), str(tree_file))
    else:
        tree_file.write_text("root: []\n", encoding="utf-8")
    if include_guide and golden_md.exists():
        for fp in golden_md.glob("*.md"):
            shutil.copy2(str(fp), str(md_dir / fp.name))


def load_unified_template(project: str) -> str:
    p = get_template_path(project)
    return p.read_text(encoding="utf-8") if p.exists() else DEFAULT_TEMPLATE


def save_unified_template(project: str, content: str) -> None:
    p = get_template_path(project)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def scan_unified_compliance(project: str) -> list[dict]:
    """Scan all files against the project's template. Returns per-file missing/extra frontmatter keys and missing headings."""
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
    """Parse YAML frontmatter from markdown content. Returns (metadata, body)."""
    import frontmatter as fm
    post = fm.loads(content)
    if post.metadata:
        return dict(post.metadata), post.content
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


