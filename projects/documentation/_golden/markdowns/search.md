# Search

PiTH includes full-text search across all files in the current project.

## Opening search

Click the magnifying glass icon in the top-right of the header bar, or press `Ctrl+F` (`Cmd+F` on Mac). The search panel slides in from the right.

## Searching

Type your query in the search field. Results appear as you type — there is a short debounce delay so you can finish typing before results load.

Each result shows:

- **File title** and path
- **Number of matches** in that file
- **Matching lines** with the query highlighted in context

Up to 10 matching lines per file and 50 files total are shown.

## Opening a result

Click any result — the file title or any matching line — to open that file in the [editor](editing.md). The search panel closes automatically.

## Closing search

Click the **✕** button in the search panel header, or press `Escape`.

## Notes

- Search is case-insensitive
- Search scans the full text of every `.md` file in `markdowns/`, excluding archived files
- Results are ranked by number of matches (most matches first)
