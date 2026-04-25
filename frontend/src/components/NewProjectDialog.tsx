import { useState, useCallback } from "react";
import { createProject, saveProjectMd, browseStartDir, browseDirs, browseMkdir } from "../api";

interface Props {
  currentProject: string | null;
  onCreated: (dirName: string) => Promise<void>;
  onClose: () => void;
}

type BrowserTarget = "project" | "markdowns" | "yaml";

function joinPath(dir: string, name: string): string {
  const sep = dir.includes("\\") ? "\\" : "/";
  return dir.replace(/[\\/]+$/, "") + sep + name;
}

export default function NewProjectDialog({ currentProject, onCreated, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [dir, setDir] = useState("");
  const [dirEdited, setDirEdited] = useState(false);
  const [error, setError] = useState("");

  const [projectDir, setProjectDir] = useState("");
  const [mdPath, setMdPath] = useState("");
  const [mdSuggested, setMdSuggested] = useState(false);
  const [yamlFile, setYamlFile] = useState("");

  const [browserTarget, setBrowserTarget] = useState<BrowserTarget | null>(null);
  const [browserPath, setBrowserPath] = useState("");
  const [browserDirs, setBrowserDirs] = useState<string[]>([]);
  const [browserFiles, setBrowserFiles] = useState<string[]>([]);
  const [browserParent, setBrowserParent] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState<string | null>(null);
  const [selectedDir, setSelectedDir] = useState<string | null>(null);

  const navigate = useCallback(async (path: string, ext?: string) => {
    try {
      const result = await browseDirs(path, ext);
      setBrowserPath(result.path);
      setBrowserDirs(result.dirs);
      setBrowserFiles(result.files);
      setBrowserParent(result.parent);
      setSelectedDir(null);
    } catch {}
  }, []);

  const openBrowser = useCallback(async (target: BrowserTarget) => {
    setBrowserTarget(target);
    setNewFolderName(null);
    let startPath = "";
    if (target === "project") {
      startPath = projectDir || await browseStartDir(currentProject ?? undefined).catch(() => "");
    } else if (target === "markdowns") {
      startPath = mdPath || projectDir || await browseStartDir(currentProject ?? undefined).catch(() => "");
    } else {
      startPath = mdPath ? mdPath : await browseStartDir(currentProject ?? undefined).catch(() => "");
    }
    await navigate(startPath, target === "yaml" ? "yaml" : "md");
  }, [currentProject, projectDir, mdPath, yamlFile, navigate]);

  const autoNameFromPath = (path: string) => {
    if (!title && !dirEdited) {
      const leaf = path.replace(/[\\/]$/, "").split(/[\\/]/).pop() || "";
      setTitle(leaf);
      setDir(leaf.replace(/\s+/g, "-").replace(/[/\\<>:"|?*\0]/g, "").toLowerCase());
    }
  };

  const selectProjectDir = () => {
    const chosen = selectedDir ?? browserPath;
    if (!chosen) return;
    setProjectDir(chosen);
    setMdPath(joinPath(chosen, "markdowns"));
    setMdSuggested(true);
    autoNameFromPath(chosen);
    setSelectedDir(null);
    setBrowserTarget(null);
  };

  const selectMarkdownsDir = () => {
    const chosen = selectedDir ?? browserPath;
    if (!chosen) return;
    setMdPath(chosen);
    setMdSuggested(false);
    autoNameFromPath(chosen);
    setSelectedDir(null);
    setBrowserTarget(null);
  };

  const selectYamlFile = (filename: string) => {
    const fullPath = joinPath(browserPath, filename);
    setYamlFile(fullPath);
    if (!mdPath) {
      setMdPath(joinPath(browserPath, "markdowns"));
      setMdSuggested(true);
    }
    if (!title && !dirEdited) {
      const stem = filename.replace(/\.(yaml|yml)$/i, "");
      setTitle(stem);
      setDir(stem.replace(/\s+/g, "-").replace(/[/\\<>:"|?*\0]/g, "").toLowerCase());
    }
    setBrowserTarget(null);
  };

  const submitNewFolder = async () => {
    const name = (newFolderName ?? "").trim();
    if (!name || !browserPath) return;
    try {
      const newPath = await browseMkdir(browserPath, name);
      setNewFolderName(null);
      await navigate(browserPath, browserTarget === "yaml" ? "yaml" : "md");
      setSelectedDir(newPath);
    } catch {}
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setError("");
    if (!dirEdited) setDir(val.trim().replace(/\s+/g, "-").replace(/[/\\<>:"|?*\0]/g, "").toLowerCase());
  };

  const handleDirChange = (val: string) => {
    setDir(val);
    setDirEdited(true);
    setError("");
  };

  const handleSubmit = async () => {
    const dirName = dir.trim().replace(/\s+/g, "-").replace(/[/\\<>:"|?*\0]/g, "").toLowerCase();
    if (!dirName || dirName === "." || dirName === "..") { setError("Invalid project name"); return; }
    if (!mdPath.trim()) { setError("Select a markdowns directory"); return; }
    try {
      await createProject(dirName, mdPath.trim(), yamlFile.trim() || undefined);
      if (title.trim()) await saveProjectMd(dirName, `# ${title.trim()}\n`);
      await onCreated(dirName);
    } catch (e: any) {
      setError(e.message ?? "Failed to create project");
    }
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: "7px 10px", fontSize: 13,
    border: "1px solid #b3d9f7", borderRadius: 4, outline: "none", boxSizing: "border-box",
  };
  const browseBtn: React.CSSProperties = {
    padding: "6px 12px", border: "1px solid #b3d9f7", borderRadius: 4,
    background: "#e8f4fd", color: "#1a6fa8", cursor: "pointer", fontSize: 12,
    fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap",
  };
  const primaryBtn: React.CSSProperties = {
    padding: "6px 16px", border: "none", borderRadius: 4,
    background: "#1a6fa8", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
  };

  // Browser overlay
  if (browserTarget) {
    const isYaml = browserTarget === "yaml";
    const isProject = browserTarget === "project";
    const ext = isYaml ? "yaml" : "md";
    const label = isProject ? "Select project directory" : isYaml ? "Select YAML file" : "Select markdowns directory";

    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", borderRadius: 8, width: 560, maxWidth: "90vw", height: 520, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid #e8e8e8" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a3a5c", marginBottom: 8 }}>{label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => browserParent !== null && navigate(browserParent, ext)} disabled={browserParent === null}
                style={{ padding: "3px 8px", border: "1px solid #ccc", borderRadius: 4, background: browserParent !== null ? "#f5f5f5" : "#fafafa", cursor: browserParent !== null ? "pointer" : "default", fontSize: 13, color: browserParent !== null ? "#333" : "#bbb", flexShrink: 0 }}>↑</button>
              <div style={{ fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", flex: 1 }}>
                {browserPath || "Select a drive"}
              </div>
              {!isYaml && browserPath && (
                <button onClick={() => setNewFolderName(f => f === null ? "" : null)}
                  style={{ ...primaryBtn, padding: "6px 16px" }}>New Folder</button>
              )}
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1, padding: "2px 0" }}>
            {newFolderName !== null && (
              <div style={{ padding: "6px 20px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 15 }}>📁</span>
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Escape") { setNewFolderName(null); return; }
                    if (e.key === "Enter") submitNewFolder();
                  }}
                  placeholder="New folder name"
                  style={{ flex: 1, padding: "3px 6px", fontSize: 12, border: "1px solid #b3d9f7", borderRadius: 4, outline: "none" }}
                />
                <button onClick={submitNewFolder} style={{ ...primaryBtn, padding: "3px 10px", fontSize: 12 }}>Create</button>
                <button onClick={() => setNewFolderName(null)}
                  style={{ padding: "3px 6px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", fontSize: 12, cursor: "pointer", color: "#999" }}>✕</button>
              </div>
            )}
            {browserDirs.map(d => {
              const leafLabel = d.replace(/[\\/]$/, "").split(/[\\/]/).pop() || d;
              const isSelected = selectedDir === d;
              return (
                <div key={d}
                  onClick={() => setSelectedDir(d)}
                  onDoubleClick={() => { setSelectedDir(null); navigate(d, ext); }}
                  style={{ padding: "6px 20px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#1a3a5c", background: isSelected ? "#e8f4fd" : "" }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f0f7ff"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ""; }}
                >
                  <span style={{ fontSize: 15 }}>📁</span><span>{leafLabel}</span>
                </div>
              );
            })}
            {isYaml && browserFiles.map(f => (
              <div key={f} onClick={() => selectYamlFile(f)}
                style={{ padding: "6px 20px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#1a6fa8" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f0f7ff")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <span style={{ fontSize: 14 }}>📄</span><span>{f}</span>
              </div>
            ))}
            {!isYaml && browserFiles.map(f => (
              <div key={f} style={{ padding: "5px 20px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, color: "#bbb" }}>
                <span style={{ fontSize: 13 }}>📄</span><span>{f}</span>
              </div>
            ))}
            {browserDirs.length === 0 && browserFiles.length === 0 && browserPath && (
              <div style={{ padding: "12px 20px", fontSize: 13, color: "#999" }}>
                {isYaml ? "No YAML files here." : "Empty directory."}
              </div>
            )}
          </div>
          <div style={{ padding: "10px 20px", borderTop: "1px solid #e8e8e8", display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setBrowserTarget(null)} style={{ padding: "6px 16px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            {!isYaml && (
              <button onClick={isProject ? selectProjectDir : selectMarkdownsDir} disabled={!browserPath}
                style={{ ...primaryBtn, background: browserPath ? "#1a6fa8" : "#a0c4e8", cursor: browserPath ? "pointer" : "default" }}>
                Select this directory
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const canSubmit = dir.trim() && mdPath.trim();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, minWidth: 480, maxWidth: 560, width: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #e8e8e8" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1a3a5c", marginBottom: 14 }}>New Project</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>Project title</div>
              <input autoFocus value={title} onChange={e => handleTitleChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="My Documentation"
                style={{ ...inputStyle, width: "100%" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>Project name</div>
              <input value={dir} onChange={e => handleDirChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="my-documentation"
                style={{ ...inputStyle, width: "100%", fontFamily: "monospace" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>Project directory</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={projectDir} onChange={e => { setProjectDir(e.target.value); setError(""); }}
                  placeholder="Browse to select or create a project folder…"
                  style={{ ...inputStyle, fontFamily: "monospace" }} />
                <button onClick={() => openBrowser("project")} style={browseBtn}>Browse</button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>
                Markdowns directory <span style={{ color: "#c0392b" }}>*</span>
                {mdSuggested && <span style={{ color: "#aaa", marginLeft: 6 }}>— suggested, browse to change</span>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={mdPath} onChange={e => { setMdPath(e.target.value); setMdSuggested(false); setError(""); }}
                  placeholder="Browse to select a markdowns directory…"
                  style={{
                    ...inputStyle, fontFamily: "monospace",
                    color: mdSuggested ? "#aaa" : undefined,
                    borderColor: mdSuggested ? "#d0e8f7" : "#b3d9f7",
                  }} />
                <button onClick={() => openBrowser("markdowns")} style={browseBtn}>Browse</button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>
                YAML file <span style={{ color: "#aaa" }}>(optional)</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={yamlFile} onChange={e => { setYamlFile(e.target.value); setError(""); }}
                  placeholder="Leave blank to create a new tree.yaml"
                  style={{ ...inputStyle, fontFamily: "monospace" }} />
                <button onClick={() => openBrowser("yaml")} style={browseBtn}>Browse</button>
              </div>
            </div>
          </div>
        </div>

        {error && <div style={{ padding: "8px 20px 0", color: "#c0392b", fontSize: 12 }}>{error}</div>}
        <div style={{ padding: "12px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "6px 16px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{ ...primaryBtn, background: canSubmit ? "#1a6fa8" : "#a0c4e8", cursor: canSubmit ? "pointer" : "default" }}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
