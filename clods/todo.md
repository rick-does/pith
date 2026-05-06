# PiTH Todo

## Open

- [ ] Investigate New Project dialog regression (suspected from Edit Project Paths work)

## Done (this session)

- [x] Filter missing projects from Open Project dialog and recent projects menu
- [x] Clean up stale `~/.pith/projects/` metadata dirs when markdowns dir is gone
- [x] Remove legacy `roots` and `active_root` fields from config.json on load
- [x] Auto-discover new project dirs dropped into `~/pith-projects`
- [x] Poll every 10s to detect new and deleted projects, update UI without refresh
- [x] Fix project chip to show dir name (not full path) in filename mode
- [x] Add Edit Project Paths dialog (all four fields: title, dir name, markdowns dir, YAML)
- [x] Trash can in recent projects menu now deletes project metadata (not archive)
- [x] Guard against `~/pith-projects` itself being set as a markdowns directory
- [x] markdowns_dir for new files always `{parent}/markdowns/` in all YAML-given cases (Quick Open, auto-discovery); no dir-name detection
- [x] Auto-discovery no-YAML case: tree.yaml created at `{dropped_dir}/tree.yaml` with relative paths; markdowns_dir = `{dropped_dir}/markdowns/`
- [x] Confirmed and documented full project creation permutation table (10 cases)
