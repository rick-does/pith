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
import {
  listProjects, createProject, archiveProject, renameProject,
  fetchProjectMd, saveProjectMd,
  fetchCollection, saveCollection, fetchMarkdown, saveMarkdown, fetchCollectionYaml,
  fetchOrphans, createFile, deleteFile, archiveFile, renameFile,
  fetchTemplate, saveTemplate, deleteTemplate,
  fetchTemplateCompliance, applyTemplate, batchApplyTemplate, useFileAsTemplate,
  restoreDocStructure, restoreDocAll,
  validateProjectLinks, validateFileLinks,
  importFromFormat, exportToFormat,
  importMarkdowns, importFiles, browseDirs, browseStartDir,
  flattenHierarchy, restoreHierarchy, checkHierarchyBackup,
  fetchConfig, fetchRoots, addRoot, removeRoot, switchRoot, setLastProject,
  uploadImages, openImagesFolder,
  fetchPrefs, savePrefs,
} from "./api";
import type { CollectionStructure, FileInfo, FileNode, ProjectInfo } from "./types";
import type { TemplateComplianceItem, FileLinkReport, BrokenLink, RootInfo } from "./api";
import { insertAsLastChild, reorder } from "./treeHelpers";

const LAST_FILE_KEY = "pith_selected_file";
const TABS_KEY = (p: string) => `pith_tabs_${p}`;
const ACTIVE_TAB_KEY = (p: string) => `pith_active_tab_${p}`;

type OverlayType = "editor" | "yaml" | "project-md" | null;

interface EditorTab {
  id: string;
  type: "editor";
  path: string;
  content: string;
  savedContent: string;
  title: string;
  frontmatter: Record<string, any>;
  brokenLinks: BrokenLink[];
}

