# Building Your Hierarchy

The hierarchy pane shows your files as a tree. Files can be nested to any depth. The structure is saved to `tree.yaml` automatically after every change.

## Adding a file

Click **⋮** on the project chip, then **File → New file**. The file is created in the project's markdowns directory and added to the bottom of the hierarchy. To create a new file in the [Unlinked pane](unlinked-files.md) instead, use **⋮** on the Unlinked chip. If the project has a file template set, the new file is pre-populated from it — see [Template](editing.md#template).

To add a child of an existing file, click **⋮** on that file chip and choose **New sub-page**. The child is added at the bottom of the parent's children and is also pre-populated from the file template if one is set.

To create a child that starts as a copy of the parent, choose **Copy to new sub-page**. The new file gets the parent's content with "-copy" appended to the title and filename.

## Reordering with drag and drop

Drag any file chip by its label to move it. While dragging:

- Hover over the **left half** of a chip to place the dragged file as a sibling (same level)
- Hover over the **right half** of a chip to nest it as the first child of that file

A spacer shows where the file will land for sibling placement. A ghost chip shows the nesting depth for child placement.

## Reordering with the keyboard

Select a file chip by clicking it. The d-pad arrow buttons appear in the left margin:

| Key | Action |
|-----|--------|
| ↑ / ↓ | Move up or down within the current level, crossing into parent/child levels as needed |
| → | Nest under the file above (make it a child) |
| ← | Unnest (move up one level) |

## Renaming a file

Click **⋮** on a file chip and choose **Rename** to rename it inline. Spaces are replaced with hyphens automatically. The filename on disk changes to match. You can also rename from the [editor toolbar](editing.md) — double-click the filename there.

## Deleting a file

Click **⋮** on a file chip and choose **Delete**. The behavior depends on what kind of project you're in and where the file lives:

- **Standard project, file in the markdowns directory** — the file is moved to `_archive/` inside the markdowns directory rather than permanently deleted. To recover it, move it back by hand.
- **File added by reference from outside the markdowns directory** — only the reference is removed; the file itself is not touched.
- **Quick Open YAML project (or any project pointed at your own YAML file)** — only the reference is removed from the YAML and unlinked list. The file is never moved. PiTH treats the YAML's directory as your space, not its own, so it doesn't create an `_archive/` folder there.

The app detects file changes automatically within a few seconds.

## Flatten and restore

To move all files out of the hierarchy and into the [Unlinked pane](unlinked-files.md), click **⋮** on the project chip and choose **Flatten hierarchy**. This saves a backup of the current tree so you can undo it.

After flattening, the menu item changes to **Restore hierarchy**. Click it to bring back the saved tree exactly as it was. The backup is automatically forgotten once you start building a new hierarchy by dragging files back in.

## Expanding and collapsing

Click the triangle next to any file that has children to expand or collapse it. See [Keyboard Shortcuts](keyboard-shortcuts.md) for the full list of navigation keys.

## Previewing a file

**Alt+click** any file chip to preview its contents without opening the editor. The tooltip shows the opposite of the current label mode — if chips show filenames, the tooltip shows the title, and vice versa.
