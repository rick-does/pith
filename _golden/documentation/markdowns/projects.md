# Managing Projects

A project is a named set of markdown files with its own hierarchy stored in a YAML file. You can have as many projects as you like and switch between them freely.

## How projects work

Each project stores a small amount of metadata in `~/.pith/projects/<project-name>/` — a pointer to where your markdowns live, a pointer to the hierarchy YAML, and a pointer to the project's template. Your actual markdown files stay wherever you put them; PiTH never moves or copies them unless you explicitly ask it to.

## The project chip

The orange chip at the top of the hierarchy pane shows the current project name. Click **⋮** on it to open the project menu.

## Creating a project

1. Click **⋮** on the project chip
2. Click **Projects → New project**
3. Enter a project title and a project metadata directory name (auto-derived from the title; you can edit it independently)
4. Optionally browse to a **markdowns directory** — the folder where your `.md` files live or will live. If  blank, PiTH creates a directory at `~/pith-projects/<project-name>/markdowns`.
5. Optionally browse to a **YAML file** — an existing `.yaml` or `.yml` file to use as the project's hierarchy. See [Using an existing YAML](#using-an-existing-yaml) below.
6. Click **Create**

PiTH creates the markdowns directory if it does not exist. If you selected a YAML file, PiTH uses it as the working hierarchy and reads whatever format it finds. If you did not select a YAML file, PiTH creates a new `tree.yaml` in `~/.pith/projects/<name>/`.

### Using an existing YAML

If you already have a YAML file that describes your file structure — a `mkdocs.yml`, a custom nav config, or any YAML with a list of `.md` paths — you can point PiTH directly at it when creating a project. PiTH reads the file, builds the hierarchy from it, and writes any changes back to the same file in the original format. Your file structure, formatting, and any extra fields per entry are preserved.

When you select a YAML file first, PiTH suggests `<yaml-dir>/markdowns/` as the markdowns directory — this is where new files are created. You can accept the suggestion or browse to any other location.

Supported formats: PiTH native (`root:` key), MkDocs (`nav:` key), and any generic YAML with a list of `.md` paths.

## Auto-discovery

PiTH automatically picks up any directory you place inside `~/pith-projects/` — no dialog required. PiTH scans that folder every few seconds and registers any new directory that contains at least one `.md` file.

In both cases, new files are always created in a `markdowns/` subdirectory inside the dropped directory — PiTH creates it if it does not exist.

- If the directory contains a YAML file, PiTH uses it as the hierarchy.
- If there is no YAML file, PiTH creates a `tree.yaml` in the directory and populates it with the `.md` files it finds.

The project appears in the Projects flyout automatically once discovered. It takes the directory name as its project name (e.g. a folder called `my-docs` becomes the project `my-docs`). You can rename it or change any of its paths via **Edit project paths**.

## Switching projects

The **Projects** flyout shows the five most recently opened projects. Click any of them to switch. To open a project not in the recent list, click **Open project…** to see the full list.

## Open Project

**Open project…** in the Projects flyout opens a dialog listing all registered projects. Type to filter by name. Click any row to open that project.

Archived projects are hidden by default. Click **Archived** at the bottom to expand the list; each archived project has a **Restore** button.

## Editing project paths

To change any of a project's core settings, click **⋮ → Projects → Edit project paths**. The dialog lets you update:

- **Project title** — the display name shown in the chip and project lists
- **Project metadata directory name** — the internal ID used for the metadata folder; renaming this renames `~/.pith/projects/<name>/`
- **Markdowns directory** — where new files live; if the new path does not exist and the old one does, PiTH moves the directory
- **YAML file** — the hierarchy file; if the new path does not exist and the old one does, PiTH moves the file

Click **Save** to apply. If the directory name changed, PiTH reloads to show the new name.

## Renaming a project

Double-click the project chip to open the project notes editor. Double-click the project name in the editor toolbar to rename it. The metadata directory is renamed to match; your markdown files are not moved.

## Project notes

Each project has a notes file for a description or anything else you want to keep alongside it. Open it with **⋮ → Projects → Project info**, or double-click the project chip.

## Removing a project from PiTH

Clicking the trash icon next to a project in the Projects flyout removes it from PiTH — the metadata folder at `~/.pith/projects/<project-name>/` is deleted and the project disappears from all lists. Your markdown files remain untouched.

**Note:** if the project's directory is inside `~/pith-projects/` and the files are still there, PiTH rediscovers it automatically and re-registers it within a few seconds. To remove a project permanently, delete or move the directory out of `~/pith-projects/` first, then remove it from PiTH — or archive it instead (see below).

If you want to keep a project registered but hidden from the flyout, use **Open project…** instead: the full project list has an archive/restore flow in the Archived section.

## Missing YAML file

If a project's hierarchy YAML file is deleted from disk while the project is still registered, PiTH shows a red **"YAML file not found"** message below the project chip. Hover over it for instructions. Use **Edit project paths** to point the project at a new or restored YAML file, or remove the project from the Projects flyout.

## Adding files from another directory

To add markdown files from outside the current project:

1. Click **⋮** on the project chip
2. Click **File → Add Existing File**
3. Browse to the directory containing the files (PiTH remembers where you last browsed)
4. Select or deselect files (all are selected by default)
5. Choose whether to reference the files in place or copy them (see below)
6. Click **Add**

**Reference in place (default):** Files appear in the Unlinked pane as external references. PiTH tracks the original file wherever it lives. The file chip text appears in italics to indicate it lives outside the project's markdowns directory. Archiving or removing the reference does not touch the file on disk.

**Copy to project:** Check **Copy to current project** to copy the files into the project's markdowns directory instead. If a file with the same name already exists, an index PiTH appends an index (e.g. `notes-1.md`, `notes-2.md`).

PiTH warns you and disables the Add button if you navigate into the project's own markdowns directory — files there are already tracked by the project automatically.

## Viewing the hierarchy file

To see the raw YAML for the current project's hierarchy, click **⋮ → YAML → View YAML**. This is a read-only view.

## Quick Open YAML

If you have a YAML file you want to open with PiTH right now — without going through the New Project dialog — use **⋮ → YAML → Quick open YAML…**. Browse to the `.yaml` or `.yml` file and click **Open**.

PiTH creates a project automatically with an auto-generated memorable name (e.g. `573-witty-finch`) and points its hierarchy at the file you selected. New files are always created in a `markdowns/` folder next to the YAML file — PiTH creates the folder if it does not exist. PiTH reads and writes the original YAML file in place without copying or moving it.

If a project already points at the same YAML file, PiTH reopens that project instead of creating a duplicate.

## Settings

Click **⋮ → Settings** on the project chip. Available options:

- **Labels** — toggle between showing file titles or filenames on chips. Persists across sessions.
- **Hide/Show status indicators** — toggles the status dot on each chip (link validation and template compliance). Persists across sessions.
- **Hide/Show new project file** — controls whether new projects are seeded with a Getting Started file.
