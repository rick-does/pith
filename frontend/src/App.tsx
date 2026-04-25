import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "./components/Sidebar";
import MarkdownEditor from "./components/MarkdownEditor";
import type { MarkdownEditorHandle } from "./components/MarkdownEditor";
import ImageBrowser from "./components/ImageBrowser";
import YAMLEditor from "./components/YAMLEditor";
import ImportModal from "./components/ImportModal";
import ExportModal from "./components/ExportModal";
import SearchPanel from "./components/SearchPanel";
import TemplateEditor from "./components/TemplateEditor";
import ComplianceReport from "./components/ComplianceReport";
import LinkReport from "./components/LinkReport";
import NewProjectDialog from "./components/NewProjectDialog";
import OpenProjectDialog from "./components/OpenProjectDialog";
import AddFileDialog from "./components/AddFileDialog";
import { useEditorTabs, TAB_STYLES, TABS_KEY, ACTIVE_TAB_KEY } from "./hooks/useEditorTabs";
import {
  listProjects, createProject, archiveProject, renameProject,
  fetchProjectMd, saveProjectMd,
  fetchCollection, saveCollection, fetchMarkdown, saveMarkdown, fetchCollectionYaml,
  fetchOrphans, createFile, archiveFile, renameFile,
  fetchTemplate, saveTemplate,
  fetchTemplateCompliance, applyTemplate, batchApplyTemplate, useFileAsTemplate,
  validateProjectLinks, validateFileLinks,
  importFromFormat, exportToFormat,
  flattenHierarchy, restoreHierarchy, checkHierarchyBackup,
  fetchConfig, setLastProject,
  openImagesFolder,
  fetchPrefs, savePrefs,
} from "./api";
import type { CollectionStructure, FileInfo, FileNode, ProjectInfo, EditorTab, OverlayType } from "./types";
import type { TemplateComplianceItem, FileLinkReport, BrokenLink } from "./api";
import { insertAsLastChild, reorder } from "./treeHelpers";

const LAST_FILE_KEY = "pith_selected_file";

function getTitleForPath(path: string, col: CollectionStructure, orph: FileInfo[]): string {
  const find = (nodes: FileNode[]): string | null => {
    for (const n of nodes) {
      if (n.path === path) return n.title;
      const found = find(n.children ?? []);
      if (found) return found;
    }
    return null;
  };
  return find(col.root) ?? orph.find(o => o.path === path)?.title ?? path.replace(/\.md$/, "");
}

