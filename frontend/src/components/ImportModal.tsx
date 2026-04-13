import { useState } from "react";

interface Props {
  onImportMkdocs: () => void;
  onImportDocusaurus: (filename?: string) => void;
  onClose: () => void;
}

export default function ImportModal({ onImportMkdocs, onImportDocusaurus, onClose }: Props) {
  const [tab, setTab] = useState<"mkdocs" | "docusaurus">("mkdocs");
  const [docFilename, setDocFilename] = useState("");

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px" }}>Import Hierarchy</h3>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setTab("mkdocs")} style={tab === "mkdocs" ? activeTab : tabBtn}>
            MkDocs
          </button>
          <button onClick={() => setTab("docusaurus")} style={tab === "docusaurus" ? activeTab : tabBtn}>
            Docusaurus
          </button>
        </div>

        {tab === "mkdocs" && (
          <div>
            <p style={{ fontSize: 13, color: "#666" }}>
              Reads <code>mkdocs.yml</code> from the project root and imports its nav structure.
            </p>
            <button onClick={() => { onImportMkdocs(); onClose(); }} style={actionBtn}>
              Import from MkDocs
            </button>
          </div>
        )}

        {tab === "docusaurus" && (
          <div>
            <p style={{ fontSize: 13, color: "#666" }}>
              Reads <code>sidebars.js</code> or <code>sidebars.ts</code> from the project root.
            </p>
            <input
              placeholder="Custom filename (optional)"
              value={docFilename}
              onChange={(e) => setDocFilename(e.target.value)}
              style={{ width: "100%", padding: 6, marginBottom: 8, boxSizing: "border-box" }}
            />
            <button
              onClick={() => { onImportDocusaurus(docFilename || undefined); onClose(); }}
              style={actionBtn}
            >
              Import from Docusaurus
            </button>
          </div>
        )}

        <button onClick={onClose} style={{ ...tabBtn, marginTop: 16 }}>Cancel</button>
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
};
const modal: React.CSSProperties = {
  background: "#fff", borderRadius: 8, padding: 24, minWidth: 360,
  boxShadow: "0 4px 24px rgba(0,0,0,.2)",
};
const tabBtn: React.CSSProperties = {
  background: "#f0f0f0", border: "1px solid #ccc", borderRadius: 4,
  padding: "6px 16px", cursor: "pointer", fontSize: 13,
};
const activeTab: React.CSSProperties = {
  ...tabBtn, background: "#0e639c", color: "#fff", borderColor: "#0e639c",
};
const actionBtn: React.CSSProperties = {
  background: "#0e639c", color: "#fff", border: "none", borderRadius: 4,
  padding: "8px 20px", cursor: "pointer", fontSize: 14,
};
