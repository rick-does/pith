import { useState, useEffect, useCallback } from "react";
import { fetchProjectPaths, fetchProjectMd, updateProjectPaths, saveProjectMd, renameProject, browseStartDir, browseDirs } from "../api";

interface Props {
  project: string;
  onSaved: (newName: string) => Promise<void>;
  onClose: () => void;
}

type BrowserTarget = "markdowns" | "yaml";

function joinPath(dir: string, name: string): string {
  const sep = dir.includes("\\") ? "\\" : "/";
  return dir.replace(/[\\/]+$/, "") + sep + name;
}

function extractTitle(content: string): string {
  const body = content.replace(/^---[\s\S]*?---\n?/, "");
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

export default function EditProjectPathsDialog({ project, onSaved, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [dir, setDir] = useState(project);
  const [mdPath, setMdPath] = useState("");
  const [yamlFile, setYamlFile] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [browserTarget, setBrowserTarget] = useState<BrowserTarget | null>(null);
  const [browserPath, setBrowserPath] = useState("");
  const [browserDirs, setBrowserDirs] = useState<string[]>([]);
  const [browserFiles, setBrowserFiles] = useState<string[]>([]);
  const [browserParent, setBrowserParent] = useState<string | null>(null);
  const [selectedDir, setSelectedDir] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchProjectPaths(project), fetchProjectMd(project)])
      .then(([paths, md]) => {
        setMdPath(paths.markdowns_dir);
        setYamlFile(paths.tree_yaml);
        setTitle(extractTitle(md));
      })
      .catch(() => setError("Failed to load project"))
      .finally(() => setLoading(false));
  }, [project]);

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
    const startPath = target === "markdowns"
      ? (mdPath || await browseStartDir(project).catch(() => ""))
      : (yamlFile ? yamlFile.replace(/[\\/][^\\/]+$/, "") : await browseStartDir(project).catch(() => ""));
    await navigate(startPath, target === "yaml" ? "yaml" : "md");
  }, [project, mdPath, yamlFile, navigate]);

  const selectMarkdownsDir = () => {
    const chosen = selectedDir ?? browserPath;
    if (!chosen) return;
    setMdPath(chosen);
    setSelectedDir(null);
    setBrowserTarget(null);
  };

  const selectYamlFile = (filename: string) => {
    setYamlFile(joinPath(browserPath, filename));
    setBrowserTarget(null);
  };

  const handleSubmit = async () => {
    const newDir = dir.trim().replace(/\s+/g, "-").replace(/[/\\<>:"|?*\0]/g, "").toLowerCase();
    if (!newDir) { setError("Project directory name is required"); return; }
    if (!mdPath.trim() || !yamlFile.trim()) { setError("Both path fields are required"); return; }
    try {
      let currentName = project;
      if (newDir !== project) {
        await renameProject(project, newDir);
        currentName = newDir;
      }
      await updateProjectPaths(currentName, mdPath.trim(), yamlFile.trim());
      if (title.trim()) await saveProjectMd(currentName, `# ${title.trim()}\n`);
      await onSaved(currentName);
    } catch (e: any) {
      setError(e.message ?? "Failed to update project");
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

  if (browserTarget) {
    const isYaml = browserTarget === "yaml";
    const ext = isYaml ? "yaml" : "md";
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", borderRadius: 8, width: 560, maxWidth: "90vw", height: 520, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid #e8e8e8" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a3a5c", marginBottom: 8 }}>{isYaml ? "Select YAML file" : "Select markdowns directory"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => browserParent !== null && navigate(browserParent, ext)} disabled={browserParent === null}
                style={{ padding: "3px 8px", border: "1px solid #ccc", borderRadius: 4, background: browserParent !== null ? "#f5f5f5" : "#fafafa", cursor: browserParent !== null ? "pointer" : "default", fontSize: 13, color: browserParent !== null ? "#333" : "#bbb", flexShrink: 0 }}>↑</button>
              <div style={{ fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", flex: 1 }}>{browserPath || "Select a drive"}</div>
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1, padding: "2px 0" }}>
            {browserDirs.map(d => {
              const leafLabel = d.replace(/[\\/]$/, "").split(/[\\/]/).pop() || d;
              const isSelected = selectedDir === d;
              return (
                <div key={d} onClick={() => setSelectedDir(d)} onDoubleClick={() => { setSelectedDir(null); navigate(d, ext); }}
                  style={{ padding: "6px 20px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#1a3a5c", background: isSelected ? "#e8f4fd" : "" }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f0f7ff"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ""; }}
                ><span style={{ fontSize: 15 }}>📁</span><span>{leafLabel}</span></div>
              );
            })}
            {isYaml && browserFiles.map(f => (
              <div key={f} onClick={() => selectYamlFile(f)}
                style={{ padding: "6px 20px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#1a6fa8" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f0f7ff")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              ><span style={{ fontSize: 14 }}>📄</span><span>{f}</span></div>
            ))}
            {browserDirs.length === 0 && browserFiles.length === 0 && browserPath && (
              <div style={{ padding: "12px 20px", fontSize: 13, color: "#999" }}>{isYaml ? "No YAML files here." : "Empty directory."}</div>
            )}
          </div>
          <div style={{ padding: "10px 20px", borderTop: "1px solid #e8e8e8", display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setBrowserTarget(null)} style={{ padding: "6px 16px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            {!isYaml && (
              <button onClick={selectMarkdownsDir} disabled={!browserPath}
                style={{ ...primaryBtn, background: browserPath ? "#1a6fa8" : "#a0c4e8", cursor: browserPath ? "pointer" : "default" }}>
                Select this directory
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const canSubmit = !loading && !!dir.trim() && !!mdPath.trim() && !!yamlFile.trim();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, minWidth: 480, maxWidth: 560, width: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #e8e8e8" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1a3a5c", marginBottom: 14 }}>Edit Project Paths</div>
          {loading ? (
            <div style={{ fontSize: 13, color: "#888", padding: "8px 0" }}>Loading…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>Project title</div>
                <input autoFocus value={title} onChange={e => { setTitle(e.target.value); setError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                  placeholder="My Documentation"
                  style={{ ...inputStyle, width: "100%" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>Project directory name</div>
                <input value={dir} onChange={e => { setDir(e.target.value); setError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                  style={{ ...inputStyle, width: "100%", fontFamily: "monospace" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>Markdowns directory</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={mdPath} onChange={e => { setMdPath(e.target.value); setError(""); }}
                    style={{ ...inputStyle, fontFamily: "monospace" }} />
                  <button onClick={() => openBrowser("markdowns")} style={browseBtn}>Browse</button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>YAML file</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={yamlFile} onChange={e => { setYamlFile(e.target.value); setError(""); }}
                    style={{ ...inputStyle, fontFamily: "monospace" }} />
                  <button onClick={() => openBrowser("yaml")} style={browseBtn}>Browse</button>
                </div>
              </div>
            </div>
          )}
        </div>
        {error && <div style={{ padding: "8px 20px 0", color: "#c0392b", fontSize: 12 }}>{error}</div>}
        <div style={{ padding: "12px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "6px 16px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{ ...primaryBtn, background: canSubmit ? "#1a6fa8" : "#a0c4e8", cursor: canSubmit ? "pointer" : "default" }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
