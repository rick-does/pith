# PiTH — Feature Reference

Implementation details for shipped and planned features. Not auto-loaded — read on demand.

---

## Shipped Features — Implementation Notes

- **Drag-and-drop hierarchy:** connector lines between nodes
- **Editor:** CodeMirror, vi mode, split/edit/preview panes; vi `:w` saves, `:x` saves and closes
- **Orphan/unlinked management:** rubber-band multi-select, shift-click range, 3 sort modes, multi-select drag/double-click; moves between hierarchy and unlinked are explicit two-file writes — drag tree→unlinked calls `saveCollection` + `saveUnlinked` (node appended); drag unlinked→tree calls `saveCollection` + `saveUnlinked` (node removed); `unlinked.yaml` stores `FileNode` objects (same schema as tree.yaml: `path`, `title`, `children: []`, `order: 0`); external absolute-path files survive round-trips through the tree; `GET /api/projects/{project}/orphans` only adds newly discovered md_dir files not yet in either list — never overwrites; `PUT /api/projects/{project}/unlinked` saves the list explicitly; old string-list format in `unlinked.yaml` is migrated on read
- **Keyboard nav:** arrow keys + dpad for hierarchy; arrow keys for orphans
- **Alt+click tooltips:** show opposite of current display mode (title vs path); tooltip uses `position:fixed` with coords from `getBoundingClientRect()` to escape sidebar overflow clipping
- **Full-text search:** Ctrl+F or top bar; debounced, highlighted matches
- **Unified templates:** templates live centrally in `~/.pith/templates/` (shared across projects); each project's `.pith-project` frontmatter `template:` field points at the template file it uses; `~/.pith/templates/default-template.md` is the shared default, seeded by `ensure_default_template()` from `DEFAULT_TEMPLATE` string on first startup; single file = FM schema + heading schema + new-file skeleton; default `---\nTitle: <add title>\n---\n\n# Title\n`; compliance returns missing_keys/extra_keys/missing_headings; Jekyll-style frontmatter supported; new files auto-populated from template; multiple named templates supported — all `.md` files in `~/.pith/templates/` are available
- **Template UI (FmBar):** "Apply template" button shows a dropdown listing all named templates (clicking off the dropdown dismisses it — no Escape, no ▾ icon); "Use as template" button shows an inline dropdown input to name the saved template; neither button resizes the bar; `GET /api/templates` returns the list; `POST /api/projects/{project}/use-as-template` accepts optional `name` param; `POST /api/projects/{project}/apply-template` accepts optional `template_name` param
- **Template apply options:** three checkboxes on both TemplateEditor and ComplianceReport — "Update frontmatter" (adds missing keys; sub-option "Remove extra keys"), "Append template body" (appends body minus h1 after `---\n\n*Template content begins here*` separator); defaults: FM on + remove-extra on + append off; prefs persisted to `~/.pith/config.json` via `GET/PUT /api/prefs`; backend stores/returns snake_case keys (`apply_fm`, `remove_extra`, `append_body`), frontend translates to camelCase on load and back on save; `apply_unified_template` skips file write if content unchanged
- **Template editor:** "Apply to open file" + "View compliance" button; HR separator between editor and controls
- **Compliance dialog:** always shows full dialog (checkboxes + buttons) even when all files conform; file list and issue categories filtered by active checkboxes — files with no visible issues hidden; "Select all" defaults on, resets on pref change; "View template" button; empty state says "All files conform to the selected checks"
- **Preview pane:** strips frontmatter (standard + Jekyll-style); rewrites `../images/` src paths for image display
- **Chip status indicators:** single icon — green circle (all OK), yellow ⚠ (template non-compliant: FM keys or headings), red ⚠ (broken links; red > yellow priority); click opens popup, click outside dismisses (document mousedown handler); popup uses `position:fixed` at z-index 1000; "Structure" row = heading compliance, "Frontmatter" row = FM key compliance
- **Unlinked chip:** eye icon hover reveals all orphan chip status/menus at once
- **Settings flyout:** Labels toggle, show/hide status indicators, show/hide new project file — persists to `prefs` sub-object of `~/.pith/config.json` via `GET/PUT /api/prefs` (keys: `title_mode`, `show_indicators`, `editor_theme`, `show_new_project_file`)
- **Filesystem polling:** 3s interval, detects new/deleted files without browser refresh
- **Import/Export:** MkDocs and Docusaurus sidebar formats (full package import/export — separate from the YAML-as-tree-yaml feature below)
- **YAML round-tripping:** when `tree_yaml` points to an existing file, PiTH reads and writes it in its original format; detection by top-level key: `root:` → PiTH native (pyyaml, unchanged), `nav:` → MkDocs (ruamel.yaml, preserves `site_name`/`theme`/etc.), anything else → generic (ruamel.yaml, preserves all non-path fields per entry); `FileNode.extra: dict` carries per-entry extra fields in memory (excluded from `model_dump()` so PiTH-native yaml stays clean); generic format: flat list of string paths or dicts with a detected path field — extra fields stored in `node.extra`, written back on save; new entries in generic format get blank values for all schema keys inferred from first existing entry; `_detect_yaml_format`, `_find_md_list`, `_generic_yaml_to_nodes`, `_rebuild_generic_list` in `backend/utils.py`; `_mkdocs_nav_to_nodes`/`_nodes_to_mkdocs_nav` reused from `backend/converters.py`
- **HTML/PDF export:** whole-collection export to single HTML with TOC and print CSS; browser: new tab; pywebview: overlay
- **Mermaid:** flowcharts, sequence diagrams, etc. in preview pane
- **Copy to sub-page:** duplicates parent content as child file with "-copy" title
- **New files/sub-pages:** added at bottom of list, not top
- **PyInstaller standalone:** Win/Mac/Linux; pywebview-safe (no `window.open`; overlays/downloads instead)
- **Docs:** `_golden/documentation/` is the source for the public GitHub Pages site only; not seeded into any project at runtime. New projects (and the stub project created when adding a new root) get a `new-project-guide.md` file seeded from `_golden/new-project/markdowns/new-project-guide.md` with `Title: Getting Started` frontmatter, linking to https://rick-does.github.io/pith/. Controlled by the `show_new_project_file` pref (Settings submenu toggle, default on); backend helper `seed_new_project_guide_if_enabled(md_dir, tree_file)` is called by both `create_project` and `add_root` stub creation.
- **Dev asset resolution:** `GOLDEN_DIR` (`backend/utils.py`) prefers source `_golden/` when present, falls back to staged `backend/golden/` (wheel install). `FRONTEND_DIST` (`backend/main.py`) prefers source `frontend/dist/` over staged `backend/ui/`. Lets source-tree dev use live-rebuilt assets while wheel users get bundled copies. `build_pkg.py` stages only `_golden/new-project/` into `backend/golden/` (`documentation/` is GH Pages only).
- **Project menu structure:** Projects (New project, Open project…, last-5-recents+archive) · File (New file, Add File from Markdown, Project info) · View YAML · Flatten/Restore hierarchy · Template (View template, Compliance) · Validate links · View HTML/PDF · Scan Project · Import from... · Export to... · Images (Browse/Insert, Add images, Open folder) · Settings
- **Stats panel:** word count, sentence count, paragraph count, avg sentence length, 5 readability scores (Flesch, FK Grade, Gunning Fog, ARI, Coleman-Liau); collapsible, on-demand
- **Scan Project:** stats+issues+structure on every file; HTML report in overlay with Save as HTML + Print/Save as PDF; endpoint `GET /api/projects/{project}/report/html` (`backend/report.py`); button is in the editor tab bar next to Structure (not far right)
- **New Project dialog:** fields: title, project name (slugified from title), project directory (optional — used to auto-suggest markdowns dir), markdowns directory (required — where new files are created), YAML file (optional — browse to any `.yaml`/`.yml` file); selecting a project directory auto-suggests `<project-dir>/markdowns` for the markdowns field in muted style; YAML browser shows `.yaml`/`.yml` files as clickable-to-select (dirs still navigable); backend receives `{markdowns_dir, tree_yaml}` on `POST /api/projects/{name}`; no copy flow — users point at existing dirs
- **File browsers (all dialogs):** single-click = highlight/select a directory; double-click = navigate into it; "New Folder" button: creates the folder, stays in parent listing, auto-highlights the new folder; "Select this directory" uses highlighted dir or current path
- **Add File from Markdown:** browse dir, select `.md` files; "Copy to current project" checkbox (default OFF) — when OFF, files are referenced in-place (absolute path added to `unlinked.yaml` via `POST /api/projects/{name}/external-files`); when ON, files are copied into `markdowns_dir` (`POST /api/projects/import-files`); duplicate filenames on copy get incrementing suffix with matching title update
- **Flatten/Restore hierarchy:** flatten moves all tree nodes to orphans (saves backup); restore brings back saved hierarchy; backup forgotten once user rebuilds tree
- **Launcher:** `_kill_existing(port)` frees port before uvicorn starts (Win + Unix)
- **Project management (no roots):** projects are a flat registry in `~/.pith/projects/<project-name>/`; no enforced content location — each project's `.pith-project` frontmatter (`markdowns_dir`, `tree_yaml`) points to wherever the user's files live; `recent_projects` in `config.json` is a global recency list (cap 5); active project NOT in localStorage — set via `PUT /api/config/last-project` which pushes to `recent_projects`; per-project tab state in localStorage keyed by `pith_tabs_<project-name>`
- **Archive:** sets `archived: true` in the project's `.pith-project` frontmatter — no files moved anywhere; archived projects hidden from the Projects flyout but accessible via Open Project dialog; `POST /api/projects/{name}/restore` clears the flag
- **Open Project dialog:** lists all projects (including archived); search/filter field; archived section collapsed by default with toggle; archived rows show Restore button; active rows switch project on click; fetches fresh list via `GET /api/projects` on open
- **Projects flyout:** shows last 5 from `recent_projects` (global, not per-root) with archive button on non-current entries; "New project" and "Open project…" items above the list; no Project Roots submenu
- **Help button:** opens GitHub Pages docs via `GET /api/open-url` → `webbrowser.open()` (pywebview-safe)
- **Image management:** `images/` dir sibling to `markdowns/`; endpoints: list/serve/upload/delete/open-folder; ImageBrowser: thumbnail grid, upload, delete-with-confirm, insert at cursor; insertion path is depth-aware: `'../'.repeat(depth + 1)`; forwardRef chain: App → MarkdownEditor → CodeEditor
- **Multi-tab editor:** vertical tab strip on left edge; first tab is orange, each new tab alternates from the last tab's color (not position); `colorIndex: 0|1` stored per tab in `EditorTab` and persisted to localStorage — closing a tab never recolors remaining tabs; right-click a tab opens context menu to toggle its color; orange = `#fff3e0`/`#ff8c00`, blue = `#e8f4fd`/`#1a6fa8`; context menu renders outside the overlay panel (which has `transform`) so `position:fixed` resolves against viewport; active tab: inset 5px box-shadow + 3px leftward growth; unsaved-changes circle at tab bottom (`translateX(-2px)` compensator for writing-mode offset — do not flip sign); close icon at tab top; `writing-mode: vertical-rl` + `rotate(180deg)` reads bottom-to-top; tabs persist to localStorage per-project (key: `pith_tabs_<project-name>`) with `tabsRestoredRef` guard; `«`/`»` toggle buttons; `no-cache` on `index.html` response so browser refresh picks up Vite rebuilds
- **Editor themes:** Themes button in sub-bar; dark: One Dark, Monokai, Andromeda, Gruvbox Dark, Xcode Dark; light: Xcode Light, Solarized Light; via `@uiw/codemirror-theme-*`; `@babel/runtime` required as peer dep; theme state in `MarkdownEditor`, menu state in `FmBar`
- **Spell check (lezer/nspell):** `spellcheck.ts` + `spellcheck.worker.ts`; Web Worker loads `nspell` + Hunspell en-US dictionaries from `frontend/public/dictionaries/`; `spellcheckExtension()` walks the lezer syntax tree via `syntaxTree()` to collect only prose text, skipping frontmatter, `FencedCode`, `InlineCode`, `CodeBlock`, `HTMLBlock`, `URL`, marks, and other non-prose nodes; emits `@codemirror/lint` Diagnostic hints with "Add to dictionary" action; 750ms debounce; personal word list persisted to `~/.pith/personal.dic` via `GET /POST /api/personal-dictionary`; markdown mode only

---

## Analysis Architecture

pith does NOT depend on pith-cli. Analysis uses `textstat` + `markdown` (both PyInstaller-friendly). No spaCy, no subprocess calls, no shared dep.

| Feature | Location | Status |
|---|---|---|
| Stats | Editor panel | Done |
| Issues | Editor panel | Done |
| Structure | Editor panel | Done |
| Scan Project | Project menu + editor tab bar | Done |
| Compare | Terminal only (pith-cli) | Dropped from GUI |

Not in the GUI (ever): `pth check` (spaCy, not bundleable), `pth extract`/`lint`/`summary`/`watch` (terminal only).

---

## CLI Features (pith-cli — separate repo)

`pth scan` · `pth stats` · `pth structure` · `pth check` · `pth compare` · `pth extract` · `pth lint` · `pth batch` · `pth summary` (Claude API) · `pth watch` · `pth report` · `pth init`
