import { useState } from "react";
import type { FrontmatterField, FrontmatterTemplate } from "../api";

interface Props {
  template: FrontmatterTemplate;
  onSave: (template: FrontmatterTemplate) => void;
  onClose: () => void;
  onViewCompliance?: () => void;
}

const FIELD_TYPES = ["string", "list", "enum", "boolean", "date"] as const;

export default function TemplateEditor({ template, onSave, onClose, onViewCompliance }: Props) {
  const [fields, setFields] = useState<FrontmatterField[]>(
    template.fields.map(f => ({ ...f })),
  );

  const addField = () => {
    setFields([...fields, { key: "", type: "string" }]);
  };

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx));
  };

  const updateField = (idx: number, patch: Partial<FrontmatterField>) => {
    setFields(fields.map((f, i) => i === idx ? { ...f, ...patch } : f));
  };

  const handleSave = () => {
    const cleaned = fields.filter(f => f.key.trim());
    onSave({ fields: cleaned });
  };

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Frontmatter Template</h3>
          <button onClick={onClose} style={closeBtnStyle}>&#10005;</button>
        </div>

        <p style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
          Define the expected frontmatter keys for files in this project. New files will be pre-filled with these fields.
        </p>

        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {fields.map((field, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8, padding: 8, background: "#f8f8f8", borderRadius: 4 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    placeholder="key"
                    value={field.key}
                    onChange={(e) => updateField(idx, { key: e.target.value.replace(/\s+/g, "_") })}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(idx, { type: e.target.value as any })}
                    style={{ ...inputStyle, width: 90 }}
                  >
                    {FIELD_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {field.type === "enum" ? (
                    <input
                      placeholder="options (comma-separated)"
                      value={(field.options ?? []).join(", ")}
                      onChange={(e) => updateField(idx, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                  ) : field.type === "boolean" ? (
                    <label style={{ fontSize: 12, color: "#666", display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={!!field.default}
                        onChange={(e) => updateField(idx, { default: e.target.checked })}
                      />
                      default: true
                    </label>
                  ) : (
                    <input
                      placeholder={field.type === "list" ? "defaults (comma-separated)" : "default value"}
                      value={
                        Array.isArray(field.default)
                          ? field.default.join(", ")
                          : (field.default as string) ?? ""
                      }
                      onChange={(e) => {
                        const val = field.type === "list"
                          ? e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                          : e.target.value;
                        updateField(idx, { default: val as any });
                      }}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                  )}
                </div>
              </div>
              <button
                onClick={() => removeField(idx)}
                style={{ background: "none", border: "none", color: "#c00", cursor: "pointer", fontSize: 16, padding: "4px", flexShrink: 0 }}
              >&#10005;</button>
            </div>
          ))}
        </div>

        <button onClick={addField} style={{ ...actionBtn, background: "#e8f4fd", color: "#1a6fa8", border: "1px solid #b3d9f7", marginTop: 8 }}>
          + Add field
        </button>

        <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
          {onViewCompliance && (
            <button onClick={onViewCompliance} style={actionBtn}>View compliance</button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ ...actionBtn, background: "#eee", color: "#333" }}>Cancel</button>
          <button onClick={handleSave} style={actionBtn}>Save template</button>
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
const inputStyle: React.CSSProperties = {
  padding: "4px 8px", fontSize: 13, border: "1px solid #ccc", borderRadius: 4, outline: "none",
};
const actionBtn: React.CSSProperties = {
  background: "#1a6fa8", color: "#fff", border: "none", borderRadius: 4,
  padding: "8px 16px", cursor: "pointer", fontSize: 13,
};
const closeBtnStyle: React.CSSProperties = {
  background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#666",
};
