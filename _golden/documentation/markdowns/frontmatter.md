# Frontmatter and Templates

PiTH supports YAML frontmatter in markdown files (with opening and closing `---` delimiters).

Frontmatter is automatically stripped from the rendered preview so it doesn't appear in the output.

## The project template

Each project points at a template file stored centrally in `~/.pith/templates/`. The template defines:

1. **Frontmatter schema** — the YAML keys all project files should have
2. **Required headings** — the section headings (h2+) all project files should have
3. **Body content** — any boilerplate text to optionally append to files

All projects share `default-template.md` unless you change the `template:` field in a project's `.pith-project` metadata. The shipped default is:

```
---
Title: <add title>
---

# Title
```

New files created in the project are pre-populated from the template, with the title heading automatically set to the filename. PiTH supports multiple named templates — every `.md` file in `~/.pith/templates/` is available. The **Apply template** button shows a dropdown to pick which template to apply, and **Use as template** lets you save the current file as a new named template.

## Managing the template

### From the Template tab (editor)

While editing a file, open the **Template** tab in the editor sub-bar. From there:

- **Apply template** — applies the template to the current file using the options you've configured (see [Applying the template](#applying-the-template))
- **Use as template** — saves the current file's full content as the project's template, replacing the previous content
- **View template** — opens the template in a markdown editor modal
- **View compliance** — opens the compliance report

### From the project menu

Click **⋮** on the project chip and choose **Template → View template** or **Template → Compliance**.

### Editing the template directly

The template is a plain markdown file in `~/.pith/templates/`. Open it via **View template** and edit it directly. Save to update it. Because templates are shared, editing the default template affects every project that uses it. The frontmatter keys you define become the compliance requirements for all project files using this template. The h2+ headings you define are checked for compliance only when **Append template body** is on. Any body content below the h1 heading can be optionally appended to files when applying.

## Applying the template

When you apply the template — either to the open file or in bulk from the compliance dialog — three options control what happens:

| Option | Default | Effect |
|--------|---------|--------|
| **Update frontmatter** | On | Adds any frontmatter keys that are in the template but missing from the file. Existing values are never overwritten. |
| **Remove extra frontmatter keys not in template** | On | Removes frontmatter keys from the file that aren't in the template. Disabled when Update frontmatter is off. |
| **Append template body** | Off | Appends the template body (everything after the h1, if any) to the end of the file, preceded by a horizontal rule and a *Template content begins here* marker. |

These settings are shared between the template editor and the compliance dialog and persist across sessions.

## Compliance

The compliance report scans all project files against the template and shows any that are out of compliance. What counts as non-compliant depends on the apply options currently active:

- **Update frontmatter on** — files with missing frontmatter keys are flagged
- **Remove extra keys on** — files with extra frontmatter keys are also flagged
- **Append template body on** — files with missing required headings are flagged

Files with no visible issues given the current options are not in the list.

All files in the list are automatically selected when the dialog opens. You can deselect individual files or use the **Select all** checkbox to toggle the selection. Click **Apply to N files** to apply. The same apply options control what gets changed.

The **View template** button (bottom-left of the dialog) closes the compliance dialog and opens the template editor.

## Status indicators

Template compliance is reflected in the status indicator on each file chip. If a file is out of compliance, the chip shows a yellow ⚠. Click the indicator to see a popup with three rows — **Frontmatter**, **Structure**, and **Links** — each showing its own status. Frontmatter checks key compliance; Structure checks required headings from the template.

A red ⚠ on the chip means the file has broken links, which takes priority over the yellow compliance warning. See [Link Validation](link-validation.md) for details.
