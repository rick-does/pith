#!/usr/bin/env python3
"""Build PiTH documentation as a static site."""

import re
import shutil
from pathlib import Path

from ruamel.yaml import YAML
import markdown as md_lib
from pygments.formatters import HtmlFormatter

ROOT = Path(__file__).parent
DOCS_DIR = ROOT / "_golden" / "documentation"
MARKDOWNS_DIR = DOCS_DIR / "markdowns"
TREE_YAML = DOCS_DIR / "tree.yaml"
OUT_DIR = ROOT / "site"
SITE_NAME = "PiTH"


def load_tree():
    ryaml = YAML()
    data = ryaml.load(TREE_YAML.read_text(encoding="utf-8"))
    return data["root"]


def page_href(node_path):
    return Path(node_path).stem + ".html"


def render_nav(nodes, current_stem):
    items = []
    for node in nodes:
        stem = Path(node["path"]).stem
        children = node.get("children") or []
        attrs = ' class="active"' if stem == current_stem else ""
        link = f'<a href="{page_href(node["path"])}">{node["title"]}</a>'
        if children:
            items.append(f"<li{attrs}>{link}{render_nav(children, current_stem)}</li>")
        else:
            items.append(f"<li{attrs}>{link}</li>")
    return "<ul>\n" + "\n".join(items) + "\n</ul>"


def fix_md_links(html):
    return re.sub(
        r'href="([^"#][^"]*?)\.md(#[^"]*)?\"',
        lambda m: f'href="{m.group(1)}.html{m.group(2) or ""}"',
        html,
    )


PAGE_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} — {site_name}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Mono:wght@400;500&display=swap">
  <link rel="stylesheet" href="pagefind/pagefind-ui.css">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="page">
    <header class="topbar">
      <a href="index.html" class="topbar-title">{site_name} Docs</a>
      <div class="topbar-right">
        <button class="search-btn" id="search-btn" title="Search">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </button>
        <a href="https://github.com/rick-does/pith" class="github-link" title="GitHub" target="_blank" rel="noopener">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="22" height="22" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </a>
      </div>
    </header>
    <aside class="sidebar">
      <nav>{nav}</nav>
    </aside>
    <main class="content">
      <article>{body}</article>
    </main>
  </div>
  <div class="search-overlay" id="search-overlay">
    <div class="search-backdrop" id="search-backdrop"></div>
    <div class="search-panel">
      <div id="search"></div>
    </div>
  </div>
  <script src="pagefind/pagefind-ui.js"></script>
  <script>
    window.addEventListener('DOMContentLoaded', () => {{
      new PagefindUI({{ element: "#search", showSubResults: true }});
      const btn = document.getElementById('search-btn');
      const overlay = document.getElementById('search-overlay');
      const backdrop = document.getElementById('search-backdrop');
      btn.addEventListener('click', () => {{
        overlay.classList.toggle('open');
        if (overlay.classList.contains('open')) {{
          setTimeout(() => {{ const inp = overlay.querySelector('input'); if (inp) inp.focus(); }}, 50);
        }}
      }});
      backdrop.addEventListener('click', () => overlay.classList.remove('open'));
    }});
  </script>
</body>
</html>"""


LAYOUT_CSS = """\
*, *::before, *::after { box-sizing: border-box; }

html { font-size: 125%; }

body {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 0.8rem;
  color: #333;
  margin: 0;
  padding: 0;
  line-height: 1.6;
}

/* Page grid */
.page {
  display: grid;
  grid-template-rows: 50px 1fr;
  grid-template-columns: 242px 1fr;
  grid-template-areas: "header header" "sidebar content";
  height: 100vh;
}

/* Header */
.topbar {
  grid-area: header;
  background: #1a6fa8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
}

.topbar-title {
  color: #fff;
  text-decoration: none;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-btn {
  background: rgba(255,255,255,0.15);
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  padding: 4px 6px;
  display: flex;
  align-items: center;
}

.search-btn:hover { background: rgba(255,255,255,0.25); }

.github-link {
  color: rgba(255,255,255,0.75);
  display: flex;
  align-items: center;
  padding: 4px;
}

.github-link:hover { color: #fff; }

/* Search overlay */
.search-overlay {
  display: none;
  position: fixed;
  top: 50px;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
}

.search-overlay.open { display: block; }

.search-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.2);
}

