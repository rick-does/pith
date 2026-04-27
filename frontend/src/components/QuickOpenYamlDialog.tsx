import { useState, useEffect, useRef, useCallback } from "react";
import { browseStartDir, browseDirs } from "../api";

interface Props {
  onOpen: (yamlPath: string) => void;
  onClose: () => void;
}

export default function QuickOpenYamlDialog({ onOpen, onClose }: Props) {
  const [browserPath, setBrowserPath] = useState("");
  const [browserDirs, setBrowserDirs] = useState<string[]>([]);
  const [browserFiles, setBrowserFiles] = useState<string[]>([]);
  const [browserParent, setBrowserParent] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const navigate = useCallback(async (path: string) => {
    try {
      const result = await browseDirs(path, "yaml");
      setBrowserPath(result.path);
      setBrowserDirs(result.dirs);
      setBrowserFiles(result.files);
      setBrowserParent(result.parent);
      setSelectedFile(null);
      setSelectedDir(null);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } catch {}
  }, []);

  useEffect(() => {
    browseStartDir().then(startPath => navigate(startPath));
  }, []);

  const confirmFile = (file: string) => {
    const sep = browserPath.includes("/") ? "/" : "\\";
    onOpen(browserPath + sep + file);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, minWidth: 480, maxWidth: 600, width: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", height: 480 }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e8e8e8" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1a3a5c", marginBottom: 8 }}>Quick Open YAML</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => browserParent !== null && navigate(browserParent)} disabled={browserParent === null} title="Go up"
              style={{ padding: "3px 8px", border: "1px solid #ccc", borderRadius: 4, background: browserParent !== null ? "#f5f5f5" : "#fafafa", cursor: browserParent !== null ? "pointer" : "default", fontSize: 13, color: browserParent !== null ? "#333" : "#bbb", flexShrink: 0 }}>↑</button>
            <div style={{ fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
              {browserPath || "Select a drive"}
            </div>
          </div>
        </div>
        <div ref={scrollRef} style={{ overflowY: "auto", flex: 1, padding: "2px 0" }}>
          {browserDirs.map(d => {
            const label = d.replace(/[\\/]$/, "").split(/[\\/]/).pop() || d;
            const isSelected = selectedDir === d;
            return (
              <div key={d}
                onClick={() => setSelectedDir(d)}
                onDoubleClick={() => navigate(d)}
                style={{ padding: "6px 20px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#1a3a5c", background: isSelected ? "#e8f4fd" : "" }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f0f7ff"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ""; }}
              >
                <span style={{ fontSize: 15 }}>📁</span><span>{label}</span>
              </div>
            );
          })}
          {browserFiles.length > 0 && browserDirs.length > 0 && <div style={{ height: 1, background: "#e8e8e8", margin: "4px 20px" }} />}
          {browserFiles.map(file => {
            const isSelected = selectedFile === file;
            return (
              <div key={file}
                onClick={() => setSelectedFile(file)}
                onDoubleClick={() => confirmFile(file)}
                style={{ padding: "5px 20px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, color: isSelected ? "#1a3a5c" : "#666", background: isSelected ? "#e8f4fd" : "transparent", cursor: "pointer" }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f0f7ff"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ""; }}
              >
                <span style={{ fontSize: 13, color: "#888" }}>📄</span>
                <span>{file}</span>
              </div>
            );
          })}
          {browserDirs.length === 0 && browserFiles.length === 0 && (
            <div style={{ padding: "12px 20px", fontSize: 13, color: "#999" }}>No YAML files here.</div>
          )}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e8e8e8", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "6px 16px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={() => selectedFile && confirmFile(selectedFile)} disabled={!selectedFile}
            style={{ padding: "6px 16px", border: "none", borderRadius: 4, background: selectedFile ? "#1a6fa8" : "#a0c4e8", color: "#fff", cursor: selectedFile ? "pointer" : "default", fontSize: 13, fontWeight: 600 }}>Open</button>
        </div>
      </div>
    </div>
  );
}
