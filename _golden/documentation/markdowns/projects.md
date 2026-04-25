# Managing Projects

A project is a named set of markdown files with its own hierarchy. You can have as many projects as you like and switch between them freely.

## How projects work

Each project stores a small amount of metadata in `~/.pith/projects/<project-name>/` — a pointer to where your markdowns live, a pointer to the hierarchy YAML, and a pointer to the project's template. Your actual markdown files stay wherever you put them; PiTH never moves or copies them unless you explicitly ask it to.

## The project chip

The orange chip at the top of the hierarchy pane shows the current project name. Click **⋮** on it to open the project menu.

## Creating a project

1. Click **⋮** on the project chip
2. Click **Projects → New project**
3. Enter a project title and a project name (auto-derived from the title; you can edit it independently)
4. Browse to the **markdowns directory** — the folder where your `.md` files live or will live. This is required.
5. Optionally browse to a **YAML file** — an existing `.yaml` or `.yml` file to use as the project's hierarchy. See [Using an existing YAML](#using-an-existing-yaml) below.
6. Click **Create**

PiTH creates the markdowns directory if it does not exist. If you selected a YAML file, PiTH uses it as the working hierarchy and reads whatever format it finds. If you did not select a YAML file, PiTH creates a new `tree.yaml` in `~/.pith/projects/<name>/`.

### Using an existing YAML

If you already have a YAML file that describes your file structure — a `mkdocs.yml`, a custom nav config, or any YAML with a list of `.md` paths — you can point PiTH directly at it when creating a project. PiTH reads the file, builds the hierarchy from it, and writes any changes back to the same file in the original format. Your file structure, formatting, and any extra fields per entry are preserved.

When you select a YAML file first, PiTH suggests `<yaml-dir>/markdowns/` as the markdowns directory. You can accept the suggestion or browse to any other location.

Supported formats: PiTH native (`root:` key), MkDocs (`nav:` key), and any generic YAML with a list of `.md` paths.

## Switching projects

The **Projects** flyout shows the five most recently opened projects. Click any of them to switch. To open a project not in the recent list, click **Open project…** to see the full list.

## Open Project

**Open project…** in the Projects flyout opens a dialog listing all registered projects. Type to filter by name. Click any row to open that project.

Archived projects are hidden by default. Click **Archived** at the bottom to expand the list; each archived project has a **Restore** button.

## Renaming a project

Double-click the project chip to open the project notes editor. Double-click the project name in the editor toolbar to rename it. The metadata directory is renamed to match; your markdown files are not moved.

## Project notes

Each project has a notes file for a description or anything else you want to keep alongside it. Open it with **⋮ → Project info**, or double-click the project chip.

## Archiving a project

Archiving hides a project from the Projects flyout and the recents list. Your markdown files are not touched. To archive:

1. Click **⋮** on the project chip
2. Click **Projects**
3. Click the trash icon next to the project you want to archive

To restore an archived project, open **Open project…** and expand the **Archived** section. Click **Restore** next to the project.

To permanently remove a project from PiTH, delete its metadata folder at `~/.pith/projects/<project-name>/` by hand. This does not delete your markdown files.

## Adding files from another directory

To copy individual markdown files from another location into the current project:

1. Click **⋮** on the project chip
2. Click **File → Add Files from Markdown**
3. Browse to the directory containing the files
4. Select or deselect files (all are selected by default)
5. Click **Add**

Files are copied into the project's markdowns directory. If a file with the same name already exists, an index is appended (e.g. `notes-1.md`, `notes-2.md`).

## Viewing the hierarchy file

To see the raw YAML for the current project's hierarchy, click **⋮ → View YAML**. This is a read-only view.

## Settings

Click **⋮ → Settings** on the project chip. Available options:

- **Labels** — toggle between showing file titles or filenames on chips. Persists across sessions.
- **Hide/Show status indicators** — toggles the status dot on each chip (link validation and template compliance). Persists across sessions.
- **Hide/Show new project file** — controls whether new projects are seeded with a Getting Started file.
