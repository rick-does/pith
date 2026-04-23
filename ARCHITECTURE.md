# PiTH — Architecture

## Repo Structure

```
backend/          FastAPI app (main.py, models, utils, converters, launcher)
backend/ui/       Built frontend assets (gitignored; staged by build_pkg.py for PyPI wheel)
backend/golden/   Staged _golden/new-project stub for wheel (gitignored; build_pkg.py)
frontend/src/     React/TypeScript (App, Sidebar, SortableItem, ProjectChip, etc.)
frontend/dist/    Built frontend (gitignored, served by FastAPI in dev)
projects/         Repo placeholder only (.gitkeep); user projects live in ~/pith-projects/ by default
_golden/          Source assets: new-project/ (stub seeded into new projects) + documentation/ (GitHub Pages source)
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
- **User data:** `~/.pith/` holds config (`config.json`), per-root and per-project metadata (`project-roots/<root>/<project>/`), templates (`templates/`), and the personal dictionary. Project content (markdowns, images, exported site configs) lives in the root's content path — `~/pith-projects/` by default, or any user-added root.

No hosted backend. Runs entirely on the user's machine.

## Project Metadata Layout

- Per-root metadata: `~/.pith/project-roots/<root-name>/` where `<root-name>` is the path's basename. Contains `.pith-project-root` marker and one subdirectory per project.
- Per-project metadata: `~/.pith/project-roots/<root-name>/<project-name>/` containing `.pith-project` (YAML frontmatter with `tree_yaml`, `markdowns_dir`, `template:` + markdown body), `tree.yaml`, and `tree-backup.yaml` when flattening.
- Templates are shared across projects in `~/.pith/templates/`. Each project's `.pith-project` `template:` field points at the template file it uses. `default-template.md` is the shared default; multi-template management is future UI work.
- Project content (markdowns/, images/, exported mkdocs.yml, sidebars.js) stays at the root's content path, resolved via the `markdowns_dir` frontmatter field.

## Asset Resolution

- `GOLDEN_DIR` (`backend/utils.py`) prefers source `_golden/` over staged `backend/golden/` so source-tree dev uses live assets. Wheel installs fall back to staged copies.
- `FRONTEND_DIST` (`backend/main.py`) prefers source `frontend/dist/` over staged `backend/ui/` for the same reason.

## Docs

- `_golden/documentation/` — source for the public GitHub Pages site only. Not seeded into any project at runtime. New projects get the `new-project-guide.md` stub instead (seeded from `_golden/new-project/`).

## Analysis

pith only, no pith-cli dependency. Uses `textstat` + `markdown`. No spaCy anywhere in pith.
