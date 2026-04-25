from __future__ import annotations

import logging
import os
import re
import shutil
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)

from .models import FileNode, CollectionStructure
from .config import PROJECTS_META_DIR, get_project_meta_dir, get_default_template_path, load_config

_pkg_golden = Path(__file__).parent / "golden"
_source_golden = Path(__file__).parent.parent / "_golden"
GOLDEN_DIR = _source_golden if _source_golden.exists() else _pkg_golden


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
    return Path.home() / "pith-projects" / project / "markdowns"


def get_images_dir(project: str) -> Path:
    return get_markdowns_dir(project).parent / "images"


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


def format_project_md(body: str, tree_yaml: Path, markdowns_dir: Path, template: Path | None = None, archived: bool = False) -> str:
    body = body.lstrip("\n")
    fm_lines = [
        f"tree_yaml: {tree_yaml}",
        f"markdowns_dir: {markdowns_dir}",
    ]
    if template is not None:
        fm_lines.append(f"template: {template}")
    if archived:
        fm_lines.append("archived: true")
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
    """Enumerate all projects under ~/.pith/projects/, including archived."""
    if not PROJECTS_META_DIR.exists():
        return []
    result = []
    for entry in sorted(PROJECTS_META_DIR.iterdir(), key=lambda p: p.name):
        if not entry.is_dir() or entry.name.startswith("_"):
            continue
        pmd = entry / ".pith-project"
        if not pmd.exists():
            continue
        meta, body = parse_frontmatter(pmd.read_text(encoding="utf-8"))
        title = entry.name
        t = extract_title(body)
        if t:
            title = t
        result.append({
            "name": entry.name,
            "title": title,
            "archived": bool(meta.get("archived", False)),
            "markdowns_dir": str(meta.get("markdowns_dir", "")),
        })
    return result


def create_project(name: str, markdowns_dir: str, tree_yaml: str | None = None) -> None:
    meta_dir = get_project_meta_dir(name)
    meta_dir.mkdir(parents=True, exist_ok=True)

    md_dir = Path(markdowns_dir)
    md_dir.mkdir(parents=True, exist_ok=True)

    if tree_yaml:
        tree_file = Path(tree_yaml)
    else:
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


def _detect_yaml_format(data: object) -> str:
    if not isinstance(data, dict):
        return "generic"
    if "root" in data and isinstance(data.get("root"), list):
        return "pith"
    if "nav" in data and isinstance(data.get("nav"), list):
        return "mkdocs"
    return "generic"


def _find_md_list(data: object) -> tuple[list | None, str | None, str | None]:
    """Find the first top-level list containing .md references.
    Returns (items, path_field, top_key).
    path_field is '__str__' for plain string lists, or the dict key whose value ends in .md.
    """
    if not isinstance(data, dict):
        return None, None, None
    for key, value in data.items():
        if not isinstance(value, list) or not value:
            continue
        field = _detect_path_field(value)
        if field is not None:
            return value, field, key
    return None, None, None


def _detect_path_field(items: list) -> str | None:
    for item in items[:10]:
        if isinstance(item, str) and item.lower().endswith(".md"):
            return "__str__"
        if isinstance(item, dict):
            for k, v in item.items():
                if isinstance(v, str) and v.lower().endswith(".md"):
                    return k
    return None


def _generic_yaml_to_nodes(items: list, path_field: str) -> list[FileNode]:
    nodes = []
    for i, item in enumerate(items):
        if path_field == "__str__":
            if isinstance(item, str) and item.lower().endswith(".md"):
                nodes.append(FileNode(path=item, title=Path(item).stem, order=i))
        elif isinstance(item, dict):
            raw_path = item.get(path_field, "")
            if not isinstance(raw_path, str) or not raw_path.lower().endswith(".md"):
                continue
            title = item.get("title") or item.get("name") or Path(raw_path).stem
            extra = {k: v for k, v in item.items() if k not in (path_field, "title", "name", "children")}
            node = FileNode(path=raw_path, title=str(title), order=i)
            node.extra = extra
            nodes.append(node)
    return nodes


def _rebuild_generic_list(data: object, top_key: str | None, path_field: str | None, collection: CollectionStructure) -> None:
    if path_field is None:
        path_field = "__str__"
    items = data[top_key] if top_key and isinstance(data, dict) else data

    # Build path → original entry map
    entry_map: dict[str, object] = {}
    schema_keys: list[str] = []
    for item in items:
        if path_field == "__str__":
            if isinstance(item, str) and item.lower().endswith(".md"):
                entry_map[item] = item
        elif isinstance(item, dict):
            p = item.get(path_field, "")
            if isinstance(p, str) and p:
                entry_map[p] = item
                if not schema_keys:
                    schema_keys = [k for k in item.keys() if k != path_field]

    def nodes_to_entries(nodes: list[FileNode]) -> list:
        result = []
        for node in nodes:
            if path_field == "__str__":
                result.append(node.path)
            else:
                if node.path in entry_map and isinstance(entry_map[node.path], dict):
                    entry = dict(entry_map[node.path])
                    entry[path_field] = node.path
                else:
                    entry = {path_field: node.path}
                    for k in schema_keys:
                        entry[k] = node.extra.get(k, "")
                result.append(entry)
            result.extend(nodes_to_entries(node.children))
        return result

    new_entries = nodes_to_entries(collection.root)
    if top_key and isinstance(data, dict):
        data[top_key] = new_entries
    elif isinstance(data, list):
        data.clear()
        data.extend(new_entries)


