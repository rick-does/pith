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

### Implemented (v0.1.0)
- Drag-and-drop markdown hierarchy editor with connector lines
- Live markdown preview with CodeMirror editor (vi mode, split/edit/preview)
- Project management (create, archive, rename, switch projects)
- Orphan/unlinked file management with rubber-band multi-select, 3 sort modes
- Keyboard navigation (arrow keys + dpad for hierarchy; arrow keys for orphans)
- Alt+click file preview tooltips
- Import/Export: MkDocs and Docusaurus sidebar formats
- Standalone executable (PyInstaller, Win/Mac/Linux)
- GitHub Actions CI (3 OS), standalone builds, MkDocs docs deploy
- Bundled documentation project (golden copy for GitHub Pages)

### To build

**High value:**
- **Full-text search** — search across all files in the current project
- **Frontmatter display** — read YAML frontmatter, show tags/metadata in sidebar or panel
- **Internal link validation** — detect broken `[links](file.md)`, highlight after rename
- **Mermaid diagram rendering** — in the preview pane

**Medium value:**
- **Whole-collection export to single HTML/PDF** — render full doc set as one document
- **Word count / reading time** — per file, shown in sidebar chips

**Lower priority:**
- Dark mode
- Templates for new files
- Image management

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
