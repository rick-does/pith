# PiTH

[![CI](https://github.com/rick-does/pith/actions/workflows/ci.yml/badge.svg)](https://github.com/rick-does/pith/actions/workflows/ci.yml)
[![Build Standalone](https://github.com/rick-does/pith/actions/workflows/standalone.yml/badge.svg)](https://github.com/rick-does/pith/actions/workflows/standalone.yml)
[![Docs](https://github.com/rick-does/pith/actions/workflows/docs.yml/badge.svg)](https://github.com/rick-does/pith/actions/workflows/docs.yml)
[![Release](https://img.shields.io/github/v/release/rick-does/pith)](https://github.com/rick-does/pith/releases/latest)

A visual markdown workspace for people who work with large collections of `.md` files.

If you've ever maintained a documentation site and found yourself hand-editing a YAML nav file, a `sidebars.js`, or a custom sidebar config every time you added, renamed, or reorganized a page — this tool is for you.

**PiTH** gives you a visual, drag-and-drop interface for organizing markdown files into a hierarchy. The hierarchy is stored as a simple `tree.yaml` alongside your files, and can be exported directly to MkDocs or Docusaurus config format when you're ready to build your site.

## Features

### Organize

- **Visual hierarchy** — drag and drop files to reorder and nest them; keyboard shortcuts for fine-grained control
- **Unlinked file management** — files not in the hierarchy surface automatically; rubber-band, shift-click, and ctrl-click multi-select; multi-drag to hierarchy
- **Flatten / restore** — flatten the tree to start fresh; restore the saved hierarchy if you change your mind
- **Multiple projects** — switch between doc sets without losing your place

### Edit and analyze

- **Built-in editor with live preview** — split pane with syntax highlighting, rendered preview, and vi mode (`:w` / `:x`)
- **Readability stats** — word count, sentence length, and 5 readability scores per file
- **Scan Project** — project-wide analysis report with export to HTML/PDF
- **Frontmatter templates** — define expected keys per project, scan for compliance, batch-update files
- **Internal link validation** — project-wide broken link scan; per-file panel that re-checks on save
- **Full-text search** — search across all files with highlighted match context
- **Mermaid diagrams** — flowcharts, sequence diagrams, and more render live in the preview pane

### Import and export

- **Import markdowns from any directory** — create a new project from an existing folder of `.md` files, or add individual files to a project
- **MkDocs and Docusaurus** — import an existing nav config or export when ready to publish
- **HTML/PDF export** — whole-collection export to a single document with table of contents and print CSS

### Local and private

- Runs entirely on your machine — no cloud, no accounts, no ongoing cost
- Standalone executable for Windows, Mac, and Linux

## Download

Download the latest standalone app from the [Releases page](https://github.com/rick-does/pith/releases) — no Python or Node.js required.

| Platform | File |
|----------|------|
| Windows | `pith-Windows.zip` |
| Mac | `pith-macOS.zip` |
| Linux | `pith-Linux.zip` |

Unzip to get a `pith/` folder, then run the executable for your platform:

- **Windows:** Double-click `pith.exe`
- **Mac:** Double-click `pith` (right-click → Open the first time to bypass the unsigned app warning)
- **Linux:** Run `./pith` from a terminal — the server starts and prints a URL to open in your browser

Your projects are stored in a `projects/` folder created automatically inside the app directory.

## Documentation

Full documentation is available at **[rick-does.github.io/pith](https://rick-does.github.io/pith/)**.

## Run from source

Requires [Python 3.12+](https://www.python.org/downloads) and [Node.js LTS](https://nodejs.org).

**Windows:**
```bat
git clone git@github.com:rick-does/pith.git
cd pith
start.bat
```

**Mac / Linux / WSL:**
```bash
git clone git@github.com:rick-does/pith.git
cd pith
./start.sh
```

Then open `http://localhost:8002` in your browser.

## Tech stack

- **Backend:** Python, FastAPI
- **Frontend:** React, Vite, TypeScript
- **Editor:** CodeMirror 6 (vi mode via @replit/codemirror-vim)
- **Drag and drop:** dnd-kit
- **Readability:** textstat
- **Standalone:** PyInstaller, pywebview
