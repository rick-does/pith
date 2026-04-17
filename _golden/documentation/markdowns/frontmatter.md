# Frontmatter

PiTH supports YAML frontmatter in markdown files — both the standard format (with opening and closing `---` delimiters) and Jekyll-style (no opening `---`, just key-value lines terminated by `---`).

Frontmatter is automatically stripped from the rendered preview so it doesn't appear in the output.

## The Frontmatter panel

When editing a file, a collapsible **Frontmatter** section appears below the editor toolbar. Click the header to expand or collapse it. The panel contains action buttons for working with the project template. Frontmatter itself is edited directly in the text editor.

## Frontmatter templates

A template defines the expected frontmatter keys for a project — their names, types, and default values. This ensures consistency across all files.

### Creating a template from an existing file

The easiest way to set up a template:

1. Open a file that already has the frontmatter structure you want
2. Expand the Frontmatter panel in the editor
3. Click **Use as template**

The file's frontmatter keys, types, and values become the project template.

### Applying the template to the current file

Click **Apply template** in the Frontmatter panel. This adds any missing template keys (with their default values) and removes any keys not in the template, for the current file only.

### Editing the template manually

Click **View template** in the Frontmatter panel, or click **⋮** on the project chip and choose **Frontmatter → Template**. In the template editor you can:

- Add, remove, or reorder fields
- Set the key name, type (string, list, enum, boolean, date), and default value
- For enum types, define the allowed options

### Supported types

| Type | Default |
|------|---------|
| string | Empty string |
| list | Empty list |
| enum | First defined option |
| boolean | false |
| date | Empty string |

## Compliance

Click **View compliance** in the Frontmatter panel, or click **⋮** on the project chip and choose **Frontmatter → Compliance**, to scan all files against the current template. The report shows files with:

- **Missing keys** — keys in the template that a file doesn't have
- **Extra keys** — keys in a file that aren't in the template

### Selective batch update

Each file in the compliance report has a checkbox. Select the files you want to update, then choose:

- **Add missing keys with default values** — fills in template keys that the file is missing
- **Remove extra keys not in template** — strips keys that aren't in the template (checked by default)

Click **Update** to apply changes to the selected files. Key order follows the template.

## Status indicators

Frontmatter compliance is one of three checks reflected in the status indicator on each file chip. If a file's frontmatter is non-compliant, the chip shows a yellow ⚠. Hover the indicator to see a popup with three rows — **Frontmatter**, **Template**, and **Links** — each showing a green circle (passing) or warning icon (failing).

A red ⚠ on the chip means the file has broken links, which takes priority over the yellow frontmatter warning. See [Link Validation](link-validation.md) for details on the full indicator scheme.

## New files

New files are pre-populated from the project's file structure template if one is set, or with a title heading only if not. To apply the frontmatter template to a new file, open it and click **Apply template** in the Frontmatter panel. See [Building Your Hierarchy](hierarchy.md) for how to create files and [Template](editing.md#template) for the file structure template.
