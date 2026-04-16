import type { FileTemplateComplianceItem } from "../api";

interface Props {
  items: FileTemplateComplianceItem[];
  onClose: () => void;
}

export default function FileTemplateComplianceReport({ items, onClose }: Props) {
  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>File Template Compliance</h3>
          <button onClick={onClose} style={closeBtnStyle}>&#10005;</button>
        </div>

        {items.length === 0 ? (
          <p style={{ color: "#3a7d44", fontSize: 14 }}>All files match the template.</p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
              {items.length} file{items.length !== 1 ? "s" : ""} missing template sections.
            </p>
            <div style={{ maxHeight: 400, overflowY: "auto", marginBottom: 16 }}>
              {items.map((item) => (
                <div key={item.path} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a1a" }}>{item.path}</div>
                  <div style={{ fontSize: 12, color: "#c00", marginTop: 2 }}>
                    Missing: {item.missing_headings.map(h => (
                      <span key={h} style={tagStyle}>{h}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={onClose} style={actionBtn}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300,
};
const modal: React.CSSProperties = {
  background: "#fff", borderRadius: 8, padding: 24, minWidth: 480, maxWidth: 600,
  boxShadow: "0 4px 24px rgba(0,0,0,.2)", maxHeight: "80vh", display: "flex", flexDirection: "column",
};
const tagStyle: React.CSSProperties = {
  display: "inline-block", padding: "1px 6px", borderRadius: 3,
  background: "#fde8e8", color: "#c00", fontSize: 11, marginLeft: 4,
};
const actionBtn: React.CSSProperties = {
  background: "#eee", color: "#333", border: "none", borderRadius: 4,
  padding: "8px 16px", cursor: "pointer", fontSize: 13,
};
const closeBtnStyle: React.CSSProperties = {
  background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#666",
};
