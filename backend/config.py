from __future__ import annotations

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

CONFIG_DIR = Path.home() / ".pith"
CONFIG_FILE = CONFIG_DIR / "config.json"
DEFAULT_ROOT_PATH = str(Path("projects").resolve())


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


def load_config() -> dict:
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
    _ensure_default_root(cfg)
    _ensure_active_root_valid(cfg)
    return cfg


def save_config(cfg: dict) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)


def get_active_projects_dir() -> Path:
    cfg = load_config()
    return Path(cfg["active_root"])
