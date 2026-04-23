# PiTH — Feature Reference

Implementation details for shipped and planned features. Not auto-loaded — read on demand.

---

## Shipped Features — Implementation Notes

- **Drag-and-drop hierarchy:** connector lines between nodes
- **Editor:** CodeMirror, vi mode, split/edit/preview panes; vi `:w` saves, `:x` saves and closes
- **Orphan management:** rubber-band multi-select, shift-click range, 3 sort modes, multi-select drag/double-click
- **Keyboard nav:** arrow keys + dpad for hierarchy; arrow keys for orphans
- **Alt+click tooltips:** show opposite of current display mode (title vs path); tooltip uses `position:fixed` with coords from `getBoundingClientRect()` to escape sidebar overflow clipping
- **Full-text search:** Ctrl+F or top bar; debounced, highlighted matches
- **Unified templates:** templates live centrally in `~/.pith/templates/` (shared across projects); each project's `.pith-project` frontmatter `template:` field points at the template file it uses; `~/.pith/templates/default-template.md` is the shared default, seeded by `ensure_default_template()` from `DEFAULT_TEMPLATE` string on first startup; single file = FM schema + heading schema + new-file skeleton; default `---\nTitle: <add title>\n---\n\n# Title\n`; "Use as template" saves editor content to the project's current template; compliance returns missing_keys/extra_keys/missing_headings; Jekyll-style frontmatter supported; new files auto-populated from template; multi-template management is future UI work
- **Template apply options:** three checkboxes on both TemplateEditor and ComplianceReport — "Update frontmatter" (adds missing keys; sub-option "Remove extra keys"), "Append template body" (appends body minus h1 after `---\n\n*Template content begins here*` separator); defaults: FM on + remove-extra on + append off; prefs persisted to `~/.pith/config.json` via `GET/PUT /api/prefs`; backend stores/returns snake_case keys (`apply_fm`, `remove_extra`, `append_body`), frontend translates to camelCase on load and back on save; `apply_unified_template` skips file write if content unchanged
- **Template editor:** "Apply to open file" + "View compliance" button; HR separator between editor and controls
- **Compliance dialog:** always shows full dialog (checkboxes + buttons) even when all files conform; file list and issue categories filtered by active checkboxes — files with no visible issues hidden; "Select all" defaults on, resets on pref change; "View template" button; empty state says "All files conform to the selected checks"
- **Preview pane:** strips frontmatter (standard + Jekyll-style); rewrites `../images/` src paths for image display
- **Chip status indicators:** single icon — green circle (all OK), yellow ⚠ (template non-compliant: FM keys or headings), red ⚠ (broken links; red > yellow priority); click opens popup, click outside dismisses (document mousedown handler); popup uses `position:fixed` at z-index 1000; "Structure" row = heading compliance, "Frontmatter" row = FM key compliance
- **Unlinked chip:** eye icon hover reveals all orphan chip status/menus at once
- **Settings flyout:** Labels toggle, show/hide status indicators, show/hide new project file — persists to `prefs` sub-object of `~/.pith/config.json` via `GET/PUT /api/prefs` (keys: `title_mode`, `show_indicators`, `editor_theme`, `show_new_project_file`)
- **Filesystem polling:** 3s interval, detects new/deleted files without browser refresh
- **Import/Export:** MkDocs and Docusaurus sidebar formats
- **HTML/PDF export:** whole-collection export to single HTML with TOC and print CSS; browser: new tab; pywebview: overlay
- **Mermaid:** flowcharts, sequence diagrams, etc. in preview pane
- **Copy to sub-page:** duplicates parent content as child file with "-copy" title
- **New files/sub-pages:** added at bottom of list, not top
- **PyInstaller standalone:** Win/Mac/Linux; pywebview-safe (no `window.open`; overlays/downloads instead)
- **Docs:** `_golden/documentation/` is the source for the public GitHub Pages site only; not seeded into any project at runtime. New projects (and the stub project created when adding a new root) get a `new-project-guide.md` file seeded from `_golden/new-project/markdowns/new-project-guide.md` with `Title: Getting Started` frontmatter, linking to https://rick-does.github.io/pith/. Controlled by the `show_new_project_file` pref (Settings submenu toggle, default on); backend helper `seed_new_project_guide_if_enabled(md_dir, tree_file)` is called by both `create_project` and `add_root` stub creation.
- **Dev asset resolution:** `GOLDEN_DIR` (`backend/utils.py`) prefers source `_golden/` when present, falls back to staged `backend/golden/` (wheel install). `FRONTEND_DIST` (`backend/main.py`) prefers source `frontend/dist/` over staged `backend/ui/`. Lets source-tree dev use live-rebuilt assets while wheel users get bundled copies. `build_pkg.py` stages only `_golden/new-project/` into `backend/golden/` (`documentation/` is GH Pages only).
- **Project menu structure:** Projects (New project, New Project from Markdowns, list+archive) · File (New file, Add File from Markdown, Project info) · View YAML · Flatten/Restore hierarchy · Template (View template, Compliance) · Validate links · View HTML/PDF · Scan Project · Import from... · Export to... · Images (Browse/Insert, Add images, Open folder) · Settings
- **Stats panel:** word count, sentence count, paragraph count, avg sentence length, 5 readability scores (Flesch, FK Grade, Gunning Fog, ARI, Coleman-Liau); collapsible, on-demand
- **Scan Project:** stats+issues+structure on every file; HTML report in overlay with Save as HTML + Print/Save as PDF; endpoint `GET /api/projects/{project}/report/html` (`backend/report.py`); button is in the editor tab bar next to Structure (not far right)
- **New Project from Markdowns:** browse to dir, copy all `.md` files; dialog: title, dir name (auto-derived), collapsible folder browser; files land as orphans
- **Add File from Markdown:** browse dir, select `.md` files (default all), copy to project; duplicate filenames get incrementing suffix (`notes-1.md`, etc.) with matching title update
- **Flatten/Restore hierarchy:** flatten moves all tree nodes to orphans (saves backup); restore brings back saved hierarchy; backup forgotten once user rebuilds tree
- **Launcher:** `_kill_existing(port)` frees port before uvicorn starts (Win + Unix)
- **Multiple project roots:** `~/.pith/config.json` stores roots list + active root + last_project per root; default root is `~/pith-projects/` and can't be removed (backend guards + UI hides trashcan when `is_default=true` on `/api/roots` response); root names always match path basenames (no user-editable title field); per-root metadata (including `.pith-project-root` marker) lives under `~/.pith/project-roots/<root-name>/`; per-project metadata at `~/.pith/project-roots/<root-name>/<project-name>/` holds `.pith-project` (YAML frontmatter with `tree_yaml`, `markdowns_dir`, `template:` + body), `tree.yaml`, and `tree-backup.yaml` when flattened; root content dirs hold only project content (markdowns/, images/, mkdocs.yml, sidebars.js); active project lives in backend config (not localStorage); per-project tab state in localStorage keyed by `<root-path>:<project-name>` to avoid collisions across roots
- **Help button:** opens GitHub Pages docs via `GET /api/open-url` → `webbrowser.open()` (pywebview-safe)
- **Image management:** `images/` dir sibling to `markdowns/`; endpoints: list/serve/upload/delete/open-folder; ImageBrowser: thumbnail grid, upload, delete-with-confirm, insert at cursor; insertion path is depth-aware: `'../'.repeat(depth + 1)`; forwardRef chain: App → MarkdownEditor → CodeEditor
- **Multi-tab editor:** vertical tab strip on left edge; first tab is orange, each new tab alternates from the last tab's color (not position); `colorIndex: 0|1` stored per tab in `EditorTab` and persisted to localStorage — closing a tab never recolors remaining tabs; right-click a tab opens context menu to toggle its color; orange = `#fff3e0`/`#ff8c00`, blue = `#e8f4fd`/`#1a6fa8`; context menu renders outside the overlay panel (which has `transform`) so `position:fixed` resolves against viewport; active tab: inset 5px box-shadow + 3px leftward growth; unsaved-changes circle at tab bottom (`translateX(-2px)` compensator for writing-mode offset — do not flip sign); close icon at tab top; `writing-mode: vertical-rl` + `rotate(180deg)` reads bottom-to-top; tabs persist to localStorage per-project with `tabsRestoredRef` guard; `«`/`»` toggle buttons; `no-cache` on `index.html` response so browser refresh picks up Vite rebuilds
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
