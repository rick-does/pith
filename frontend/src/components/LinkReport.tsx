import type { FileLinkReport } from "../api";

interface Props {
  items: FileLinkReport[];
  onOpen: (path: string) => void;
  onClose: () => void;
}

export default function LinkReport({ items, onOpen, onClose }: Props) {
  const totalBroken = items.reduce((s, i) => s + i.broken_links.length, 0);

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Link Validation</h3>
          <button onClick={onClose} style={closeBtnStyle}>&#10005;</button>
        </div>

        {items.length === 0 ? (
          <p style={{ color: "#3a7d44", fontSize: 14 }}>All internal links are valid.</p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
              {totalBroken} broken link{totalBroken !== 1 ? "s" : ""} in {items.length} file{items.length !== 1 ? "s" : ""}.
            </p>

            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {items.map((item) => (
                <div key={item.path} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  <div
                    onClick={() => { onOpen(item.path); onClose(); }}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#1a1a1a" }}>{item.title}</span>
                    <span style={{ fontSize: 12, color: "#888" }}>{item.path}</span>
                  </div>
                  {item.broken_links.map((link, i) => (
                    <div key={i} style={{ padding: "3px 0 3px 16px", fontSize: 12 }}>
                      <span style={{ color: "#c00", fontFamily: "monospace" }}>{link.target}</span>
                      <span style={{ color: "#888", marginLeft: 8 }}>line {link.line}</span>
                      {link.text && (
                        <span style={{ color: "#999", marginLeft: 8 }}>"{link.text}"</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={actionBtn}>Close</button>
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
  background: "#fff", borderRadius: 8, padding: 24, minWidth: 480, maxWidth: 600,
  boxShadow: "0 4px 24px rgba(0,0,0,.2)", maxHeight: "80vh", display: "flex", flexDirection: "column",
};
const actionBtn: React.CSSProperties = {
  background: "#333", color: "#fff", border: "none", borderRadius: 4,
  padding: "8px 16px", cursor: "pointer", fontSize: 13,
};
const closeBtnStyle: React.CSSProperties = {
  background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#666",
};
