from __future__ import annotations
from .utils import get_all_md_files, get_markdowns_dir, get_project_md
from .stats import compute_stats
from .issues import compute_issues
from .structure import compute_structure


def generate_report_html(project: str) -> str:
    md_dir = get_markdowns_dir(project)
    files = sorted(f["path"] for f in get_all_md_files(project))

    project_title = project
    pmd = get_project_md(project)
    if pmd.exists():
        import re
        m = re.search(r"^#\s+(.+)$", pmd.read_text(encoding="utf-8"), re.MULTILINE)
        if m:
            project_title = m.group(1).strip()

    sections: list[str] = []
    summary_rows: list[str] = []

    for rel in files:
        fp = md_dir / rel
        if not fp.exists():
            continue

        try:
            stats = compute_stats(fp)
        except (OSError, ValueError, AttributeError):
            stats = None
        try:
            issues = compute_issues(fp)
        except (OSError, ValueError, AttributeError):
            issues = None
        try:
            structure = compute_structure(fp)
        except (OSError, ValueError, AttributeError):
            structure = None

        file_id = rel.replace("/", "-").replace("\\", "-").replace(".", "-")

        warn_count = sum(1 for f in issues["flags"] if f["severity"] == "warn") if issues else 0
        info_count = sum(1 for f in issues["flags"] if f["severity"] == "info") if issues else 0
        word_count = stats["word_count"] if stats else "-"
        fre = f"{stats['flesch_reading_ease']} ({stats['flesch_reading_ease_label']})" if stats else "-"

        # Summary table row
        badge = ""
        if warn_count:
            badge += f'<span class="badge warn">{warn_count} warn</span> '
        if info_count:
            badge += f'<span class="badge info">{info_count} info</span>'
        if not badge:
            badge = '<span class="badge ok">OK</span>'
        summary_rows.append(
            f'<tr><td><a href="#{file_id}">{rel}</a></td>'
            f'<td class="num">{word_count}</td>'
            f'<td>{fre}</td>'
            f'<td>{badge}</td></tr>'
        )

        # Per-file section
        parts: list[str] = [f'<section id="{file_id}"><h2>{rel}</h2>']

        if stats:
            parts.append(
                f'<div class="stats-grid">'
                f'<div class="stat"><span class="label">Words</span><span class="val">{stats["word_count"]}</span></div>'
                f'<div class="stat"><span class="label">Sentences</span><span class="val">{stats["sentence_count"]}</span></div>'
                f'<div class="stat"><span class="label">Paragraphs</span><span class="val">{stats["paragraph_count"]}</span></div>'
                f'<div class="stat"><span class="label">Avg sent.</span><span class="val">{stats["avg_sentence_length"]}w</span></div>'
                f'<div class="stat"><span class="label">Flesch</span><span class="val">{stats["flesch_reading_ease"]} <small>({stats["flesch_reading_ease_label"]})</small></span></div>'
                f'<div class="stat"><span class="label">FK Grade</span><span class="val">{stats["flesch_kincaid_grade"]}</span></div>'
                f'<div class="stat"><span class="label">Gunning Fog</span><span class="val">{stats["gunning_fog"]}</span></div>'
                f'<div class="stat"><span class="label">ARI</span><span class="val">{stats["automated_readability_index"]}</span></div>'
                f'<div class="stat"><span class="label">Coleman-Liau</span><span class="val">{stats["coleman_liau_index"]}</span></div>'
                f'</div>'
            )

        if issues and issues["flags"]:
            flags_html = "".join(
                f'<li class="flag {f["severity"]}">{f["message"]}</li>'
                for f in issues["flags"]
            )
            parts.append(f'<ul class="flags">{flags_html}</ul>')
        elif issues:
            parts.append('<p class="no-issues">No issues found</p>')

        if structure and structure["sections"]:
            rows = "".join(
                f'<tr>'
                f'<td>{"#" * s["level"]}</td>'
                f'<td>{s["title"]}</td>'
                f'<td class="num">{s["word_count"] if s["word_count"] else "—"}</td>'
                f'</tr>'
                for s in structure["sections"]
            )
            parts.append(
                f'<table class="structure">'
                f'<thead><tr><th>Level</th><th>Heading</th><th>Words</th></tr></thead>'
                f'<tbody>{rows}</tbody>'
                f'</table>'
            )

        parts.append("</section>")
        sections.append("\n".join(parts))

    summary_html = (
        f'<table class="summary">'
        f'<thead><tr><th>File</th><th>Words</th><th>Readability</th><th>Issues</th></tr></thead>'
        f'<tbody>{"".join(summary_rows)}</tbody>'
        f'</table>'
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Report — {project_title}</title>
<style>
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; color: #1a1a1a; background: #f7f9fc; }}
.page {{ max-width: 960px; margin: 0 auto; padding: 32px 24px; }}
h1 {{ font-size: 24px; color: #1a3a5c; margin-bottom: 4px; }}
.subtitle {{ color: #888; font-size: 13px; margin-bottom: 32px; }}
h2 {{ font-size: 16px; font-weight: 600; color: #1a6fa8; margin: 0 0 12px; border-bottom: 1px solid #d0e8f7; padding-bottom: 6px; }}
h3 {{ font-size: 13px; font-weight: 600; color: #555; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: .04em; }}
section {{ background: #fff; border: 1px solid #d0e8f7; border-radius: 8px; padding: 20px; margin-bottom: 20px; }}
table {{ width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px; }}
th {{ text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #d0e8f7; padding: 6px 8px; }}
td {{ padding: 5px 8px; border-bottom: 1px solid #eef4fb; vertical-align: top; }}
td.num {{ text-align: right; font-variant-numeric: tabular-nums; color: #555; }}
table.summary {{ margin-bottom: 28px; }}
table.summary a {{ color: #1a6fa8; text-decoration: none; }}
table.summary a:hover {{ text-decoration: underline; }}
.stats-grid {{ display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }}
.stat {{ background: #f0f7ff; border-radius: 6px; padding: 8px 12px; min-width: 120px; }}
.stat .label {{ display: block; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 2px; }}
.stat .val {{ font-size: 15px; font-weight: 600; color: #1a3a5c; }}
.stat .val small {{ font-size: 11px; font-weight: 400; color: #888; }}
ul.flags {{ list-style: none; margin-bottom: 12px; }}
ul.flags li {{ padding: 4px 0 4px 20px; font-size: 13px; position: relative; }}
ul.flags li::before {{ position: absolute; left: 0; top: 4px; }}
li.warn::before {{ content: "⚠"; color: #c97b00; }}
li.info::before {{ content: "•"; color: #1a6fa8; font-weight: 700; }}
p.no-issues {{ color: #3a7d44; font-size: 13px; margin-bottom: 12px; }}
table.structure td:first-child {{ color: #888; font-family: monospace; font-size: 12px; width: 60px; }}
.badge {{ display: inline-block; border-radius: 4px; padding: 1px 6px; font-size: 11px; font-weight: 600; }}
.badge.ok {{ background: #e6f4ea; color: #3a7d44; }}
.badge.warn {{ background: #fff3cd; color: #856404; }}
.badge.info {{ background: #e8f4fd; color: #1a6fa8; }}
@media print {{ body {{ background: #fff; }} .page {{ padding: 0; }} }}
</style>
</head>
<body>
<div class="page">
<h1>{project_title}</h1>
<p class="subtitle">Analysis report &mdash; {len(files)} file{"s" if len(files) != 1 else ""}</p>
<h3>Summary</h3>
{summary_html}
{"".join(sections)}
</div>
</body>
</html>"""
