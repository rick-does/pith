from __future__ import annotations

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

CONFIG_DIR = Path.home() / ".pith"
CONFIG_FILE = CONFIG_DIR / "config.json"
PROJECTS_META_DIR = CONFIG_DIR / "projects"
TEMPLATES_DIR = CONFIG_DIR / "templates"
DEFAULT_TEMPLATE_NAME = "default-template.md"

_PREFS_DEFAULTS: dict = {
    "apply_fm": True,
    "remove_extra": True,
    "append_body": False,
    "show_indicators": True,
    "title_mode": True,
    "editor_theme": "one-dark",
    "show_new_project_file": True,
}


def _default_config() -> dict:
    return {
        "recent_projects": [],
        "prefs": dict(_PREFS_DEFAULTS),
    }


_config_cache: dict | None = None


def load_config() -> dict:
    global _config_cache
    if _config_cache is not None:
        return _config_cache
    if not CONFIG_FILE.exists():
        cfg = _default_config()
        save_config(cfg)
        _config_cache = cfg
        return cfg
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            cfg = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("config load failed, resetting to defaults: %s", e)
        cfg = _default_config()
        save_config(cfg)
        _config_cache = cfg
        return cfg
    changed = False
    if "prefs" not in cfg:
        cfg["prefs"] = dict(_PREFS_DEFAULTS)
        changed = True
    if "recent_projects" not in cfg:
        cfg["recent_projects"] = []
        changed = True
    if changed:
        save_config(cfg)
    _config_cache = cfg
    return cfg


def save_config(cfg: dict) -> None:
    global _config_cache
    _config_cache = None
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)


def push_recent_project(name: str) -> None:
    """Add project to front of recent_projects, capped at 5. Removes duplicates."""
    cfg = load_config()
    recents: list = cfg.get("recent_projects", [])
    recents = [p for p in recents if p != name]
    recents.insert(0, name)
    cfg["recent_projects"] = recents[:5]
    save_config(cfg)


def get_default_template_path() -> Path:
    return TEMPLATES_DIR / DEFAULT_TEMPLATE_NAME


def get_project_meta_dir(project: str) -> Path:
    """Per-project metadata dir: ~/.pith/projects/<project>/"""
    return PROJECTS_META_DIR / project
