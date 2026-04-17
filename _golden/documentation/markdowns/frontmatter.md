# Frontmatter and Templates

PiTH supports YAML frontmatter in markdown files — both the standard format (with opening and closing `---` delimiters) and Jekyll-style (no opening `---`, just key-value lines terminated by `---`).

Frontmatter is automatically stripped from the rendered preview so it doesn't appear in the output.

## The project template

Each project has a single template file (`template.md`) that defines two things:

1. **Frontmatter schema** — the YAML keys all project files should have
2. **Required headings** — the section headings all project files should have

The default template is:

```
---
Title: <add title>
---

# Title
```

New files created in the project are pre-populated from this template, with the title heading automatically set to the filename.

## Managing the template

### From the Template tab (editor)

While editing a file, open the **Template** tab in the editor sub-bar. From there:

- **Apply template** — adds missing frontmatter keys and missing headings to the current file
- **Use as template** — extracts the current file's frontmatter block and headings and saves them as the project template
- **View template** — opens the template in a markdown editor modal
- **View compliance** — opens the compliance report

### From the project menu

Click **⋮** on the project chip and choose **Template → View template** or **Template → Compliance**.

### Editing the template directly

The template is a plain markdown file. Open it via **View template** and edit the frontmatter block and/or add heading lines. Save to update the project template. The frontmatter keys and headings you define become the compliance requirements for all project files.

## Compliance

The compliance report scans all files in the project against the current template and shows:

- **Missing keys** — frontmatter keys in the template that a file is missing
- **Extra keys** — frontmatter keys in a file that aren't in the template
- **Missing headings** — headings required by the template that a file doesn't have

Select the files you want to fix and click **Apply to N files**. Applying adds missing frontmatter keys and appends missing heading sections.

## Status indicators

Template compliance is reflected in the status indicator on each file chip. If a file is out of compliance, the chip shows a yellow ⚠. Hover the indicator to see a popup with the compliance details and link check results.

A red ⚠ on the chip means the file has broken links, which takes priority over the yellow compliance warning. See [Link Validation](link-validation.md) for details.
