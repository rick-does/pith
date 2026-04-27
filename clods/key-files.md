# PiTH — Key Files

- `App.tsx` — nearly all UI state lives here; the orchestration hub
- `components/Sidebar.tsx`, `components/SortableItem.tsx` — hierarchy drag-and-drop
- `components/MarkdownEditor.tsx` — CodeMirror editor, tabs, analysis, spell check
- `backend/utils.py` — project/file ops, YAML format detection and round-tripping
- `backend/main.py` — FastAPI app; routers: config, projects, collection, files, analysis, export
