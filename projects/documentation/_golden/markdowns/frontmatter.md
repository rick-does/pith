# Frontmatter

PiTH supports YAML frontmatter in markdown files — both the standard format (with opening and closing `---` delimiters) and Jekyll-style (no opening `---`, just key-value lines terminated by `---`).

## Viewing frontmatter

When you open a file that has frontmatter, a collapsible **Frontmatter** panel appears below the editor toolbar. Click the header to expand or collapse it. The panel shows each key with a type-appropriate input field.

Frontmatter is automatically stripped from the rendered preview.

## Editing frontmatter

Expand the Frontmatter panel and edit values directly. Changes update the YAML in the editor content in real time. Save with `Ctrl+S` as usual.

## Frontmatter templates

A template defines the expected frontmatter keys for a project — their names, types, and default values. This ensures consistency across all files.

### Creating a template from an existing file

The easiest way to set up a template:

1. Open a file that already has the frontmatter structure you want
2. Expand the Frontmatter panel
3. Click **Use as template**

The file's frontmatter keys, types, and values become the project template.

### Editing the template manually

Click the **Frontmatter** button in the top bar to open the template editor. Here you can:

- Add, remove, or reorder fields
- Set the key name, type (string, list, enum, boolean, date), and default value
- For enum types, define the allowed options

### Supported types

| Type | Input | Default |
|------|-------|---------|
| string | Text field | Empty string |
| list | Comma-separated text | Empty list |
| enum | Dropdown of defined options | First option |
| boolean | Checkbox | false |
| date | Text field | Empty string |

## Compliance

Click the **Compliance** button in the top bar to scan all files against the current template. The report shows:

- **Missing keys** — keys in the template that a file doesn't have
- **Extra keys** — keys in a file that aren't in the template

### Selective batch update

Each file in the compliance report has a checkbox. Select the files you want to update, then choose:

- **Add missing keys with default values** — fills in template keys that the file is missing
- **Remove extra keys not in template** — strips keys that aren't in the template

Click **Update** to apply changes to the selected files. Key order is preserved from the template.

## New files

When a frontmatter template is defined, new files created in PiTH are pre-filled with the template's keys and default values.
