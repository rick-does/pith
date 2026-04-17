# CLAUDE.md — PiTH

**PiTH** is a full-featured markdown workspace. Visual hierarchy editor + prose analysis CLI + live preview + full-text search. Fully local, no hosted backend.

---

## Repo Structure

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
- **CLI:** pith-cli (`pth` command) — separate repo (rick-does/pith-cli), not a dependency of pith
- **Distribution:** pip-installable + standalone executable (PyInstaller, Win/Mac/Linux)

No hosted backend. Runs entirely on the user's machine.

---

## GUI Features (shipped)

Drag-and-drop hierarchy editor · live markdown preview · CodeMirror editor (vi mode, split/edit/preview) · project management · orphan file management · keyboard navigation · alt+click tooltips · full-text search · unified project template (`template.md`): "Use as template" copies editor content directly to `template.md`; apply has three independently toggleable options: update frontmatter (adds missing keys, optionally removes extras, never overwrites values), append template body minus h1 with separator; compliance scan flags missing/extra FM keys and missing headings, filtered by active options; apply prefs persisted to `~/.pith/config.json` · template compliance scan + batch apply · chip status indicators (green/yellow/red) · internal link validation · filesystem polling · import/export (MkDocs, Docusaurus) · HTML/PDF export · Mermaid rendering · multi-tab editor pane · editor color themes · stats/issues/structure panels · Scan Project report · image management · multiple project roots · spell check (lezer/nspell, personal dictionary) · vi `:w`/`:x` bindings · settings (localStorage) · pywebview-safe throughout · PyInstaller standalone builds · bundled documentation project

See `FEATURES.md` for implementation details on any of the above.

**Docs two-copy architecture:**
- `_golden/documentation/markdowns/` — source of truth; edit here and commit
- `projects/documentation/markdowns/` — runtime copy; disposable, never commit back
- Backend overwrites runtime copy from golden on first launch and Restore Docs (unconditional)

**Open items:**
- Cross-platform testing + pywebview testing in progress (next session).

**Analysis (pith only, no pith-cli dependency):** Uses `textstat` + `markdown`. No spaCy anywhere in pith.

---

## Naming

- **Product name:** PiTH
- **Repo:** rick-does/pith
- **GUI command:** `pith`
- **CLI command:** `pth` (from pith-cli, a separate repo)
- **No references to prior project names** anywhere in this codebase.

---

## Dev Workflow

Always run frontend with `--watch` (Vite) and backend with `--reload` (uvicorn). Never tell the user to restart the app to see changes — hot reload must be active.

---

## Rules

- Never add comments or docstrings to code that wasn't changed
- Never add features beyond what was asked
- Don't create new files to document changes — edit existing files or nothing
