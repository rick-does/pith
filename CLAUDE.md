# CLAUDE.md — PiTH

**PiTH** is a full-featured markdown workspace. Visual hierarchy editor + prose analysis + live preview + full-text search. Fully local, no hosted backend.

See `ARCHITECTURE.md` for repo structure, stack, and the docs two-copy model. See `FEATURES.md` for implementation details of shipped features.

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
