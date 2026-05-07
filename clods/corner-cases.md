# Corner Cases — Testing Notes

Scenarios to verify during testing. These are edge cases where behavior is defined but
worth confirming works as expected in practice.

---

## Path resolution in tree.yaml

**Relative paths in external tree.yaml files**
- Situation: a project's tree.yaml lives outside `~/.pith/projects/` (Quick Open YAML, user-supplied path, auto-discovery) and contains relative paths
- Currently: relative paths always resolve against `markdowns_dir`
- Known gap: for auto-discovery case 10 (loose `.md` files, no prior YAML), PiTH creates tree.yaml in `{dropped_dir}/` with paths relative to `{dropped_dir}/`, but `markdowns_dir = {dropped_dir}/markdowns/` — so existing files won't be found in the hierarchy
- Resolution options not yet decided; add to todo when prioritized

## Project Creation / Auto-discovery

**Multiple YAML files in a dropped dir (`~/pith-projects`)**
- Situation: user drops a dir containing e.g. `mkdocs.yml` and `custom-nav.yml`
- Expected: PiTH picks one silently (prefers a file named `tree` or `collection`; otherwise first alphabetically)
- User path to fix: Edit Project Paths → change YAML file to the preferred one
- Verify: the picked YAML is actually loaded and the hierarchy renders correctly