def load_collection(project: str) -> CollectionStructure:
    from .converters import _mkdocs_nav_to_nodes
    from ruamel.yaml import YAML

    tree_file = get_collection_file(project)
    if not tree_file.exists():
        files = get_all_md_files(project)
        nodes = [
            FileNode(path=f["path"], title=f["title"], order=i)
            for i, f in enumerate(files)
        ]
        return CollectionStructure(root=nodes)

    ryaml = YAML()
    ryaml.preserve_quotes = True
    data = ryaml.load(tree_file.read_text(encoding="utf-8"))
    if not data:
        return CollectionStructure(root=[])

    fmt = _detect_yaml_format(data)

    if fmt == "pith":
        if "root" not in data:
            return CollectionStructure(root=[])
        collection = CollectionStructure(**yaml.safe_load(tree_file.read_text(encoding="utf-8")))
    elif fmt == "mkdocs":
        nodes = _mkdocs_nav_to_nodes(list(data.get("nav", [])))
        collection = CollectionStructure(root=nodes)
    else:
        items, path_field, _ = _find_md_list(data)
        nodes = _generic_yaml_to_nodes(items or [], path_field or "__str__")
        collection = CollectionStructure(root=nodes)

    return sync_collection(project, collection)


def save_collection(project: str, collection: CollectionStructure) -> None:
    from .converters import _nodes_to_mkdocs_nav
    from ruamel.yaml import YAML

    tree_file = get_collection_file(project)
    tree_file.parent.mkdir(parents=True, exist_ok=True)

    if not tree_file.exists():
        data = {"root": [node.model_dump() for node in collection.root]}
        tree_file.write_text(yaml.dump(data, default_flow_style=False), encoding="utf-8")
        if collection.root:
            backup = get_hierarchy_backup_file(project)
            if backup.exists():
                backup.unlink()
        return

    ryaml = YAML()
    ryaml.preserve_quotes = True
    with open(tree_file, encoding="utf-8") as f:
        existing = ryaml.load(f)

    fmt = _detect_yaml_format(existing)

    if fmt == "pith":
        data = {"root": [node.model_dump() for node in collection.root]}
        tree_file.write_text(yaml.dump(data, default_flow_style=False), encoding="utf-8")
    elif fmt == "mkdocs":
        existing["nav"] = _nodes_to_mkdocs_nav(collection.root)
        with open(tree_file, "w", encoding="utf-8") as f:
            ryaml.dump(existing, f)
    else:
        _, path_field, top_key = _find_md_list(existing)
        _rebuild_generic_list(existing, top_key, path_field, collection)
        with open(tree_file, "w", encoding="utf-8") as f:
            ryaml.dump(existing, f)

    if collection.root:
        backup = get_hierarchy_backup_file(project)
        if backup.exists():
            backup.unlink()


def get_orphans(project: str, collection: CollectionStructure) -> list[dict]:
    all_files = get_all_md_files(project)
    known = flatten_paths(collection.root)
    return [f for f in all_files if f["path"] not in known]


def archive_file(project: str, rel_path: str) -> str:
    import time
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


def _set_project_archived(name: str, archived: bool) -> None:
    pmd = get_project_md(name)
    if not pmd.exists():
        return
    meta, body = parse_frontmatter(pmd.read_text(encoding="utf-8"))
    tree_yaml_val = meta.get("tree_yaml")
    markdowns_dir_val = meta.get("markdowns_dir")
    pmd.write_text(
        format_project_md(
            body=body,
            tree_yaml=Path(str(tree_yaml_val)) if tree_yaml_val else get_project_meta_dir(name) / "tree.yaml",
            markdowns_dir=Path(str(markdowns_dir_val)) if markdowns_dir_val else Path.home(),
            template=Path(str(meta["template"])) if meta.get("template") else None,
            archived=archived,
        ),
        encoding="utf-8",
    )


def archive_project(name: str) -> None:
    _set_project_archived(name, True)


def restore_project(name: str) -> None:
    _set_project_archived(name, False)


def delete_project(name: str) -> None:
    meta_dir = get_project_meta_dir(name)
    if meta_dir.exists():
        shutil.rmtree(meta_dir)


def rename_project(old_name: str, new_name: str) -> None:
    meta_src = get_project_meta_dir(old_name)
    meta_dest = get_project_meta_dir(new_name)

    if meta_dest.exists():
        raise ValueError("Target project already exists")

    if meta_src.exists():
        meta_src.rename(meta_dest)

    pmd = meta_dest / ".pith-project"
    if pmd.exists():
        meta, body = parse_frontmatter(pmd.read_text(encoding="utf-8"))
        old_tree = str(meta_src / "tree.yaml")
        if str(meta.get("tree_yaml", "")) == old_tree:
            meta["tree_yaml"] = str(meta_dest / "tree.yaml")
        template_val = meta.get("template")
        pmd.write_text(
            format_project_md(
                body=body,
                tree_yaml=Path(str(meta["tree_yaml"])),
                markdowns_dir=Path(str(meta["markdowns_dir"])),
                template=Path(str(template_val)) if template_val else None,
                archived=bool(meta.get("archived", False)),
            ),
            encoding="utf-8",
        )


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
    parts = re.split(r'(^#{2,}\s+.+$)', template_body, flags=re.MULTILINE)
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

    if lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                body_start = i + 1
                break
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
