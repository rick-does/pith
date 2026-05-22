# Introduction

PiTH is a visual editor for collections of Markdown files. You drag and drop files in a hierarchical tree, and PiTH saves the structure to a YAML file. PiTH also has a full-featured Markdown editor where you can create, edit, and preview Markdown files.

## The problem

If you maintain a documentation site built with a static site generator — MkDocs, Docusaurus, Jekyll, or similar — you know the problem. Every time you add a page, rename a file, or reorganize a section, you have to open a config file and edit it by hand. With dozens of files this is tedious. With hundreds, it becomes a source of insidious errors.

## What PiTH does

PiTH maintains a hierarchy for your markdown files and you interact with it visually: drag files to [reorder and nest them](hierarchy.md), and promote [unlinked files](unlinked-files.md) into the tree. The hierarchy lives in a YAML file — PiTH can create one, or you can point it at an existing file (`mkdocs.yml`, a custom nav config, anything) and PiTH reads and writes it in place without changing its format.

Opening a file launches a multi-tab editor with a live rendered preview, vi keybindings, and syntax highlighting. Mermaid diagram code blocks render as actual diagrams in the preview. Multiple files can be open simultaneously as tabs; they persist across sessions.

PiTH also includes:

- [Full-text search](search.md) across all files in a project
- [Internal link validation](link-validation.md) — scan for broken links project-wide or per file
- [Frontmatter template management](frontmatter.md) — define expected YAML keys, check compliance, and batch-update files
- [File structure templates](editing.md#template) — define required headings; new files are pre-populated automatically
- [Quick Open YAML](projects.md#quick-open-yaml) — point PiTH at any `mkdocs.yml`, custom nav config, or YAML with markdown paths and start working immediately

Projects point to files wherever they already live — PiTH stores only lightweight metadata in `~/.pith/projects/` and never moves your files unless you ask it to. See [Managing Projects](projects.md).

## How this documentation works

This documentation is published on [GitHub Pages](https://rick-does.github.io/pith/). When you create a new project in PiTH, you'll find a short **Getting Started** file that links back here. See [Getting Started](getting-started.md) for installation instructions.
