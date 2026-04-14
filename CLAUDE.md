# CLAUDE.md — PiTH

**PiTH** is a full-featured markdown workspace. Visual hierarchy editor + prose analysis CLI + live preview + full-text search. Fully local, no hosted backend.

---

## What PiTH Is

PiTH combines two tools under one package:

- **GUI** — a visual drag-and-drop markdown hierarchy editor with live preview, full-text search, frontmatter display, internal link validation, and Mermaid diagram rendering.
- **CLI (`pth`)** — prose analysis CLI. Provided by the `pith-cli` package (rick-does/pith-cli), which PiTH depends on. Also installable standalone.

The GUI is the primary interface. The CLI is a companion tool available from the terminal.

---

## Repo Structure

This repo (`rick-does/pith`) is the PiTH GUI app.
The CLI lives in `rick-does/pith-cli` as a standalone installable dependency (not yet integrated).

```
backend/          FastAPI app (main.py, models, utils, converters, launcher)
frontend/src/     React/TypeScript (App, Sidebar, SortableItem, ProjectChip, etc.)
frontend/dist/    Built frontend (gitignored, served by FastAPI)
projects/         User project data (only documentation/ is tracked)
docs/             GitHub Pages source (index.md redirect + styles; CI copies markdowns in)
.github/workflows CI, standalone builds, docs deploy
pith.spec         PyInstaller config
mkdocs.yml        MkDocs Material config for GitHub Pages
```


---

## Architecture

- **Frontend:** React/TypeScript — visual hierarchy editor, live markdown preview
- **Backend:** FastAPI — file I/O, project management, analysis endpoints
- **Desktop:** pywebview — packages frontend + backend as a local desktop app
- **CLI:** pith-cli (`pth` command) — pulled in as a dependency
- **Distribution:** pip-installable + standalone executable (PyInstaller, Win/Mac/Linux)

No hosted backend. No Lightsail. No ongoing cost. Runs entirely on the user's machine.

---

## GUI Features

### Implemented
- Drag-and-drop markdown hierarchy editor with connector lines
- Live markdown preview with CodeMirror editor (vi mode, split/edit/preview)
- Project management (create, archive, rename, switch projects)
- Orphan/unlinked file management with rubber-band multi-select, 3 sort modes, multi-select drag/double-click
- Keyboard navigation (arrow keys + dpad for hierarchy; arrow keys for orphans)
- Alt+click file preview tooltips; tooltips show opposite of display (title vs path)
- Full-text search across all files (Ctrl+F or top bar button, debounced, highlighted matches)
- Frontmatter template management (per-project schema, infer from file via "Use as template", compliance scan with selective batch update, Jekyll-style support)
- Frontmatter panel in editor (collapsible, defaults closed, type-aware inputs)
- Preview pane strips frontmatter (both standard and Jekyll-style)
- Internal link validation (project-wide scan, per-file broken link panel in editor, re-validates on save)
- Status indicators on chips: stacked dots (green outline = OK, red filled = broken links, yellow filled = frontmatter mismatch)
- Unlinked chip eye icon: hover to reveal all orphan chip status/menus at once
- Settings flyout in project menu: Labels toggle, show/hide status indicators (persists in localStorage)
- Filesystem polling (3s interval, detects new/deleted files without browser refresh)
- Import/Export: MkDocs and Docusaurus sidebar formats
- View HTML/PDF: whole-collection export to single HTML with TOC and print CSS (browser: new tab; pywebview: overlay)
- Mermaid diagram rendering in preview pane (flowcharts, sequence diagrams, etc.)
- Copy to new sub-page: duplicates parent content as a child file with "-copy" title
- New files/sub-pages added at bottom of list (not top)
- Settings persist in localStorage: title/filename mode, status indicators on/off
- Standalone executable (PyInstaller, Win/Mac/Linux); pywebview-safe (no window.open)
- GitHub Actions CI (3 OS), standalone builds, MkDocs docs deploy
- Bundled documentation project (11 pages, golden copy with restore via project menu)
- Project menu: flyout submenus for Projects, Frontmatter, Restore Docs, Import, Export, Settings

### To build

**pith-cli integration (stats panel) — next up, fully planned:**
- Add `pith-cli` (rick-does/pith-cli) as a pip dependency in `pyproject.toml`
- New FastAPI endpoint that imports `pith.commands.stats` directly and returns data as JSON (no subprocess)
- New collapsible **Stats** panel in the editor pane, below the frontmatter panel, defaults closed
- Panel shows: word count, sentence count, paragraph count, avg sentence length, then a readability sub-section with: Flesch Reading Ease (with label e.g. "Standard"), Flesch-Kincaid Grade, Gunning Fog, Automated Readability Index, Coleman-Liau
- No reading time — dropped by design
- `pth check` not surfaced in GUI — requires spaCy + post-install model download (`python -m spacy download en_core_web_sm`), not bundleable as a normal pip dep or PyInstaller artifact
- Stats run on demand when panel is expanded, not on every file open

**External directory projects:**
- Open/manage markdown files in any directory on the filesystem, not just the embedded `projects/` folder
- Includes file browser for project selection
- Cross-platform (Win/Linux/Mac)

**Image management** — tied to external directory work; image directory convention, UI for browsing/inserting images

**Lower priority:**
- Templates for new files — pre-populate new files with a skeleton (frontmatter, title heading, section stubs); configurable per project

---

## CLI Features (pth)

Provided by `pith-cli`. Commands:

**Core:**
- `pth scan <file>` — 5-second triage: shape, size, obvious red flags
- `pth stats <file>` — pure numbers: word count, sentence length, readability scores
- `pth structure <file>` — skeleton: heading hierarchy, section sizes, nesting depth
- `pth check <file>` — quality pass: passive voice, long sentences, style violations
- `pth compare <f1> <f2>` — structural diff: what sections changed, not line-level
- `pth extract <file>` — data pull: headings, links, code blocks as JSON

**Additional:**
- `pth lint <file>` — fast CI-friendly pass, exit 1 if issues found
- `pth batch <dir>` — run analysis across a directory
- `pth summary <file>` — one-paragraph summary (Claude API, user provides key)
- `pth watch <file>` — live re-analysis as you edit
- `pth report <file>` — full HTML or JSON report
- `pth init` — create a `.pth` config file

---

## Naming

- **Product name:** PiTH
- **Repo:** rick-does/pith
- **GUI command:** `pith`
- **CLI command:** `pth` (from pith-cli dependency)
- **No references to prior project names** anywhere in this codebase.

---

## Rules

- Never add comments or docstrings to code that wasn't changed
- Never add features beyond what was asked
- Don't create new files to document changes — edit existing files or nothing