export default function App() {
  // Core project/collection state
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

  // Simple overlay/modal toggles
  const [importModal, setImportModal] = useState<{ format: "mkdocs" | "docusaurus" } | null>(null);
  const [exportModal, setExportModal] = useState<{ format: "mkdocs" | "docusaurus" } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [imageBrowserOpen, setImageBrowserOpen] = useState(false);
  const [imageBrowserTriggerAdd, setImageBrowserTriggerAdd] = useState(false);

  // Template state
  const [templateContent, setTemplateContent] = useState("");
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [complianceItems, setComplianceItems] = useState<TemplateComplianceItem[] | null>(null);
  const [templatePrefs, setTemplatePrefs] = useState({ apply_fm: true, remove_extra: true, append_body: false });
  const handlePrefsChange = useCallback((prefs: typeof templatePrefs) => {
    setTemplatePrefs(prefs);
    savePrefs(prefs);
  }, []);

  // Links/indicators state
  const [linkReport, setLinkReport] = useState<FileLinkReport[] | null>(null);
  const [fileBrokenLinks, setFileBrokenLinks] = useState<BrokenLink[]>([]);
  const [brokenLinkMap, setBrokenLinkMap] = useState<Record<string, number>>({});
  const [frontmatterIssueMap, setFrontmatterIssueMap] = useState<Record<string, boolean>>({});
  const [templateIssueMap, setTemplateIssueMap] = useState<Record<string, boolean>>({});
  const [showIndicators, setShowIndicators] = useState(true);

  // Preview state
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [reportPreview, setReportPreview] = useState<string | null>(null);
  const [hasHierarchyBackup, setHasHierarchyBackup] = useState(false);

  // Project settings
  const [recentProjectNames, setRecentProjectNames] = useState<string[]>([]);
  const [titleMode, setTitleMode] = useState(true);
  const [editorTheme, setEditorTheme] = useState<string>("one-dark");
  const [showNewProjectFile, setShowNewProjectFile] = useState(true);

  // Dialog open flags
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [openProjectOpen, setOpenProjectOpen] = useState(false);
  const [addFileDialogOpen, setAddFileDialogOpen] = useState(false);

  // Refs that the hook and tab handlers share
  const editorContentRef = useRef(editorContent);
  const savedContentRef = useRef(savedContent);
  useEffect(() => { editorContentRef.current = editorContent; }, [editorContent]);
  useEffect(() => { savedContentRef.current = savedContent; }, [savedContent]);

  // Editor tabs
  const {
    tabs, setTabs, activeTabId, setActiveTabId, tabContextMenu, setTabContextMenu,
    tabsRef, activeTabIdRef, tabsRestoredRef,
    handleSwitchTab, handleCloseTab,
  } = useEditorTabs({ editorContentRef, savedContentRef, setSelectedPath, setEditorContent, setSavedContent, setFileBrokenLinks, setOverlayType });

  // Tab persistence (stays here to read overlayType without passing it to the hook)
  useEffect(() => {
    if (!currentProject || loading || !tabsRestoredRef.current) return;
    localStorage.setItem(TABS_KEY(currentProject), JSON.stringify(tabs));
    localStorage.setItem(TABS_KEY(currentProject) + "_overlay", overlayType ?? "");
    if (activeTabId) localStorage.setItem(ACTIVE_TAB_KEY(currentProject), activeTabId);
  }, [tabs, activeTabId, overlayType, currentProject, loading]);

  const markdownEditorRef = useRef<MarkdownEditorHandle>(null);
  const htmlIframeRef = useRef<HTMLIFrameElement>(null);
  const reportIframeRef = useRef<HTMLIFrameElement>(null);

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
  const collectionLoadingRef = useRef(false);

  const refreshBrokenLinks = useCallback(async (project: string) => {
    try {
      const reports = await validateProjectLinks(project);
      const map: Record<string, number> = {};
      for (const r of reports) map[r.path] = r.broken_links.length;
      setBrokenLinkMap(map);
    } catch {}
  }, []);

  const refreshTemplateIssues = useCallback(async (project: string) => {
    try {
      const items = await fetchTemplateCompliance(project);
      const fmMap: Record<string, boolean> = {};
      const headingMap: Record<string, boolean> = {};
      for (const item of items) {
        if (item.missing_keys.length > 0 || item.extra_keys.length > 0) fmMap[item.path] = true;
        if (item.missing_headings.length > 0) headingMap[item.path] = true;
      }
      setFrontmatterIssueMap(fmMap);
      setTemplateIssueMap(headingMap);
    } catch {}
  }, []);

  const loadCollection = useCallback(async (project: string) => {
    try {
      const [c, o, t] = await Promise.all([
        fetchCollection(project),
        fetchOrphans(project),
        fetchTemplate(project),
      ]);
      setCollection(c);
      setOrphans(o);
      setTemplateContent(t.content);
      refreshBrokenLinks(project);
      refreshTemplateIssues(project);
    } catch {
      setError("Failed to load collection");
    }
  }, [refreshBrokenLinks, refreshTemplateIssues]);

  useEffect(() => {
    (async () => {
      try {
        const [cfg, ps, prefs] = await Promise.all([fetchConfig(), listProjects(), fetchPrefs()]);
        if (prefs && typeof prefs === "object") {
          setTemplatePrefs(prev => ({
            apply_fm: "apply_fm" in prefs ? Boolean(prefs.apply_fm) : prev.apply_fm,
            remove_extra: "remove_extra" in prefs ? Boolean(prefs.remove_extra) : prev.remove_extra,
            append_body: "append_body" in prefs ? Boolean(prefs.append_body) : prev.append_body,
          }));
          if ("show_indicators" in prefs) setShowIndicators(Boolean(prefs.show_indicators));
          if ("title_mode" in prefs) setTitleMode(Boolean(prefs.title_mode));
          if ("editor_theme" in prefs && typeof prefs.editor_theme === "string") setEditorTheme(prefs.editor_theme);
          if ("show_new_project_file" in prefs) setShowNewProjectFile(Boolean(prefs.show_new_project_file));
        }
        const activeProjects = ps.filter((p: ProjectInfo) => !p.archived);
        const recents: string[] = cfg.recent_projects ?? [];
        setProjects(activeProjects);
        setRecentProjectNames(recents);
        if (activeProjects.length === 0) { setLoading(false); return; }
        const firstRecent = recents.find((n: string) => activeProjects.some((p: ProjectInfo) => p.name === n));
        const project = firstRecent ?? activeProjects[0].name;
        setCurrentProject(project);
        await loadCollection(project);
      } catch {
        setError("Failed to load projects");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCollection]);

  // Tab restoration (stays here because it needs handleSelect, defined below)
  useEffect(() => {
    if (loading || !currentProject) return;
    let hadStoredTabs = false;
    try {
      const stored = localStorage.getItem(TABS_KEY(currentProject));
      if (stored) {
        hadStoredTabs = true;
        const parsedTabs: EditorTab[] = JSON.parse(stored).map((t: any, i: number) => ({ ...t, colorIndex: typeof t.colorIndex === "number" ? t.colorIndex : i % 2 }));
        if (parsedTabs.length > 0) {
          const storedActiveId = localStorage.getItem(ACTIVE_TAB_KEY(currentProject));
          const storedOverlay = localStorage.getItem(TABS_KEY(currentProject) + "_overlay") ?? "";
          const activeTab = parsedTabs.find(t => t.id === storedActiveId) ?? parsedTabs[0];
          setTabs(parsedTabs);
          setActiveTabId(activeTab.id);
          setSelectedPath(activeTab.path);
          setEditorContent(activeTab.content);
          setSavedContent(activeTab.savedContent);
          setFileBrokenLinks(activeTab.brokenLinks);
          if (storedOverlay) setOverlayType(storedOverlay as OverlayType);
          tabsRestoredRef.current = true;
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to restore tabs from localStorage:", e);
    }
    tabsRestoredRef.current = true;
    if (!hadStoredTabs) {
      const savedPath = localStorage.getItem(LAST_FILE_KEY);
      if (savedPath) handleSelect(savedPath).catch(() => localStorage.removeItem(LAST_FILE_KEY));
    }
  }, [loading]);

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
          if (!collectionLoadingRef.current) {
            collectionLoadingRef.current = true;
            loadCollection(currentProject).finally(() => { collectionLoadingRef.current = false; });
          }
        } else {
          lastFileCountRef.current = count;
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [currentProject, loadCollection]);

  const handleCloseOverlay = useCallback(() => {
    if (activeTabIdRef.current) {
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: editorContentRef.current } : t));
    }
    setOverlayType(null);
    localStorage.removeItem(LAST_FILE_KEY);
  }, []);

  const handleSwitchProject = useCallback(async (name: string) => {
    tabsRestoredRef.current = false;
    setTabs([]);
    setActiveTabId(null);
    setCurrentProject(name);
    setLastProject(name).catch(() => {});
    setRecentProjectNames(prev => [name, ...prev.filter(n => n !== name)].slice(0, 5));
    localStorage.removeItem(LAST_FILE_KEY);
    setSelectedPath(null);
    setOverlayType(null);
    setCollection({ root: [] });
    setOrphans([]);
    await loadCollection(name);
    checkHierarchyBackup(name).then(setHasHierarchyBackup);
  }, [loadCollection]);

  const handleArchiveProject = useCallback(async (name: string) => {
    await archiveProject(name);
    const ps = await listProjects();
    const activeProjects = ps.filter((p: ProjectInfo) => !p.archived);
    setProjects(activeProjects);
    setRecentProjectNames(prev => prev.filter(n => n !== name));
    window.alert(`"${name}" is now archived`);
    if (name === currentProject) {
      if (activeProjects.length > 0) {
        await handleSwitchProject(activeProjects[0].name);
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
    if (path === null && overlayType === "editor") setOverlayType(null);
  }, [overlayType]);

  const handleSelect = useCallback(async (path: string) => {
    if (!currentProject) return;
    if (activeTabIdRef.current) {
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: editorContentRef.current } : t));
    }
    const existing = tabsRef.current.find(t => t.path === path);
    if (existing) {
      setActiveTabId(existing.id);
      setSelectedPath(path);
      setEditorContent(existing.content);
      setSavedContent(existing.savedContent);
      setFileBrokenLinks(existing.brokenLinks);
      setOverlayType("editor");
      localStorage.setItem(LAST_FILE_KEY, path);
      return;
    }
    const [text, broken] = await Promise.all([
      fetchMarkdown(currentProject, path).catch(() => "# Error loading file"),
      validateFileLinks(currentProject, path).catch(() => []),
    ]);
    const newTab: EditorTab = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: "editor",
      path,
      content: text,
      savedContent: text,
      title: getTitleForPath(path, collection, orphans),
      frontmatter: {},
      brokenLinks: broken,
      colorIndex: tabsRef.current.length === 0 ? 0 : (tabsRef.current[tabsRef.current.length - 1].colorIndex === 0 ? 1 : 0),
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setSelectedPath(path);
    setEditorContent(text);
    setSavedContent(text);
    setFileBrokenLinks(broken);
    setOverlayType("editor");
    localStorage.setItem(LAST_FILE_KEY, path);
  }, [currentProject, collection, orphans]);

  const handleOpenYaml = useCallback(async () => {
    if (!currentProject) return;
    try {
      const y = await fetchCollectionYaml(currentProject);
      setYamlContent(y);
      setOverlayType("yaml");
    } catch {}
  }, [currentProject]);

  const handleOpenProjectMd = useCallback(async () => {
    if (!currentProject) return;
    try {
      const text = await fetchProjectMd(currentProject);
      setProjectMdContent(text);
      setOverlayType("project-md");
    } catch {}
  }, [currentProject]);

  const handleYamlSaved = useCallback(() => {
    if (currentProject) loadCollection(currentProject);
  }, [currentProject, loadCollection]);

  const handleSaveTemplate = useCallback(async (content: string) => {
    if (!currentProject) return;
    await saveTemplate(currentProject, content);
    setTemplateContent(content);
    setShowTemplateEditor(false);
    await refreshTemplateIssues(currentProject);
  }, [currentProject, refreshTemplateIssues]);

  const handleShowCompliance = useCallback(async () => {
    if (!currentProject) return;
    const items = await fetchTemplateCompliance(currentProject);
    setComplianceItems(items);
  }, [currentProject]);

  const handleToggleIndicators = useCallback(() => {
    setShowIndicators(prev => {
      const next = !prev;
      savePrefs({ show_indicators: next }).catch(() => {});
      return next;
    });
  }, []);

  const handleEditorThemeChange = useCallback((id: string) => {
    setEditorTheme(id);
    savePrefs({ editor_theme: id }).catch(() => {});
  }, []);

  const handleToggleNewProjectFile = useCallback(() => {
    setShowNewProjectFile(prev => {
      const next = !prev;
      savePrefs({ show_new_project_file: next }).catch(() => {});
      return next;
    });
  }, []);

  const handleShowLinkReport = useCallback(async () => {
    if (!currentProject) return;
    const items = await validateProjectLinks(currentProject);
    setLinkReport(items);
    const map: Record<string, number> = {};
    for (const r of items) map[r.path] = r.broken_links.length;
    setBrokenLinkMap(map);
  }, [currentProject]);

  const handleExportHtml = useCallback(() => {
    if (!currentProject) return;
    fetch(`/api/projects/${encodeURIComponent(currentProject)}/export/html`).then(r => r.text()).then(setHtmlPreview).catch(() => {});
  }, [currentProject]);

  const handleReport = useCallback(() => {
    if (!currentProject) return;
    fetch(`/api/projects/${encodeURIComponent(currentProject)}/report/html`).then(r => r.text()).then(setReportPreview).catch(() => {});
  }, [currentProject]);

  const handleUseAsTemplate = useCallback(async () => {
    if (!currentProject || !selectedPath) return;
    const { content } = await useFileAsTemplate(currentProject, selectedPath, editorContent);
    setTemplateContent(content);
    await refreshTemplateIssues(currentProject);
  }, [currentProject, selectedPath, editorContent, refreshTemplateIssues]);

  const handleApplyTemplate = useCallback(async (removeExtra = false, applyFm = true, appendBody = true) => {
    if (!currentProject || !selectedPath) return;
    const { content } = await applyTemplate(currentProject, selectedPath, removeExtra, applyFm, appendBody);
    setEditorContent(content);
    setFrontmatterIssueMap(prev => { const next = { ...prev }; delete next[selectedPath]; return next; });
    setTemplateIssueMap(prev => { const next = { ...prev }; delete next[selectedPath]; return next; });
  }, [currentProject, selectedPath]);

  const handleBatchApply = useCallback(async (files: string[], removeExtra: boolean, applyFm = true, appendBody = true) => {
    if (!currentProject) return;
    await batchApplyTemplate(currentProject, files, removeExtra, applyFm, appendBody);
    setComplianceItems(null);
    await Promise.all([loadCollection(currentProject), refreshTemplateIssues(currentProject), refreshBrokenLinks(currentProject)]);
    const fileSet = new Set(files);
    const openAffected = tabs.filter(t => t.type === "editor" && fileSet.has(t.path));
    if (openAffected.length > 0) {
      const updates = await Promise.all(
        openAffected.map(t => fetchMarkdown(currentProject, t.path).then(text => ({ path: t.path, text })))
      );
      const updateMap = new Map(updates.map(u => [u.path, u.text]));
      setTabs(prev => prev.map(t => updateMap.has(t.path) ? { ...t, content: updateMap.get(t.path)!, savedContent: updateMap.get(t.path)! } : t));
      if (selectedPath && updateMap.has(selectedPath)) {
        const text = updateMap.get(selectedPath)!;
        setEditorContent(text);
        setSavedContent(text);
      }
    }
  }, [currentProject, loadCollection, refreshTemplateIssues, refreshBrokenLinks, selectedPath, tabs]);

  const handleFileSaved = useCallback((path: string, content: string) => {
    setSavedContent(content);
    savedContentRef.current = content;
    if (currentProject) {
      validateFileLinks(currentProject, path).then(broken => {
        setFileBrokenLinks(broken);
        setBrokenLinkMap(prev => {
          const next = { ...prev };
          if (broken.length > 0) next[path] = broken.length;
          else delete next[path];
          return next;
        });
      }).catch(() => {});
      refreshTemplateIssues(currentProject);
    }
    if (activeTabIdRef.current) {
      const h1Candidate = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? {
        ...t, content, savedContent: content, ...(h1Candidate ? { title: h1Candidate } : {}),
      } : t));
    }
    const h1 = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
    if (!h1) return;
    const updateTitle = (nodes: FileNode[]): FileNode[] =>
      nodes.map(n => n.path === path ? { ...n, title: h1 } : { ...n, children: updateTitle(n.children ?? []) });
    setCollection(prev => ({ root: updateTitle(prev.root) }));
  }, [currentProject, refreshTemplateIssues]);

  const handleCollectionChange = useCallback(async (c: CollectionStructure) => {
    if (!currentProject) return;
    setCollection(c);
    try {
      await saveCollection(currentProject, c);
      const o = await fetchOrphans(currentProject);
      setOrphans(o);
      if (c.root.length > 0) setHasHierarchyBackup(false);
    } catch {}
  }, [currentProject]);

  const makeNewTab = (path: string, content: string, title: string, brokenLinks: BrokenLink[]): EditorTab => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: "editor",
    path, content, savedContent: content, title, frontmatter: {}, brokenLinks,
    colorIndex: tabsRef.current.length === 0 ? 0 : (tabsRef.current[tabsRef.current.length - 1].colorIndex === 0 ? 1 : 0),
  });

  const openNewTab = (tab: EditorTab) => {
    if (activeTabIdRef.current) {
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: editorContentRef.current } : t));
    }
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
    setSelectedPath(tab.path);
    setEditorContent(tab.content);
    setSavedContent(tab.content);
    setOverlayType("editor");
  };

  const handleCreateFile = useCallback(async (filename: string) => {
    if (!currentProject) return;
    await createFile(currentProject, filename);
    const title = filename.replace(/\.md$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const newNode: FileNode = { path: filename, title, order: 0, children: [] };
    const newRoot = reorder([...collection.root, newNode]);
    await saveCollection(currentProject, { root: newRoot });
    setCollection({ root: newRoot });
    const o = await fetchOrphans(currentProject);
    setOrphans(o);
    const initContent = await fetchMarkdown(currentProject, filename);
    openNewTab(makeNewTab(filename, initContent, title, []));
  }, [currentProject, collection]);

  const handleDeleteFile = useCallback(async (path: string) => {
    if (!currentProject) return;
    await archiveFile(currentProject, path);
    const tabToClose = tabsRef.current.find(t => t.path === path);
    if (tabToClose) {
      const next = tabsRef.current.filter(t => t.path !== path);
      setTabs(next);
      if (tabToClose.id === activeTabIdRef.current) {
        if (next.length === 0) {
          setActiveTabId(null);
          setOverlayType(null);
          setSelectedPath(null);
        } else {
          const newActive = next[next.length - 1];
          setActiveTabId(newActive.id);
          setSelectedPath(newActive.path);
          setEditorContent(newActive.content);
          setSavedContent(newActive.savedContent);
          setFileBrokenLinks(newActive.brokenLinks);
          setOverlayType("editor");
        }
      }
    } else if (selectedPath === path) {
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
    const newRoot = reorder(insertAsLastChild(collection.root, parentPath, newNode));
    await saveCollection(currentProject, { root: newRoot });
    setCollection({ root: newRoot });
    const o = await fetchOrphans(currentProject);
    setOrphans(o);
    const initContent = await fetchMarkdown(currentProject, filename);
    openNewTab(makeNewTab(filename, initContent, title, []));
  }, [currentProject, collection]);

  const handleCopyToChildFile = useCallback(async (parentPath: string) => {
    if (!currentProject) return;
    const source = await fetchMarkdown(currentProject, parentPath).catch(() => "");
    const stem = parentPath.replace(/\.md$/, "");
    const newFilename = `${stem}-copy.md`;
    await createFile(currentProject, newFilename);
    const findTitle = (nodes: FileNode[]): string => {
      for (const n of nodes) {
        if (n.path === parentPath) return n.title;
        const found = findTitle(n.children ?? []);
        if (found) return found;
      }
      return "";
    };
    const title = `${findTitle(collection.root) || stem}-copy`;
    const newContent = source.replace(/^(#\s+).+$/m, `$1${title}`);
    await saveMarkdown(currentProject, newFilename, newContent);
    const newNode: FileNode = { path: newFilename, title, order: 0, children: [] };
    const newRoot = reorder(insertAsLastChild(collection.root, parentPath, newNode));
    await saveCollection(currentProject, { root: newRoot });
    setCollection({ root: newRoot });
    const o = await fetchOrphans(currentProject);
    setOrphans(o);
    openNewTab(makeNewTab(newFilename, newContent, title, []));
  }, [currentProject, collection]);

  const handleRenameFile = useCallback(async (oldPath: string, newName: string) => {
    if (!currentProject) return;
    let name = newName.trim().replace(/ /g, "-");
    if (!name.endsWith(".md")) name += ".md";
    const { new_path } = await renameFile(currentProject, oldPath, name);
    if (selectedPath === oldPath) setSelectedPath(new_path);
    setTabs(prev => prev.map(t => t.path === oldPath ? { ...t, path: new_path } : t));
    await loadCollection(currentProject);
  }, [currentProject, selectedPath, loadCollection]);

  const handleRefresh = useCallback(async () => {
    if (!currentProject) return;
    const ps = await listProjects();
    setProjects(ps.filter((p: ProjectInfo) => !p.archived));
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#fff", fontWeight: "bold", fontSize: "20px", lineHeight: 1 }}>Pi<span style={{ color: "#f90" }}>T</span>H</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", fontStyle: "italic", lineHeight: 1, position: "relative", top: -1 }}>visual markdown workspace</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSearchOpen(o => !o)} title="Search (Ctrl+F)"
            style={{ background: searchOpen ? "rgba(255,255,255,0.15)" : "transparent", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center" }}
            onMouseEnter={(e) => { (e.currentTarget.querySelector("svg") as SVGElement).style.opacity = "1"; e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
            onMouseLeave={(e) => { (e.currentTarget.querySelector("svg") as SVGElement).style.opacity = searchOpen ? "1" : "0.7"; e.currentTarget.style.background = searchOpen ? "rgba(255,255,255,0.15)" : "transparent"; }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", opacity: searchOpen ? 1 : 0.7 }}>
              <circle cx="6.5" cy="6.5" r="4.5" stroke="white" strokeWidth="2"/>
              <line x1="10" y1="10" x2="14.5" y2="14.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button onClick={() => fetch(`/api/open-url?url=${encodeURIComponent("https://rick-does.github.io/pith/")}`)} title="Documentation"
            style={{ background: "transparent", border: "none", borderRadius: "50%", color: "#fff", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; (e.currentTarget.querySelector("svg") as SVGElement).style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; (e.currentTarget.querySelector("svg") as SVGElement).style.opacity = "0.7"; }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", opacity: 0.7 }}>
              <circle cx="10" cy="10" r="9" stroke="white" strokeWidth="2"/>
              <text x="10" y="15" textAnchor="middle" fill="white" fontSize="12" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontWeight="bold">?</text>
            </svg>
          </button>
          <button onClick={() => fetch(`/api/open-url?url=${encodeURIComponent("https://github.com/rick-does/pith")}`)} title="GitHub — source, issues, contact"
            style={{ background: "transparent", border: "none", borderRadius: "50%", color: "#fff", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; (e.currentTarget.querySelector("svg") as SVGElement).style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; (e.currentTarget.querySelector("svg") as SVGElement).style.opacity = "0.7"; }}
          >
            <svg width="20" height="20" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", opacity: 0.7 }}>
              <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" fill="white"/>
            </svg>
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
          orphans={orphans}
          onRefresh={handleRefresh}
          treeOps={{
            onDelete: handleDeleteFile,
            onRename: handleRenameFile,
            onCreateChild: handleCreateChildFile,
            onCopyToChild: handleCopyToChildFile,
          }}
          indicators={{ brokenLinkMap, frontmatterIssueMap, templateIssueMap }}
          chip={{
            currentProject: currentProject ?? "",
            currentProjectTitle: projects.find(p => p.name === currentProject)?.title ?? currentProject ?? "",
            recentProjects: recentProjectNames.map(n => projects.find(p => p.name === n)).filter(Boolean) as ProjectInfo[],
            titleMode,
            setTitleMode: (mode: boolean) => { setTitleMode(mode); savePrefs({ title_mode: mode }).catch(() => {}); },
            onSwitchProject: handleSwitchProject,
            onNewProject: () => setNewProjectOpen(true),
            onOpenProject: () => setOpenProjectOpen(true),
            onArchiveProject: handleArchiveProject,
            onOpenProjectMd: handleOpenProjectMd,
            onCreateFile: handleCreateFile,
            onAddFileFromMd: () => setAddFileDialogOpen(true),
            onOpenYaml: handleOpenYaml,
            onImport: (fmt) => setImportModal({ format: fmt }),
            onExport: (fmt) => setExportModal({ format: fmt }),
            onEditTemplate: () => setShowTemplateEditor(true),
            onCheckCompliance: handleShowCompliance,
            onValidateLinks: handleShowLinkReport,
            onExportHtml: handleExportHtml,
            onReport: handleReport,
            hasHierarchyBackup,
            onFlattenHierarchy: async () => {
              if (!currentProject) return;
              await flattenHierarchy(currentProject);
              setHasHierarchyBackup(true);
              await handleRefresh();
            },
            onRestoreHierarchy: async () => {
              if (!currentProject) return;
              await restoreHierarchy(currentProject);
              setHasHierarchyBackup(false);
              await loadCollection(currentProject);
            },
            showIndicators,
            onToggleIndicators: handleToggleIndicators,
            showNewProjectFile,
            onToggleNewProjectFile: handleToggleNewProjectFile,
            onBrowseImages: () => { setImageBrowserTriggerAdd(false); setImageBrowserOpen(true); },
            onAddImages: () => { setImageBrowserTriggerAdd(true); setImageBrowserOpen(true); },
            onOpenImagesFolder: () => { if (currentProject) openImagesFolder(currentProject); },
          }}
        />
      </div>

      <div
        className={`overlay-panel${overlayOpen ? " overlay-panel--open" : ""}`}
        style={tabs.length > 0 ? {
          width: 1171,
          transform: overlayOpen ? "translateX(0)" : "translateX(calc(100% - 52px))",
        } : undefined}
      >
        {tabs.length > 0 && (
          <div style={{ width: 52, flexShrink: 0, display: "flex", flexDirection: "column", background: "transparent", paddingTop: 133, position: "relative" }}>
            {!overlayOpen && (
              <button onClick={() => { const t = tabs.find(t => t.id === activeTabId); if (t) setOverlayType("editor"); }} title="Open editor"
                style={{ position: "absolute", top: 72, right: 0, width: 32, height: 32, background: "#fff", border: "none", borderRadius: "4px 0 0 4px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, color: "#555", padding: 0, lineHeight: 1, filter: "drop-shadow(0 0 10px rgba(125,128,136,0.75))" }}>&#xAB;</button>
            )}
            {overlayOpen && (
              <button onClick={handleCloseOverlay} title="Close editor"
                style={{ position: "absolute", top: 72, right: 0, width: 32, height: 32, background: "#fff", border: "none", borderRadius: "4px 0 0 4px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, color: "#555", padding: 0, lineHeight: 1, filter: "drop-shadow(0 0 10px rgba(125,128,136,0.75))" }}>&#xBB;</button>
            )}
            <div style={{ background: "transparent", filter: "drop-shadow(0 0 25px rgba(90,95,105,0.95))", borderRadius: "14px 0 0 14px", padding: "20px 0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {tabs.map((tab) => {
                const tabStyle = TAB_STYLES[tab.colorIndex % TAB_STYLES.length];
                const isActive = tab.id === activeTabId;
                const isDirty = tab.id === activeTabId ? editorContent !== savedContent : tab.content !== tab.savedContent;
                const label = titleMode ? tab.title : tab.path.replace(/\.md$/, "");
                return (
                  <div key={tab.id} title={label} className="editor-tab" onClick={() => handleSwitchTab(tab.id)}
                    onContextMenu={(e) => { e.preventDefault(); setTabContextMenu({ tabId: tab.id, x: e.clientX, y: e.clientY }); }}
                    style={{ width: isActive ? 35 : 32, minHeight: 120, marginLeft: isActive ? -3 : 0, paddingLeft: isActive ? 3 : 0, background: tabStyle.bg, border: `1.5px solid ${tabStyle.border}`, borderRight: "none", borderRadius: "10px 0 0 10px", boxShadow: isActive ? `inset 5px 0 0 0 ${tabStyle.border}` : "none", cursor: "pointer", userSelect: "none", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingTop: 4, paddingBottom: 6, paddingRight: 1.5 }}
                  >
                    <button onClick={e => { e.stopPropagation(); handleCloseTab(tab.id); }} title="Close" className="editor-tab-close"
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: 0, lineHeight: 1, width: 16, height: 16, display: overlayOpen ? "flex" : "none", alignItems: "center", justifyContent: "center", flexShrink: 0, transform: "translateX(4px)" }}>&#x2715;</button>
                    <div style={{ flex: 1 }} />
                    <span style={{ writingMode: "vertical-rl" as const, transform: "rotate(180deg) translateX(-3px)", fontSize: 15, fontWeight: 500, lineHeight: 1.2, color: tabStyle.text, overflow: "hidden", whiteSpace: "nowrap", maxHeight: 80, flexShrink: 0 }}>{label}</span>
                    <div title={isDirty ? "Not saved" : undefined} style={{ width: 9, height: 9, marginTop: 6, borderRadius: "50%", background: isDirty ? tabStyle.indicator : "transparent", flexShrink: 0, transform: "translateX(4px)" }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", overflow: "hidden", background: "#1a1a2e", boxShadow: "-8px 0 20px rgba(125,128,136,0.6)" }}>
          <span className="overlay-close-btn" onClick={handleCloseOverlay}>&#10005;</span>
          {overlayType === "editor" && selectedPath && (
            <MarkdownEditor
              ref={markdownEditorRef}
              key={selectedPath}
              project={currentProject ?? undefined}
              path={selectedPath}
              content={editorContent}
              savedContent={savedContent}
              onContentChange={setEditorContent}
              viMode={viMode}
              onViModeChange={setViMode}
              onSaved={handleFileSaved}
              onSave={async (path, content) => { if (currentProject) await saveMarkdown(currentProject, path, content); }}
              onRename={handleRenameFile}
              onUseAsTemplate={handleUseAsTemplate}
              onApplyTemplate={handleApplyTemplate}
              onEditTemplate={() => setShowTemplateEditor(true)}
              onViewCompliance={handleShowCompliance}
              onClose={handleCloseOverlay}
              onReport={handleReport}
              onOpenImageBrowser={() => { setImageBrowserTriggerAdd(false); setImageBrowserOpen(true); }}
              brokenLinks={fileBrokenLinks}
              editorTheme={editorTheme}
              onEditorThemeChange={handleEditorThemeChange}
            />
          )}
          {overlayType === "yaml" && (
            <YAMLEditor yamlContent={yamlContent} onYamlChange={setYamlContent} onSaved={handleYamlSaved} viMode={viMode} readOnly />
          )}
          {overlayType === "project-md" && currentProject && (
            <MarkdownEditor
              key={`project-md-${currentProject}`}
              path={currentProject}
              content={projectMdContent}
              savedContent={projectMdContent}
              onContentChange={setProjectMdContent}
              viMode={viMode}
              onViModeChange={setViMode}
              onSave={async (_path, content) => { await saveProjectMd(currentProject, content); }}
              onRename={async (_oldName, newName) => {
                const dirName = newName.trim().replace(/\s+/g, "-").replace(/[/\\<>:"|?*\0]/g, "").toLowerCase();
                if (!dirName || dirName === currentProject) return;
                try {
                  await renameProject(currentProject, dirName);
                  const ps = await listProjects();
                  setProjects(ps.filter((p: ProjectInfo) => !p.archived));
                  setRecentProjectNames(prev => prev.map(n => n === currentProject ? dirName : n));
                  setCurrentProject(dirName);
                  setLastProject(dirName).catch(() => {});
                  const text = await fetchProjectMd(dirName);
                  setProjectMdContent(text);
                } catch (e: any) {
                  alert(e.message ?? "Failed to rename project");
                }
              }}
              editorTheme={editorTheme}
              onEditorThemeChange={handleEditorThemeChange}
            />
          )}
        </div>
      </div>

      {tabContextMenu && (() => {
        const ctxTab = tabs.find(t => t.id === tabContextMenu.tabId);
        if (!ctxTab) return null;
        const nextLabel = ctxTab.colorIndex === 0 ? "blue" : "orange";
        return (
          <div onMouseDown={e => e.stopPropagation()}
            style={{ position: "fixed", top: tabContextMenu.y, left: tabContextMenu.x, zIndex: 1000, background: "#fff", border: "1px solid #d0e0f0", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", padding: "4px 0", minWidth: 130 }}
          >
            <div style={{ padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#333" }}
              onClick={() => { setTabs(prev => prev.map(t => t.id === tabContextMenu.tabId ? { ...t, colorIndex: t.colorIndex === 0 ? 1 : 0 } : t)); setTabContextMenu(null); }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "#f0f6ff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >Change to {nextLabel}</div>
          </div>
        );
      })()}

      {error && (
        <div style={{ position: "fixed", bottom: "16px", left: "50%", transform: "translateX(-50%)", background: "#c00", color: "#fff", padding: "8px 16px", borderRadius: "4px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {importModal && currentProject && (
        <ImportModal
          onImportMkdocs={async () => { await importFromFormat(currentProject, "mkdocs"); setImportModal(null); await loadCollection(currentProject); }}
          onImportDocusaurus={async (filename?: string) => { await importFromFormat(currentProject, "docusaurus", filename); setImportModal(null); await loadCollection(currentProject); }}
          onClose={() => setImportModal(null)}
        />
      )}

      {exportModal && currentProject && (
        <ExportModal
          format={exportModal.format}
          resultPath=""
          onExport={async () => { const result = await exportToFormat(currentProject, exportModal.format); setExportModal(null); window.alert(`Exported to: ${result.path}`); }}
          onClose={() => setExportModal(null)}
        />
      )}

      {imageBrowserOpen && currentProject && (
        <ImageBrowser
          project={currentProject}
          editorOpen={overlayType === "editor" && selectedPath !== null}
          selectedPath={selectedPath}
          onInsert={(markdown) => { markdownEditorRef.current?.insertText(markdown); }}
          onClose={() => { setImageBrowserOpen(false); setImageBrowserTriggerAdd(false); }}
          triggerAdd={imageBrowserTriggerAdd}
        />
      )}

      {searchOpen && currentProject && (
        <SearchPanel currentProject={currentProject} onOpen={(path) => { setSearchOpen(false); handleSelect(path); }} onClose={() => setSearchOpen(false)} />
      )}

      {showTemplateEditor && (
        <TemplateEditor
          content={templateContent}
          onSave={handleSaveTemplate}
          onClose={() => setShowTemplateEditor(false)}
          onViewCompliance={handleShowCompliance}
          onApply={selectedPath ? (removeExtra, applyFm, appendBody) => handleApplyTemplate(removeExtra, applyFm, appendBody) : undefined}
          prefs={templatePrefs}
          onPrefsChange={handlePrefsChange}
        />
      )}

      {complianceItems !== null && (
        <ComplianceReport
          items={complianceItems}
          onBatchApply={handleBatchApply}
          onClose={() => setComplianceItems(null)}
          onViewTemplate={() => { setComplianceItems(null); setShowTemplateEditor(true); }}
          prefs={templatePrefs}
          onPrefsChange={handlePrefsChange}
        />
      )}

      {linkReport !== null && (
        <LinkReport items={linkReport} onOpen={handleSelect} onClose={() => setLinkReport(null)} />
      )}

      {htmlPreview !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#fff", display: "flex", flexDirection: "column" }}>
          <div style={{ height: 50, background: "#1a6fa8", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 15, flex: 1 }}>Export Preview</span>
            <button onClick={() => { const blob = new Blob([htmlPreview], { type: "text/html" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${currentProject}.html`; a.click(); URL.revokeObjectURL(a.href); }}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>Save as HTML</button>
            <button onClick={() => htmlIframeRef.current?.contentWindow?.print()}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>Print / Save as PDF</button>
            <button onClick={() => setHtmlPreview(null)}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>Close</button>
          </div>
          <iframe ref={htmlIframeRef} srcDoc={htmlPreview} style={{ flex: 1, border: "none", width: "100%" }} title="Export preview" />
        </div>
      )}

      {reportPreview !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#fff", display: "flex", flexDirection: "column" }}>
          <div style={{ height: 50, background: "#1a6fa8", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 15, flex: 1 }}>Scan Project</span>
            <button onClick={() => { const blob = new Blob([reportPreview], { type: "text/html" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${currentProject}-report.html`; a.click(); URL.revokeObjectURL(a.href); }}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>Save as HTML</button>
            <button onClick={() => reportIframeRef.current?.contentWindow?.print()}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>Print / Save as PDF</button>
            <button onClick={() => setReportPreview(null)}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>Close</button>
          </div>
          <iframe ref={reportIframeRef} srcDoc={reportPreview} style={{ flex: 1, border: "none", width: "100%" }} title="Analysis report" />
        </div>
      )}

      {newProjectOpen && (
        <NewProjectDialog
          currentProject={currentProject}
          onCreated={async (dirName) => {
            const ps = await listProjects();
            setProjects(ps.filter((p: ProjectInfo) => !p.archived));
            await handleSwitchProject(dirName);
            setNewProjectOpen(false);
          }}
          onClose={() => setNewProjectOpen(false)}
        />
      )}

      {openProjectOpen && (
        <OpenProjectDialog
          currentProject={currentProject}
          onOpen={async (name) => {
            setOpenProjectOpen(false);
            await handleSwitchProject(name);
          }}
          onClose={() => setOpenProjectOpen(false)}
        />
      )}

      {addFileDialogOpen && currentProject && (
        <AddFileDialog
          currentProject={currentProject}
          onAdded={() => { setAddFileDialogOpen(false); handleRefresh(); }}
          onClose={() => setAddFileDialogOpen(false)}
        />
      )}
    </div>
  );
}
