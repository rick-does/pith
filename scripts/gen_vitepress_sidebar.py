#!/usr/bin/env python3
"""Generate docs/.vitepress/sidebar.json from _golden/documentation/tree.yaml."""

import json
import yaml
from pathlib import Path

ROOT = Path(__file__).parent.parent
TREE_YAML = ROOT / "_golden" / "documentation" / "tree.yaml"
OUT = ROOT / "docs" / ".vitepress" / "sidebar.json"


def build_sidebar(nodes):
    items = []
    for node in sorted(nodes, key=lambda n: n["order"]):
        stem = Path(node["path"]).stem
        item = {"text": node["title"], "link": f"/{stem}"}
        children = node.get("children") or []
        if children:
            item["collapsed"] = True
            item["items"] = build_sidebar(children)
        items.append(item)
    return items


tree = yaml.safe_load(TREE_YAML.read_text(encoding="utf-8"))
sidebar = [{"items": build_sidebar(tree["root"])}]
OUT.write_text(json.dumps(sidebar, indent=2), encoding="utf-8")
print(f"Generated {len(sidebar)} top-level items -> {OUT}")
