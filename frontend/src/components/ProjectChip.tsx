import { useState, useRef, useEffect, CSSProperties, KeyboardEvent } from "react";
import type { ProjectInfo } from "../types";
import { GAP } from "./SortableItemConstants";

export interface ProjectChipProps {
  currentProject: string;
  currentProjectTitle: string;
  projects: ProjectInfo[];
  titleMode: boolean;
  setTitleMode: (mode: boolean) => void;
  onSwitchProject: (name: string) => void;
  onNewProject: (expandMarkdowns: boolean) => void;
  onArchiveProject: (name: string) => Promise<void>;
  onOpenProjectMd: () => void;
  onCreateFile: (filename: string) => Promise<void>;
  onAddFileFromMd: () => void;
  onOpenYaml: () => void;
  onImport: (format: "mkdocs" | "docusaurus") => void;
  onExport: (format: "mkdocs" | "docusaurus") => void;
  onEditTemplate: () => void;
  onCheckCompliance: () => void;
  onRestoreStructure: () => void;
  onRestoreAll: () => void;
  onValidateLinks: () => void;
  onExportHtml: () => void;
  onReport: () => void;


  hasHierarchyBackup: boolean;
  onFlattenHierarchy: () => void;
  onRestoreHierarchy: () => void;
  isDocumentation: boolean;
  showIndicators: boolean;
  onToggleIndicators: () => void;
}

