from __future__ import annotations
import re
from pathlib import Path
from .utils import parse_frontmatter


def compute_structure(file_path: Path) -> dict:
    raw = file_path.read_text(encoding="utf-8")
    _, body = parse_frontmatter(raw)

    clean = re.sub(r"```[\s\S]*?```", "", body)
    headings = []
    for m in re.finditer(r"^(#{1,6})\s+(.+)$", clean, re.MULTILINE):
        headings.append({
            "level": len(m.group(1)),
            "title": m.group(2).strip(),
            "pos": m.start(),
        })

    sections = []
    for i, h in enumerate(headings):
        nl = clean.find("\n", h["pos"])
        body_start = nl + 1 if nl != -1 else len(clean)
        body_end = headings[i + 1]["pos"] if i + 1 < len(headings) else len(clean)
        section_text = clean[body_start:body_end]
        section_text = re.sub(r"^#{1,6}\s+.*$", "", section_text, flags=re.MULTILINE)
        word_count = len(section_text.split())
        sections.append({
            "level": h["level"],
            "title": h["title"],
            "word_count": word_count,
        })

    total_words = sum(s["word_count"] for s in sections)
    max_depth = max((s["level"] for s in sections), default=0)

    return {
        "sections": sections,
        "max_depth": max_depth,
        "total_words": total_words,
    }
