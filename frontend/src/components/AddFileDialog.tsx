import { useState, useEffect, useRef, useCallback } from "react";
import { addExternalFiles, importFiles, browseStartDir, browseDirs } from "../api";

interface Props {
  currentProject: string;
  markdownsDir?: string;
  onAdded: () => void;
  onClose: () => void;
}

function normPath(p: string) {
  return p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

export default function AddFileDialog({ currentProject, markdownsDir, onAdded, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copyToMarkdowns, setCopyToMarkdowns] = useState(false);
  const [error, setError] = useState("");
  const [browserPath, setBrowserPath] = useState("");
  const [browserDirs, setBrowserDirs] = useState<string[]>([]);
  const [browserFiles, setBrowserFiles] = useState<string[]>([]);
  const [browserParent, setBrowserParent] = useState<string | null>(null);
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isInsideProjectDir = !!(markdownsDir && browserPath &&
    normPath(browserPath).startsWith(normPath(markdownsDir)));

  const LAST_DIR_KEY = "pith_add_file_last_dir";

  const navigate = useCallback(async (path: string): Promise<string[]> => {
    try {
      const result = await browseDirs(path);
      setBrowserPath(result.path);
      setBrowserDirs(result.dirs);
      setBrowserFiles(result.files);
      setBrowserParent(result.parent);
      setSelectedDir(null);
      setSelected(new Set());
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      return result.files;
    } catch { return []; }
  }, []);

  const navigateAndRemember = useCallback(async (path: string): Promise<string[]> => {
    const files = await navigate(path);
    try { localStorage.setItem(LAST_DIR_KEY, path); } catch {}
    return files;
  }, [navigate]);

  useEffect(() => {
    const lastDir = (() => { try { return localStorage.getItem(LAST_DIR_KEY); } catch { return null; } })();
    if (lastDir) {
      browseDirs(lastDir).then(result => {
        navigate(result.path);
      }).catch(() => {
        // last dir no longer accessible, fall back to default
        browseStartDir(currentProject).then(startPath => navigateToStart(startPath));
      });
    } else {
      browseStartDir(currentProject).then(startPath => navigateToStart(startPath));
    }
  }, []);

  const navigateToStart = useCallback(async (startPath: string) => {
    if (markdownsDir && normPath(startPath).startsWith(normPath(markdownsDir))) {
      const result = await browseDirs(startPath);
      if (result.parent) { navigate(result.parent); return; }
    }
    navigate(startPath);
  }, [markdownsDir, navigate]);

  const handleConfirm = async () => {
    if (selected.size === 0 || isInsideProjectDir) return;
    try { localStorage.setItem(LAST_DIR_KEY, browserPath); } catch {}
    const sep = browserPath.includes("/") ? "/" : "\\";
    const filePaths = [...selected].map(name => browserPath + sep + name);
    try {
      if (copyToMarkdowns) {
        await importFiles(currentProject, filePaths);
      } else {
        await addExternalFiles(currentProject, filePaths);
      }
      onAdded();
    } catch (e: any) {
      setError(e.message ?? "Failed to add files");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, minWidth: 480, maxWidth: 600, width: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", height: 480 }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e8e8e8" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1a3a5c", marginBottom: 8 }}>Add Existing File</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => browserParent !== null && navigateAndRemember(browserParent)} disabled={browserParent === null} title="Go up"
              style={{ padding: "3px 8px", border: "1px solid #ccc", borderRadius: 4, background: browserParent !== null ? "#f5f5f5" : "#fafafa", cursor: browserParent !== null ? "pointer" : "default", fontSize: 13, color: browserParent !== null ? "#333" : "#bbb", flexShrink: 0 }}>↑</button>
            <div style={{ fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
              {browserPath || "Select a drive"}
            </div>
          </div>
        </div>
        {isInsideProjectDir && (
          <div style={{ padding: "8px 20px", background: "#fff8e1", borderBottom: "1px solid #ffe082", fontSize: 12, color: "#7a5c00" }}>
            This is the project's own folder — files here are already tracked automatically. Navigate outside the project to add external files.
          </div>
        )}
        <div ref={scrollRef} style={{ overflowY: "auto", flex: 1, padding: "2px 0" }}>
          {browserDirs.map(d => {
            const label = d.replace(/[\\/]$/, "").split(/[\\/]/).pop() || d;
            const isSelected = selectedDir === d;
            return (
              <div key={d}
                onClick={() => setSelectedDir(d)}
                onDoubleClick={() => navigateAndRemember(d)}
                style={{ padding: "6px 20px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#1a3a5c", background: isSelected ? "#e8f4fd" : "" }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f0f7ff"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ""; }}
              >
                <span style={{ fontSize: 15 }}>📁</span><span>{label}</span>
              </div>
            );
          })}
          {browserFiles.length > 0 && browserDirs.length > 0 && <div style={{ height: 1, background: "#e8e8e8", margin: "4px 20px" }} />}
          {browserFiles.length > 0 && !isInsideProjectDir && (
            <div style={{ padding: "4px 20px 2px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#888", cursor: "pointer", textDecoration: "underline" }}
                onClick={() => { if (selected.size === browserFiles.length) setSelected(new Set()); else setSelected(new Set(browserFiles)); }}>
                {selected.size === browserFiles.length ? "Deselect all" : "Select all"}
              </span>
            </div>
          )}
          {browserFiles.map(file => {
            const isSelected = selected.has(file);
            return (
              <div key={file}
                onClick={() => { if (!isInsideProjectDir) setSelected(prev => { const next = new Set(prev); if (next.has(file)) next.delete(file); else next.add(file); return next; }); }}
                style={{ padding: "5px 20px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, color: isInsideProjectDir ? "#bbb" : (isSelected ? "#1a3a5c" : "#666"), background: isSelected ? "#e8f4fd" : "transparent", cursor: isInsideProjectDir ? "default" : "pointer" }}
                onMouseEnter={e => { if (!isSelected && !isInsideProjectDir) e.currentTarget.style.background = "#f0f7ff"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ""; }}
              >
                <span style={{ fontSize: 13, color: isInsideProjectDir ? "#ddd" : (isSelected ? "#1a6fa8" : "#999") }}>{isSelected ? "☑" : "☐"}</span>
                <span>{file}</span>
              </div>
            );
          })}
          {browserDirs.length === 0 && browserFiles.length === 0 && (
            <div style={{ padding: "12px 20px", fontSize: 13, color: "#999" }}>Empty directory.</div>
          )}
        </div>
        {error && <div style={{ padding: "8px 20px 0", color: "#c0392b", fontSize: 12 }}>{error}</div>}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e8e8e8", display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "#666", display: "flex", alignItems: "center", gap: 5, flex: 1, cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" checked={copyToMarkdowns} onChange={e => setCopyToMarkdowns(e.target.checked)} />
            Copy to current project
          </label>
          {selected.size > 0 && !isInsideProjectDir && <span style={{ fontSize: 12, color: "#888" }}>{selected.size} file{selected.size !== 1 ? "s" : ""} selected</span>}
          <button onClick={onClose} style={{ padding: "6px 16px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={handleConfirm} disabled={selected.size === 0 || isInsideProjectDir} style={{ padding: "6px 16px", border: "none", borderRadius: 4, background: selected.size > 0 && !isInsideProjectDir ? "#1a6fa8" : "#a0c4e8", color: "#fff", cursor: selected.size > 0 && !isInsideProjectDir ? "pointer" : "default", fontSize: 13, fontWeight: 600 }}>Add</button>
        </div>
      </div>
    </div>
  );
}
