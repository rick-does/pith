import { useState } from "react";
import type { FrontmatterField } from "../api";

interface Props {
  metadata: Record<string, any>;
  templateFields: FrontmatterField[];
  onChange: (key: string, value: any) => void;
  onUseAsTemplate?: () => void;
  onEditTemplate?: () => void;
}

export default function FrontmatterPanel({ metadata, templateFields, onChange, onUseAsTemplate, onEditTemplate }: Props) {
  const [collapsed, setCollapsed] = useState(true);

  const allKeys = new Set([
    ...templateFields.map(f => f.key),
    ...Object.keys(metadata),
  ]);
  const fieldMap = new Map(templateFields.map(f => [f.key, f]));

  return (
    <div style={{ borderBottom: "1px solid #333", background: "#111", flexShrink: 0 }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: "6px 12px", cursor: "pointer", display: "flex",
          alignItems: "center", gap: 6, userSelect: "none",
        }}
      >
        <span style={{ fontSize: 10, color: "#888" }}>{collapsed ? "\u25B6" : "\u25BC"}</span>
        <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Frontmatter</span>
        <span style={{ fontSize: 11, color: "#888" }}>({allKeys.size} field{allKeys.size !== 1 ? "s" : ""})</span>
        <div style={{ flex: 1 }} />
        {onUseAsTemplate && Object.keys(metadata).length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onUseAsTemplate(); }}
            style={{
              background: "transparent", border: "1px solid #444", borderRadius: 3,
              color: "#6b8cff", cursor: "pointer", padding: "2px 8px", fontSize: 11,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(107,140,255,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Use as template
          </button>
        )}
      </div>

      {!collapsed && (
        <div style={{ padding: "4px 12px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          {allKeys.size === 0 && onEditTemplate && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={onEditTemplate}
                style={{
                  flexShrink: 0, background: "transparent", border: "1px solid #444",
                  borderRadius: 3, color: "#6b8cff", cursor: "pointer", padding: "3px 10px", fontSize: 11,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(107,140,255,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Set up template
              </button>
              <span style={{ fontSize: 11, color: "#888" }}>
                Define fields with a template, or write frontmatter directly in the file.
              </span>
            </div>
          )}
          {[...allKeys].map(key => {
            const field = fieldMap.get(key);
            const value = metadata[key];
            const type = field?.type ?? "string";

            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 12, color: field ? "#f90" : "#6b8cff",
                  width: 100, flexShrink: 0, textAlign: "right", fontWeight: 500,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }} title={key}>
                  {key}
                </span>

                {type === "boolean" ? (
                  <input
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => onChange(key, e.target.checked)}
                  />
                ) : type === "enum" && field?.options ? (
                  <select
                    value={value ?? ""}
                    onChange={(e) => onChange(key, e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">—</option>
                    {field.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : type === "list" ? (
                  <input
                    value={Array.isArray(value) ? value.join(", ") : (value ?? "")}
                    onChange={(e) => onChange(key, e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                    placeholder="comma-separated"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                ) : (
                  <input
                    value={value ?? ""}
                    onChange={(e) => onChange(key, e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#222", border: "1px solid #444", borderRadius: 3,
  color: "#ccc", fontSize: 12, padding: "3px 6px", outline: "none",
};
