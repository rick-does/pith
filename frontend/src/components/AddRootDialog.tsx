import { useState, useEffect, useCallback } from "react";
import { addRoot, browseStartDir, browseDirs } from "../api";

interface Props {
  onAdded: (rootPath: string) => Promise<void>;
  onClose: () => void;
}

export default function AddRootDialog({ onAdded, onClose }: Props) {
  const [description, setDescription] = useState("");
  const [createDir, setCreateDir] = useState(false);
  const [newDirName, setNewDirName] = useState("");
  const [error, setError] = useState("");
  const [browserPath, setBrowserPath] = useState("");
  const [browserDirs, setBrowserDirs] = useState<string[]>([]);
  const [browserParent, setBrowserParent] = useState<string | null>(null);

  const navigate = useCallback(async (path: string) => {
    try {
      const data = await browseDirs(path);
      setBrowserPath(data.path);
      setBrowserDirs(data.dirs);
      setBrowserParent(data.parent);
    } catch {}
  }, []);

  useEffect(() => {
    browseStartDir().then(startPath => navigate(startPath));
  }, []);

  const handleAdd = async () => {
    if (!browserPath) { setError("Select a directory"); return; }
    if (createDir && !newDirName.trim()) { setError("Enter a directory name"); return; }
    const targetPath = createDir ? `${browserPath}/${newDirName.trim()}` : browserPath;
    try {
      const { path } = await addRoot(targetPath, description.trim(), createDir);
      await onAdded(path);
    } catch (e: any) {
      setError(e.message ?? "Failed to add root");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, minWidth: 480, maxWidth: 600, width: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e8e8e8" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1a3a5c", marginBottom: 12 }}>New Project Root</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {createDir && (
              <div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>New directory name</div>
                <input autoFocus value={newDirName}
                  onChange={e => { setNewDirName(e.target.value.replace(/\s+/g, "-").replace(/[/\\<>:"|?*\0]/g, "").toLowerCase()); setError(""); }}
                  placeholder="my-projects"
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #b3d9f7", borderRadius: 4, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
              </div>
            )}
            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>Description <span style={{ color: "#bbb" }}>(optional)</span></div>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Personal documentation projects"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #b3d9f7", borderRadius: 4, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["Use existing directory", "Create new directory"] as const).map((label, i) => (
                <button key={label} onClick={() => setCreateDir(i === 1)}
                  style={{ flex: 1, padding: "6px 10px", border: `1px solid ${createDir === (i === 1) ? "#1a6fa8" : "#ccc"}`, borderRadius: 4, background: createDir === (i === 1) ? "#e8f4fd" : "#fff", color: createDir === (i === 1) ? "#1a6fa8" : "#555", cursor: "pointer", fontSize: 12, fontWeight: createDir === (i === 1) ? 600 : 400 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "8px 20px 4px", fontSize: 12, color: "#555" }}>
          {createDir ? "Choose parent directory:" : "Select directory:"}
          {browserPath && <span style={{ marginLeft: 8, fontFamily: "monospace", color: "#888" }}>{createDir && newDirName ? `${browserPath}/${newDirName}` : browserPath}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 20px 6px" }}>
          <button onClick={() => browserParent !== null && navigate(browserParent)} disabled={browserParent === null} title="Go up"
            style={{ padding: "3px 8px", border: "1px solid #ccc", borderRadius: 4, background: browserParent !== null ? "#f5f5f5" : "#fafafa", cursor: browserParent !== null ? "pointer" : "default", fontSize: 13, color: browserParent !== null ? "#333" : "#bbb", flexShrink: 0 }}>↑</button>
          <div style={{ fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
            {browserPath || "Select a drive"}
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "2px 0", minHeight: 160 }}>
          {browserDirs.map(d => {
            const label = d.replace(/[\\/]$/, "").split(/[\\/]/).pop() || d;
            return (
              <div key={d} onClick={() => navigate(d)}
                style={{ padding: "6px 20px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#1a3a5c" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f0f7ff")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <span style={{ fontSize: 15 }}>📁</span><span>{label}</span>
              </div>
            );
          })}
          {browserDirs.length === 0 && browserPath && (
            <div style={{ padding: "12px 20px", fontSize: 13, color: "#999" }}>No subdirectories.</div>
          )}
        </div>

        {error && <div style={{ padding: "8px 20px 0", color: "#c0392b", fontSize: 12 }}>{error}</div>}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e8e8e8", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "6px 16px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={handleAdd} style={{ padding: "6px 16px", border: "none", borderRadius: 4, background: "#1a6fa8", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Add Root</button>
        </div>
      </div>
    </div>
  );
}
