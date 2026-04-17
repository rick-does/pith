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
- Orphan/unlinked file management with rubber-band multi-select, shift-click range select, 3 sort modes, multi-select drag/double-click
- Keyboard navigation (arrow keys + dpad for hierarchy; arrow keys for orphans)
- Alt+click file preview tooltips; tooltips show opposite of display (title vs path)
- Full-text search across all files (Ctrl+F or top bar button, debounced, highlighted matches)
- Unified project template (`template.md` per project): single file serves as frontmatter schema + required headings schema + new-file skeleton; default template is `---\nTitle: <add title>\n---\n\n# Title\n`; "Use as template" extracts frontmatter block + headings from current file; compliance scan returns missing_keys, extra_keys, missing_headings per file; applying adds missing FM keys and appends missing heading sections; new files auto-populated with title heading swapped in; Jekyll-style frontmatter supported
- Template action bar in editor: single "Template" tab with Apply template, Use as template, View template, View compliance
- Preview pane strips frontmatter (both standard and Jekyll-style)
- Internal link validation (project-wide scan, per-file broken link panel in editor, re-validates on save)
- Status indicators on chips: single icon — green circle (all OK), yellow ⚠ (template non-compliant: FM keys or headings), red ⚠ (broken links; red takes priority over yellow); hover indicator to show popup; popup uses position:fixed at z-index 1000 to escape overflow clipping
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
- Bundled documentation project (11 pages) — two-copy architecture:
  - `projects/documentation/markdowns/` — user-editable copy, shown in the app; gitignored, populated at runtime
  - `_golden/documentation/markdowns/` — source of truth for GitHub Pages and Restore Docs; tracked in git; the docs workflow only triggers on changes here
  - On first launch and on Restore Docs, the backend overwrites `projects/documentation/` from `_golden/documentation/` (unconditional — not "if missing")
  - **Rule:** edit docs directly in `_golden/documentation/markdowns/` and commit. The runtime copy in `projects/documentation/` is disposable and never copied back to `_golden/`.
- Project menu: Projects (New project, New Project from Markdowns, project list with archive), File (New file, Add File from Markdown, Project info), View YAML, Flatten/Restore hierarchy, Template (View template, Compliance), Validate links, View HTML/PDF, Scan Project, Restore Docs (documentation only), Import from..., Export to..., Images (Browse/Insert, Add images, Open folder), Settings
- Stats panel in editor (collapsible, on-demand): word count, sentence count, paragraph count, avg sentence length, 5 readability scores (Flesch, FK Grade, Gunning Fog, ARI, Coleman-Liau)
- Vi keybindings in editor: :w saves, :x saves and closes
- Scan Project: project-wide analysis report (stats + issues + structure on every file); accessible from Project menu and editor tab bar; renders in overlay with Save as HTML and Print/Save as PDF
- New Project from Markdowns: browse to any directory, copy all `.md` files into a new local project; dialog includes project title, directory name (auto-derived from title), and collapsible folder browser showing dirs + .md files; files land as orphans in the new project
- Add File from Markdown: browse to a directory, select one or more `.md` files (default: all selected), copy into the current project's markdowns dir; duplicate filenames get incrementing index suffix (e.g. `notes-1.md`, `notes-2.md`) with matching title update
- Flatten/Restore hierarchy: flatten moves all tree nodes to orphans (saves backup); restore brings back the saved hierarchy; backup is forgotten once user starts rebuilding the tree
- Launcher kills stale processes on startup: `_kill_existing(port)` frees the port before uvicorn starts (Win + Unix)
- Multiple project roots: `~/.pith/config.json` stores roots list + active root + last_project per root; default `projects/` root is permanent and cannot be removed; `.pith-project-root` file written to each root dir; active project migrated from localStorage to backend config
- Help button (?) in header: opens GitHub Pages docs in system browser (pywebview-safe via `GET /api/open-url` → `webbrowser.open()`)
- Image management: fixed `images/` dir as standard project artifact (sibling to `markdowns/`); backend endpoints for list/serve/upload/delete/open-folder; ImageBrowser dialog (thumbnail grid, upload, delete-with-confirm, insert at cursor); Images flyout in project menu (Browse/Insert, Add images, Open folder); Images button in editor sub-bar; preview pane rewrites `../images/` src paths; cursor-position insertion via forwardRef chain (App → MarkdownEditor → CodeEditor)
- Image insertion path is depth-aware: `'../'.repeat(depth + 1)` where depth = selectedPath.split('/').length - 1
- Multi-tab editor pane: opening files adds them as tabs (vertical tab strip on left edge of editor pane) with alternating blue (`#e8f4fd`/`#1a6fa8`) and orange (`#fff3e0`/`#ff8c00`) colors from selected file chip palette; active tab indicated by inset 5px box-shadow on left edge and 3px leftward growth (with matching paddingLeft to keep content centered); unsaved-changes circle indicator at tab bottom (opposite tab color); close icon at tab top (hidden when overlay closed); vertical text via `writing-mode: vertical-rl` + `rotate(180deg)` reads bottom-to-top; tabs persist to localStorage per-project (tabs list, active tab, overlayType) with `tabsRestoredRef` guard preventing save-before-restore; `«`/`»` toggle buttons at top edge with own `drop-shadow` (not merged with tab strip shadow); `no-cache` header on `index.html` response (backend/main.py) ensures browser refresh picks up Vite rebuilds without requiring app restart
- Editor color themes: **Themes** button in editor sub-bar (left of Images) opens a dropdown; theme applied immediately and persisted to localStorage (`editorTheme` key); dark themes: One Dark, Monokai, Andromeda, Gruvbox Dark, Xcode Dark; light themes: Xcode Light, Solarized Light; separator between groups; implemented via `@uiw/codemirror-theme-*` packages + `EDITOR_THEMES` export from `CodeEditor.tsx`; theme state lives in `MarkdownEditor`, menu state in `FmBar`; `@babel/runtime` required as peer dep of uiw packages
- Native browser spell check in markdown editor: `EditorView.contentAttributes.of({ spellcheck: "true" })` in `CodeEditor.tsx`, markdown mode only

