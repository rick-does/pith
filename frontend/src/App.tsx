import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "./components/Sidebar";
import MarkdownEditor from "./components/MarkdownEditor";
import YAMLEditor from "./components/YAMLEditor";
import ImportModal from "./components/ImportModal";
import ExportModal from "./components/ExportModal";
import SearchPanel from "./components/SearchPanel";
import {
  listProjects, createProject, deleteProject, archiveProject, renameProject,
  fetchProjectMd, saveProjectMd,
  fetchCollection, saveCollection, fetchMarkdown, saveMarkdown, fetchCollectionYaml,
  fetchOrphans, createFile, deleteFile, archiveFile, renameFile,
} from "./api";
import type { CollectionStructure, FileInfo, FileNode, ProjectInfo } from "./types";
import { insertAsChild, reorder, removeNode } from "./treeHelpers";

const LAST_PROJECT_KEY = "pith_project";

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

  const loadCollection = useCallback(async (project: string) => {
    try {
      const [c, o] = await Promise.all([fetchCollection(project), fetchOrphans(project)]);
      setCollection(c);
      setOrphans(o);
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
  }, []);

  const handleSelect = useCallback(async (path: string) => {
    if (!currentProject) return;
    const text = await fetchMarkdown(currentProject, path).catch(() => "# Error loading file");
    setSelectedPath(path);
    setEditorContent(text);
    setSavedContent(text);
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

  const handleFileSaved = useCallback((path: string, content: string) => {
    setSavedContent(content);
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
          <span style={{ color: "#fff", fontSize: "13px", fontStyle: "italic" }}>visual markdown workspace</span>
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
            path={`${currentProject}/project.md`}
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
    </div>
  );
}
