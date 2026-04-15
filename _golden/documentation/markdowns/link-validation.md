# Link Validation

PiTH can detect broken internal links across all files in a project. An internal link is any markdown link that points to another file, like `[text](other-file.md)`. External links (starting with `http://` or `https://`) are not checked.

## Status indicators on chips

Every file chip in the hierarchy shows two stacked status dots to the left of the three-dot menu. The top dot shows link status; the bottom dot shows frontmatter status:

| Dot | Green outline | Filled color |
|-----|--------------|--------------|
| Top (links) | No broken links | Red — one or more broken links |
| Bottom (frontmatter) | Matches template (or no template defined) | Yellow — missing or extra frontmatter keys |

Hover over a dot to see details.

In the Unlinked pane, indicators appear when you hover over a chip, select it, or hover over the **eye icon** on the Unlinked header to reveal all at once.

## Validating links

Click **⋮** on the project chip, then **Validate links**. This scans every file and opens a report showing all files with broken links. Click any file in the report to open it in the editor.

## Broken links in the editor

When you open a file that has broken links:

- The editor toolbar shows a red count: "⚠ N broken links"
- A detail panel below the toolbar lists each broken link with its line number and target

## Fixing links

Edit the file to correct or remove the broken links, then save (`Ctrl+S`). PiTH re-validates the file on save and immediately updates:

- The broken link panel in the editor
- The status dot on the file's hierarchy chip

The red dot disappears as soon as all links in the file are valid.

## Turning off indicators

If you prefer a cleaner look, click **⋮** on the project chip, then **Settings → Hide status indicators**. This hides all status dots from hierarchy and unlinked chips, and removes the eye icon from the Unlinked header. The setting persists across sessions.
