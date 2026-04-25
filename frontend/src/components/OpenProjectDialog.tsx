import { useState, useEffect } from "react";
import { listProjects, restoreProject } from "../api";
import type { ProjectInfo } from "../types";

interface Props {
  currentProject: string | null;
  onOpen: (name: string) => void;
  onClose: () => void;
}

export default function OpenProjectDialog({ currentProject, onOpen, onClose }: Props) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProjects().then(ps => { setProjects(ps); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleRestore = async (name: string) => {
    await restoreProject(name);
    setProjects(prev => prev.map(p => p.name === name ? { ...p, archived: false } : p));
  };

  const q = query.toLowerCase();
  const active = projects.filter(p => !p.archived && (p.title.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)));
  const archived = projects.filter(p => p.archived && (p.title.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)));

  const rowStyle: React.CSSProperties = {
    padding: "8px 20px", display: "flex", alignItems: "center", gap: 10,
    cursor: "pointer", borderBottom: "1px solid #f0f0f0",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, width: 560, maxWidth: "92vw", maxHeight: "75vh", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e8e8e8" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1a3a5c", marginBottom: 10 }}>Open Project</div>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects..."
            style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #b3d9f7", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && <div style={{ padding: "20px", color: "#999", fontSize: 13, textAlign: "center" }}>Loading…</div>}

          {!loading && active.length === 0 && !showArchived && (
            <div style={{ padding: "20px", color: "#999", fontSize: 13, textAlign: "center" }}>No projects found.</div>
          )}

          {active.map(p => (
            <div key={p.name}
              style={{ ...rowStyle, background: p.name === currentProject ? "#e8f4fd" : "transparent" }}
              onClick={() => { onOpen(p.name); onClose(); }}
              onMouseEnter={e => { if (p.name !== currentProject) (e.currentTarget as HTMLDivElement).style.background = "#f5f8ff"; }}
              onMouseLeave={e => { if (p.name !== currentProject) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: p.name === currentProject ? 600 : 400, color: p.name === currentProject ? "#1a6fa8" : "#222", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.title}
                </div>
                {p.markdowns_dir && (
                  <div style={{ fontSize: 11, color: "#999", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
                    {p.markdowns_dir}
                  </div>
                )}
              </div>
            </div>
          ))}

          {archived.length > 0 && (
            <>
              <div
                style={{ padding: "8px 20px", fontSize: 12, color: "#888", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid #eee", userSelect: "none" }}
                onClick={() => setShowArchived(o => !o)}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ""}
              >
                <span style={{ fontSize: 10 }}>{showArchived ? "▲" : "▼"}</span>
                Archived ({archived.length})
              </div>
              {showArchived && archived.map(p => (
                <div key={p.name} style={{ ...rowStyle, background: "transparent", cursor: "default", paddingLeft: 28 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#999", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                    {p.markdowns_dir && (
                      <div style={{ fontSize: 11, color: "#bbb", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
                        {p.markdowns_dir}
                      </div>
                    )}
                  </div>
                  <span
                    onClick={() => handleRestore(p.name)}
                    style={{ fontSize: 11, color: "#1a6fa8", border: "1px solid #b3d9f7", borderRadius: 3, padding: "2px 8px", cursor: "pointer", flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget as HTMLSpanElement).style.background = "#e8f4fd"}
                    onMouseLeave={e => (e.currentTarget as HTMLSpanElement).style.background = "transparent"}
                  >Restore</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ padding: "10px 20px", borderTop: "1px solid #e8e8e8", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "6px 16px", border: "1px solid #ccc", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
