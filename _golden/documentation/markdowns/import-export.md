---
Title: Import & Export 
---

# Import & Export

## Loading an existing YAML as your hierarchy

The simplest way to bring an existing project into PiTH is to point a new project directly at your YAML file when creating it. PiTH reads the file, builds the hierarchy, and writes changes back in the original format — no copying, no conversion.

1. Click **⋮ → Projects → New project**
2. Set the markdowns directory to where your `.md` files are
3. Click **Browse** next to the YAML field and select your file
4. Click **Create**

PiTH supports:
- **PiTH native** — `root:` key with path/title/order/children nodes


## Exporting as HTML / PDF

Click **⋮ → View HTML/PDF** to generate a single HTML document containing all files in hierarchy order. The document includes a cover page, table of contents, and all sections with print-friendly styling.

In a browser, the page opens in a new tab with **Save as HTML** and **Print / Save as PDF** buttons. In the standalone app, it opens in an overlay with a Save button.

## Notes

- **Import from…** replaces the current hierarchy entirely
- Export reflects the current hierarchy at the time of export; run it again after any reorganization
- If you used the YAML file field when creating a project, PiTH writes changes to the hierarchy back to your file automatically — you do not need to export
