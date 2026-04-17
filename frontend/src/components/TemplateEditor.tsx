import { useState } from "react";
import CodeEditor from "./CodeEditor";

interface Props {
  content: string;
  onSave: (content: string) => void;
  onClose: () => void;
  onViewCompliance?: () => void;
}

export default function TemplateEditor({ content, onSave, onClose, onViewCompliance }: Props) {
  const [value, setValue] = useState(content);

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Project Template</h3>
          <button onClick={onClose} style={closeBtnStyle}>&#10005;</button>
        </div>
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 12px" }}>
          Edit the project template. Frontmatter keys and headings (h2+) define compliance requirements for all project files.
        </p>
        <div style={{ flex: 1, border: "1px solid #ccc", borderRadius: 4, overflow: "hidden", minHeight: 300 }}>
          <CodeEditor value={value} onChange={setValue} language="markdown" viMode={false} theme="github-light" />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
          {onViewCompliance && (
            <button onClick={onViewCompliance} style={actionBtn}>View compliance</button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ ...actionBtn, background: "#eee", color: "#333" }}>Cancel</button>
          <button onClick={() => onSave(value)} style={actionBtn}>Save template</button>
        </div>
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300,
};
const modal: React.CSSProperties = {
  background: "#fff", borderRadius: 8, padding: 24, width: 600,
  boxShadow: "0 4px 24px rgba(0,0,0,.2)", maxHeight: "80vh",
  display: "flex", flexDirection: "column",
};
const actionBtn: React.CSSProperties = {
  background: "#1a6fa8", color: "#fff", border: "none", borderRadius: 4,
  padding: "8px 16px", cursor: "pointer", fontSize: 13,
};
const closeBtnStyle: React.CSSProperties = {
  background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#666",
};
