import { useState, useEffect } from "react";
import type { TemplateComplianceItem } from "../api";

export interface TemplatePrefs {
  apply_fm: boolean;
  remove_extra: boolean;
  append_body: boolean;
}

interface Props {
  items: TemplateComplianceItem[];
  onBatchApply: (files: string[], remove_extra: boolean, apply_fm: boolean, append_body: boolean) => void;
  onClose: () => void;
  onViewTemplate?: () => void;
  prefs: TemplatePrefs;
  onPrefsChange: (prefs: TemplatePrefs) => void;
}

export default function ComplianceReport({ items, onBatchApply, onClose, onViewTemplate, prefs, onPrefsChange }: Props) {
  const set = (patch: Partial<TemplatePrefs>) => onPrefsChange({ ...prefs, ...patch });

  const visibleItems = items.filter(item => {
    const hasFm = prefs.apply_fm && (item.missing_keys.length > 0 || (prefs.remove_extra && item.extra_keys.length > 0));
    const hasBody = prefs.append_body && item.missing_headings.length > 0;
    return hasFm || hasBody;
  });

  const [selected, setSelected] = useState<Set<string>>(() => new Set(visibleItems.map(i => i.path)));

  useEffect(() => {
    setSelected(new Set(visibleItems.map(i => i.path)));
  }, [prefs.apply_fm, prefs.remove_extra, prefs.append_body]);

  const toggleFile = (path: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === visibleItems.length ? new Set() : new Set(visibleItems.map(i => i.path)));
  };

  const selectedCount = selected.size;

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Template Compliance</h3>
          <button onClick={onClose} style={closeBtnStyle}>&#10005;</button>
        </div>

        <>
          {visibleItems.length === 0 ? (
            <p style={{ color: "#3a7d44", fontSize: 14, marginBottom: 16 }}>All files conform to the selected checks.</p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
                {visibleItems.length} file{visibleItems.length !== 1 ? "s" : ""} out of compliance.
              </p>

              <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#1a6fa8", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="checkbox" checked={selected.size === visibleItems.length} onChange={toggleAll} />
                  {selected.size === visibleItems.length ? "Deselect all" : "Select all"}
                </label>
                <span style={{ fontSize: 12, color: "#888" }}>({selectedCount} selected)</span>
              </div>

              <div style={{ maxHeight: 380, overflowY: "auto", marginBottom: 16 }}>
                {visibleItems.map((item) => (
                <div
                  key={item.path}
                  style={{ padding: "8px 0", borderBottom: "1px solid #eee", opacity: selected.has(item.path) ? 1 : 0.5 }}
                >
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selected.has(item.path)}
                      onChange={() => toggleFile(item.path)}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a1a" }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>{item.path}</div>
                      {prefs.apply_fm && item.missing_keys.length > 0 && (
                        <div style={{ fontSize: 12, color: "#c00", marginTop: 2 }}>
                          Missing keys: {item.missing_keys.map(k => <span key={k} style={redTag}>{k}</span>)}
                        </div>
                      )}
                      {prefs.apply_fm && prefs.remove_extra && item.extra_keys.length > 0 && (
                        <div style={{ fontSize: 12, color: "#996600", marginTop: 2 }}>
                          Extra keys: {item.extra_keys.map(k => <span key={k} style={yellowTag}>{k}</span>)}
                        </div>
                      )}
                      {prefs.append_body && item.missing_headings.length > 0 && (
                        <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                          Missing headings: {item.missing_headings.map(h => <span key={h} style={grayTag}>{h}</span>)}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
                ))}
              </div>
            </>
          )}

          <hr style={{ border: "none", borderTop: "2px solid #ddd", margin: "12px 0" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555", cursor: "pointer" }}>
              <input type="checkbox" checked={prefs.apply_fm} onChange={e => set({ apply_fm: e.target.checked })} />
              Update frontmatter
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888", cursor: "pointer", marginLeft: 16 }}>
              <input type="checkbox" checked={prefs.remove_extra} onChange={e => set({ remove_extra: e.target.checked })} disabled={!prefs.apply_fm} />
              Remove extra frontmatter keys not in template
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555", cursor: "pointer" }}>
              <input type="checkbox" checked={prefs.append_body} onChange={e => set({ append_body: e.target.checked })} />
              Append template body
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {onViewTemplate && (
              <button onClick={onViewTemplate} style={actionBtn}>View template</button>
            )}
            <div style={{ flex: 1 }} />
            <button onClick={onClose} style={{ ...actionBtn, background: "#eee", color: "#333" }}>Close</button>
            <button
              onClick={() => onBatchApply([...selected], prefs.remove_extra, prefs.apply_fm, prefs.append_body)}
              disabled={selectedCount === 0}
              style={{ ...actionBtn, opacity: selectedCount === 0 ? 0.5 : 1, cursor: selectedCount === 0 ? "default" : "pointer" }}
            >
              Apply to {selectedCount} file{selectedCount !== 1 ? "s" : ""}
            </button>
          </div>
        </>
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
const redTag: React.CSSProperties = {
  display: "inline-block", padding: "1px 6px", borderRadius: 3,
  background: "#fde8e8", color: "#c00", fontSize: 11, marginLeft: 4,
};
const yellowTag: React.CSSProperties = {
  display: "inline-block", padding: "1px 6px", borderRadius: 3,
  background: "#fff3e0", color: "#996600", fontSize: 11, marginLeft: 4,
};
const grayTag: React.CSSProperties = {
  display: "inline-block", padding: "1px 6px", borderRadius: 3,
  background: "#f0f0f0", color: "#555", fontSize: 11, marginLeft: 4,
};
const actionBtn: React.CSSProperties = {
  background: "#1a6fa8", color: "#fff", border: "none", borderRadius: 4,
  padding: "8px 16px", cursor: "pointer", fontSize: 13,
};
const closeBtnStyle: React.CSSProperties = {
  background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#666",
};
