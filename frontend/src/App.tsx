import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "./components/Sidebar";
import MarkdownEditor from "./components/MarkdownEditor";
import YAMLEditor from "./components/YAMLEditor";
import ImportModal from "./components/ImportModal";
import ExportModal from "./components/ExportModal";
import SearchPanel from "./components/SearchPanel";
import TemplateEditor from "./components/TemplateEditor";
import ComplianceReport from "./components/ComplianceReport";
import {
  listProjects, createProject, deleteProject, archiveProject, renameProject,
  fetchProjectMd, saveProjectMd,
  fetchCollection, saveCollection, fetchMarkdown, saveMarkdown, fetchCollectionYaml,
  fetchOrphans, createFile, deleteFile, archiveFile, renameFile,
  fetchTemplate, saveTemplate as apiSaveTemplate, fetchFileFrontmatter,
  restoreDocStructure, restoreDocAll,
  fetchCompliance, batchUpdateFrontmatter, inferTemplateFromFile,
} from "./api";
import type { CollectionStructure, FileInfo, FileNode, ProjectInfo } from "./types";
import type { FrontmatterTemplate, FrontmatterField, ComplianceItem } from "./api";
import { insertAsChild, reorder, removeNode } from "./treeHelpers";

const LAST_PROJECT_KEY = "pith_project";

function parseFrontmatterClient(content: string): Record<string, any> {
  const lines = content.split("\n");
  let yamlLines: string[] = [];

  if (lines[0]?.trim() === "---") {
    // Standard format
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") { yamlLines = lines.slice(1, i); break; }
    }
  } else if (lines[0] && /^\w[\w\s]*:/.test(lines[0])) {
    // Jekyll-style: key: value lines terminated by ---
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === "---") { yamlLines = lines.slice(0, i); break; }
    }
  }

  if (yamlLines.length === 0) return {};

  const meta: Record<string, any> = {};
  for (const line of yamlLines) {
    const match = line.match(/^([\w][\w\s]*?)\s*:\s*(.*)$/);
    if (match) {
      const [, key, raw] = match;
      const val = raw.trim();
      if (val.startsWith("[") && val.endsWith("]")) {
        meta[key.trim()] = val.slice(1, -1).split(",").map(s => s.trim()).filter(Boolean);
      } else if (val === "true") {
        meta[key.trim()] = true;
      } else if (val === "false") {
        meta[key.trim()] = false;
      } else {
        meta[key.trim()] = val;
      }
    }
  }
  return meta;
}

type OverlayType = "editor" | "yaml" | "project-md" | null;

