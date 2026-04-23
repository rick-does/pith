import { useState, useCallback } from "react";
import { importMarkdowns, renameProject, saveProjectMd, createProject, browseStartDir, browseDirs } from "../api";

interface Props {
  currentProject: string | null;
  initialExpand: boolean;
  onCreated: (dirName: string) => Promise<void>;
  onClose: () => void;
}

export default function NewProjectDialog({ currentProject, initialExpand, onCreated, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [dir, setDir] = useState("");
  const [dirEdited, setDirEdited] = useState(false);
  const [mdExpanded, setMdExpanded] = useState(initialExpand);
  const [error, setError] = useState("");
  const [browserPath, setBrowserPath] = useState("");
  const [browserDirs, setBrowserDirs] = useState<string[]>([]);
  const [browserFiles, setBrowserFiles] = useState<string[]>([]);
  const [browserParent, setBrowserParent] = useState<string | null>(null);

  const navigate = useCallback(async (path: string): Promise<string[]> => {
    try {
      const result = await browseDirs(path);
      setBrowserPath(result.path);
      setBrowserDirs(result.dirs);
      setBrowserFiles(result.files);
      setBrowserParent(result.parent);
      return result.files;
    } catch { return []; }
  }, []);

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

  const handleExpandToggle = () => {
    const expanding = !mdExpanded;
    setMdExpanded(expanding);
    if (expanding && !browserPath) {
      browseStartDir(currentProject ?? undefined).then(startPath => navigate(startPath));
    }
  };

  const handleSubmit = async () => {
    const dirName = dir.trim().replace(/\s+/g, "-").replace(/[/\\<>:"|?*\0]/g, "").toLowerCase();
    if (!dirName || dirName === "." || dirName === "..") { setError("Invalid project directory name"); return; }
    try {
      if (browserPath && mdExpanded) {
        const { name } = await importMarkdowns(browserPath);
        if (name !== dirName) await renameProject(name, dirName);
        await saveProjectMd(dirName, `# ${title.trim() || dirName}\n`);
      } else {
        await createProject(dirName);
        if (title.trim()) await saveProjectMd(dirName, `# ${title.trim()}\n`);
      }
      await onCreated(dirName);
    } catch (e: any) {
      setError(e.message ?? "Failed to create project");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, minWidth: 480, maxWidth: 600, width: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", maxHeight: "80vh" }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e8e8e8" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1a3a5c", marginBottom: 12 }}>New Project</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>Project title</div>
              <input autoFocus value={title} onChange={e => handleTitleChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="My Documentation"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #b3d9f7", borderRadius: 4, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>Directory name</div>
              <input value={dir} onChange={e => handleDirChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="my-documentation"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #b3d9f7", borderRadius: 4, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
            </div>
          </div>
        </div>

        <div style={{ borderBottom: "1px solid #e8e8e8" }}>
          <div onClick={handleExpandToggle}
            style={{ padding: "10px 20px", fontSize: 13, color: "#1a3a5c", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, userSelect: "none" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f0f7ff")}
            onMouseLeave={e => (e.currentTarget.style.background = "")}
          >
            <span style={{ fontSize: 11, color: "#999" }}>{mdExpanded ? "▼" : "▶"}</span>
            <span>Copy from Markdowns directory</span>
            {browserPath && <span style={{ fontSize: 11, color: "#888", fontFamily: "monospace", marginLeft: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{browserPath}</span>}
          </div>
          {mdExpanded && (
            <div style={{ display: "flex", flexDirection: "column", height: 280 }}>
              <div style={{ padding: "4px 20px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => browserParent !== null && navigate(browserParent)} disabled={browserParent === null} title="Go up"
                  style={{ padding: "3px 8px", border: "1px solid #ccc", borderRadius: 4, background: browserParent !== null ? "#f5f5f5" : "#fafafa", cursor: browserParent !== null ? "pointer" : "default", fontSize: 13, color: browserParent !== null ? "#333" : "#bbb", flexShrink: 0 }}>↑</button>
                <div style={{ fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                  {browserPath || "Select a drive"}
                </div>
                {browserPath && (
                  <button onClick={() => { setBrowserPath(""); setBrowserDirs([]); setBrowserFiles([]); setBrowserParent(null); }}
                    title="Clear selection" style={{ padding: "2px 6px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 11, color: "#999", flexShrink: 0 }}>✕</button>
                )}
              </div>
              <div style={{ overflowY: "auto", flex: 1, padding: "2px 0" }}>
                {browserDirs.map(d => {
                  const label = d.replace(/[\\/]$/, "").split(/[\\/]/).pop() || d;
                  return (
                    <div key={d} onClick={() => {
                      navigate(d);
                      if (!title && !dirEdited) {
                        const dl = d.replace(/[\\/]$/, "").split(/[\\/]/).pop() || "";
                        setTitle(dl);
                        setDir(dl.replace(/\s+/g, "-").replace(/[/\\<>:"|?*\0]/g, "").toLowerCase());
                      }
                    }}
                      style={{ padding: "6px 20px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#1a3a5c" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f0f7ff")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      <span style={{ fontSize: 15 }}>📁</span><span>{label}</span>
                    </div>
                  );
                })}
                {browserFiles.length > 0 && browserDirs.length > 0 && <div style={{ height: 1, background: "#e8e8e8", margin: "4px 20px" }} />}
                {browserFiles.map(f => (
                  <div key={f} style={{ padding: "5px 20px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, color: "#666" }}>
                    <span style={{ fontSize: 13, color: "#999" }}>📄</span><span>{f}</span>
                  </div>
                ))}
                {browserDirs.length === 0 && browserFiles.length === 0 && (
                  <div style={{ padding: "12px 20px", fontSize: 13, color: "#999" }}>Empty directory.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {error && <div style={{ padding: "8px 20px 0", color: "#c0392b", fontSize: 12 }}>{error}</div>}
        <div style={{ padding: "12px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "6px 16px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!dir.trim()} style={{ padding: "6px 16px", border: "none", borderRadius: 4, background: dir.trim() ? "#1a6fa8" : "#a0c4e8", color: "#fff", cursor: dir.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600 }}>Create</button>
        </div>
      </div>
    </div>
  );
}
