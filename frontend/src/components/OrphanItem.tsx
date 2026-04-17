import { useState, useEffect, useRef, useCallback, CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { fetchMarkdown } from "../api";

export interface OrphanItemProps {
  path: string;
  title: string;
  titleMode: boolean;
  isMultiSelected: boolean;
  onMultiSelect: (path: string, ctrl: boolean, shift: boolean) => void;
  onAddToSelection: (path: string) => void;
  onOpen: (path: string) => void;
  onDelete: (path: string) => void;
  onAddToHierarchy: (path: string) => void;
  currentProject: string;
  setChipRef: (el: HTMLElement | null) => void;
  activeId: string | null;
  brokenLinkMap?: Record<string, number>;
  frontmatterIssueMap?: Record<string, boolean>;
  templateIssueMap?: Record<string, boolean>;
  showIndicators?: boolean;
  forceShowIndicators?: boolean;
}

export function OrphanItem({ path, title, titleMode, isMultiSelected, onMultiSelect, onAddToSelection, onOpen, onDelete, onAddToHierarchy, currentProject, setChipRef, activeId, brokenLinkMap, frontmatterIssueMap, templateIssueMap, showIndicators, forceShowIndicators }: OrphanItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: path });
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewFixed, setPreviewFixed] = useState<{ left: number; top: number } | null>(null);
  const label = titleMode ? title : path;
  const tooltip = titleMode ? path : title;
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLSpanElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const [indicatorPos, setIndicatorPos] = useState<{ bottom: number; centerX: number } | null>(null);
  const indicatorButtonRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || menuTriggerRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const txStr = transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined;

  const bc = brokenLinkMap?.[path] ?? 0;
  const fm = frontmatterIssueMap?.[path] ?? false;
  const tmpl = templateIssueMap?.[path] ?? false;
  const indicatorLevel = bc > 0 ? "red" : (fm || tmpl) ? "yellow" : "green";

  const mi: CSSProperties = { padding: "7px 14px", fontSize: "13px", cursor: "pointer", color: "#666", whiteSpace: "nowrap" };

  return (
    <div ref={setNodeRef} style={{ transform: (isDragging || activeId !== null) ? undefined : txStr, transition: (isDragging || activeId !== null) ? undefined : transition ?? undefined, opacity: isDragging ? 0 : 1, margin: "8px 0" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <div
          {...attributes} {...listeners}
          ref={(el) => setChipRef(el as HTMLElement | null)}
          data-orphan-chip="true"
          style={{
            position: "relative", display: "inline-flex", alignItems: "stretch",
            width: "2.5in", overflow: "visible",
            background: isMultiSelected ? "#fff3e0" : (hovered || forceShowIndicators || indicatorOpen) ? "#fff8f0" : "transparent",
            boxShadow: isMultiSelected ? "inset 5px 0 0 0 #ff8c00" : "none",
            borderRadius: "4px", cursor: "pointer", userSelect: "none", outline: "none",
          }}
          onClick={(e) => {
            if (e.altKey) {
              const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              setPreviewFixed({ left: r.left - 272, top: r.top });
              fetchMarkdown(currentProject, path).then(setPreviewContent).catch(() => {});
              return;
            }
            if (clickTimerRef.current) {
              clearTimeout(clickTimerRef.current);
              clickTimerRef.current = null;
              onOpen(path);
            } else {
              clickTimerRef.current = setTimeout(() => {
                clickTimerRef.current = null;
                onMultiSelect(path, e.ctrlKey || e.metaKey, e.shiftKey);
              }, 250);
            }
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => { setHovered(false); setPreviewContent(null); setPreviewFixed(null); }}
        >
          <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, padding: `5px ${(isMultiSelected || hovered || forceShowIndicators || indicatorOpen) ? "50px" : "10px"} 5px 12px`, position: "relative" }}>
            <span style={{ fontSize: "15px", fontWeight: 500, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }} title={tooltip}>
              {label}
            </span>
          </div>
          {showIndicators && (isMultiSelected || hovered || forceShowIndicators || indicatorOpen) && (
            <span
              ref={indicatorButtonRef}
              onMouseEnter={() => { if (indicatorButtonRef.current) { const r = indicatorButtonRef.current.getBoundingClientRect(); setIndicatorPos({ bottom: window.innerHeight - r.top + 8, centerX: r.left + r.width / 2 }); setIndicatorOpen(true); } }}
              onMouseLeave={() => setIndicatorOpen(false)}
              style={{ position: "absolute", right: "36px", top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", width: "14px", cursor: "pointer" }}
            >
              {indicatorLevel === "green"
                ? <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3a7d44", flexShrink: 0 }} />
                : <span style={{ fontSize: "13px", lineHeight: 1, fontWeight: "bold", color: indicatorLevel === "red" ? "#c00" : "#cc8800", userSelect: "none" }}>&#9888;</span>
              }
              {indicatorOpen && indicatorPos && (
                <div style={{ position: "fixed", bottom: indicatorPos.bottom, left: indicatorPos.centerX, transform: "translateX(-50%)", zIndex: 1000, background: "#fff", border: "1px solid #d0e8f7", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "6px 10px", minWidth: "170px" }}>
                  <div style={{ position: "absolute", bottom: -9, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: "9px solid #d0e8f7" }} />
                  <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid #fff" }} />
                  <div title={fm ? "Frontmatter is non-compliant" : "Frontmatter OK"} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0" }}>
                    {fm ? <span style={{ fontSize: "13px", lineHeight: 1, fontWeight: "bold", color: "#cc8800", userSelect: "none" }}>&#9888;</span> : <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3a7d44", flexShrink: 0 }} />}
                    <span style={{ fontSize: "12px", color: "#555" }}>Frontmatter</span>
                  </div>
                  <div title={tmpl ? "Template is non-compliant" : "Template OK"} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0" }}>
                    {tmpl ? <span style={{ fontSize: "13px", lineHeight: 1, fontWeight: "bold", color: "#cc8800", userSelect: "none" }}>&#9888;</span> : <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3a7d44", flexShrink: 0 }} />}
                    <span style={{ fontSize: "12px", color: "#555" }}>Template</span>
                  </div>
                  <div title={bc > 0 ? `${bc} broken link${bc !== 1 ? "s" : ""}` : "Links OK"} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0" }}>
                    {bc > 0 ? <span style={{ fontSize: "13px", lineHeight: 1, fontWeight: "bold", color: "#c00", userSelect: "none" }}>&#9888;</span> : <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3a7d44", flexShrink: 0 }} />}
                    <span style={{ fontSize: "12px", color: "#555" }}>Links</span>
                  </div>
                </div>
              )}
            </span>
          )}
          {(isMultiSelected || hovered || forceShowIndicators || indicatorOpen) && (
            <span
              ref={menuTriggerRef}
              onClick={(e) => { e.stopPropagation(); onAddToSelection(path); setMenuOpen(o => !o); }}
              style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "16px", fontWeight: "bold", color: "#bbb" }}
            >&#8942;</span>
          )}
        </div>
        {previewContent && !isDragging && previewFixed && (
          <div style={{
            position: "fixed", left: previewFixed.left, top: previewFixed.top,
            zIndex: 200, width: "260px", pointerEvents: "none",
            background: "#fff", border: "1px solid #d0e8f7",
            borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.13)",
            padding: "8px 10px",
          }}>
            <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "5px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{path}</div>
            {previewContent.split("\n").filter(l => l.trim()).slice(0, 8).map((line, i) => (
              <div key={i} style={{ fontSize: "12px", color: "#333", fontFamily: "monospace", lineHeight: 1.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{line}</div>
            ))}
          </div>
        )}
        {menuOpen && (
          <div ref={menuRef} style={{ position: "absolute", top: "100%", right: 0, zIndex: 100, background: "#fff", border: "1px solid #d0e8f7", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: "140px", overflow: "hidden" }}>
            <div style={mi} onClick={() => { onOpen(path); setMenuOpen(false); }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}>View/Edit</div>
            <div style={{ ...mi, color: "#c00" }} onClick={() => { onDelete(path); setMenuOpen(false); }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#fff5f5"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}>Delete</div>
          </div>
        )}
      </div>
    </div>
  );
}