export default function App() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [collection, setCollection] = useState<CollectionStructure>({ root: [] });
  const [orphans, setOrphans] = useState<FileInfo[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [yamlContent, setYamlContent] = useState("");
  const [projectMdContent, setProjectMdContent] = useState("");
  const [viMode, setViMode] = useState(true);
  const [overlayType, setOverlayType] = useState<OverlayType>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importModal, setImportModal] = useState<{ format: "mkdocs" | "docusaurus" } | null>(null);
  const [exportModal, setExportModal] = useState<{ format: "mkdocs" | "docusaurus" } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [template, setTemplate] = useState<FrontmatterTemplate>({ fields: [] });
  const [fileFrontmatter, setFileFrontmatter] = useState<Record<string, any>>({});
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[] | null>(null);

  const editorContentRef = useRef(editorContent);
  const savedContentRef = useRef(savedContent);
  useEffect(() => { editorContentRef.current = editorContent; }, [editorContent]);
  useEffect(() => { savedContentRef.current = savedContent; }, [savedContent]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && !overlayType) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [overlayType]);

  const lastFileCountRef = useRef<number>(-1);

  const loadCollection = useCallback(async (project: string) => {
    try {
      const [c, o, t] = await Promise.all([
        fetchCollection(project),
        fetchOrphans(project),
        fetchTemplate(project),
      ]);
      setCollection(c);
      setOrphans(o);
      setTemplate(t);
    } catch {
      setError("Failed to load collection");
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const ps = await listProjects();
        setProjects(ps);
        if (ps.length === 0) {
          setLoading(false);
          return;
        }
        const saved = localStorage.getItem(LAST_PROJECT_KEY);
        const project = (saved && ps.some(p => p.name === saved)) ? saved : ps[0].name;
        setCurrentProject(project);
        await loadCollection(project);
      } catch {
        setError("Failed to load projects");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCollection]);

  useEffect(() => {
    if (!currentProject) return;
    lastFileCountRef.current = -1;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/projects/${encodeURIComponent(currentProject)}/file-count`);
        if (!r.ok) return;
        const { count } = await r.json();
        if (lastFileCountRef.current >= 0 && count !== lastFileCountRef.current) {
          lastFileCountRef.current = count;
          loadCollection(currentProject);
        } else {
          lastFileCountRef.current = count;
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [currentProject, loadCollection]);

  const handleSwitchProject = useCallback(async (name: string) => {
    setCurrentProject(name);
    localStorage.setItem(LAST_PROJECT_KEY, name);
    setSelectedPath(null);
    setOverlayType(null);
    setCollection({ root: [] });
    setOrphans([]);
    await loadCollection(name);
  }, [loadCollection]);

  const handleCreateProject = useCallback(async (name: string) => {
    await createProject(name);
    const ps = await listProjects();
    setProjects(ps);
    await handleSwitchProject(name);
  }, [handleSwitchProject]);

  const handleRenameProject = useCallback(async (oldName: string, newName: string) => {
    const { new_name } = await renameProject(oldName, newName);
    const ps = await listProjects();
    setProjects(ps);
    setCurrentProject(new_name);
    localStorage.setItem(LAST_PROJECT_KEY, new_name);
  }, []);

  const handleDeleteProject = useCallback(async (name: string) => {
    await deleteProject(name);
    const ps = await listProjects();
    setProjects(ps);
    if (ps.length > 0) {
      await handleSwitchProject(ps[0].name);
    } else {
      setCurrentProject(null);
      setCollection({ root: [] });
      setOrphans([]);
      setOverlayType(null);
    }
  }, [handleSwitchProject]);

  const handleArchiveProject = useCallback(async (name: string) => {
    await archiveProject(name);
    const ps = await listProjects();
    setProjects(ps);
    window.alert(`"${name}" is now archived`);
    if (name === currentProject) {
      if (ps.length > 0) {
        await handleSwitchProject(ps[0].name);
      } else {
        setCurrentProject(null);
        setCollection({ root: [] });
        setOrphans([]);
        setOverlayType(null);
      }
    }
  }, [currentProject, handleSwitchProject]);

  const handleHighlight = useCallback((path: string | null) => {
    setSelectedPath(path);
    if (path === null && overlayType === "editor") {
      setOverlayType(null);
    }
  }, [overlayType]);

  const handleSelect = useCallback(async (path: string) => {
    if (!currentProject) return;
    const [text, fm] = await Promise.all([
      fetchMarkdown(currentProject, path).catch(() => "# Error loading file"),
      fetchFileFrontmatter(currentProject, path).catch(() => ({ frontmatter: {} })),
    ]);
    setSelectedPath(path);
    setEditorContent(text);
    setSavedContent(text);
    setFileFrontmatter(fm.frontmatter ?? {});
    setOverlayType("editor");
  }, [currentProject]);

  const handleCloseOverlay = useCallback(() => {
    if (overlayType === "editor" && editorContentRef.current !== savedContentRef.current) {
      if (!window.confirm(`"${selectedPath}" has unsaved changes.\n\nClose without saving?`)) return;
    }
    setOverlayType(null);
  }, [overlayType, selectedPath]);

  const handleOpenYaml = useCallback(async () => {
    if (!currentProject) return;
    try {
      const y = await fetchCollectionYaml(currentProject);
      setYamlContent(y);
    } catch {}
    setOverlayType("yaml");
  }, [currentProject]);

  const handleOpenProjectMd = useCallback(async () => {
    if (!currentProject) return;
    try {
      const text = await fetchProjectMd(currentProject);
      setProjectMdContent(text);
    } catch {}
    setOverlayType("project-md");
  }, [currentProject]);

  const handleYamlSaved = useCallback(() => {
    if (currentProject) loadCollection(currentProject);
  }, [currentProject, loadCollection]);

  const handleFrontmatterChange = useCallback((key: string, value: any) => {
    const newMeta = { ...fileFrontmatter, [key]: value };
    setFileFrontmatter(newMeta);
    // Rebuild content with updated frontmatter (always standard --- format)
    const lines = editorContentRef.current.split("\n");
    let bodyStart = 0;
    if (lines[0]?.trim() === "---") {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "---") { bodyStart = i + 1; break; }
      }
    } else if (lines[0] && /^\w[\w\s]*:/.test(lines[0])) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === "---") { bodyStart = i + 1; break; }
      }
    }
    const body = lines.slice(bodyStart).join("\n");
    const yamlLines = Object.entries(newMeta).map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.join(", ")}]`;
      if (typeof v === "boolean") return `${k}: ${v}`;
      return `${k}: ${v}`;
    });
    const newContent = `---\n${yamlLines.join("\n")}\n---\n${body}`;
    setEditorContent(newContent);
  }, [fileFrontmatter]);

  const handleSaveTemplate = useCallback(async (t: FrontmatterTemplate) => {
    if (!currentProject) return;
    await apiSaveTemplate(currentProject, t);
    setTemplate(t);
    setShowTemplateEditor(false);
  }, [currentProject]);

  const handleShowCompliance = useCallback(async () => {
    if (!currentProject) return;
    const items = await fetchCompliance(currentProject);
    setComplianceItems(items);
  }, [currentProject]);

  const handleUseAsTemplate = useCallback(async () => {
    if (!currentProject || !selectedPath) return;
    const t = await inferTemplateFromFile(currentProject, selectedPath);
    setTemplate(t);
  }, [currentProject, selectedPath]);

  const handleBatchUpdate = useCallback(async (addDefaults: boolean, stripExtra: boolean, files: string[]) => {
    if (!currentProject) return;
    await batchUpdateFrontmatter(currentProject, addDefaults, stripExtra, files);
    setComplianceItems(null);
    await loadCollection(currentProject);
  }, [currentProject, loadCollection]);

  const handleFileSaved = useCallback((path: string, content: string) => {
    setSavedContent(content);
    // Re-parse frontmatter from saved content (standard or Jekyll-style)
    const meta = parseFrontmatterClient(content);
    setFileFrontmatter(meta);
    const h1 = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
    if (!h1) return;
    const updateTitle = (nodes: FileNode[]): FileNode[] =>
      nodes.map(n => n.path === path ? { ...n, title: h1 } : { ...n, children: updateTitle(n.children ?? []) });
    setCollection(prev => ({ root: updateTitle(prev.root) }));
  }, []);

  const handleCollectionChange = useCallback(async (c: CollectionStructure) => {
    if (!currentProject) return;
    setCollection(c);
    try {
      await saveCollection(currentProject, c);
      const o = await fetchOrphans(currentProject);
      setOrphans(o);
    } catch {}
  }, [currentProject]);

  const handleCreateFile = useCallback(async (filename: string) => {
    if (!currentProject) return;
    await createFile(currentProject, filename);
    const title = filename.replace(/\.md$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const newNode: FileNode = { path: filename, title, order: 0, children: [] };
    const newRoot = reorder([newNode, ...collection.root]);
    await saveCollection(currentProject, { root: newRoot });
    setCollection({ root: newRoot });
    const o = await fetchOrphans(currentProject);
    setOrphans(o);
    const initContent = `# ${title}\n`;
    setSelectedPath(filename);
    setEditorContent(initContent);
    setSavedContent(initContent);
    setOverlayType("editor");
  }, [currentProject, collection]);

  const handleDeleteFile = useCallback(async (path: string) => {
    if (!currentProject) return;
    await archiveFile(currentProject, path);
    if (selectedPath === path) {
      setOverlayType(null);
      setSelectedPath(null);
    }
    await loadCollection(currentProject);
    window.alert(`"${path}" is now archived`);
  }, [currentProject, selectedPath, loadCollection]);

  const handleCreateChildFile = useCallback(async (parentPath: string, filename: string) => {
    if (!currentProject) return;
    await createFile(currentProject, filename);
    const title = filename.replace(/\.md$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const newNode: FileNode = { path: filename, title, order: 0, children: [] };
    const newRoot = reorder(insertAsChild(collection.root, parentPath, newNode));
    await saveCollection(currentProject, { root: newRoot });
    setCollection({ root: newRoot });
    const o = await fetchOrphans(currentProject);
    setOrphans(o);
    const initContent = `# ${title}\n`;
    setSelectedPath(filename);
    setEditorContent(initContent);
    setSavedContent(initContent);
    setOverlayType("editor");
  }, [currentProject, collection]);

  const handleRenameFile = useCallback(async (oldPath: string, newName: string) => {
    if (!currentProject) return;
    let name = newName.trim().replace(/ /g, "-");
    if (!name.endsWith(".md")) name += ".md";
    const { new_path } = await renameFile(currentProject, oldPath, name);
    if (selectedPath === oldPath) setSelectedPath(new_path);
    await loadCollection(currentProject);
  }, [currentProject, selectedPath, loadCollection]);

  const handleRefresh = useCallback(async () => {
    if (!currentProject) return;
    const ps = await listProjects();
    setProjects(ps);
    await loadCollection(currentProject);
  }, [currentProject, loadCollection]);

  const handleRestoreStructure = useCallback(async () => {
    if (!window.confirm("Restore documentation hierarchy to the original structure? Your file contents will not change.")) return;
    await restoreDocStructure();
    await loadCollection("documentation");
  }, [loadCollection]);

  const handleRestoreAll = useCallback(async () => {
    if (!window.confirm("Restore documentation hierarchy AND all file contents to the original? Any edits you made to documentation files will be lost.")) return;
    await restoreDocAll();
    await loadCollection("documentation");
  }, [loadCollection]);

  const overlayOpen = overlayType !== null;

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#fff", color: "#999" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100vh", width: "100vw", overflow: "hidden", background: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ height: "50px", flexShrink: 0, background: "#1a6fa8", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1in" }}>
        <span style={{ color: "#fff", fontWeight: "bold", fontSize: "20px" }}>Pi<span style={{ color: "#f90" }}>T</span>H</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#fff", fontSize: "13px", fontStyle: "italic" }}>visual markdown workspace</span>
          <button
            onClick={() => setSearchOpen(o => !o)}
            title="Search (Ctrl+F)"
            style={{
              background: searchOpen ? "rgba(255,255,255,0.2)" : "transparent",
              border: "1px solid rgba(255,255,255,0.3)", borderRadius: 4,
              color: "#fff", cursor: "pointer", padding: "4px 10px",
              fontSize: 13, display: "flex", alignItems: "center", gap: 6,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = searchOpen ? "rgba(255,255,255,0.2)" : "transparent"; }}
          >
            &#128269; Search
          </button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Sidebar
          collection={collection}
          selectedPath={selectedPath}
          onSelect={handleHighlight}
          onOpen={handleSelect}
          onCollectionChange={handleCollectionChange}
          onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          onCreateChildFile={handleCreateChildFile}
          onOpenYaml={handleOpenYaml}
          yamlOpen={overlayType === "yaml"}
          orphans={orphans}
          currentProject={currentProject ?? ""}
          currentProjectTitle={projects.find(p => p.name === currentProject)?.title ?? currentProject ?? ""}
          projects={projects}
          onSwitchProject={handleSwitchProject}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          onArchiveProject={handleArchiveProject}
          onRenameProject={handleRenameProject}
          onOpenProjectMd={handleOpenProjectMd}
          onRefresh={handleRefresh}
          onImport={(fmt) => setImportModal({ format: fmt })}
          onExport={(fmt) => setExportModal({ format: fmt })}
          onEditTemplate={() => setShowTemplateEditor(true)}
          onCheckCompliance={handleShowCompliance}
          onRestoreStructure={handleRestoreStructure}
          onRestoreAll={handleRestoreAll}
        />
      </div>

      <div className={`overlay-panel${overlayOpen ? " overlay-panel--open" : ""}`}>
        <span className="overlay-close-btn" onClick={handleCloseOverlay}>&#10005;</span>
        {overlayType === "editor" && selectedPath && (
          <MarkdownEditor
            key={selectedPath}
            path={selectedPath}
            content={editorContent}
            savedContent={savedContent}
            onContentChange={setEditorContent}
            viMode={viMode}
            onViModeChange={setViMode}
            onSaved={handleFileSaved}
            onSave={async (path, content) => {
              if (!currentProject) return;
              await saveMarkdown(currentProject, path, content);
            }}
            onRename={handleRenameFile}
            frontmatter={fileFrontmatter}
            templateFields={template.fields}
            onFrontmatterChange={handleFrontmatterChange}
            onUseAsTemplate={handleUseAsTemplate}
          />
        )}
        {overlayType === "yaml" && (
          <YAMLEditor
            yamlContent={yamlContent}
            onYamlChange={setYamlContent}
            onSaved={handleYamlSaved}
            viMode={viMode}
            readOnly
          />
        )}
        {overlayType === "project-md" && currentProject && (
          <MarkdownEditor
            key={`project-md-${currentProject}`}
            path="Project Notes"
            content={projectMdContent}
            savedContent={projectMdContent}
            onContentChange={setProjectMdContent}
            viMode={viMode}
            onViModeChange={setViMode}
            onSave={async (_path, content) => {
              await saveProjectMd(currentProject, content);
            }}
          />
        )}
      </div>

      {error && (
        <div style={{ position: "fixed", bottom: "16px", left: "50%", transform: "translateX(-50%)", background: "#c00", color: "#fff", padding: "8px 16px", borderRadius: "4px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {importModal && currentProject && (
        <ImportModal
          onImportMkdocs={() => { setImportModal(null); loadCollection(currentProject); }}
          onImportDocusaurus={() => { setImportModal(null); loadCollection(currentProject); }}
          onClose={() => setImportModal(null)}
        />
      )}

      {exportModal && currentProject && (
        <ExportModal
          format={exportModal.format}
          resultPath=""
          onClose={() => setExportModal(null)}
        />
      )}

      {searchOpen && currentProject && (
        <SearchPanel
          currentProject={currentProject}
          onOpen={(path) => { setSearchOpen(false); handleSelect(path); }}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {showTemplateEditor && (
        <TemplateEditor
          template={template}
          onSave={handleSaveTemplate}
          onClose={() => setShowTemplateEditor(false)}
        />
      )}

      {complianceItems !== null && (
        <ComplianceReport
          items={complianceItems}
          onBatchUpdate={handleBatchUpdate}
          onClose={() => setComplianceItems(null)}
        />
      )}
    </div>
  );
}
