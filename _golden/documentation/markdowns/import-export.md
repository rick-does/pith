# Import & Export

## Using an existing YAML as your hierarchy

The simplest way to bring an existing project into PiTH is to point a new project directly at your YAML file when creating it. PiTH reads the file, builds the hierarchy, and writes changes back in the original format — no copying, no conversion.

1. Click **⋮ → Projects → New project**
2. Set the markdowns directory to where your `.md` files are
3. Click **Browse** next to the YAML field and select your file
4. Click **Create**

PiTH supports:
- **PiTH native** — `root:` key with path/title/order/children nodes
- **MkDocs nav** — `nav:` key; preserves `site_name`, `theme`, and all other top-level fields
- **Generic YAML** — any YAML with a flat list of `.md` paths (plain strings or dicts with a path field); extra fields per entry are preserved when PiTH writes changes back

## Importing from MkDocs

Use **Import from… → MkDocs** to rebuild the PiTH hierarchy from a `mkdocs.yml` that already lives in your project folder. This replaces the current hierarchy.

1. Place your `mkdocs.yml` in the project's content directory (the parent of `markdowns/`)
2. Click **⋮ → Import from... → MkDocs**

The hierarchy is built from the `nav:` section of the file. Markdown files referenced in the nav must already exist in your markdowns directory — import does not copy files.

## Importing from Docusaurus

1. Place your `sidebars.js` (or `sidebars.ts`) in the project's content directory
2. Click **⋮ → Import from... → Docusaurus**

If neither `sidebars.js` nor `sidebars.ts` is found, you are prompted for the filename.

## Exporting to MkDocs

Click **⋮ → Export to... → MkDocs**. The exported `mkdocs.yml` is written to the project's content directory (the parent of your markdowns folder). Copy it back to your MkDocs project to use it.

## Exporting to Docusaurus

Click **⋮ → Export to... → Docusaurus**. The exported `sidebars.js` is written to the project's content directory. Copy it back to your Docusaurus project.

## Exporting as HTML / PDF

Click **⋮ → View HTML/PDF** to generate a single HTML document containing all files in hierarchy order. The document includes a cover page, table of contents, and all sections with print-friendly styling.

In a browser, the page opens in a new tab with **Save as HTML** and **Print / Save as PDF** buttons. In the standalone app, it opens in an overlay with a Save button.

## Notes

- **Import from…** replaces the current hierarchy entirely
- Export reflects the current hierarchy at the time of export; run it again after any reorganization
- If you used the YAML file field when creating a project, changes to the hierarchy are written back to your file automatically — you do not need to export
