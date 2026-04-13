import { useState } from "react";
import type { ComplianceItem } from "../api";

interface Props {
  items: ComplianceItem[];
  onBatchUpdate: (addDefaults: boolean, stripExtra: boolean) => void;
  onClose: () => void;
}

export default function ComplianceReport({ items, onBatchUpdate, onClose }: Props) {
  const [addDefaults, setAddDefaults] = useState(true);
  const [stripExtra, setStripExtra] = useState(false);

  const totalMissing = items.reduce((s, i) => s + i.missing.length, 0);
  const totalExtra = items.reduce((s, i) => s + i.extra.length, 0);

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Frontmatter Compliance</h3>
          <button onClick={onClose} style={closeBtnStyle}>&#10005;</button>
        </div>

        {items.length === 0 ? (
          <p style={{ color: "#3a7d44", fontSize: 14 }}>All files match the template.</p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
              {items.length} file{items.length !== 1 ? "s" : ""} out of compliance.
              {totalMissing > 0 && ` ${totalMissing} missing key${totalMissing !== 1 ? "s" : ""}.`}
              {totalExtra > 0 && ` ${totalExtra} extra key${totalExtra !== 1 ? "s" : ""}.`}
            </p>

            <div style={{ maxHeight: 350, overflowY: "auto", marginBottom: 16 }}>
              {items.map((item) => (
                <div key={item.path} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a1a" }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{item.path}</div>
                  {item.missing.length > 0 && (
                    <div style={{ fontSize: 12, color: "#c00", marginTop: 2 }}>
                      Missing: {item.missing.map(k => (
                        <span key={k} style={tagStyle}>{k}</span>
                      ))}
                    </div>
                  )}
                  {item.extra.length > 0 && (
                    <div style={{ fontSize: 12, color: "#996600", marginTop: 2 }}>
                      Extra: {item.extra.map(k => (
                        <span key={k} style={{ ...tagStyle, background: "#fff3e0", color: "#996600" }}>{k}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ background: "#f8f8f8", padding: 12, borderRadius: 6, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Batch update options</div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", marginBottom: 4 }}>
                <input type="checkbox" checked={addDefaults} onChange={(e) => setAddDefaults(e.target.checked)} />
                Add missing keys with default values
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={stripExtra} onChange={(e) => setStripExtra(e.target.checked)} />
                Remove extra keys not in template
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ ...actionBtn, background: "#eee", color: "#333" }}>Close</button>
              <button
                onClick={() => onBatchUpdate(addDefaults, stripExtra)}
                style={actionBtn}
              >
                Update {items.length} file{items.length !== 1 ? "s" : ""}
              </button>
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
  background: "#1a6fa8", color: "#fff", border: "none", borderRadius: 4,
  padding: "8px 16px", cursor: "pointer", fontSize: 13,
};
const closeBtnStyle: React.CSSProperties = {
  background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#666",
};
