import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import CodeEditor from "./CodeEditor";
import MermaidBlock from "./MermaidBlock";
import FrontmatterPanel from "./FrontmatterPanel";
import type { FrontmatterField, BrokenLink } from "../api";

interface Props {
  path: string;
  content: string;
  savedContent?: string;
  onContentChange: (c: string) => void;
  viMode: boolean;
  onViModeChange: (v: boolean) => void;
  onSaved?: (path: string, content: string) => void;
  onSave: (path: string, content: string) => Promise<void>;
  onRename?: (oldPath: string, newName: string) => void;
  frontmatter?: Record<string, any>;
  templateFields?: FrontmatterField[];
  onFrontmatterChange?: (key: string, value: any) => void;
  brokenLinks?: BrokenLink[];
  onUseAsTemplate?: () => void;
}

export default function MarkdownEditor({ path, content, savedContent, onContentChange, viMode, onViModeChange, onSaved, onSave, onRename, frontmatter, templateFields, onFrontmatterChange, onUseAsTemplate, brokenLinks }: Props) {
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#1a1a2e" }} onKeyDown={handleKeyDown}>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #333", background: "#16213e", flexShrink: 0 }}>
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
              style={{ background: "#1a1a2e", border: "1px solid #6b8cff", borderRadius: "3px", color: "#ccc", fontSize: "14px", padding: "1px 6px", outline: "none", width: "180px" }}
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
          <label style={{ color: "#666", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", flexShrink: 0 }}>
            <input type="checkbox" checked={viMode} onChange={(e) => onViModeChange(e.target.checked)} />
            vi
          </label>
          <button onClick={handleSave} disabled={saving || !isDirty} style={{
            padding: "4px 12px", fontSize: "13px", border: "none", cursor: isDirty ? "pointer" : "default", borderRadius: "3px",
            background: isDirty ? "#3a7d44" : "#2a2a3a", color: isDirty ? "#fff" : "#555", flexShrink: 0,
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
              background: view === v ? "#6b8cff" : "#2d2d44", color: view === v ? "#fff" : "#aaa",
            }}>
              {v}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
      </div>

      {frontmatter && templateFields && onFrontmatterChange && (
        <FrontmatterPanel
          metadata={frontmatter}
          templateFields={templateFields}
          onChange={onFrontmatterChange}
          onUseAsTemplate={onUseAsTemplate}
        />
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
            <CodeEditor value={content} onChange={onContentChange} language="markdown" viMode={viMode} />
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
