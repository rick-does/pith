# Project Creation Matrix

How `markdowns_dir` (new files) and `tree.yaml` are determined for each project creation path.

The YAML owns existing file paths — `markdowns_dir` is purely where new files are created.

## New Project dialog

| # | Input | `markdowns_dir` (new files) | existing files | `tree.yaml` |
|---|-------|---------------------------|----------------|-------------|
| 1 | nothing | `~/pith-projects/{name}/markdowns/` | — | `~/.pith/projects/{name}/tree.yaml` |
| 2 | markdowns only | given path | given path | `~/.pith/projects/{name}/tree.yaml` |
| 3 | YAML only | `~/pith-projects/{name}/markdowns/` | wherever YAML points | given path |
| 4 | markdowns and YAML | given path | wherever YAML points | given path |

## Quick Open YAML

| # | Situation | `markdowns_dir` (new files) | existing files | `tree.yaml` |
|---|-----------|---------------------------|----------------|-------------|
| 5 | YAML matches existing project | unchanged | unchanged | unchanged |
| 6 | new YAML, `markdowns/` subdir exists next to it | `{yaml_parent}/markdowns/` | wherever YAML points | given path |
| 7 | new YAML, no subdir | `{yaml_parent}/markdowns/` | wherever YAML points | given path |

## Auto-discovery (`~/pith-projects`)

| # | Situation | `markdowns_dir` (new files) | existing files | `tree.yaml` |
|---|-----------|---------------------------|----------------|-------------|
| 8 | YAML + any content subdir | `{dropped_dir}/markdowns/` | wherever YAML points | found YAML |
| 9 | YAML, no content subdir | `{dropped_dir}/markdowns/` | wherever YAML points | found YAML |
| 10 | loose `.md` files, no YAML | `{dropped_dir}/markdowns/` | `{dropped_dir}/` (relative paths in tree.yaml) | `{dropped_dir}/tree.yaml` (created) |

## Notes

- Cases 6 and 8 no longer require the existing content dir to be named `markdowns` — the YAML handles existing file paths regardless of dir name; `markdowns/` is only the new-files destination.
- Cases 6 and 7 collapse to the same outcome: `markdowns_dir` is always `{yaml_parent}/markdowns/`.
- Case 10 tree.yaml uses relative paths; `markdowns_dir` is a separate subdir for new files only.
- `~/pith-projects` itself is rejected as a `markdowns_dir` (HTTP 400).
