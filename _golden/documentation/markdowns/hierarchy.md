# Building Your Hierarchy

The hierarchy pane shows your files as a tree. Files can be nested to any depth. The structure is saved to `tree.yaml` automatically after every change.

## Adding a file

Click **⋮** on the project chip, then **File → New file**. The file is created in `markdowns/` and added to the bottom of the hierarchy.

To add a child of an existing file, click **⋮** on that file chip and choose **New sub-page**. The child is added at the bottom of the parent's children.

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

Click **⋮** on a file chip and choose **Rename** to rename it inline. Spaces are replaced with hyphens automatically. The file on disk is renamed to match. You can also rename from the [editor toolbar](editing.md) — double-click the filename there.

## Deleting a file

Click **⋮** on a file chip and choose **Delete**. The file is moved to `markdowns/_archive/` rather than permanently deleted. To recover it, move it back to `markdowns/` by hand. The app detects file changes automatically within a few seconds.

## Flatten and restore

To move all files out of the hierarchy and into the [Unlinked pane](unlinked-files.md), click **⋮** on the project chip and choose **Flatten hierarchy**. This saves a backup of the current tree so you can undo it.

After flattening, the menu item changes to **Restore hierarchy**. Click it to bring back the saved tree exactly as it was. The backup is automatically forgotten once you start building a new hierarchy by dragging files back in.

## Expanding and collapsing

Click the triangle next to any file that has children to expand or collapse it. See [Keyboard Shortcuts](keyboard-shortcuts.md) for the full list of navigation keys.