### To build

**Analysis panel — architecture decision:**
pith and pith-cli are separate, independent projects. pith does NOT depend on pith-cli. Analysis functionality is embedded directly in pith's backend using `textstat` and `markdown-it-py` (both PyInstaller-friendly, no spaCy). pith-cli is a standalone CLI for power users; pith is a self-contained GUI executable for any user. No shared dep, no subprocess calls, no spaCy anywhere in pith.

**Analysis panel — command plan:**

| Feature | GUI home | Status |
|---|---|---|
| Stats | Editor panel | Done |
| Issues | Editor panel | Done |
| Structure | Editor panel | Done |
| Scan Project | Project menu + editor tab bar | Done |
| Compare | Terminal only | Dropped from GUI |

All per-file analysis panels (Stats, Issues, Structure) are live in the editor tab bar. Scan Project runs stats+issues+structure across all project files and renders a self-contained HTML report in an overlay (`backend/report.py`, endpoint `GET /api/projects/{project}/report/html`). Overlay has Save as HTML, Print/Save as PDF, and Close.

**What's not in the GUI (ever):**
- `pth check` — dropped; spaCy requires post-install model download, not bundleable, passive voice detection unreliable
- `pth extract`, `pth lint`, `pth summary`, `pth watch` — terminal only

**Lower priority / open:**
- Tab alignment refinements: small horizontal offset between the text glyph center and the circle/close-icon axis in vertical tabs (writing-mode: vertical-rl draws Latin glyphs with baseline near one side of the line-box; a `translateX(-2px)` compensator is in place but may need tuning per font/zoom)

**Spell check — current state and next step:**

Browser native spell check is live: `EditorView.contentAttributes.of({ spellcheck: "true" })` in `CodeEditor.tsx`, markdown mode only. Zero deps, one line. Downside: markdown-unaware — flags code spans, URLs, frontmatter, heading markers as misspellings.

The right long-term solution is a DIY lezer-tree spell checker:
- Walk the CodeMirror markdown syntax tree (`@lezer/markdown`) and collect only prose text nodes
- Skip: `FencedCode`, `InlineCode`, `CodeBlock`, `Link`, `URL`, `Image`, `HTMLBlock`, YAML frontmatter
- Split text ranges into words, check each against a dictionary (`nspell` + Hunspell `.dic`/`.aff` files, ~2MB for en-US)
- Load dictionary and run checks in a Web Worker (avoid blocking UI thread)
- Emit `@codemirror/lint` `Diagnostic` objects with correct `from`/`to` document positions
- Debounce re-checks; ideally only re-check changed syntax tree nodes

No maintained npm package exists for CM6 spell checking (as of 2026-04). All CM6 spell check packages are unmaintained or CM5-only. The CM6 maintainer's own recommendation (discuss.codemirror.net) is this exact DIY approach. Roughly 200–300 lines; non-trivial but well-understood.

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
