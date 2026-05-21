# Building Your Hierarchy

The hierarchy pane shows your files as a tree. Files can nest to any depth. PiTH saves the structure to the project's YAML file after every change.

## Adding a file

Click **⋮** on the project chip, then **File → New file**. The file is added to the project's markdowns directory and added to the bottom of the hierarchy tree. To create a new file in the [Unlinked pane](unlinked-files.md) instead, click **⋮** on the Unlinked chip. If the project has a file template, the file becomes an instance of the template — see [Template](editing.md#template).

To add a child to an existing file, click **⋮** on that file chip and choose **New sub-page**. The child is added as the last of that files children is also pre-populated from the file template if one exists.

To create a child that starts as a copy of the parent, choose **Copy to new sub-page**. The new file gets the parent's content with "-copy" appended to the title and filename.

## Reordering with drag and drop

Drag any file chip by its label to move it. While dragging:

- Hover over the **left half** of a chip to place the dragged file as a sibling (same level)
- Hover over the **right half** of a chip to nest it as the first child of that file

A spacer shows where the file would land for sibling placement. A ghost chip shows the nesting depth for child placement.

## Reordering with the keyboard

Select a file chip by clicking it. The d-pad arrow buttons appear in the left margin:

| Key | Action |
|-----|--------|
| ↑ ↓ | Move up or down within the current level, crossing into parent/child levels as needed |
| → | Nest under the file above (make it a child) |
| ← | Unnest (move up one level) |

## Renaming a file

Click **⋮** on a file chip and choose **Rename** to rename it inline. Spaces are replaced with hyphens automatically. The filename on disk changes to match. You can also rename from the [editor toolbar](editing.md) — double-click the filename there.

## Deleting a file

Click **⋮** on a file chip and choose **Delete**. The behavior depends on what kind of project you're in and where the file lives:

- **Standard project, file in the markdowns directory** — the file moves to `_archive/` inside the markdowns directory rather than being permanently deleted. To recover it, move it back by hand.
- **File added by reference from outside the markdowns directory** — PiTH removes only the reference; it does not touch the file itself.
- **Quick Open YAML project (or any project pointed at your own YAML file)** — PiTH only removes the reference from the YAML and unlinked list. It never moves the file. PiTH treats the YAML's directory as your space, not its own, so it doesn't create an `_archive/` folder there.

The app detects file changes automatically within a few seconds.

## Flatten and restore

To move all files out of the hierarchy and into the [Unlinked pane](unlinked-files.md), click **⋮** on the project chip and choose **Flatten hierarchy**. This saves a backup of the current tree so you can undo it.

After flattening, the menu item changes to **Restore hierarchy**. Click it to bring back the saved tree exactly as it was. PiTH automatically forgets the backup when you start building a new hierarchy by dragging files back in.

## Expanding and collapsing

Click the icon next to any file that has children to expand or collapse it. See [Keyboard Shortcuts](keyboard-shortcuts.md) for the full list of navigation keys.

## File chip labels and tooltips

The **Labels** setting (⋮ → Settings) controls whether chips show the file title or the filename. Whichever mode is active, hover over any chip to show the full file path. In filename mode, the tooltip also includes the title above the path.

Files that live outside the project have text in *italics* to indicate they are external — the file lives somewhere else; PiTH never moves or copies it without your instruction.

## Previewing a file

**Alt+click** any file chip to preview its contents without opening the editor. The tooltip shows the opposite of the current label mode — if chips show filenames, the tooltip shows the title, and vice versa.
