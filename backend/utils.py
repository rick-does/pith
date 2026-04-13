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
    return PROJECTS_DIR / project / "project.md"


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
        pmd = entry / "project.md"
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
