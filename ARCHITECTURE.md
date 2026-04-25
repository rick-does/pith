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
- **User data:** `~/.pith/` holds config (`config.json`), per-project metadata (`projects/<project>/`), templates (`templates/`), and the personal dictionary. Project content (markdowns, images, exported site configs) lives wherever the user chose when creating the project — there is no enforced root directory.
- **YAML handling:** `pyyaml` for PiTH-native tree.yaml; `ruamel.yaml` for round-tripping MkDocs and generic YAML formats with formatting/comment preservation.

No hosted backend. Runs entirely on the user's machine.

## Project Metadata Layout

- Per-project metadata: `~/.pith/projects/<project-name>/` containing `.pith-project` (YAML frontmatter with `tree_yaml`, `markdowns_dir`, `template:`, optional `archived: true` + markdown body), `tree.yaml` (when not using a custom yaml path), and `tree-backup.yaml` when flattening.
- Templates are shared across projects in `~/.pith/templates/`. Each project's `.pith-project` `template:` field points at the template file it uses. `default-template.md` is the shared default; multi-template management is future UI work.
- Project content (markdowns/, images/, exported mkdocs.yml, sidebars.js) lives at whatever path the user specified at project creation, resolved via the `markdowns_dir` frontmatter field. No enforced directory structure.
- `tree_yaml` in `.pith-project` can point to any file on disk — a PiTH-native `tree.yaml`, an existing `mkdocs.yml`, or any custom YAML. PiTH detects the format on every load and writes back in the same format.

## Config Schema

`~/.pith/config.json`:
```json
{
  "recent_projects": ["proj-a", "proj-b"],
  "prefs": { "apply_fm": true, "remove_extra": true, "append_body": false, "show_indicators": true, "title_mode": true, "editor_theme": "one-dark", "show_new_project_file": true }
}
```
`recent_projects` is a global recency list capped at 5. Updated via `PUT /api/config/last-project` which calls `push_recent_project()` in `config.py`.

## Asset Resolution

- `GOLDEN_DIR` (`backend/utils.py`) prefers source `_golden/` over staged `backend/golden/` so source-tree dev uses live assets. Wheel installs fall back to staged copies.
- `FRONTEND_DIST` (`backend/main.py`) prefers source `frontend/dist/` over staged `backend/ui/` for the same reason.

## Docs

- `_golden/documentation/` — source for the public GitHub Pages site only. Not seeded into any project at runtime. New projects get the `new-project-guide.md` stub instead (seeded from `_golden/new-project/`).

## Analysis

pith only, no pith-cli dependency. Uses `textstat` + `markdown`. No spaCy anywhere in pith.
