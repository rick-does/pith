# Unlinked Files

The **Unlinked** pane shows files that exist in the project's `markdowns/` folder but are not yet part of the [hierarchy](hierarchy.md). This happens when you add files directly to the folder, [import](import-export.md) a batch of files, or remove a file from the hierarchy without deleting it.

## The Unlinked chip

The blue **Unlinked** chip sits in the right column, parallel to the project chip. Click it to expand or collapse the pane. The warning icon changes color:

- **Gray** — no unlinked files
- **Orange** — one or more files are waiting to be linked

The pane is open by default. Click the chip to collapse it, and again to reopen it.

## Adding files to the hierarchy

There are three ways to move an unlinked file into the hierarchy:

1. **Drag** it from the Unlinked pane and drop it onto the hierarchy
2. **Select** it (click once) and press the **←** arrow key
3. Click **⋮** on the file chip and choose **Add to hierarchy**

Double-clicking an unlinked file opens it in the editor.

**Alt+click** on a file chip shows a preview of the file's contents without opening the editor. The preview tooltip shows the opposite of the current label mode — if labels show filenames, the tooltip shows the title, and vice versa.

To select multiple files:

- **Ctrl/Cmd+click** to toggle individual files
- **Shift+click** to select a range between the last-clicked file and the shift-clicked file
- **Drag a rectangle** around a group of files (rubber-band select)

The ← key moves all selected files into the hierarchy at once. You can also multi-drag selected files onto the hierarchy.

Hover over the **eye icon** on the Unlinked header to reveal status indicators on all unlinked chips at once, without selecting them.

## Sorting unlinked files

Click **⋮** on the Unlinked chip to change the sort order:

- **Recent** — most recently modified first (default)
- **A→Z** — alphabetical by filename or title
- **Custom** — drag files within the pane to set your own order

Dragging a file within the Unlinked pane, or using the ↑/↓ arrow keys with a file selected, automatically switches to Custom sort.

## Creating a new file

Click **⋮** on the Unlinked chip and choose **＋ New file**. Type a filename and press Enter. The file is created in `markdowns/` and appears in the Unlinked pane, ready to be added to the hierarchy. If the project has a file template set, the new file is pre-populated from it.

You can also add existing markdown files from another directory — see [Adding files from another directory](projects.md#adding-files-from-another-directory).

## Files in subdirectories

Files inside subdirectories of `markdowns/` are also surfaced in the Unlinked pane if they are not in the hierarchy. Files inside `markdowns/_archive/` are excluded.
