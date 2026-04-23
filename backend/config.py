from __future__ import annotations

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

CONFIG_DIR = Path.home() / ".pith"
CONFIG_FILE = CONFIG_DIR / "config.json"
DEFAULT_ROOT_PATH = str(Path.home() / "pith-projects")
LEGACY_DEFAULT_ROOT_PATH = str(Path.home() / ".pith" / "projects")


def _default_config() -> dict:
    return {
        "roots": [
            {
                "path": DEFAULT_ROOT_PATH,
                "name": "Default",
                "description": "",
                "last_project": None,
            }
        ],
        "active_root": DEFAULT_ROOT_PATH,
        "prefs": {
            "apply_fm": True,
            "remove_extra": True,
            "append_body": False,
            "show_indicators": True,
            "title_mode": True,
            "editor_theme": "one-dark",
            "show_new_project_file": True,
        },
    }


def _ensure_default_root(cfg: dict) -> None:
    paths = [r["path"] for r in cfg.get("roots", [])]
    if DEFAULT_ROOT_PATH not in paths:
        cfg.setdefault("roots", []).insert(0, {
            "path": DEFAULT_ROOT_PATH,
            "name": "Default",
            "description": "",
            "last_project": None,
        })


def _ensure_active_root_valid(cfg: dict) -> None:
    paths = [r["path"] for r in cfg.get("roots", [])]
    if cfg.get("active_root") not in paths:
        cfg["active_root"] = paths[0] if paths else DEFAULT_ROOT_PATH


def _migrate_meta_under_project_roots(cfg: dict) -> None:
    """Move legacy ~/.pith/<root-name>/ dirs into ~/.pith/project-roots/<root-name>/.

    Also rewrites absolute paths in each project's .pith-project frontmatter so
    tree_yaml: still points at the correct (moved) location. Idempotent.
    """
    import shutil as _shutil
    for root in cfg.get("roots", []):
        name = root.get("name")
        if not name:
            continue
        old_dir = CONFIG_DIR / name
        new_dir = PROJECT_ROOTS_DIR / name
        if not old_dir.is_dir() or new_dir.exists() or old_dir == new_dir:
            continue
        if old_dir.resolve() == PROJECT_ROOTS_DIR.resolve():
            continue
        PROJECT_ROOTS_DIR.mkdir(parents=True, exist_ok=True)
        _shutil.move(str(old_dir), str(new_dir))
        old_prefix = str(old_dir)
        new_prefix = str(new_dir)
        for proj_dir in new_dir.iterdir():
            if not proj_dir.is_dir():
                continue
            pmd = proj_dir / ".pith-project"
            if not pmd.exists():
                continue
            try:
                content = pmd.read_text(encoding="utf-8")
            except OSError:
                continue
            if old_prefix in content:
                pmd.write_text(content.replace(old_prefix, new_prefix), encoding="utf-8")


def _migrate_root_names_to_basenames(cfg: dict) -> bool:
    """Rewrite each root's `name` to match its path basename, renaming its metadata
    dir under ~/.pith/project-roots/ and fixing absolute paths in each project's
    .pith-project frontmatter. Skips collisions (logs warning). Returns True if
    any root was renamed.
    """
    import shutil as _shutil
    changed = False
    names_in_use = {r.get("name") for r in cfg.get("roots", []) if r.get("name")}
    for root in cfg.get("roots", []):
        old_name = root.get("name", "")
        path = root.get("path", "")
        if not path:
            continue
        new_name = Path(path).name
        if not new_name or new_name == old_name:
            continue
        if new_name in names_in_use:
            logger.warning(
                "Skipping rename of root '%s' to '%s': collision with existing root name",
                old_name, new_name,
            )
            continue
        old_dir = PROJECT_ROOTS_DIR / old_name if old_name else None
        new_dir = PROJECT_ROOTS_DIR / new_name
        if old_dir and old_dir.exists() and not new_dir.exists():
            _shutil.move(str(old_dir), str(new_dir))
            old_prefix = str(old_dir)
            new_prefix = str(new_dir)
            for proj_dir in new_dir.iterdir():
                if not proj_dir.is_dir():
                    continue
                pmd = proj_dir / ".pith-project"
                if not pmd.exists():
                    continue
                try:
                    content = pmd.read_text(encoding="utf-8")
                except OSError:
                    continue
                if old_prefix in content:
                    pmd.write_text(content.replace(old_prefix, new_prefix), encoding="utf-8")
        names_in_use.discard(old_name)
        names_in_use.add(new_name)
        root["name"] = new_name
        changed = True
    return changed


def _migrate_legacy_default(cfg: dict) -> bool:
    """Rewrite the Default root's path from ~/.pith/projects to ~/pith-projects.
    Also updates active_root if it pointed at the legacy path. Returns True if changed.
    """
    changed = False
    for r in cfg.get("roots", []):
        if r.get("name") == "Default" and r.get("path") == LEGACY_DEFAULT_ROOT_PATH:
            r["path"] = DEFAULT_ROOT_PATH
            changed = True
    if cfg.get("active_root") == LEGACY_DEFAULT_ROOT_PATH:
        cfg["active_root"] = DEFAULT_ROOT_PATH
        changed = True
    return changed


