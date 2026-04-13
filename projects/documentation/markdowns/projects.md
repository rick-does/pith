---
Author: ''
Keywords: null
Required: false
Title: Managing projects
---

# Managing Projects

A project is a self-contained set of markdown files with its own hierarchy. You can have as many projects as you like and switch between them freely.

## The project chip

The orange chip at the top of the hierarchy pane is the project chip. It shows the current project name. Click the **⋮** icon on it to open the project menu.

## Creating a project

1. Click **⋮** on the project chip
2. Click **Projects**, then **＋ New project**
3. Type a name and press Enter

Project names use hyphens instead of spaces. The display title comes from the `# H1` heading in the project notes file.

## Switching projects

1. Click **⋮** on the project chip
2. Click **Projects**
3. Click any project in the list

## Renaming a project

Double-click the project chip label to rename it inline, or use **⋮ → Projects → rename** from the menu.

## Project notes

Each project has a notes file for a description or anything else you want to keep alongside the files. Open it with **⋮ → Info**.

## Archiving a project

Projects are never permanently deleted from the UI. Instead, archiving moves the entire project folder to `projects/_archive/`. To archive:

1. Click **⋮** on the project chip
2. Click **Projects**
3. Click the trash icon next to the project you want to archive

To permanently delete a project, remove its folder from `projects/_archive/` by hand.

## Viewing the hierarchy file

To see the raw `tree.yaml` for the current project, click **⋮ → View YAML**. This is a read-only view.

## Restoring documentation

The bundled Documentation project includes a golden copy of its original structure and content. If you rearrange or edit the documentation pages and want to reset them, click **⋮** on the project chip, then **Restore Docs**:

- **Structure only** — restores the hierarchy (`tree.yaml`) to its original order without changing any file content
- **Structure & content** — restores both the hierarchy and all markdown files to their original state

This option only appears when the Documentation project is selected. Other projects do not have a golden copy.

## Settings

Click **⋮ → Settings** on the project chip. Available options:

- **Labels** — toggle between showing file titles or filenames on chips. This preference persists across sessions.
- **Status indicators** — show or hide the link validation and frontmatter compliance dots on chips. This preference persists across sessions.