.search-panel {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  max-width: calc(100vw - 2rem);
  background: #fff;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  padding: 0.75rem;
  max-height: 70vh;
  overflow-y: auto;
  z-index: 1;
}

#search { --pagefind-ui-primary: #1a6fa8; }

/* Sidebar */
.sidebar {
  grid-area: sidebar;
  background: #fafafa;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.sidebar nav ul { list-style: none; padding: 0; margin: 0; }
.sidebar nav ul ul { padding-left: 0.75rem; }
.sidebar nav li { margin: 0; }

.sidebar nav a {
  display: block;
  padding: 0.28rem 1rem;
  text-decoration: none;
  color: #555;
  font-size: 0.7rem;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar nav a:hover { color: #1a6fa8; background: rgba(26,111,168,0.06); }

.sidebar nav li.active > a {
  color: #1a6fa8;
  font-weight: 500;
  border-left: 3px solid #1a6fa8;
  padding-left: calc(1rem - 3px);
}

/* Content */
.content {
  grid-area: content;
  overflow-y: auto;
  padding: 1.5rem 2.5rem;
}

article { max-width: 760px; }

h1 { font-size: 2em; font-weight: 300; margin: 0 0 0.75rem; color: #1a1a1a; }
h2 { font-size: 1.5625em; font-weight: 400; margin: 1.5rem 0 0.4rem; color: #1a1a1a; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.25rem; }
h3 { font-size: 1.25em; font-weight: 400; margin: 1.1rem 0 0.3rem; color: #333; }
h4, h5, h6 { font-size: 1em; font-weight: 700; margin: 0.9rem 0 0.25rem; }

p { margin: 0.5rem 0; }

a { color: #1a6fa8; text-decoration: none; }
a:hover { text-decoration: underline; }

ul, ol { margin: 0.4rem 0; padding-left: 1.4rem; }
li { margin: 0.15rem 0; }

code {
  font-family: 'Roboto Mono', 'Consolas', monospace;
  font-size: 0.85em;
  background: #f0f4f8;
  padding: 0.12em 0.35em;
  border-radius: 3px;
  color: #c7254e;
}

pre {
  background: #f6f8fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0.9rem;
  overflow-x: auto;
  margin: 0.6rem 0;
}

pre code { background: none; padding: 0; color: inherit; }

table { border-collapse: collapse; width: 100%; margin: 0.6rem 0; }
th { background: #f0f4f8; font-weight: 500; text-align: left; padding: 0.4rem 0.65rem; border: 1px solid #ddd; }
td { padding: 0.35rem 0.65rem; border: 1px solid #ddd; }
tr:nth-child(even) td { background: #fafafa; }

blockquote {
  border-left: 3px solid #1a6fa8;
  margin: 0.6rem 0;
  padding: 0.4rem 0.9rem;
  color: #666;
  background: #f8fafd;
}

.codehilite { border-radius: 4px; overflow: auto; margin: 0.6rem 0; }
.codehilite pre { margin: 0; padding: 0.9rem; background: transparent; border: none; }

"""


def all_nodes(nodes):
    for node in nodes:
        yield node
        if node.get("children"):
            yield from all_nodes(node["children"])


def build():
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir()

    tree = load_tree()
    processor = md_lib.Markdown(
        extensions=["fenced_code", "tables", "codehilite", "toc"],
        extension_configs={"codehilite": {"guess_lang": False}},
    )

    count = 0
    for node in all_nodes(tree):
        stem = Path(node["path"]).stem
        md_file = MARKDOWNS_DIR / f"{stem}.md"
        if not md_file.exists():
            print(f"  WARNING: {md_file} not found, skipping")
            continue

        processor.reset()
        body = fix_md_links(processor.convert(md_file.read_text(encoding="utf-8")))
        nav = render_nav(tree, stem)

        html = PAGE_TEMPLATE.format(
            title=node["title"],
            site_name=SITE_NAME,
            nav=nav,
            body=body,
        )

        (OUT_DIR / f"{stem}.html").write_text(html, encoding="utf-8")
        print(f"  {stem}.html")
        count += 1

    pygments_css = HtmlFormatter(style="friendly").get_style_defs(".codehilite")
    (OUT_DIR / "style.css").write_text(LAYOUT_CSS + pygments_css, encoding="utf-8")

    print(f"\nBuilt {count} pages to {OUT_DIR}/")


if __name__ == "__main__":
    build()
