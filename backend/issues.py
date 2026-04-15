from __future__ import annotations
import re
from pathlib import Path
from .utils import parse_frontmatter

LONG_SENTENCE_WORDS = 40
LONG_PARAGRAPH_WORDS = 150


def compute_issues(file_path: Path) -> dict:
    raw = file_path.read_text(encoding="utf-8")
    _, body = parse_frontmatter(raw)

    flags: list[dict] = []

    headings = _extract_headings(body)
    h1s = [h for h in headings if h["level"] == 1]

    if not headings:
        flags.append({"severity": "warn", "message": "No headings found"})
    else:
        if not h1s:
            flags.append({"severity": "warn", "message": "No H1 heading"})
        elif len(h1s) > 1:
            flags.append({"severity": "warn", "message": f"{len(h1s)} H1 headings (expected 1)"})
        for msg in _find_skipped_levels(headings):
            flags.append({"severity": "warn", "message": msg})

    empty_count = _count_empty_sections(body, headings)
    if empty_count:
        s = "s" if empty_count != 1 else ""
        flags.append({"severity": "info", "message": f"{empty_count} empty section{s}"})

    clean = _strip_for_analysis(body)

    long_sent_count = _count_long_sentences(clean)
    if long_sent_count:
        s = "s" if long_sent_count != 1 else ""
        flags.append({"severity": "info", "message": f"{long_sent_count} sentence{s} over {LONG_SENTENCE_WORDS} words"})

    long_para_count = _count_long_paragraphs(clean)
    if long_para_count:
        s = "s" if long_para_count != 1 else ""
        flags.append({"severity": "info", "message": f"{long_para_count} paragraph{s} over {LONG_PARAGRAPH_WORDS} words"})

    marker_count = _count_markers(body)
    if marker_count:
        s = "s" if marker_count != 1 else ""
        flags.append({"severity": "warn", "message": f"{marker_count} TODO/FIXME marker{s}"})

    return {
        "flags": flags,
        "shape": {
            "headings": len(headings),
            "empty_sections": empty_count,
            "long_sentences": long_sent_count,
            "long_paragraphs": long_para_count,
        },
    }


def _extract_headings(text: str) -> list[dict]:
    clean = re.sub(r"```[\s\S]*?```", "", text)
    headings = []
    for m in re.finditer(r"^(#{1,6})\s+(.+)$", clean, re.MULTILINE):
        headings.append({
            "level": len(m.group(1)),
            "text": m.group(2).strip(),
            "pos": m.start(),
        })
    return headings


def _find_skipped_levels(headings: list[dict]) -> list[str]:
    msgs = []
    for i in range(1, len(headings)):
        prev = headings[i - 1]["level"]
        curr = headings[i]["level"]
        if curr > prev + 1:
            label = headings[i]["text"][:40]
            msgs.append(f'Heading jumps H{prev} \u2192 H{curr} ("{label}")')
    return msgs


def _count_empty_sections(text: str, headings: list[dict]) -> int:
    if not headings:
        return 0
    clean = re.sub(r"```[\s\S]*?```", "", text)
    count = 0
    for i, h in enumerate(headings):
        nl = clean.find("\n", h["pos"])
        section_start = nl + 1 if nl != -1 else len(clean)
        section_end = len(clean)
        for j in range(i + 1, len(headings)):
            if headings[j]["level"] <= h["level"]:
                section_end = headings[j]["pos"]
                break
        section_body = clean[section_start:section_end]
        body_only = re.sub(r"^#{1,6}\s+.*$", "", section_body, flags=re.MULTILINE).strip()
        if not body_only:
            count += 1
    return count


def _strip_for_analysis(text: str) -> str:
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`[^`]+`", "", text)
    text = re.sub(r"^#{1,6}\s+.*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"!\[[^\]]*\]\([^\)]+\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    text = re.sub(r"\*{1,3}([^\*]+)\*{1,3}", r"\1", text)
    text = re.sub(r"_{1,3}([^_]+)_{1,3}", r"\1", text)
    text = re.sub(r"^[|\s].*\|.*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^>\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\d+\.\s+", "", text, flags=re.MULTILINE)
    return text.strip()


def _count_long_sentences(text: str) -> int:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return sum(1 for s in sentences if len(s.split()) > LONG_SENTENCE_WORDS)


def _count_long_paragraphs(text: str) -> int:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    return sum(1 for p in paragraphs if len(p.split()) > LONG_PARAGRAPH_WORDS)


def _count_markers(text: str) -> int:
    clean = re.sub(r"```[\s\S]*?```", "", text)
    clean = re.sub(r"`[^`]+`", "", clean)
    return len(re.findall(r"\b(?:TODO|FIXME|TBD|XXX)\b", clean))
