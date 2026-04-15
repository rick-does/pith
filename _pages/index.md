---
title: PiTH
hide:
  - navigation
---

# PiTH

PiTH is a local tool for managing large collections of markdown files. It gives you a visual, drag-and-drop interface for organizing files into a hierarchy — so you never have to hand-edit a YAML nav file or sidebar config again.

## The problem

If you maintain a documentation site built with a static site generator — MkDocs, Docusaurus, Jekyll, or similar — you know the friction. Every time you add a page, rename a file, or reorganize a section, you have to open a config file and edit it by hand. With dozens of files this is tedious. With hundreds, it becomes a real source of errors.

## What PiTH does

PiTH keeps your markdown files in a project folder and maintains the hierarchy in a `tree.yaml` file alongside them. You interact with the hierarchy visually: drag files to [reorder and nest them](hierarchy.md), and promote [unlinked files](unlinked-files.md) into the tree. The YAML is always up to date; you never touch it directly.

PiTH also includes [full-text search](search.md) across all files in a project, and [frontmatter template management](frontmatter.md) — define the expected YAML frontmatter for your project, check which files are compliant, and batch-update files to match.

When you're ready to publish, PiTH can [export your hierarchy](import-export.md) directly to MkDocs or Docusaurus config format.

## How this documentation works

This documentation is itself a PiTH project — managed in PiTH and bundled with the app. If you're running PiTH locally, you can open the documentation project directly in the app to read or edit any page. See [Getting Started](getting-started.md) for installation instructions.
