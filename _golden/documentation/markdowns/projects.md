# Managing Projects

A project is a self-contained set of markdown files with its own hierarchy. You can have as many projects as you like and switch between them freely.

Projects live inside a **project root** — a directory on disk that holds one or more projects. By default PiTH uses `~/pith-projects/` in your home directory. You can add additional roots to keep separate groups of projects in different locations (for example, a personal writing folder or a separate repo).

## Project roots

A project root is a directory that PiTH treats exactly like the default `~/pith-projects/` folder — it can hold any number of projects. Switching roots changes which set of projects you see.

### Adding a root

1. Click **⋮** on the project chip
2. Click **Projects → Project roots → New root**
3. (Optional) Enter a description for this root
4. Choose **Use existing directory** or **Create new directory**
5. Browse to the location and click **Add Root**

The root's name is always the chosen directory's basename — it's not a user-editable field. The new root becomes active immediately. PiTH records the root's description (and other metadata) in `~/.pith/project-roots/<root-name>/.pith-project-root`. The project root directory itself only holds project content; per-project metadata (`tree.yaml`, `.pith-project`, etc.) lives alongside the marker at `~/.pith/project-roots/<root-name>/<project-name>/`.

### Switching roots

1. Click **⋮** on the project chip
2. Click **Projects → Project roots**
3. Click any root in the list

PiTH remembers the last project you had open in each root and returns to it when you switch back.

### Removing a root

Click the trash icon next to any non-default root in the **Project roots** list. This only removes it from the list — the directory and all its projects remain on disk. You can re-add it at any time.

You cannot remove the default root (`~/pith-projects/`) from the UI.

## The project chip

The orange chip at the top of the hierarchy pane is the project chip. It shows the current project name. Click the **⋮** icon on it to open the project menu.

## Creating a project

1. Click **⋮** on the project chip
2. Click **Projects → New project**
3. Enter a project title and directory name, then click **Create**

The directory name derives automatically from the title (lowercased, spaces become hyphens). You can edit it independently. The display title comes from the `# H1` heading in the project notes file.

## Creating a project from existing markdowns

If you already have a folder of `.md` files you want to work with:

1. Click **⋮** on the project chip
2. Click **Projects → New Project from Markdowns**
3. Enter a project title and directory name
4. Expand **Copy from Markdowns directory** and browse to the folder containing your files
5. Click **Create**

All `.md` files in the selected directory are copied into the new project's `markdowns/` folder. The originals are not modified. Files appear in the [Unlinked pane](unlinked-files.md) ready to be organized into the hierarchy.

## Adding files from another directory

To add individual markdown files to an existing project:

1. Click **⋮** on the project chip
2. Click **File → Add Files from Markdown**
3. Browse to the directory containing the files
4. Select or deselect files (all are selected by default)
5. Click **Add**

Files are copied into the project. If a file with the same name already exists, an index is appended (e.g. `notes-1.md`, `notes-2.md`).

## Switching projects

1. Click **⋮** on the project chip
2. Click **Projects**
3. Click any project in the list

## Renaming a project

Double-click the project chip to open the project notes editor. Double-click the directory name in the editor toolbar to rename it. The content directory and the metadata directory are both renamed, and the paths stored in `.pith-project` frontmatter are rewritten to match.

## Project notes

Each project has a notes file for a description or anything else you want to keep alongside the files. Open it with **⋮ → Project info**, or double-click the project chip.

## Archiving a project

Projects are never permanently deleted from the UI. Instead, archiving moves both the project's content folder (under the project root) and its metadata folder (under `~/.pith/project-roots/<root-name>/`) to their respective `_archive/` subdirectories. To archive:

1. Click **⋮** on the project chip
2. Click **Projects**
3. Click the trash icon next to the project you want to archive

To permanently delete a project, remove its folders from the two `_archive/` locations by hand.

## Viewing the hierarchy file

To see the raw `tree.yaml` for the current project, click **⋮ → View YAML**. This is a read-only view.

## Settings

Click **⋮ → Settings** on the project chip. Available options:

- **Labels** — toggle between showing file titles or filenames on chips. This preference persists across sessions.
- **Hide/Show status indicators** — toggles the status indicator on each chip (link validation, frontmatter compliance, and file template compliance). This preference persists across sessions.