const TAB_STYLES = [
  { bg: "#e8f4fd", text: "#555", border: "#1a6fa8", indicator: "#ff8c00" },
  { bg: "#fff3e0", text: "#555", border: "#ff8c00", indicator: "#1a6fa8" },
];

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
  const [imageBrowserOpen, setImageBrowserOpen] = useState(false);
  const [imageBrowserTriggerAdd, setImageBrowserTriggerAdd] = useState(false);
  const [templateContent, setTemplateContent] = useState("");
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [complianceItems, setComplianceItems] = useState<TemplateComplianceItem[] | null>(null);
  const [templatePrefs, setTemplatePrefs] = useState({ applyFm: true, removeExtra: true, appendBody: false });
  const handlePrefsChange = useCallback((prefs: typeof templatePrefs) => {
    setTemplatePrefs(prefs);
    savePrefs({ apply_fm: prefs.applyFm, remove_extra: prefs.removeExtra, append_body: prefs.appendBody });
  }, []);
  const [linkReport, setLinkReport] = useState<FileLinkReport[] | null>(null);
  const [fileBrokenLinks, setFileBrokenLinks] = useState<BrokenLink[]>([]);
  const [brokenLinkMap, setBrokenLinkMap] = useState<Record<string, number>>({});
  const [frontmatterIssueMap, setFrontmatterIssueMap] = useState<Record<string, boolean>>({});
  const [templateIssueMap, setTemplateIssueMap] = useState<Record<string, boolean>>({});
  const [showIndicators, setShowIndicators] = useState(() => localStorage.getItem("pith_indicators") !== "false");
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [reportPreview, setReportPreview] = useState<string | null>(null);
  const [hasHierarchyBackup, setHasHierarchyBackup] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDir, setNewProjectDir] = useState("");
  const [newProjectDirEdited, setNewProjectDirEdited] = useState(false);
  const [newProjectMdExpanded, setNewProjectMdExpanded] = useState(false);
  const [newProjectError, setNewProjectError] = useState("");
  const [folderBrowserPath, setFolderBrowserPath] = useState("");
  const [folderBrowserDirs, setFolderBrowserDirs] = useState<string[]>([]);
  const [folderBrowserFiles, setFolderBrowserFiles] = useState<string[]>([]);
  const [folderBrowserParent, setFolderBrowserParent] = useState<string | null>(null);
  const [addFileDialogOpen, setAddFileDialogOpen] = useState(false);
  const [addFileSelected, setAddFileSelected] = useState<Set<string>>(new Set());
  const [addFileError, setAddFileError] = useState("");
  const [roots, setRoots] = useState<RootInfo[]>([]);
  const [currentRoot, setCurrentRoot] = useState("");
  const [newRootOpen, setNewRootOpen] = useState(false);
  const [newRootName, setNewRootName] = useState("");
  const [newRootDescription, setNewRootDescription] = useState("");
  const [newRootCreateDir, setNewRootCreateDir] = useState(false);
  const [newRootNewDirName, setNewRootNewDirName] = useState("");
  const [newRootError, setNewRootError] = useState("");
  const [rootBrowserPath, setRootBrowserPath] = useState("");
  const [rootBrowserDirs, setRootBrowserDirs] = useState<string[]>([]);
  const [rootBrowserParent, setRootBrowserParent] = useState<string | null>(null);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [titleMode, setTitleMode] = useState(() => localStorage.getItem("pith_title_mode") !== "false");

  const editorContentRef = useRef(editorContent);
  const savedContentRef = useRef(savedContent);
  const markdownEditorRef = useRef<MarkdownEditorHandle>(null);
  const htmlIframeRef = useRef<HTMLIFrameElement>(null);
  const reportIframeRef = useRef<HTMLIFrameElement>(null);
  const folderBrowserScrollRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  const tabsRestoredRef = useRef(false);
  useEffect(() => { editorContentRef.current = editorContent; }, [editorContent]);
  useEffect(() => { savedContentRef.current = savedContent; }, [savedContent]);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

  useEffect(() => {
    if (!currentProject || loading || !tabsRestoredRef.current) return;
    localStorage.setItem(TABS_KEY(currentProject), JSON.stringify(tabs));
    localStorage.setItem(TABS_KEY(currentProject) + "_overlay", overlayType ?? "");
    if (activeTabId) localStorage.setItem(ACTIVE_TAB_KEY(currentProject), activeTabId);
  }, [tabs, activeTabId, overlayType, currentProject, loading]);

  const handleCloseOverlay = useCallback(() => {
    if (activeTabIdRef.current) {
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: editorContentRef.current } : t));
    }
    setOverlayType(null);
    localStorage.removeItem(LAST_FILE_KEY);
  }, []);

  const handleSwitchTab = useCallback((id: string) => {
    if (activeTabIdRef.current) {
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: editorContentRef.current } : t));
    }
    const tab = tabsRef.current.find(t => t.id === id);
    if (!tab) return;
    setActiveTabId(id);
    setSelectedPath(tab.path);
    setEditorContent(tab.content);
    setSavedContent(tab.savedContent);
    setFileBrokenLinks(tab.brokenLinks);
    setOverlayType("editor");
  }, []);

  const handleCloseTab = useCallback((id: string) => {
    const currentActiveId = activeTabIdRef.current;
    const allTabs = tabsRef.current;
    const tab = allTabs.find(t => t.id === id);
    if (!tab) return;
    const isDirty = id === currentActiveId
      ? editorContentRef.current !== savedContentRef.current
      : tab.content !== tab.savedContent;
    if (isDirty && !window.confirm(`"${tab.path}" has unsaved changes.\n\nClose without saving?`)) return;
    const next = allTabs.filter(t => t.id !== id);
    setTabs(next);
    if (id === currentActiveId) {
      if (next.length === 0) {
        setActiveTabId(null);
        setOverlayType(null);
        setSelectedPath(null);
      } else {
        const idx = allTabs.findIndex(t => t.id === id);
        const newActive = next[Math.max(0, idx - 1)];
        setActiveTabId(newActive.id);
        setSelectedPath(newActive.path);
        setEditorContent(newActive.content);
        setSavedContent(newActive.savedContent);
        setFileBrokenLinks(newActive.brokenLinks);
        setOverlayType("editor");
      }
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && !overlayType) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [overlayType, handleCloseOverlay]);

  const lastFileCountRef = useRef<number>(-1);

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
            applyFm: "apply_fm" in prefs ? Boolean(prefs.apply_fm) : prev.applyFm,
            removeExtra: "remove_extra" in prefs ? Boolean(prefs.remove_extra) : prev.removeExtra,
            appendBody: "append_body" in prefs ? Boolean(prefs.append_body) : prev.appendBody,
          }));
        }
        const rootList = cfg.roots.map((r: RootInfo) => ({ ...r, active: r.path === cfg.active_root }));
        setRoots(rootList);
        setCurrentRoot(cfg.active_root);
        setProjects(ps);
        if (ps.length === 0) {
          setLoading(false);
          return;
        }
        const activeRoot = rootList.find((r: RootInfo) => r.active);
        const lastProject = activeRoot?.last_project;
        const project = (lastProject && ps.some((p: ProjectInfo) => p.name === lastProject)) ? lastProject : ps[0].name;
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
    if (loading || !currentProject) return;
    try {
      const stored = localStorage.getItem(TABS_KEY(currentProject));
      if (stored) {
        const parsedTabs: EditorTab[] = JSON.parse(stored);
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
    } catch {}
    tabsRestoredRef.current = true;
    const savedPath = localStorage.getItem(LAST_FILE_KEY);
    if (savedPath) handleSelect(savedPath).catch(() => localStorage.removeItem(LAST_FILE_KEY));
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
          loadCollection(currentProject);
        } else {
          lastFileCountRef.current = count;
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [currentProject, loadCollection]);

  const handleSwitchProject = useCallback(async (name: string) => {
    tabsRestoredRef.current = false;
    setTabs([]);
    setActiveTabId(null);
    setCurrentProject(name);
    setLastProject(name).catch(() => {});
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
      localStorage.setItem("pith_indicators", String(next));
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
    const url = `/api/projects/${encodeURIComponent(currentProject)}/export/html`;
    fetch(url).then(r => r.text()).then(setHtmlPreview).catch(() => {});
  }, [currentProject]);

  const handleReport = useCallback(() => {
    if (!currentProject) return;
    const url = `/api/projects/${encodeURIComponent(currentProject)}/report/html`;
    fetch(url).then(r => r.text()).then(setReportPreview).catch(() => {});
  }, [currentProject]);

  const navigateFolderBrowser = useCallback(async (path: string): Promise<string[]> => {
    try {
      const result = await browseDirs(path);
      setFolderBrowserPath(result.path);
      setFolderBrowserDirs(result.dirs);
      setFolderBrowserFiles(result.files);
      setFolderBrowserParent(result.parent);
      if (folderBrowserScrollRef.current) folderBrowserScrollRef.current.scrollTop = 0;
      return result.files;
    } catch { return []; }
  }, []);

  const handleOpenNewProject = useCallback((expandMarkdowns: boolean) => {
    setNewProjectTitle("");
    setNewProjectDir("");
    setNewProjectDirEdited(false);
    setNewProjectError("");
    setNewProjectMdExpanded(expandMarkdowns);
    setFolderBrowserPath("");
    setFolderBrowserDirs([]);
    setFolderBrowserFiles([]);
    setFolderBrowserParent(null);
    setNewProjectOpen(true);
    if (expandMarkdowns) {
      browseStartDir(currentProject ?? undefined).then(startPath => navigateFolderBrowser(startPath));
    }
  }, [navigateFolderBrowser, currentProject]);

  const handleNewProjectTitleChange = useCallback((title: string) => {
    setNewProjectTitle(title);
    setNewProjectError("");
    if (!newProjectDirEdited) {
      setNewProjectDir(title.trim().replace(/\s+/g, "-").replace(/[/\\<>:"|?*\0]/g, "").toLowerCase());
    }
  }, [newProjectDirEdited]);

  const handleNewProjectDirChange = useCallback((dir: string) => {
    setNewProjectDir(dir);
    setNewProjectDirEdited(true);
    setNewProjectError("");
  }, []);

  const handleNewProjectSubmit = useCallback(async () => {
    const dirName = newProjectDir.trim().replace(/\s+/g, "-").replace(/[/\\<>:"|?*\0]/g, "").toLowerCase();
    if (!dirName || dirName === "." || dirName === "..") {
      setNewProjectError("Invalid project directory name");
      return;
    }
    try {
      if (folderBrowserPath && newProjectMdExpanded) {
        const { name } = await importMarkdowns(folderBrowserPath);
        if (name !== dirName) {
          await renameProject(name, dirName);
        }
        const pmd_title = newProjectTitle.trim() || dirName;
        await saveProjectMd(dirName, `# ${pmd_title}\n`);
      } else {
        await createProject(dirName);
        if (newProjectTitle.trim()) {
          await saveProjectMd(dirName, `# ${newProjectTitle.trim()}\n`);
        }
      }
      const ps = await listProjects();
      setProjects(ps);
      await handleSwitchProject(dirName);
      setNewProjectOpen(false);
    } catch (e: any) {
      setNewProjectError(e.message ?? "Failed to create project");
    }
  }, [newProjectDir, newProjectTitle, folderBrowserPath, newProjectMdExpanded, handleSwitchProject]);

  const navigateRootBrowser = useCallback(async (path: string) => {
    try {
      const data = await browseDirs(path);
      setRootBrowserPath(data.path);
      setRootBrowserDirs(data.dirs);
      setRootBrowserParent(data.parent);
    } catch {}
  }, []);

  const handleOpenNewRoot = useCallback(() => {
    setNewRootName("");
    setNewRootDescription("");
    setNewRootCreateDir(false);
    setNewRootNewDirName("");
    setNewRootError("");
    setRootBrowserPath("");
    setRootBrowserDirs([]);
    setRootBrowserParent(null);
    setNewRootOpen(true);
    browseStartDir().then(startPath => navigateRootBrowser(startPath));
  }, [navigateRootBrowser]);

  const handleAddRoot = useCallback(async () => {
    if (!newRootName.trim()) { setNewRootError("Title is required"); return; }
    if (!rootBrowserPath) { setNewRootError("Select a directory"); return; }
    const targetPath = newRootCreateDir
      ? `${rootBrowserPath}/${newRootNewDirName.trim()}`
      : rootBrowserPath;
    if (newRootCreateDir && !newRootNewDirName.trim()) { setNewRootError("Enter a directory name"); return; }
    try {
      const { path } = await addRoot(targetPath, newRootName.trim(), newRootDescription.trim(), newRootCreateDir);
      const updatedRoots = await fetchRoots();
      setRoots(updatedRoots);
      setNewRootOpen(false);
      const result = await switchRoot(path);
      setCurrentRoot(path);
      setRoots(prev => prev.map(r => ({ ...r, active: r.path === path })));
      setProjects(result.projects);
      if (result.active_project) {
        setCurrentProject(result.active_project);
        await loadCollection(result.active_project);
      } else {
        setCurrentProject(null);
        setCollection({ root: [] });
        setOrphans([]);
      }
    } catch (e: any) {
      setNewRootError(e.message ?? "Failed to add root");
    }
  }, [newRootName, newRootDescription, newRootCreateDir, newRootNewDirName, rootBrowserPath, loadCollection]);

  const handleSwitchRoot = useCallback(async (path: string) => {
    try {
      const result = await switchRoot(path);
      setCurrentRoot(path);
      setRoots(prev => prev.map(r => ({ ...r, active: r.path === path })));
      tabsRestoredRef.current = false;
      setTabs([]);
      setActiveTabId(null);
      setSelectedPath(null);
      setOverlayType(null);
      localStorage.removeItem(LAST_FILE_KEY);
      setProjects(result.projects);
      if (result.active_project) {
        setCurrentProject(result.active_project);
        await loadCollection(result.active_project);
      } else {
        setCurrentProject(null);
        setCollection({ root: [] });
        setOrphans([]);
      }
    } catch {}
  }, [loadCollection]);

  const handleRemoveRoot = useCallback(async (path: string) => {
    try {
      await removeRoot(path);
      const updatedRoots = await fetchRoots();
      setRoots(updatedRoots);
      const active = updatedRoots.find(r => r.active);
      if (active && active.path !== currentRoot) {
        await handleSwitchRoot(active.path);
      }
    } catch (e: any) {
      alert(e.message ?? "Failed to remove root");
    }
  }, [currentRoot, handleSwitchRoot]);

  const handleOpenAddFile = useCallback(() => {
    setAddFileSelected(new Set());
    setAddFileError("");
    setFolderBrowserPath("");
    setFolderBrowserDirs([]);
    setFolderBrowserFiles([]);
    setFolderBrowserParent(null);
    setAddFileDialogOpen(true);
    browseStartDir(currentProject ?? undefined).then(startPath =>
      navigateFolderBrowser(startPath).then(files => setAddFileSelected(new Set(files)))
    );
  }, [navigateFolderBrowser, currentProject]);

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
    if (activeTabIdRef.current) {
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: editorContentRef.current } : t));
    }
    const newTab: EditorTab = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: "editor" as const, path: filename, content: initContent, savedContent: initContent, title, frontmatter: {}, brokenLinks: [],
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setSelectedPath(filename);
    setEditorContent(initContent);
    setSavedContent(initContent);
    setOverlayType("editor");
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
    if (activeTabIdRef.current) {
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: editorContentRef.current } : t));
    }
    const newTab: EditorTab = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: "editor" as const, path: filename, content: initContent, savedContent: initContent, title, frontmatter: {}, brokenLinks: [],
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setSelectedPath(filename);
    setEditorContent(initContent);
    setSavedContent(initContent);
    setOverlayType("editor");
  }, [currentProject, collection]);

  const handleCopyToChildFile = useCallback(async (parentPath: string) => {
    if (!currentProject) return;
    const source = await fetchMarkdown(currentProject, parentPath).catch(() => "");
    const stem = parentPath.replace(/\.md$/, "");
    const newFilename = `${stem}-copy.md`;
    await createFile(currentProject, newFilename);
    // Find the parent's title from the collection and append "-copy"
    const findTitle = (nodes: FileNode[]): string => {
      for (const n of nodes) {
        if (n.path === parentPath) return n.title;
        const found = findTitle(n.children ?? []);
        if (found) return found;
      }
      return "";
    };
    const parentTitle = findTitle(collection.root) || stem;
    const title = `${parentTitle}-copy`;
    // Replace the H1 in the copied content
    const newContent = source.replace(/^(#\s+).+$/m, `$1${title}`);
    await saveMarkdown(currentProject, newFilename, newContent);
    const newNode: FileNode = { path: newFilename, title, order: 0, children: [] };
    const newRoot = reorder(insertAsLastChild(collection.root, parentPath, newNode));
    await saveCollection(currentProject, { root: newRoot });
    setCollection({ root: newRoot });
    const o = await fetchOrphans(currentProject);
    setOrphans(o);
    if (activeTabIdRef.current) {
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: editorContentRef.current } : t));
    }
    const newTab: EditorTab = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: "editor" as const, path: newFilename, content: newContent, savedContent: newContent, title, frontmatter: {}, brokenLinks: [],
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setSelectedPath(newFilename);
    setEditorContent(newContent);
    setSavedContent(newContent);
    setOverlayType("editor");
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
    setProjects(ps);
    await loadCollection(currentProject);
  }, [currentProject, loadCollection]);

  const handleAddFileConfirm = useCallback(async () => {
    if (!currentProject || addFileSelected.size === 0) return;
    const filePaths = [...addFileSelected].map(name => {
      const sep = folderBrowserPath.includes("/") ? "/" : "\\";
      return folderBrowserPath + sep + name;
    });
    try {
      await importFiles(currentProject, filePaths);
      setAddFileDialogOpen(false);
      await handleRefresh();
    } catch (e: any) {
      setAddFileError(e.message ?? "Failed to import files");
    }
  }, [currentProject, addFileSelected, folderBrowserPath, handleRefresh]);

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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#fff", fontWeight: "bold", fontSize: "20px", lineHeight: 1 }}>Pi<span style={{ color: "#f90" }}>T</span>H</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", fontStyle: "italic", lineHeight: 1, position: "relative", top: -1 }}>visual markdown workspace</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setSearchOpen(o => !o)}
            title="Search (Ctrl+F)"
            style={{
              background: searchOpen ? "rgba(255,255,255,0.15)" : "transparent",
              border: "none", borderRadius: 4,
              color: "#fff", cursor: "pointer", padding: "4px 6px",
              display: "flex", alignItems: "center",
            }}
            onMouseEnter={(e) => { (e.currentTarget.querySelector("svg") as SVGElement).style.opacity = "1"; e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
            onMouseLeave={(e) => { (e.currentTarget.querySelector("svg") as SVGElement).style.opacity = searchOpen ? "1" : "0.7"; e.currentTarget.style.background = searchOpen ? "rgba(255,255,255,0.15)" : "transparent"; }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", opacity: searchOpen ? 1 : 0.7 }}>
              <circle cx="6.5" cy="6.5" r="4.5" stroke="white" strokeWidth="2"/>
              <line x1="10" y1="10" x2="14.5" y2="14.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            onClick={() => fetch(`/api/open-url?url=${encodeURIComponent("https://rick-does.github.io/pith/")}`)}
            title="Documentation"
            style={{
              background: "transparent",
              border: "none", borderRadius: "50%",
              color: "#fff", cursor: "pointer", padding: "2px",
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; (e.currentTarget.querySelector("svg") as SVGElement).style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; (e.currentTarget.querySelector("svg") as SVGElement).style.opacity = "0.7"; }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", opacity: 0.7 }}>
              <circle cx="10" cy="10" r="9" stroke="white" strokeWidth="2"/>
              <text x="10" y="15" textAnchor="middle" fill="white" fontSize="12" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontWeight="bold">?</text>
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
          onCreateFile={handleCreateFile}
          onAddFileFromMd={handleOpenAddFile}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          onCreateChildFile={handleCreateChildFile}
          onCopyToChildFile={handleCopyToChildFile}
          onOpenYaml={handleOpenYaml}
          yamlOpen={overlayType === "yaml"}
          orphans={orphans}
          currentProject={currentProject ?? ""}
          currentProjectTitle={projects.find(p => p.name === currentProject)?.title ?? currentProject ?? ""}
          projects={projects}
          onSwitchProject={handleSwitchProject}
          onNewProject={handleOpenNewProject}
          onArchiveProject={handleArchiveProject}
          onOpenProjectMd={handleOpenProjectMd}
          onRefresh={handleRefresh}
          onImport={(fmt) => setImportModal({ format: fmt })}
          onExport={(fmt) => setExportModal({ format: fmt })}
          onEditTemplate={() => setShowTemplateEditor(true)}
          onCheckCompliance={handleShowCompliance}
          onRestoreStructure={handleRestoreStructure}
          onRestoreAll={handleRestoreAll}
          onValidateLinks={handleShowLinkReport}
          onExportHtml={handleExportHtml}
          onReport={handleReport}
          hasHierarchyBackup={hasHierarchyBackup}
          onFlattenHierarchy={async () => {
            if (!currentProject) return;
            await flattenHierarchy(currentProject);
            setHasHierarchyBackup(true);
            await handleRefresh();
          }}
          onRestoreHierarchy={async () => {
            if (!currentProject) return;
            await restoreHierarchy(currentProject);
            setHasHierarchyBackup(false);
            await loadCollection(currentProject);
          }}
          brokenLinkMap={brokenLinkMap}
          frontmatterIssueMap={frontmatterIssueMap}
          templateIssueMap={templateIssueMap}
          showIndicators={showIndicators}
          onToggleIndicators={handleToggleIndicators}
          roots={roots}
          currentRoot={currentRoot}
          onSwitchRoot={handleSwitchRoot}
          onAddRoot={handleOpenNewRoot}
          onRemoveRoot={handleRemoveRoot}
          onBrowseImages={() => { setImageBrowserTriggerAdd(false); setImageBrowserOpen(true); }}
          onAddImages={() => { setImageBrowserTriggerAdd(true); setImageBrowserOpen(true); }}
          onOpenImagesFolder={() => { if (currentProject) openImagesFolder(currentProject); }}
          titleMode={titleMode}
          onTitleModeChange={(mode: boolean) => { setTitleMode(mode); localStorage.setItem("pith_title_mode", String(mode)); }}
        />
      </div>

      <div
        className={`overlay-panel${overlayOpen ? " overlay-panel--open" : ""}`}
        style={tabs.length > 0 ? {
          width: 1171,
          transform: overlayOpen ? "translateX(0)" : "translateX(calc(100% - 52px))",
        } : undefined}
      >
        {/* Notebook tab strip — left edge of the panel */}
        {tabs.length > 0 && (
          <div style={{
            width: 52, flexShrink: 0,
            display: "flex", flexDirection: "column",
            background: "transparent",
            paddingTop: 133,
            position: "relative",
          }}>
          {!overlayOpen && (
            <button
              onClick={() => {
                const activeTab = tabs.find(t => t.id === activeTabId);
                if (!activeTab) return;
                setOverlayType("editor");
              }}
              title="Open editor"
              style={{
                position: "absolute", top: 72, right: 0,
                width: 32, height: 32,
                background: "#fff", border: "none",
                borderRadius: "4px 0 0 4px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 600, color: "#555",
                padding: 0, lineHeight: 1,
                filter: "drop-shadow(0 0 10px rgba(125,128,136,0.75))",
              }}
            >&#xAB;</button>
          )}
          {overlayOpen && (
            <button
              onClick={handleCloseOverlay}
              title="Close editor"
              style={{
                position: "absolute", top: 72, right: 0,
                width: 32, height: 32,
                background: "#fff", border: "none",
                borderRadius: "4px 0 0 4px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 600, color: "#555",
                padding: 0, lineHeight: 1,
                filter: "drop-shadow(0 0 10px rgba(125,128,136,0.75))",
              }}
            >&#xBB;</button>
          )}
          <div style={{
            background: "transparent",
            filter: "drop-shadow(0 0 25px rgba(90,95,105,0.95))",
            borderRadius: "14px 0 0 14px",
            padding: "20px 0 20px 20px",
            display: "flex", flexDirection: "column",
            gap: 10,
          }}>
            {tabs.map((tab, i) => {
              const tabStyle = TAB_STYLES[i % TAB_STYLES.length];
              const isActive = tab.id === activeTabId;
              const isDirty = tab.id === activeTabId
                ? editorContent !== savedContent
                : tab.content !== tab.savedContent;
              const label = titleMode ? tab.title : tab.path.replace(/\.md$/, "");
              return (
                <div
                  key={tab.id}
                  title={label}
                  className="editor-tab"
                  onClick={() => handleSwitchTab(tab.id)}
                  style={{
                    width: isActive ? 35 : 32, minHeight: 120,
                    marginLeft: isActive ? -3 : 0,
                    paddingLeft: isActive ? 3 : 0,
                    background: tabStyle.bg,
                    border: `1.5px solid ${tabStyle.border}`,
                    borderRight: "none",
                    borderRadius: "10px 0 0 10px",
                    boxShadow: isActive ? `inset 5px 0 0 0 ${tabStyle.border}` : "none",
                    cursor: "pointer",
                    userSelect: "none", flexShrink: 0,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "flex-end",
                    paddingTop: 4, paddingBottom: 6,
                    paddingRight: 1.5,
                  }}
                >
                  <button
                    onClick={e => { e.stopPropagation(); handleCloseTab(tab.id); }}
                    title="Close"
                    className="editor-tab-close"
                    style={{
                      background: "none", border: "none",
                      cursor: "pointer", fontSize: 11, padding: 0,
                      lineHeight: 1, width: 16, height: 16,
                      display: overlayOpen ? "flex" : "none",
                      alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >&#x2715;</button>
                  <div style={{ flex: 1 }} />
                  <span style={{
                    writingMode: "vertical-rl" as const,
                    transform: "rotate(180deg)",
                    fontSize: 15, fontWeight: 500, lineHeight: 1.2,
                    color: tabStyle.text,
                    overflow: "hidden", whiteSpace: "nowrap",
                    maxHeight: 80,
                    flexShrink: 0,
                  }}>
                    {label}
                  </span>
                  <div
                    title={isDirty ? "Not saved" : undefined}
                    style={{
                      width: 9, height: 9, marginTop: 6,
                      borderRadius: "50%",
                      background: isDirty ? tabStyle.indicator : "transparent",
                      flexShrink: 0,
                    }}
                  />
                </div>
              );
            })}
          </div>
          </div>
        )}

        {/* Editor content area */}
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
              onSave={async (path, content) => {
                if (!currentProject) return;
                await saveMarkdown(currentProject, path, content);
              }}
              onRename={handleRenameFile}
              onUseAsTemplate={handleUseAsTemplate}
              onApplyTemplate={handleApplyTemplate}
              onEditTemplate={() => setShowTemplateEditor(true)}
              onViewCompliance={handleShowCompliance}
              onClose={handleCloseOverlay}
              onReport={handleReport}
              onOpenImageBrowser={() => { setImageBrowserTriggerAdd(false); setImageBrowserOpen(true); }}
              brokenLinks={fileBrokenLinks}
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
              path={currentProject}
              content={projectMdContent}
              savedContent={projectMdContent}
              onContentChange={setProjectMdContent}
              viMode={viMode}
              onViModeChange={setViMode}
              onSave={async (_path, content) => {
                await saveProjectMd(currentProject, content);
              }}
              onRename={async (_oldName, newName) => {
                const dirName = newName.trim().replace(/\s+/g, "-").replace(/[/\\<>:"|?*\0]/g, "").toLowerCase();
                if (!dirName || dirName === currentProject) return;
                try {
                  await renameProject(currentProject, dirName);
                  const ps = await listProjects();
                  setProjects(ps);
                  setCurrentProject(dirName);
                  setLastProject(dirName).catch(() => {});
                  const text = await fetchProjectMd(dirName);
                  setProjectMdContent(text);
                } catch (e: any) {
                  alert(e.message ?? "Failed to rename project");
                }
              }}
            />
          )}
        </div>
      </div>

      {error && (
        <div style={{ position: "fixed", bottom: "16px", left: "50%", transform: "translateX(-50%)", background: "#c00", color: "#fff", padding: "8px 16px", borderRadius: "4px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {importModal && currentProject && (
        <ImportModal
          onImportMkdocs={async () => {
            await importFromFormat(currentProject, "mkdocs");
            setImportModal(null);
            await loadCollection(currentProject);
          }}
          onImportDocusaurus={async (filename?: string) => {
            await importFromFormat(currentProject, "docusaurus", filename);
            setImportModal(null);
            await loadCollection(currentProject);
          }}
          onClose={() => setImportModal(null)}
        />
      )}

      {exportModal && currentProject && (
        <ExportModal
          format={exportModal.format}
          resultPath=""
          onExport={async () => {
            const result = await exportToFormat(currentProject, exportModal.format);
            setExportModal(null);
            window.alert(`Exported to: ${result.path}`);
          }}
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
        <SearchPanel
          currentProject={currentProject}
          onOpen={(path) => { setSearchOpen(false); handleSelect(path); }}
          onClose={() => setSearchOpen(false)}
        />
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
        <LinkReport
          items={linkReport}
          onOpen={handleSelect}
          onClose={() => setLinkReport(null)}
        />
      )}

      {htmlPreview !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#fff", display: "flex", flexDirection: "column" }}>
          <div style={{
            height: 50, background: "#1a6fa8", display: "flex", alignItems: "center",
            padding: "0 24px", gap: 12, flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 15, flex: 1 }}>Export Preview</span>
            <button
              onClick={() => {
                const blob = new Blob([htmlPreview], { type: "text/html" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `${currentProject}.html`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
            >Save as HTML</button>
            <button
              onClick={() => htmlIframeRef.current?.contentWindow?.print()}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
            >Print / Save as PDF</button>
            <button
              onClick={() => setHtmlPreview(null)}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
            >Close</button>
          </div>
          <iframe
            ref={htmlIframeRef}
            srcDoc={htmlPreview}
            style={{ flex: 1, border: "none", width: "100%" }}
            title="Export preview"
          />
        </div>
      )}

      {reportPreview !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#fff", display: "flex", flexDirection: "column" }}>
          <div style={{
            height: 50, background: "#1a6fa8", display: "flex", alignItems: "center",
            padding: "0 24px", gap: 12, flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 15, flex: 1 }}>Scan Project</span>
            <button
              onClick={() => {
                const blob = new Blob([reportPreview], { type: "text/html" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `${currentProject}-report.html`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
            >Save as HTML</button>
            <button
              onClick={() => reportIframeRef.current?.contentWindow?.print()}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
            >Print / Save as PDF</button>
            <button
              onClick={() => setReportPreview(null)}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
            >Close</button>
          </div>
          <iframe
            ref={reportIframeRef}
            srcDoc={reportPreview}
            style={{ flex: 1, border: "none", width: "100%" }}
            title="Analysis report"
          />
        </div>
      )}

      {newProjectOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
>
          <div style={{ background: "#fff", borderRadius: 8, minWidth: 480, maxWidth: 600, width: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", maxHeight: "80vh" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e8e8e8" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1a3a5c", marginBottom: 12 }}>New Project</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>Project title</div>
                  <input autoFocus value={newProjectTitle}
                    onChange={e => handleNewProjectTitleChange(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleNewProjectSubmit(); }}
                    placeholder="My Documentation"
                    style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #b3d9f7", borderRadius: 4, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>Directory name</div>
                  <input value={newProjectDir}
                    onChange={e => handleNewProjectDirChange(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleNewProjectSubmit(); }}
                    placeholder="my-documentation"
                    style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #b3d9f7", borderRadius: 4, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
                </div>
              </div>
            </div>

            <div style={{ borderBottom: "1px solid #e8e8e8" }}>
              <div
                onClick={() => {
                  const expanding = !newProjectMdExpanded;
                  setNewProjectMdExpanded(expanding);
                  if (expanding && !folderBrowserPath) {
                    browseStartDir(currentProject ?? undefined).then(startPath => navigateFolderBrowser(startPath));
                  }
                }}
                style={{ padding: "10px 20px", fontSize: 13, color: "#1a3a5c", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, userSelect: "none" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f0f7ff")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <span style={{ fontSize: 11, color: "#999" }}>{newProjectMdExpanded ? "\u25BC" : "\u25B6"}</span>
                <span>Copy from Markdowns directory</span>
                {folderBrowserPath && <span style={{ fontSize: 11, color: "#888", fontFamily: "monospace", marginLeft: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{folderBrowserPath}</span>}
              </div>
              {newProjectMdExpanded && (
                <div style={{ display: "flex", flexDirection: "column", height: 280 }}>
                  <div style={{ padding: "4px 20px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => folderBrowserParent !== null && navigateFolderBrowser(folderBrowserParent)}
                      disabled={folderBrowserParent === null}
                      title="Go up"
                      style={{ padding: "3px 8px", border: "1px solid #ccc", borderRadius: 4, background: folderBrowserParent !== null ? "#f5f5f5" : "#fafafa", cursor: folderBrowserParent !== null ? "pointer" : "default", fontSize: 13, color: folderBrowserParent !== null ? "#333" : "#bbb", flexShrink: 0 }}
                    >↑</button>
                    <div style={{ fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                      {folderBrowserPath || "Select a drive"}
                    </div>
                    {folderBrowserPath && (
                      <button onClick={() => { setFolderBrowserPath(""); setFolderBrowserDirs([]); setFolderBrowserFiles([]); setFolderBrowserParent(null); }}
                        title="Clear selection" style={{ padding: "2px 6px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 11, color: "#999", flexShrink: 0 }}>✕</button>
                    )}
                  </div>
                  <div style={{ overflowY: "auto", flex: 1, padding: "2px 0" }}>
                    {folderBrowserDirs.map(dir => {
                      const label = dir.replace(/[\\/]$/, "").split(/[\\/]/).pop() || dir;
                      return (
                        <div key={dir}
                          onClick={() => {
                            navigateFolderBrowser(dir);
                            if (!newProjectTitle && !newProjectDirEdited) {
                              const dirLabel = dir.replace(/[\\/]$/, "").split(/[\\/]/).pop() || "";
                              setNewProjectTitle(dirLabel);
                              setNewProjectDir(dirLabel.replace(/\s+/g, "-").replace(/[/\\<>:"|?*\0]/g, "").toLowerCase());
                            }
                          }}
                          style={{ padding: "6px 20px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#1a3a5c" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#f0f7ff")}
                          onMouseLeave={e => (e.currentTarget.style.background = "")}
                        >
                          <span style={{ fontSize: 15 }}>📁</span>
                          <span>{label}</span>
                        </div>
                      );
                    })}
                    {folderBrowserFiles.length > 0 && folderBrowserDirs.length > 0 && (
                      <div style={{ height: 1, background: "#e8e8e8", margin: "4px 20px" }} />
                    )}
                    {folderBrowserFiles.map(file => (
                      <div key={file}
                        style={{ padding: "5px 20px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, color: "#666" }}
                      >
                        <span style={{ fontSize: 13, color: "#999" }}>📄</span>
                        <span>{file}</span>
                      </div>
                    ))}
                    {folderBrowserDirs.length === 0 && folderBrowserFiles.length === 0 && (
                      <div style={{ padding: "12px 20px", fontSize: 13, color: "#999" }}>Empty directory.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {newProjectError && (
              <div style={{ padding: "8px 20px 0", color: "#c0392b", fontSize: 12 }}>{newProjectError}</div>
            )}
            <div style={{ padding: "12px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setNewProjectOpen(false)} style={{ padding: "6px 16px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button onClick={handleNewProjectSubmit} disabled={!newProjectDir.trim()} style={{ padding: "6px 16px", border: "none", borderRadius: 4, background: newProjectDir.trim() ? "#1a6fa8" : "#a0c4e8", color: "#fff", cursor: newProjectDir.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600 }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {addFileDialogOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
>
          <div style={{ background: "#fff", borderRadius: 8, minWidth: 480, maxWidth: 600, width: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", height: 480 }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e8e8e8" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1a3a5c", marginBottom: 8 }}>Add File from Markdown</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={() => folderBrowserParent !== null && navigateFolderBrowser(folderBrowserParent).then(files => setAddFileSelected(new Set(files)))}
                  disabled={folderBrowserParent === null}
                  title="Go up"
                  style={{ padding: "3px 8px", border: "1px solid #ccc", borderRadius: 4, background: folderBrowserParent !== null ? "#f5f5f5" : "#fafafa", cursor: folderBrowserParent !== null ? "pointer" : "default", fontSize: 13, color: folderBrowserParent !== null ? "#333" : "#bbb", flexShrink: 0 }}
                >↑</button>
                <div style={{ fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                  {folderBrowserPath || "Select a drive"}
                </div>
              </div>
            </div>
            <div ref={folderBrowserScrollRef} style={{ overflowY: "auto", flex: 1, padding: "2px 0" }}>
              {folderBrowserDirs.map(dir => {
                const label = dir.replace(/[\\/]$/, "").split(/[\\/]/).pop() || dir;
                return (
                  <div key={dir}
                    onClick={() => { navigateFolderBrowser(dir).then(files => setAddFileSelected(new Set(files))); }}
                    style={{ padding: "6px 20px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#1a3a5c" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f0f7ff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <span style={{ fontSize: 15 }}>📁</span>
                    <span>{label}</span>
                  </div>
                );
              })}
              {folderBrowserFiles.length > 0 && folderBrowserDirs.length > 0 && (
                <div style={{ height: 1, background: "#e8e8e8", margin: "4px 20px" }} />
              )}
              {folderBrowserFiles.length > 0 && (
                <div style={{ padding: "4px 20px 2px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#888", cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => {
                      if (addFileSelected.size === folderBrowserFiles.length) setAddFileSelected(new Set());
                      else setAddFileSelected(new Set(folderBrowserFiles));
                    }}
                  >{addFileSelected.size === folderBrowserFiles.length ? "Deselect all" : "Select all"}</span>
                </div>
              )}
              {folderBrowserFiles.map(file => {
                const selected = addFileSelected.has(file);
                return (
                  <div key={file}
                    onClick={() => setAddFileSelected(prev => {
                      const next = new Set(prev);
                      if (next.has(file)) next.delete(file); else next.add(file);
                      return next;
                    })}
                    style={{ padding: "5px 20px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, color: selected ? "#1a3a5c" : "#666", background: selected ? "#e8f4fd" : "transparent", cursor: "pointer" }}
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#f0f7ff"; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = ""; }}
                  >
                    <span style={{ fontSize: 13, color: selected ? "#1a6fa8" : "#999" }}>{selected ? "\u2611" : "\u2610"}</span>
                    <span>{file}</span>
                  </div>
                );
              })}
              {folderBrowserDirs.length === 0 && folderBrowserFiles.length === 0 && (
                <div style={{ padding: "12px 20px", fontSize: 13, color: "#999" }}>Empty directory.</div>
              )}
            </div>
            {addFileError && (
              <div style={{ padding: "8px 20px 0", color: "#c0392b", fontSize: 12 }}>{addFileError}</div>
            )}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #e8e8e8", display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
              {addFileSelected.size > 0 && <span style={{ fontSize: 12, color: "#888", flex: 1 }}>{addFileSelected.size} file{addFileSelected.size !== 1 ? "s" : ""} selected</span>}
              <button onClick={() => setAddFileDialogOpen(false)} style={{ padding: "6px 16px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button onClick={handleAddFileConfirm} disabled={addFileSelected.size === 0} style={{ padding: "6px 16px", border: "none", borderRadius: 4, background: addFileSelected.size > 0 ? "#1a6fa8" : "#a0c4e8", color: "#fff", cursor: addFileSelected.size > 0 ? "pointer" : "default", fontSize: 13, fontWeight: 600 }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {newRootOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
>
          <div style={{ background: "#fff", borderRadius: 8, minWidth: 480, maxWidth: 600, width: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e8e8e8" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1a3a5c", marginBottom: 12 }}>New Project Root</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {newRootCreateDir && (
                  <div>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>New directory name</div>
                    <input autoFocus value={newRootNewDirName}
                      onChange={e => { setNewRootNewDirName(e.target.value.replace(/\s+/g, "-").replace(/[/\\<>:"|?*\0]/g, "").toLowerCase()); setNewRootError(""); }}
                      placeholder="my-projects"
                      style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #b3d9f7", borderRadius: 4, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>Title</div>
                  <input autoFocus={!newRootCreateDir} value={newRootName}
                    onChange={e => { setNewRootName(e.target.value); setNewRootError(""); }}
                    placeholder="My Docs"
                    style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #b3d9f7", borderRadius: 4, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>Description <span style={{ color: "#bbb" }}>(optional)</span></div>
                  <input value={newRootDescription}
                    onChange={e => setNewRootDescription(e.target.value)}
                    placeholder="Personal documentation projects"
                    style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #b3d9f7", borderRadius: 4, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["Use existing directory", "Create new directory"] as const).map((label, i) => (
                    <button key={label} onClick={() => setNewRootCreateDir(i === 1)}
                      style={{ flex: 1, padding: "6px 10px", border: `1px solid ${newRootCreateDir === (i === 1) ? "#1a6fa8" : "#ccc"}`, borderRadius: 4, background: newRootCreateDir === (i === 1) ? "#e8f4fd" : "#fff", color: newRootCreateDir === (i === 1) ? "#1a6fa8" : "#555", cursor: "pointer", fontSize: 12, fontWeight: newRootCreateDir === (i === 1) ? 600 : 400 }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: "8px 20px 4px", fontSize: 12, color: "#555" }}>
              {newRootCreateDir ? "Choose parent directory:" : "Select directory:"}
              {rootBrowserPath && <span style={{ marginLeft: 8, fontFamily: "monospace", color: "#888" }}>{newRootCreateDir && newRootNewDirName ? `${rootBrowserPath}/${newRootNewDirName}` : rootBrowserPath}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 20px 6px" }}>
              <button
                onClick={() => rootBrowserParent !== null && navigateRootBrowser(rootBrowserParent)}
                disabled={rootBrowserParent === null}
                title="Go up"
                style={{ padding: "3px 8px", border: "1px solid #ccc", borderRadius: 4, background: rootBrowserParent !== null ? "#f5f5f5" : "#fafafa", cursor: rootBrowserParent !== null ? "pointer" : "default", fontSize: 13, color: rootBrowserParent !== null ? "#333" : "#bbb", flexShrink: 0 }}
              >↑</button>
              <div style={{ fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                {rootBrowserPath || "Select a drive"}
              </div>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "2px 0", minHeight: 160 }}>
              {rootBrowserDirs.map(dir => {
                const label = dir.replace(/[\\/]$/, "").split(/[\\/]/).pop() || dir;
                return (
                  <div key={dir}
                    onClick={() => navigateRootBrowser(dir)}
                    style={{ padding: "6px 20px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#1a3a5c" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f0f7ff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <span style={{ fontSize: 15 }}>📁</span>
                    <span>{label}</span>
                  </div>
                );
              })}
              {rootBrowserDirs.length === 0 && rootBrowserPath && (
                <div style={{ padding: "12px 20px", fontSize: 13, color: "#999" }}>No subdirectories.</div>
              )}
            </div>

            {newRootError && <div style={{ padding: "8px 20px 0", color: "#c0392b", fontSize: 12 }}>{newRootError}</div>}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #e8e8e8", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setNewRootOpen(false)} style={{ padding: "6px 16px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button onClick={handleAddRoot} style={{ padding: "6px 16px", border: "none", borderRadius: 4, background: "#1a6fa8", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Add Root</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
