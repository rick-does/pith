# Import & Export

PiTH can import a hierarchy from MkDocs or Docusaurus config files, and export back to those formats when you're ready to publish.

## Importing from MkDocs

1. [Create a new project](projects.md) in PiTH (use **⋮ → Projects → ＋ New project** on the project chip)
2. Copy your `mkdocs.yml` into the project folder at `projects/{name}/mkdocs.yml`
3. Copy your markdown files into `projects/{name}/markdowns/`
4. Click **⋮** on the project chip, then **Import from... → MkDocs**

The hierarchy is built from the `nav:` section of your config. Category-only nodes (sections with no page of their own) are flattened — their children are promoted up one level.

## Importing from Docusaurus

1. [Create a new project](projects.md) in PiTH (use **⋮ → Projects → ＋ New project** on the project chip)
2. Copy your `sidebars.js` (or `sidebars.ts`) into the project folder at `projects/{name}/sidebars.js`
3. Copy your markdown files into `projects/{name}/markdowns/`
4. Click **⋮** on the project chip, then **Import from... → Docusaurus**

If neither `sidebars.js` nor `sidebars.ts` is found, you are prompted for the filename.

## Exporting to MkDocs

Click **⋮ → Export to... → MkDocs**. The exported `mkdocs.yml` is written to `projects/{name}/mkdocs.yml`. Copy it back to your MkDocs project to use it.

## Exporting to Docusaurus

Click **⋮ → Export to... → Docusaurus**. The exported `sidebars.js` is written to `projects/{name}/sidebars.js`. Copy it back to your Docusaurus project.

## Exporting as HTML / PDF

Click **⋮ → View HTML/PDF** to generate a single HTML document containing all files in hierarchy order. The document includes a cover page, table of contents, and all sections with print-friendly styling.

In a browser, the page opens in a new tab with **Save as HTML** and **Print / Save as PDF** buttons. In the standalone app, it opens in an overlay with a Save button.

To create a PDF, open the HTML file in your browser and use `Ctrl+P` (or `Cmd+P` on Mac) to print to PDF.

## Notes

- Import replaces the current hierarchy entirely
- Markdown files referenced in the imported config must already exist in `markdowns/` — import does not copy files
- Export reflects the current hierarchy at the time of export; run it again after any reorganization
