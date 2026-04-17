# Link Validation

PiTH can detect broken internal links across all files in a project. An internal link is any markdown link that points to another file, like `[text](other-file.md)`. External links (starting with `http://` or `https://`) are not checked.

## Status indicators on chips

Every file chip in the hierarchy shows a single status indicator to the left of the three-dot menu:

| Indicator | Meaning |
|-----------|---------|
| Green circle | All checks pass — no broken links, frontmatter compliant, file template compliant |
| Yellow ⚠ | Style issue — frontmatter or file template is non-compliant (no broken links) |
| Red ⚠ | Broken links found (takes priority over yellow) |

Hover over the indicator to see a popup with three rows — **Frontmatter**, **Structure**, and **Links** — each showing its own green circle or warning icon. Frontmatter checks key compliance; Structure checks required headings from the template. This lets you see at a glance which checks are passing and which are not.

In the Unlinked pane, the indicator appears when you hover over a chip, select it, or hover over the **eye icon** on the Unlinked header to reveal all at once.

## Validating links

Click **⋮** on the project chip, then **Validate links**. This scans every file and opens a report showing all files with broken links. Click any file in the report to open it in the editor.

## Broken links in the editor

When you open a file that has broken links:

- The editor toolbar shows a red count: "⚠ N broken links"
- A detail panel below the toolbar lists each broken link with its line number and target

## Fixing links

Edit the file to correct or remove the broken links, then save (`Ctrl+S`). PiTH re-validates the file on save and immediately updates:

- The broken link panel in the editor
- The status indicator on the file's chip

The indicator turns green as soon as all links in the file are valid.

## Turning off indicators

If you prefer a cleaner look, click **⋮** on the project chip, then **Settings → Hide status indicators**. This hides all status indicators from hierarchy and unlinked chips, and removes the eye icon from the Unlinked header. The setting persists across sessions.
