---
Title: Unlinked Files
---

# Unlinked Files

The **Unlinked** pane shows markdown files that are registered with the project but not yet part of the [hierarchy](hierarchy.md). This includes files you add to the markdowns directory and files added by reference when you create a project from a YAML file.

## The Unlinked chip

The blue **Unlinked** chip sits in the right column, parallel to the project chip. Click it to expand or collapse the pane. The warning icon changes color:

- **Gray** — no unlinked files
- **Orange** — one or more files are waiting to be linked

The pane is open by default. Click the chip to collapse it, and again to reopen it.

## Adding files to the hierarchy

You have four ways to move unlinked files into the hierarchy:

1. **Select** and **Drag** them from the Unlinked pane and drop them onto the hierarchy
2. **Select** and press the **←** arrow key
3. **Select** ad click the **←** button between the two panes
4. Click **⋮** on one file chip and choose **Add to hierarchy**

**Note**: Double-clicking an unlinked file opens it in the editor.

**Alt+click** on a file chip shows a preview of the file's contents without opening the editor.

Hovering over any chip shows the full file path. In filename mode, the tooltip also shows the title above the path. Files added by reference from outside the project appear in *italics*.

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

Click **⋮** on the Unlinked chip and choose **＋ New file**. Type a filename and press Enter. The file appears in `markdowns/` and appears in the Unlinked pane, ready for you to add it to the hierarchy. If the project has a file template, the new file becomes an instance of the template.

You can also add existing markdown files from another directory — see [Adding files from another directory](projects.md#adding-files-from-another-directory).

## Files in subdirectories

Files inside subdirectories of the markdowns directory also appear in the Unlinked pane if they are not in the hierarchy. Files inside `_archive/` are excluded.
