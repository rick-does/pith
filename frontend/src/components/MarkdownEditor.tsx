import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import CodeEditor from "./CodeEditor";
import MermaidBlock from "./MermaidBlock";
import StatsPanel from "./StatsPanel";
import type { BrokenLink } from "../api";

interface Props {
  project?: string;
  path: string;
  content: string;
  savedContent?: string;
  onContentChange: (c: string) => void;
  viMode: boolean;
  onViModeChange: (v: boolean) => void;
  onSaved?: (path: string, content: string) => void;
  onSave: (path: string, content: string) => Promise<void>;
  onRename?: (oldPath: string, newName: string) => void;
  brokenLinks?: BrokenLink[];
  onUseAsTemplate?: () => void;
  onApplyTemplate?: () => void;
  onEditTemplate?: () => void;
  onViewCompliance?: () => void;
  onClose?: () => void;
}

export default function MarkdownEditor({ project, path, content, savedContent, onContentChange, viMode, onViModeChange, onSaved, onSave, onRename, onUseAsTemplate, onApplyTemplate, onEditTemplate, onViewCompliance, onClose, brokenLinks }: Props) {
  const [view, setView] = useState<"edit" | "preview" | "split">("split");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const savedContentRef = useRef(savedContent ?? content);
  const isDirty = content !== savedContentRef.current;

  useEffect(() => {
    savedContentRef.current = savedContent ?? content;
  }, [path]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(path, content);
      savedContentRef.current = content;
      onSaved?.(path, content);
      setSaveMsg("Saved \u2713");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch {
      setSaveMsg("Error saving");
    } finally {
      setSaving(false);
    }
  }, [path, content, onSaved, onSave]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#222" }} onKeyDown={handleKeyDown}>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #333", background: "#111", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
          {renaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.stopPropagation(); setRenaming(false); const n = renameValue.trim(); if (n && n !== path) onRename?.(path, n); }
                if (e.key === "Escape") { e.stopPropagation(); setRenaming(false); }
              }}
              onBlur={() => { setRenaming(false); const n = renameValue.trim(); if (n && n !== path) onRename?.(path, n); }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: "#222", border: "1px solid #6b8cff", borderRadius: "3px", color: "#ccc", fontSize: "14px", padding: "1px 6px", outline: "none", width: "180px" }}
            />
          ) : (
            <span
              style={{ color: "#888", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: onRename ? "text" : "default" }}
              onDoubleClick={() => { if (onRename) { setRenameValue(path); setRenaming(true); } }}
              title={onRename ? "Double-click to rename" : undefined}
            >
              {path}
            </span>
          )}
          <label style={{ color: "#888", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", flexShrink: 0 }}>
            <input type="checkbox" checked={viMode} onChange={(e) => onViModeChange(e.target.checked)} style={{ display: "none" }} />
            <span style={{
              width: 13, height: 13, borderRadius: 2, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "1px solid #555", background: "#2a2a3a",
              color: "#fff", fontSize: 11, fontWeight: "bold", lineHeight: 1,
            }}>{viMode ? "✓" : ""}</span>
            vi
          </label>
          <button onClick={handleSave} disabled={saving || !isDirty} style={{
            padding: "4px 12px", fontSize: "13px", border: "none", cursor: isDirty ? "pointer" : "default", borderRadius: "3px",
            background: isDirty ? "#3a7d44" : "#2a2a3a", color: isDirty ? "#fff" : "#888", flexShrink: 0,
            transition: "background 0.15s, color 0.15s",
          }}>
            {saving ? "..." : "Save"}
          </button>
          {saveMsg && <span style={{ color: "#5f9", fontSize: "13px", flexShrink: 0 }}>{saveMsg}</span>}
          {brokenLinks && brokenLinks.length > 0 && (
            <span style={{ color: "#f66", fontSize: "12px", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
              &#9888; {brokenLinks.length} broken link{brokenLinks.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          {["edit", "split", "preview"].map((v) => (
            <button key={v} onClick={() => setView(v as any)} style={{
              padding: "4px 10px", fontSize: "13px", border: "none", cursor: "pointer", borderRadius: "3px",
              background: view === v ? "#f90" : "#2d2d44", color: view === v ? "#fff" : "#aaa",
            }}>
              {v}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
      </div>

      {(onApplyTemplate || onUseAsTemplate || onEditTemplate || onViewCompliance) && (
        <FmBar onApplyTemplate={onApplyTemplate} onUseAsTemplate={onUseAsTemplate} onEditTemplate={onEditTemplate} onViewCompliance={onViewCompliance} />
      )}

      {project && (
        <StatsPanel project={project} filePath={path} />
      )}

      {brokenLinks && brokenLinks.length > 0 && (
        <div style={{ borderBottom: "1px solid #333", background: "#2a1a1a", padding: "6px 12px", flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: "#f66", fontWeight: 600, marginBottom: 4 }}>
            Broken links ({brokenLinks.length})
          </div>
          {brokenLinks.map((link, i) => (
            <div key={i} style={{ fontSize: 12, color: "#ccc", padding: "2px 0", display: "flex", gap: 8 }}>
              <span style={{ color: "#666" }}>L{link.line}</span>
              <span style={{ color: "#f66", fontFamily: "monospace" }}>{link.target}</span>
              {link.text && <span style={{ color: "#888" }}>"{link.text}"</span>}
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {(view === "edit" || view === "split") && (
          <div style={{ flex: view === "split" ? "0 0 559px" : 1, minWidth: 0, overflow: "hidden", borderRight: view === "split" ? "1px solid #333" : "none" }}>
            <CodeEditor value={content} onChange={onContentChange} language="markdown" viMode={viMode} onSave={handleSave} onClose={onClose} />
          </div>
        )}
        {(view === "preview" || view === "split") && (
          <div style={{
            flex: view === "split" ? "0 0 559px" : 1, minWidth: 0, overflowY: "auto", padding: "1.5rem 2rem",
            background: "#fafafa", color: "#1a1a1a", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            lineHeight: "1.7",
          }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre({ children, node }) {
                  const codeEl = node?.children?.[0];
                  if (codeEl && "properties" in codeEl) {
                    const cls = (codeEl.properties as any)?.className;
                    if (Array.isArray(cls) && cls.some((c: string) => c === "language-mermaid")) {
                      return <>{children}</>;
                    }
                  }
                  return <pre>{children}</pre>;
                },
                code({ className, children, ...props }) {
                  if (/language-mermaid/.test(className || "")) {
                    return <MermaidBlock chart={String(children).trim()} />;
                  }
                  return <code className={className} {...props}>{children}</code>;
                },
              }}
            >
              {stripFrontmatter(content)}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function FmBar({ onApplyTemplate, onUseAsTemplate, onEditTemplate, onViewCompliance }: { onApplyTemplate?: () => Promise<void> | void; onUseAsTemplate?: () => Promise<void> | void; onEditTemplate?: () => void; onViewCompliance?: () => void }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");

  const run = async (fn: () => Promise<void> | void, label: string) => {
    await fn();
    setMsg(label + " \u2713");
    setTimeout(() => setMsg(""), 2000);
  };

  return (
    <div style={{ borderBottom: "1px solid #333", background: "#111", flexShrink: 0 }}>
      <div style={{ padding: "4px 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 10, color: "#888" }}>{open ? "\u25BC" : "\u25B6"}</span>
        <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Frontmatter</span>
        {!open && msg && <span style={{ fontSize: 12, color: "#7ec8f7" }}>{msg}</span>}
      </div>
      {open && (
        <div style={{ padding: "4px 12px 6px 32px", display: "flex", gap: 8, alignItems: "center" }}>
          {onApplyTemplate && (
            <button onClick={() => run(onApplyTemplate, "Applied")} title="Apply global frontmatter template" style={fmBtnStyle} onMouseEnter={fmBtnHover} onMouseLeave={fmBtnLeave}>
              Apply template
            </button>
          )}
          {onUseAsTemplate && (
            <button onClick={() => run(onUseAsTemplate, "Saved as template")} title="Use as global frontmatter template" style={fmBtnStyle} onMouseEnter={fmBtnHover} onMouseLeave={fmBtnLeave}>
              Use as template
            </button>
          )}
          {onEditTemplate && (
            <button onClick={onEditTemplate} title="View and edit the global frontmatter template" style={fmBtnStyle} onMouseEnter={fmBtnHover} onMouseLeave={fmBtnLeave}>
              View template
            </button>
          )}
          {onViewCompliance && (
            <button onClick={onViewCompliance} title="View frontmatter compliance report" style={fmBtnStyle} onMouseEnter={fmBtnHover} onMouseLeave={fmBtnLeave}>
              View compliance
            </button>
          )}
          {msg && <span style={{ fontSize: 12, color: "#7ec8f7" }}>{msg}</span>}
        </div>
      )}
    </div>
  );
}

const fmBtnStyle: React.CSSProperties = {
  padding: "3px 12px", fontSize: "12px", border: "1px solid #333",
  cursor: "pointer", borderRadius: "3px", background: "#222", color: "#aaa",
  transition: "background 0.15s, color 0.15s, border-color 0.15s",
};
const fmBtnHover = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = "#1a3a5c";
  e.currentTarget.style.color = "#7ec8f7";
  e.currentTarget.style.borderColor = "#2a6a9a";
};
const fmBtnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = "#222";
  e.currentTarget.style.color = "#aaa";
  e.currentTarget.style.borderColor = "#333";
};

function stripFrontmatter(content: string): string {
  const lines = content.split("\n");
  // Standard: starts with ---
  if (lines[0]?.trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        return lines.slice(i + 1).join("\n");
      }
    }
    return content;
  }
  // Jekyll-style: starts with Key: value, terminated by ---
  if (lines[0] && /^\w[\w\s]*:/.test(lines[0])) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        return lines.slice(i + 1).join("\n");
      }
    }
  }
  return content;
}