export default function ProjectChip({ currentProject, currentProjectTitle, projects, titleMode, setTitleMode, onSwitchProject, onNewProject, onArchiveProject, onOpenProjectMd, onCreateFile, onAddFileFromMd, onOpenYaml, onImport, onExport, onEditTemplate, onCheckCompliance, onRestoreStructure, onRestoreAll, onValidateLinks, onExportHtml, onReport, hasHierarchyBackup, onFlattenHierarchy, onRestoreHierarchy, isDocumentation, showIndicators, onToggleIndicators }: ProjectChipProps) {



  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [projectSubmenuOpen, setProjectSubmenuOpen] = useState(false);
  const [importSubmenuOpen, setImportSubmenuOpen] = useState(false);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const [frontmatterSubmenuOpen, setFrontmatterSubmenuOpen] = useState(false);
  const [restoreSubmenuOpen, setRestoreSubmenuOpen] = useState(false);
  const [fileSubmenuOpen, setFileSubmenuOpen] = useState(false);
  const [settingsSubmenuOpen, setSettingsSubmenuOpen] = useState(false);
  const menuRef = useRef<HTMLSpanElement>(null);
  const menuButtonRef = useRef<HTMLSpanElement>(null);




  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [createError, setCreateError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);







  const startCreating = () => { setCreatingFile(true); setNewFileName(""); setCreateError(""); setTimeout(() => inputRef.current?.focus(), 50); };
  const cancelCreating = () => { setCreatingFile(false); setNewFileName(""); setCreateError(""); };
  const submitNewFile = async () => {
    let name = newFileName.trim();
    if (!name) return;
    if (!name.endsWith(".md")) name += ".md";
    if (/[/\\<>:"|?*]/.test(name.replace(/\.md$/, ""))) { setCreateError("Invalid filename characters"); return; }
    try { await onCreateFile(name); cancelCreating(); }
    catch (e: any) { setCreateError(e.message ?? "Error creating file"); }
  };
  const handleInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submitNewFile();
    if (e.key === "Escape") cancelCreating();
  };

  const menuItem: CSSProperties = {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "7px 14px", fontSize: "13px", cursor: "pointer",
    color: "#666", whiteSpace: "nowrap",
  };
  const flyoutArrow: CSSProperties = { fontSize: "18px", color: "#999", lineHeight: 0 };
  const submenuStyle: CSSProperties = {
    position: "absolute", left: "100%", top: 0, zIndex: 101,
    background: "#fff", border: "1px solid #d0e8f7", borderRadius: "8px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: "160px", overflow: "hidden",
  };

  return (
    <div style={{ margin: `${GAP}px 0` }}>
      <div style={{
        display: "inline-flex", alignItems: "center",
        width: "2.5in",
        background: "#ff8c00", borderRadius: "6px",
        padding: "5px 8px 5px 12px",
        userSelect: "none",
      }}>
        <span
          style={{ fontSize: "15px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, cursor: "pointer" }}
          title={titleMode ? currentProjectTitle : currentProject}
          onDoubleClick={() => { onOpenProjectMd(); }}
        >
          {titleMode ? currentProjectTitle : currentProject}
        </span>
        <span ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <span
            ref={menuButtonRef}
            onClick={() => {
              if (!menuOpen && menuButtonRef.current) {
                const r = menuButtonRef.current.getBoundingClientRect();
                setMenuPos({ top: r.top + r.height / 2, left: r.left + r.width / 2 });
              }
              setMenuOpen(o => !o);
            }}
            title="Menu"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "4px", cursor: "pointer", fontSize: "18px", fontWeight: "bold", color: menuOpen ? "#fff" : "rgba(255,255,255,0.65)", background: menuOpen ? "rgba(255,255,255,0.2)" : "transparent" }}
            onMouseEnter={(e) => { if (!menuOpen) e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { if (!menuOpen) e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
          >&#8942;</span>

          {menuOpen && menuPos && (
            <div style={{
              position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 1000,
              background: "#fff", border: "1px solid #d0e8f7", borderRadius: "8px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: "200px", overflow: "visible",
            }}>
              {/* Projects flyout */}
              <div
                style={{ ...menuItem, justifyContent: "space-between", position: "relative" }}
                onMouseEnter={() => setProjectSubmenuOpen(true)}
                onMouseLeave={() => setProjectSubmenuOpen(false)}
              >
                <span>Projects</span>
                <span style={flyoutArrow}>&#9656;</span>
                {projectSubmenuOpen && (
                  <div style={submenuStyle}>
                    <div style={{ ...menuItem }}
                      onClick={() => { onNewProject(false); setMenuOpen(false); setProjectSubmenuOpen(false); }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >New project</div>
                    <div style={{ ...menuItem }}
                      onClick={() => { onNewProject(true); setMenuOpen(false); setProjectSubmenuOpen(false); }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >New Project from Markdowns</div>
                    <div style={{ height: "1px", background: "#b8cfe0", margin: "2px 0" }} />
                    {projects.map(p => (
                      <div key={p.name}
                        style={{ ...menuItem, background: p.name === currentProject ? "#e8f4fd" : "transparent", color: p.name === currentProject ? "#1a6fa8" : "#666", fontWeight: p.name === currentProject ? 600 : 400, justifyContent: "space-between", paddingRight: "8px" }}
                        onClick={() => { onSwitchProject(p.name); setMenuOpen(false); setProjectSubmenuOpen(false); }}
                        onMouseEnter={(e) => { if (p.name !== currentProject) (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                        onMouseLeave={(e) => { if (p.name !== currentProject) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                      >
                        <span>{p.name === currentProject && <span style={{ color: "#1a6fa8", fontSize: "11px", marginRight: "4px" }}>&#10003;</span>}{titleMode ? p.title : p.name}</span>
                        <span
                          title="Archive project"
                          onClick={(e) => { e.stopPropagation(); onArchiveProject(p.name); setMenuOpen(false); setProjectSubmenuOpen(false); }}
                          style={{ color: "#555", fontSize: "18px", lineHeight: 1, padding: "2px 6px", borderRadius: "3px", cursor: "pointer", flexShrink: 0 }}
                          onMouseEnter={(e) => { e.stopPropagation(); (e.currentTarget as HTMLSpanElement).style.color = "#c0392b"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "#555"; }}
                        >&#128465;</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* File flyout */}
              <div
                style={{ ...menuItem, justifyContent: "space-between", position: "relative" }}
                onMouseEnter={() => setFileSubmenuOpen(true)}
                onMouseLeave={() => setFileSubmenuOpen(false)}
              >
                <span>File</span>
                <span style={flyoutArrow}>&#9656;</span>
                {fileSubmenuOpen && (
                  <div style={submenuStyle}>
                    <div style={{ ...menuItem }}
                      onClick={() => { startCreating(); setMenuOpen(false); setFileSubmenuOpen(false); }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >New file</div>
                    <div style={{ ...menuItem }}
                      onClick={() => { onAddFileFromMd(); setMenuOpen(false); setFileSubmenuOpen(false); }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >Add File from Markdown</div>
                  </div>
                )}
              </div>

              <div style={{ ...menuItem }}
                onClick={() => { onOpenProjectMd(); setMenuOpen(false); }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >Project info</div>

              <div style={{ ...menuItem }}
                onClick={() => { onOpenYaml(); setMenuOpen(false); }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >View YAML</div>

              <div style={{ ...menuItem }}
                onClick={() => { hasHierarchyBackup ? onRestoreHierarchy() : onFlattenHierarchy(); setMenuOpen(false); }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >{hasHierarchyBackup ? "Restore hierarchy" : "Flatten hierarchy"}</div>

              <div style={{ height: "1px", background: "#b8cfe0", margin: "2px 0" }} />

              {/* Frontmatter flyout */}
              <div
                style={{ ...menuItem, justifyContent: "space-between", position: "relative" }}
                onMouseEnter={() => setFrontmatterSubmenuOpen(true)}
                onMouseLeave={() => setFrontmatterSubmenuOpen(false)}
              >
                <span>Frontmatter</span>
                <span style={flyoutArrow}>&#9656;</span>
                {frontmatterSubmenuOpen && (
                  <div style={submenuStyle}>
                    <div style={{ ...menuItem }}
                      onClick={() => { onEditTemplate(); setMenuOpen(false); setFrontmatterSubmenuOpen(false); }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >Template</div>
                    <div style={{ ...menuItem }}
                      onClick={() => { onCheckCompliance(); setMenuOpen(false); setFrontmatterSubmenuOpen(false); }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >Compliance</div>
                  </div>
                )}
              </div>

              <div style={{ ...menuItem }}
                onClick={() => { onValidateLinks(); setMenuOpen(false); }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >Validate links</div>

              <div style={{ ...menuItem }}
                onClick={() => { onExportHtml(); setMenuOpen(false); }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >View HTML/PDF</div>

              <div style={{ ...menuItem }}
                onClick={() => { onReport(); setMenuOpen(false); }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >Scan Project</div>

              {/* Restore Docs flyout (documentation project only) */}
              {isDocumentation && (
                <div
                  style={{ ...menuItem, justifyContent: "space-between", position: "relative" }}
                  onMouseEnter={() => setRestoreSubmenuOpen(true)}
                  onMouseLeave={() => setRestoreSubmenuOpen(false)}
                >
                  <span>Restore Docs</span>
                  <span style={flyoutArrow}>&#9656;</span>
                  {restoreSubmenuOpen && (
                    <div style={submenuStyle}>
                      <div style={{ ...menuItem }}
                        onClick={() => { onRestoreStructure(); setMenuOpen(false); setRestoreSubmenuOpen(false); }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                      >Structure only</div>
                      <div style={{ ...menuItem }}
                        onClick={() => { onRestoreAll(); setMenuOpen(false); setRestoreSubmenuOpen(false); }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                      >Structure &amp; content</div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ height: "1px", background: "#b8cfe0", margin: "2px 0" }} />

              {/* Import/Export flyouts */}
              <div
                style={{ ...menuItem, justifyContent: "space-between", position: "relative" }}
                onMouseEnter={() => setImportSubmenuOpen(true)}
                onMouseLeave={() => setImportSubmenuOpen(false)}
              >
                <span>Import from...</span>
                <span style={flyoutArrow}>&#9656;</span>
                {importSubmenuOpen && (
                  <div style={submenuStyle}>
                    {(["mkdocs", "docusaurus"] as const).map(fmt => (
                      <div key={fmt} style={{ ...menuItem }}
                        onClick={() => { onImport(fmt); setMenuOpen(false); setImportSubmenuOpen(false); }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                      >{fmt === "mkdocs" ? "MkDocs" : "Docusaurus"}</div>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{ ...menuItem, justifyContent: "space-between", position: "relative" }}
                onMouseEnter={() => setExportSubmenuOpen(true)}
                onMouseLeave={() => setExportSubmenuOpen(false)}
              >
                <span>Export to...</span>
                <span style={flyoutArrow}>&#9656;</span>
                {exportSubmenuOpen && (
                  <div style={submenuStyle}>
                    {(["mkdocs", "docusaurus"] as const).map(fmt => (
                      <div key={fmt} style={{ ...menuItem }}
                        onClick={() => { onExport(fmt); setMenuOpen(false); setExportSubmenuOpen(false); }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                      >{fmt === "mkdocs" ? "MkDocs" : "Docusaurus"}</div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ height: "1px", background: "#b8cfe0", margin: "2px 0" }} />

              {/* Settings flyout */}
              <div
                style={{ ...menuItem, justifyContent: "space-between", position: "relative" }}
                onMouseEnter={() => setSettingsSubmenuOpen(true)}
                onMouseLeave={() => setSettingsSubmenuOpen(false)}
              >
                <span>Settings</span>
                <span style={flyoutArrow}>&#9656;</span>
                {settingsSubmenuOpen && (
                  <div style={{ ...submenuStyle, minWidth: "200px" }}>
                    <div style={{ padding: "7px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", color: "#666" }}>Labels:</span>
                      <div style={{ display: "flex", border: "1px solid #b3d9f7", borderRadius: "4px", overflow: "hidden" }}>
                        {([["Filename", false], ["Title", true]] as const).map(([label, mode]) => (
                          <button key={String(label)} onClick={() => { setTitleMode(mode); }} style={{ padding: "3px 8px", border: "none", cursor: "pointer", fontSize: "12px", background: titleMode === mode ? "#1a6fa8" : "#e8f4fd", color: titleMode === mode ? "#fff" : "#1a6fa8" }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div
                      style={{ ...menuItem }}
                      onClick={() => { onToggleIndicators(); }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: "13px" }}>{showIndicators ? "Hide" : "Show"} status indicators</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </span>
      </div>

      {creatingFile && (
        <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ display: "flex", gap: "4px" }}>
            <input ref={inputRef} value={newFileName} onChange={(e) => { setNewFileName(e.target.value); setCreateError(""); }} onKeyDown={handleInputKey} placeholder="filename.md"
              style={{ padding: "4px 6px", background: "#fff", border: "1px solid #b3d9f7", borderRadius: "4px", color: "#1a1a1a", fontSize: "12px", outline: "none", width: "140px" }} />
            <button onClick={submitNewFile} style={{ padding: "4px 8px", background: "#3a7d44", border: "none", borderRadius: "4px", color: "#fff", fontSize: "12px", cursor: "pointer" }}>&#10003;</button>
            <button onClick={cancelCreating} style={{ padding: "4px 8px", background: "#aaa", border: "none", borderRadius: "4px", color: "#fff", fontSize: "12px", cursor: "pointer" }}>&#10005;</button>
          </div>
          {createError && <div style={{ color: "#f66", fontSize: "11px" }}>{createError}</div>}
        </div>
      )}
    </div>
  );
}
