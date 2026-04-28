# PiTH — Key Files

- `App.tsx` — nearly all UI state lives here; the orchestration hub
- `components/Sidebar.tsx`, `components/SortableItem.tsx` — hierarchy drag-and-drop; DragOverlay ghost chip
- `components/MarkdownEditor.tsx` — CodeMirror editor, tabs, analysis, spell check
- `treeHelpers.ts` — `basename()`, `isAbsolute()`, `fullPath()` used throughout for path display
- `backend/utils.py` — project/file ops, YAML format detection and round-tripping, sync_collection, get_orphans
- `backend/main.py` — FastAPI app; routers: config, projects, collection, files, analysis, export
