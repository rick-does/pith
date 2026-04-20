# PiTH — Architecture

## Repo Structure

```
backend/          FastAPI app (main.py, models, utils, converters, launcher)
backend/ui/       Built frontend assets (gitignored; staged by build_pkg.py for PyPI wheel)
backend/golden/   Bundled docs (gitignored; staged by build_pkg.py for PyPI wheel)
frontend/src/     React/TypeScript (App, Sidebar, SortableItem, ProjectChip, etc.)
frontend/dist/    Built frontend (gitignored, served by FastAPI in dev)
projects/         Repo placeholder only (.gitkeep); user projects live in ~/.pith/projects/
_golden/          Source of truth for bundled documentation project
docs/             GitHub Pages source (index.md redirect + styles; CI copies markdowns in)
.github/workflows CI, standalone builds, docs deploy, PyPI publish
build_pkg.py      Local wheel build script (npm build → stage assets → python -m build)
pith.spec         PyInstaller config
mkdocs.yml        MkDocs Material config for GitHub Pages
```

## Stack

- **Frontend:** React/TypeScript — visual hierarchy editor, live markdown preview
- **Backend:** FastAPI — file I/O, project management, analysis endpoints
- **Desktop:** pywebview — packages frontend + backend as a local desktop app
- **CLI:** pith-cli (`pth` command) — separate repo (rick-does/pith-cli), not a dependency of pith
- **Distribution:** PyPI (`pip install pith-md`) + standalone executable (PyInstaller, Win/Mac/Linux)
- **User data:** `~/.pith/` — config, projects, personal dictionary

No hosted backend. Runs entirely on the user's machine.

## Docs Two-Copy Architecture

- `_golden/documentation/markdowns/` — source of truth; edit here and commit
- `projects/documentation/markdowns/` — runtime copy; disposable, never commit back
- Backend overwrites runtime copy from golden on first launch and Restore Docs (unconditional)

## Analysis

pith only, no pith-cli dependency. Uses `textstat` + `markdown`. No spaCy anywhere in pith.