_config_cache: dict | None = None


def update_root_marker_archived(root_name: str, archived: bool) -> None:
    """Set the archived flag in a root's .pith-project-root marker file, creating it if needed."""
    marker = get_root_meta_dir(root_name) / ".pith-project-root"
    try:
        marker.parent.mkdir(parents=True, exist_ok=True)
        existing = marker.read_text(encoding="utf-8").splitlines() if marker.exists() else [f"name: {root_name}"]
        lines = [l for l in existing if not l.startswith("archived:")]
        lines.append(f"archived: {str(archived).lower()}")
        marker.write_text("\n".join(lines) + "\n", encoding="utf-8")
    except OSError:
        pass


def _recover_roots_from_metadata(cfg: dict) -> bool:
    """Add any roots found in project-roots/ metadata that are missing from cfg."""
    import frontmatter as fm
    if not PROJECT_ROOTS_DIR.exists():
        return False
    known_paths = {r["path"] for r in cfg.get("roots", [])}
    known_names = {r["name"] for r in cfg.get("roots", [])}
    added = False
    for root_dir in sorted(PROJECT_ROOTS_DIR.iterdir()):
        if not root_dir.is_dir():
            continue
        name = root_dir.name
        description = ""
        path = None
        archived = False
        marker = root_dir / ".pith-project-root"
        if marker.exists():
            try:
                for line in marker.read_text(encoding="utf-8").splitlines():
                    if line.startswith("path:"):
                        path = line[5:].strip()
                    elif line.startswith("description:"):
                        description = line[12:].strip()
                    elif line.startswith("archived:"):
                        archived = line[9:].strip().lower() == "true"
            except OSError:
                pass
        if not path:
            if name == Path(DEFAULT_ROOT_PATH).name:
                path = DEFAULT_ROOT_PATH
            else:
                for proj_dir in root_dir.iterdir():
                    if not proj_dir.is_dir():
                        continue
                    pmd = proj_dir / ".pith-project"
                    if not pmd.exists():
                        continue
                    try:
                        post = fm.loads(pmd.read_text(encoding="utf-8"))
                        md_dir = post.metadata.get("markdowns_dir", "")
                        if md_dir:
                            path = str(Path(md_dir).parent.parent)
                            break
                    except Exception:
                        pass
        if not path or path in known_paths or name in known_names:
            continue
        cfg.setdefault("roots", []).append({
            "path": path,
            "name": name,
            "description": description,
            "last_project": None,
            "archived": archived,
        })
        known_paths.add(path)
        known_names.add(name)
        added = True
    return added


def load_config() -> dict:
    global _config_cache
    if _config_cache is not None:
        return _config_cache
    if not CONFIG_FILE.exists():
        cfg = _default_config()
        save_config(cfg)
        return cfg
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            cfg = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("config load failed, resetting to defaults: %s", e)
        cfg = _default_config()
        save_config(cfg)
        return cfg
    migrated = _migrate_legacy_default(cfg)
    _ensure_default_root(cfg)
    if _recover_roots_from_metadata(cfg):
        migrated = True
    _ensure_active_root_valid(cfg)
    if "prefs" not in cfg:
        cfg["prefs"] = _default_config()["prefs"]
        migrated = True
    if migrated:
        save_config(cfg)
    _migrate_meta_under_project_roots(cfg)
    if _migrate_root_names_to_basenames(cfg):
        save_config(cfg)
    _config_cache = cfg
    return cfg


def save_config(cfg: dict) -> None:
    global _config_cache
    _config_cache = None
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)


def get_active_projects_dir() -> Path:
    cfg = load_config()
    return Path(cfg["active_root"])


def get_active_root_entry() -> dict:
    cfg = load_config()
    for r in cfg["roots"]:
        if r["path"] == cfg["active_root"]:
            return r
    return cfg["roots"][0] if cfg["roots"] else {"path": DEFAULT_ROOT_PATH, "name": "Default"}


def get_active_root_name() -> str:
    return get_active_root_entry()["name"]


PROJECT_ROOTS_DIR = CONFIG_DIR / "project-roots"
TEMPLATES_DIR = CONFIG_DIR / "templates"
DEFAULT_TEMPLATE_NAME = "default-template.md"


def get_default_template_path() -> Path:
    return TEMPLATES_DIR / DEFAULT_TEMPLATE_NAME


def get_root_meta_dir(root_name: str | None = None) -> Path:
    """Per-root metadata dir under ~/.pith/project-roots/<root-name>/."""
    if root_name is None:
        root_name = get_active_root_name()
    return PROJECT_ROOTS_DIR / root_name


def get_project_meta_dir(project: str, root_name: str | None = None) -> Path:
    """Per-project metadata dir under ~/.pith/project-roots/<root-name>/<project>/."""
    return get_root_meta_dir(root_name) / project
