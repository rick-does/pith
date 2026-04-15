import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import CodeEditor from "./CodeEditor";
import MermaidBlock from "./MermaidBlock";
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

      {(project || onApplyTemplate || onUseAsTemplate || onEditTemplate || onViewCompliance) && (
        <FmBar onApplyTemplate={onApplyTemplate} onUseAsTemplate={onUseAsTemplate} onEditTemplate={onEditTemplate} onViewCompliance={onViewCompliance} project={project} filePath={path} />
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

interface StatsData {
  word_count: number; sentence_count: number; paragraph_count: number;
  avg_sentence_length: number; flesch_reading_ease: number;
  flesch_reading_ease_label: string; flesch_kincaid_grade: number;
  gunning_fog: number; automated_readability_index: number; coleman_liau_index: number;
}
interface IssueFlag { severity: "warn" | "info"; message: string; }
interface IssuesData {
  flags: IssueFlag[];
  shape: { headings: number; empty_sections: number; long_sentences: number; long_paragraphs: number; };
}

type ActivePanel = "frontmatter" | "stats" | "issues" | null;

function FmBar({ onApplyTemplate, onUseAsTemplate, onEditTemplate, onViewCompliance, project, filePath }: {
  onApplyTemplate?: () => Promise<void> | void;
  onUseAsTemplate?: () => Promise<void> | void;
  onEditTemplate?: () => void;
  onViewCompliance?: () => void;
  project?: string;
  filePath?: string;
}) {
  const [active, setActive] = useState<ActivePanel>(null);
  const [fmMsg, setFmMsg] = useState("");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [issues, setIssues] = useState<IssuesData | null>(null);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);

  useEffect(() => { setStats(null); setIssues(null); }, [filePath]);

  useEffect(() => {
    if (active === "stats" && project && filePath) {
      setStats(null); setStatsError(null); setStatsLoading(true);
      fetch(`/api/projects/${project}/stats/${filePath}`)
        .then(r => { if (!r.ok) throw new Error("Failed to load stats"); return r.json(); })
        .then(d => { setStats(d); setStatsLoading(false); })
        .catch(e => { setStatsError(e.message); setStatsLoading(false); });
    }
  }, [active, project, filePath]);

  useEffect(() => {
    if (active === "issues" && project && filePath) {
      setIssues(null); setIssuesError(null); setIssuesLoading(true);
      fetch(`/api/projects/${project}/issues/${filePath}`)
        .then(r => { if (!r.ok) throw new Error("Failed to load issues"); return r.json(); })
        .then(d => { setIssues(d); setIssuesLoading(false); })
        .catch(e => { setIssuesError(e.message); setIssuesLoading(false); });
    }
  }, [active, project, filePath]);

  const toggle = (panel: NonNullable<ActivePanel>) => setActive(p => p === panel ? null : panel);

  const runFm = async (fn: () => Promise<void> | void, label: string) => {
    await fn();
    setFmMsg(label + " \u2713");
    setTimeout(() => setFmMsg(""), 2000);
  };

  const hasFm = onApplyTemplate || onUseAsTemplate || onEditTemplate || onViewCompliance;

  const Tab = ({ id, label }: { id: NonNullable<ActivePanel>; label: string }) => (
    <div
      onClick={() => toggle(id)}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "4px 14px",
        cursor: "pointer", userSelect: "none", borderRight: "1px solid #1e1e1e",
      }}
    >
      <span style={{ fontSize: 10, color: "#888" }}>{active === id ? "\u25BC" : "\u25B6"}</span>
      <span style={{ fontSize: 12, color: active === id ? "#bbb" : "#888", fontWeight: 600 }}>{label}</span>
    </div>
  );

  return (
    <div style={{ borderBottom: "1px solid #333", background: "#111", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        {hasFm && <Tab id="frontmatter" label="Frontmatter" />}
        {project && <Tab id="stats" label="Stats" />}
        {project && <Tab id="issues" label="Issues" />}
        <div style={{ flex: 1 }} />
        {active === "frontmatter" && fmMsg && (
          <span style={{ fontSize: 12, color: "#7ec8f7", padding: "4px 12px", alignSelf: "center" }}>{fmMsg}</span>
        )}
      </div>

      {active === "frontmatter" && hasFm && (
        <div style={{ padding: "4px 12px 6px 32px", display: "flex", gap: 8, alignItems: "center" }}>
          {onApplyTemplate && (
            <button onClick={() => runFm(onApplyTemplate, "Applied")} title="Apply global frontmatter template" style={fmBtnStyle} onMouseEnter={fmBtnHover} onMouseLeave={fmBtnLeave}>Apply template</button>
          )}
          {onUseAsTemplate && (
            <button onClick={() => runFm(onUseAsTemplate, "Saved as template")} title="Use as global frontmatter template" style={fmBtnStyle} onMouseEnter={fmBtnHover} onMouseLeave={fmBtnLeave}>Use as template</button>
          )}
          {onEditTemplate && (
            <button onClick={onEditTemplate} title="View and edit the global frontmatter template" style={fmBtnStyle} onMouseEnter={fmBtnHover} onMouseLeave={fmBtnLeave}>View template</button>
          )}
          {onViewCompliance && (
            <button onClick={onViewCompliance} title="View frontmatter compliance report" style={fmBtnStyle} onMouseEnter={fmBtnHover} onMouseLeave={fmBtnLeave}>View compliance</button>
          )}
        </div>
      )}

      {active === "stats" && project && (
        <div style={{ padding: "4px 12px 10px" }}>
          {statsLoading && <span style={{ fontSize: 12, color: "#888" }}>Loading…</span>}
          {statsError && <span style={{ fontSize: 12, color: "#f66" }}>{statsError}</span>}
          {stats && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
                <StatRow label="Words" value={String(stats.word_count)} />
                <StatRow label="Sentences" value={String(stats.sentence_count)} />
                <StatRow label="Paragraphs" value={String(stats.paragraph_count)} />
                <StatRow label="Avg sentence length" value={`${stats.avg_sentence_length} words`} />
              </div>
              <div style={{ fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 4, paddingTop: 4, borderTop: "1px solid #222" }}>Readability</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <StatRow label="Flesch Reading Ease" value={`${stats.flesch_reading_ease}`} note={stats.flesch_reading_ease_label} />
                <StatRow label="Flesch-Kincaid Grade" value={`${stats.flesch_kincaid_grade}`} />
                <StatRow label="Gunning Fog" value={`${stats.gunning_fog}`} />
                <StatRow label="Automated Readability" value={`${stats.automated_readability_index}`} />
                <StatRow label="Coleman-Liau" value={`${stats.coleman_liau_index}`} />
              </div>
            </>
          )}
        </div>
      )}

      {active === "issues" && project && (
        <div style={{ padding: "4px 12px 10px" }}>
          {issuesLoading && <span style={{ fontSize: 12, color: "#888" }}>Loading…</span>}
          {issuesError && <span style={{ fontSize: 12, color: "#f66" }}>{issuesError}</span>}
          {issues && (
            <>
              {issues.flags.length === 0 ? (
                <span style={{ fontSize: 12, color: "#5c5" }}>No issues found</span>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {issues.flags.map((flag, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ fontSize: 11, color: flag.severity === "warn" ? "#fa0" : "#666", flexShrink: 0, marginTop: 1 }}>
                        {flag.severity === "warn" ? "\u26A0" : "\u2022"}
                      </span>
                      <span style={{ fontSize: 12, color: "#ccc" }}>{flag.message}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #222" }}>
                <span style={{ fontSize: 11, color: "#555" }}>{issues.shape.headings} heading{issues.shape.headings !== 1 ? "s" : ""}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "#888", width: 150, flexShrink: 0, textAlign: "right" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#ccc" }}>{value}</span>
      {note && <span style={{ fontSize: 11, color: "#888" }}>{note}</span>}
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
