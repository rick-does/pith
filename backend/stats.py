from __future__ import annotations
import re
from pathlib import Path
import textstat
from .utils import parse_frontmatter


def compute_stats(file_path: Path) -> dict:
    raw = file_path.read_text(encoding="utf-8")
    _, body = parse_frontmatter(raw)
    plain = _strip_markdown(body)

    fre = textstat.flesch_reading_ease(plain)
    return {
        "word_count": textstat.lexicon_count(plain, removepunct=True),
        "sentence_count": textstat.sentence_count(plain),
        "paragraph_count": _count_paragraphs(plain),
        "avg_sentence_length": round(textstat.avg_sentence_length(plain), 1),
        "flesch_reading_ease": round(fre, 1),
        "flesch_reading_ease_label": _flesch_label(fre),
        "flesch_kincaid_grade": round(textstat.flesch_kincaid_grade(plain), 1),
        "gunning_fog": round(textstat.gunning_fog(plain), 1),
        "automated_readability_index": round(textstat.automated_readability_index(plain), 1),
        "coleman_liau_index": round(textstat.coleman_liau_index(plain), 1),
    }


def _count_paragraphs(text: str) -> int:
    return len([p for p in text.split("\n\n") if p.strip()])


def _strip_markdown(text: str) -> str:
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`[^`]+`", "", text)
    text = re.sub(r"^[|\s].*\|.*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^#{1,6}\s+.*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    text = re.sub(r"!\[[^\]]*\]\([^\)]+\)", "", text)
    text = re.sub(r"\*{1,3}([^\*]+)\*{1,3}", r"\1", text)
    text = re.sub(r"_{1,3}([^_]+)_{1,3}", r"\1", text)
    text = re.sub(r"^[-*_]{3,}\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^>\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\d+\.\s+", "", text, flags=re.MULTILINE)
    return text.strip()


def _flesch_label(score: float) -> str:
    if score >= 90: return "Very easy"
    if score >= 80: return "Easy"
    if score >= 70: return "Fairly easy"
    if score >= 60: return "Standard"
    if score >= 50: return "Fairly difficult"
    if score >= 30: return "Difficult"
    return "Very difficult"
