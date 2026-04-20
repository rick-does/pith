import { useState, useEffect, useRef, CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import type { FileNode } from "../types";
import { fetchMarkdown } from "../api";
import { LINE, COL_W, CHILD_INDENT, GAP } from "./SortableItemConstants";

function RenameInput({ currentPath, onCommit, onCancel }: {
  currentPath: string;
  onCommit: (newName: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(currentPath);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => { ref.current?.select(); }, 30); }, []);
  return (
    <input
      ref={ref}
      value={value}
      autoFocus
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.stopPropagation(); onCommit(value.trim()); }
      }}
      onBlur={() => onCommit(value.trim())}
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#fff", border: "1px solid #ff8c00",
        borderRadius: "4px", color: "#1a1a1a", fontSize: "14px",
        padding: "1px 4px", outline: "none", minWidth: 0, width: "160px",
      }}
    />
  );
}

function ConnectorLines({ depth, ancestors, isLast }: { depth: number; ancestors: boolean[]; isLast: boolean }) {
  if (depth === 0) return null;
  return (
    <div style={{ display: "flex", flexShrink: 0, alignSelf: "stretch" }}>
      {ancestors.map((hasMore, i) => (
        <div key={i} style={{ width: `${CHILD_INDENT}px`, flexShrink: 0, position: "relative" }}>
          {hasMore && (
            <div style={{
              position: "absolute", left: `${CHILD_INDENT / 2}px`,
              top: `-${GAP}px`, bottom: `-${GAP}px`,
              width: 0, borderLeft: `1px solid ${LINE}`,
            }} />
          )}
        </div>
      ))}
      <div style={{ width: `${CHILD_INDENT}px`, flexShrink: 0, position: "relative" }}>
        <div style={{
          position: "absolute", left: `${CHILD_INDENT / 2}px`,
          top: `-${GAP}px`, bottom: isLast ? "50%" : `-${GAP}px`,
          width: 0, borderLeft: `1px solid ${LINE}`,
        }} />
        <div style={{
          position: "absolute", left: `${CHILD_INDENT / 2}px`, top: "50%",
          width: `${CHILD_INDENT / 2}px`, height: 0, borderTop: `1px solid ${LINE}`,
        }} />
      </div>
    </div>
  );
}

export interface ItemProps {
  node: FileNode;
  depth: number;
  isLast: boolean;
  ancestors: boolean[];
  selectedPath: string | null;
  titleMode: boolean;
  onSelect: (path: string | null) => void;
  onOpen: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string, newName: string) => void;
  onCreateChild: (parentPath: string, filename: string) => Promise<void>;
  onCopyToChild: (parentPath: string) => Promise<void>;
  expanded: Set<string>;
  toggleExpand: (path: string) => void;
  overId: string | null;
  activeId: string | null;
  activeLabel: string;
  dragDeltaX: number;
  showTopIndicator?: boolean;
  currentProject: string;
  brokenLinkMap?: Record<string, number>;
  frontmatterIssueMap?: Record<string, boolean>;
  templateIssueMap?: Record<string, boolean>;
  showIndicators?: boolean;
}

export function SortableItem({ node, depth, isLast, ancestors, selectedPath, titleMode, onSelect, onOpen, onDelete, onRename, onCreateChild, onCopyToChild, expanded, toggleExpand, overId, activeId, activeLabel, dragDeltaX, showTopIndicator, currentProject, brokenLinkMap, frontmatterIssueMap, templateIssueMap, showIndicators }: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.path });
  const [renaming, setRenaming] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewPos, setPreviewPos] = useState<{ top: number; left: number } | null>(null);
  const [addingChild, setAddingChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [childError, setChildError] = useState("");
  const childInputRef = useRef<HTMLInputElement>(null);
  const menuTriggerRef = useRef<HTMLSpanElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const [indicatorPos, setIndicatorPos] = useState<{ bottom: number; centerX: number } | null>(null);
  const indicatorButtonRef = useRef<HTMLSpanElement>(null);
  const indicatorHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleHide = () => { indicatorHideTimer.current = setTimeout(() => setIndicatorOpen(false), 150); };
  const cancelHide = () => { if (indicatorHideTimer.current) { clearTimeout(indicatorHideTimer.current); indicatorHideTimer.current = null; } };

  useEffect(() => {
    if (!indicatorOpen) return;
    const handler = (e: MouseEvent) => { if (!indicatorButtonRef.current?.contains(e.target as Node)) setIndicatorOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [indicatorOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuTriggerRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    if (isDragging) onSelect(node.path);
  }, [isDragging]);

  const isExpanded = expanded.has(node.path);
  const hasChildren = (node.children ?? []).length > 0;
  const isSelected = selectedPath === node.path;
  const isOver = activeId !== null && overId === node.path && activeId !== node.path;
  const label = titleMode ? node.title : node.path;
  const tooltip = titleMode ? node.path : node.title;
  const brokenCount = brokenLinkMap?.[node.path] ?? 0;
  const hasFmIssue = frontmatterIssueMap?.[node.path] ?? false;
  const hasTmplIssue = templateIssueMap?.[node.path] ?? false;
  const indicatorLevel = brokenCount > 0 ? "red" : (hasFmIssue || hasTmplIssue) ? "yellow" : "green";

  const dropAction = isOver
    ? dragDeltaX > 30 ? "nest" : dragDeltaX < -30 ? "unnest" : "sibling"
    : null;

  const submitChild = async () => {
    let name = childName.trim();
    if (!name) return;
    if (!name.endsWith(".md")) name += ".md";
    if (/[/\\<>:"|?*]/.test(name.replace(/\.md$/, ""))) { setChildError("Invalid filename"); return; }
    try {
      await onCreateChild(node.path, name);
      setAddingChild(false);
      setChildName("");
      setChildError("");
    } catch (e: any) { setChildError(e.message ?? "Error"); }
  };

  const txStr = transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined;

  const mi: CSSProperties = { padding: "7px 14px", fontSize: "13px", fontWeight: "normal", cursor: "pointer", color: "#666", whiteSpace: "nowrap" };
  const connectorWidth = (ancestors.length + 1) * CHILD_INDENT;

  return (
    <div ref={setNodeRef} style={{ transform: (isDragging || depth > 1 || activeId !== null) ? undefined : txStr, transition: (isDragging || depth > 1 || activeId !== null) ? undefined : transition ?? undefined, margin: `${GAP}px 0` }}>
      {showTopIndicator && (
        <div style={{ height: "40px" }} />
      )}
      <div style={{ display: "flex", alignItems: "stretch", opacity: isDragging ? 0 : 1 }}>
        <ConnectorLines depth={depth} ancestors={ancestors} isLast={isLast} />
        <div style={{ minWidth: 0, position: "relative", zIndex: menuOpen || indicatorOpen ? 50 : undefined }}>
          <div
            {...attributes} {...listeners}
            style={{
              display: "inline-flex", alignItems: "stretch",
              width: "2.5in", overflow: "visible",
              background: isSelected && dropAction !== "nest" ? "#e8f4fd" : hovered ? "#f0f6ff" : "#fff",
              border: `1.5px solid ${dropAction === "nest" ? "#4caf50" : "#1a6fa8"}`,
              boxShadow: isSelected && dropAction !== "nest" ? "inset 5px 0 0 0 #1a6fa8" : "none",
              borderRadius: "6px", cursor: "pointer", userSelect: "none",
              outline: dropAction === "nest" ? "2px solid #4caf5066" : "none",
              outlineOffset: "1px",
            }}
            onClick={(e) => {
              if (e.altKey) { const r = e.currentTarget.getBoundingClientRect(); setPreviewPos({ top: r.top, left: r.right + 12 }); fetchMarkdown(currentProject, node.path).then(setPreviewContent).catch(() => {}); return; }
              if (clickTimerRef.current) {
                clearTimeout(clickTimerRef.current);
                clickTimerRef.current = null;
                onOpen(node.path);
              } else {
                clickTimerRef.current = setTimeout(() => {
                  clickTimerRef.current = null;
                  onSelect(isSelected ? null : node.path);
                }, 250);
              }
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPreviewContent(null); }}
          >
            <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, gap: "2px", padding: `5px ${showIndicators ? "45px" : "31px"} 5px 12px`, position: "relative" }}>
              {hasChildren ? (
                <span onClick={(e) => { e.stopPropagation(); toggleExpand(node.path); }} style={{ width: "16px", flexShrink: 0, marginTop: "-5px", marginBottom: "-5px", marginRight: "3px", paddingTop: "5px", paddingBottom: "5px", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <svg width="9" height="13" viewBox="0 0 11 16" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}><polyline points="2,2 9,8 2,14"/></svg>
                </span>
              ) : (
                <span style={{ width: "16px", marginRight: "3px", flexShrink: 0 }} />
              )}
              {renaming ? (
                <RenameInput
                  currentPath={node.path}
                  onCommit={(newName) => { setRenaming(false); if (newName && newName !== node.path) onRename(node.path, newName); }}
                  onCancel={() => setRenaming(false)}
                />
              ) : (
                <span
                  style={{ fontSize: "15px", fontWeight: 500, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}
                  title={tooltip}
                >
                  {label}
                </span>
              )}
              {showIndicators && (
                <span
                  ref={indicatorButtonRef}
                  onClick={(e) => { e.stopPropagation(); if (indicatorButtonRef.current) { const r = indicatorButtonRef.current.getBoundingClientRect(); setIndicatorPos({ bottom: window.innerHeight - r.top + 8, centerX: r.left + r.width / 2 }); setIndicatorOpen(o => !o); } }}
                  style={{ position: "absolute", right: "31px", top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", width: "14px", cursor: "pointer" }}
                >
                  {indicatorLevel === "green"
                    ? <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3a7d44", flexShrink: 0, marginTop: "2px" }} />
                    : <span style={{ fontSize: "13px", lineHeight: 1, fontWeight: "bold", color: indicatorLevel === "red" ? "#c00" : "#cc8800", userSelect: "none" }}>&#9888;</span>
                  }
                  {indicatorOpen && indicatorPos && (
                    <div style={{ position: "fixed", bottom: indicatorPos.bottom, left: indicatorPos.centerX, transform: "translateX(-50%)", zIndex: 1000, background: "#fff", border: "1px solid #d0e8f7", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "6px 10px", minWidth: "170px" }}>
                      <div style={{ position: "absolute", bottom: -9, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: "9px solid #d0e8f7" }} />
                      <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid #fff" }} />
                      <div title={hasFmIssue ? "Frontmatter is non-compliant" : "Frontmatter OK"} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0" }}>
                        {hasFmIssue ? <span style={{ fontSize: "13px", lineHeight: 1, fontWeight: "bold", color: "#cc8800", userSelect: "none" }}>&#9888;</span> : <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3a7d44", flexShrink: 0 }} />}
                        <span style={{ fontSize: "12px", color: "#555" }}>Frontmatter</span>
                      </div>
                      <div title={hasTmplIssue ? "Structure is non-compliant" : "Structure OK"} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0" }}>
                        {hasTmplIssue ? <span style={{ fontSize: "13px", lineHeight: 1, fontWeight: "bold", color: "#cc8800", userSelect: "none" }}>&#9888;</span> : <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3a7d44", flexShrink: 0 }} />}
                        <span style={{ fontSize: "12px", color: "#555" }}>Structure</span>
                      </div>
                      <div title={brokenCount > 0 ? `${brokenCount} broken link${brokenCount !== 1 ? "s" : ""}` : "Links OK"} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0" }}>
                        {brokenCount > 0 ? <span style={{ fontSize: "13px", lineHeight: 1, fontWeight: "bold", color: "#c00", userSelect: "none" }}>&#9888;</span> : <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3a7d44", flexShrink: 0 }} />}
                        <span style={{ fontSize: "12px", color: "#555" }}>Links</span>
                      </div>
                    </div>
                  )}
                </span>
              )}
              <span
                ref={menuTriggerRef}
                onClick={(e) => { e.stopPropagation(); onSelect(node.path); if (!menuOpen && menuTriggerRef.current) { const r = menuTriggerRef.current.getBoundingClientRect(); setMenuPos({ top: r.top + r.height / 2, left: r.left + r.width / 2 }); } setMenuOpen(o => !o); }}
                style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "31px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "16px", fontWeight: "bold", color: "#bbb" }}
              >
                &#8942;
                {menuOpen && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: menuPos?.top ?? 0, left: menuPos?.left ?? 0, zIndex: 200, background: "#fff", border: "1px solid #d0e8f7", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: "150px", overflow: "hidden" }}>
                    <div style={mi} onClick={() => { onOpen(node.path); setMenuOpen(false); }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}>View/Edit</div>
                    <div style={mi} onClick={() => { setMenuOpen(false); setTimeout(() => setRenaming(true), 0); }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}>Rename</div>
                    <div style={mi} onClick={() => { setAddingChild(true); setChildName(""); setChildError(""); setMenuOpen(false); setTimeout(() => childInputRef.current?.focus(), 50); }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}>New sub-page</div>
                    <div style={mi} onClick={() => { onCopyToChild(node.path); setMenuOpen(false); }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f5f5"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}>Copy to new sub-page</div>
                    <div style={{ ...mi, color: "#c00" }} onClick={() => { onDelete(node.path); setMenuOpen(false); }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#fff5f5"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}>Delete</div>
                  </div>
                )}
              </span>
            </div>
          </div>

          {previewContent && previewPos && !isDragging && !renaming && (
            <div style={{
              position: "fixed", top: previewPos.top, left: previewPos.left,
              zIndex: 1000, width: "260px", pointerEvents: "none",
              background: "#fff", border: "1px solid #d0e8f7",
              borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.13)",
              padding: "8px 10px",
            }}>
              <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "5px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.path}</div>
              {previewContent.split("\n").filter(l => l.trim()).slice(0, 8).map((line, i) => (
                <div key={i} style={{ fontSize: "12px", color: "#333", fontFamily: "monospace", lineHeight: 1.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{line}</div>
              ))}
            </div>
          )}

          {addingChild && (
            <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ display: "flex", gap: "4px" }}>
                <input
                  ref={childInputRef}
                  value={childName}
                  onChange={(e) => { setChildName(e.target.value); setChildError(""); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitChild();
                  }}
                  placeholder="filename.md"
                  style={{ padding: "4px 6px", background: "#fff", border: "1px solid #b3d9f7", borderRadius: "4px", color: "#1a1a1a", fontSize: "12px", outline: "none", width: "140px" }}
                />
                <button onClick={submitChild} style={{ padding: "4px 8px", background: "#3a7d44", border: "none", borderRadius: "4px", color: "#fff", fontSize: "12px", cursor: "pointer" }}>&#10003;</button>
                <button onClick={() => { setAddingChild(false); setChildName(""); setChildError(""); }} style={{ padding: "4px 8px", background: "#aaa", border: "none", borderRadius: "4px", color: "#fff", fontSize: "12px", cursor: "pointer" }}>&#10005;</button>
              </div>
              {childError && <div style={{ color: "#f66", fontSize: "11px" }}>{childError}</div>}
            </div>
          )}
        </div>
      </div>

      {(dropAction === "sibling" || dropAction === "unnest") && (
        <div style={{ height: "40px", marginLeft: `${connectorWidth}px`, marginTop: `${GAP}px` }} />
      )}

      {dropAction === "nest" && activeId && (
        <div style={{ display: "flex", alignItems: "center", marginTop: `${GAP}px`, opacity: 0.4 }}>
          <ConnectorLines
            depth={depth + 1}
            ancestors={[...ancestors, !isLast]}
            isLast={!(hasChildren && isExpanded)}
          />
          <div style={{
            display: "inline-flex", alignItems: "center",
            width: "2.5in", padding: "5px 12px",
            border: "1.5px solid #1a6fa8", borderRadius: "6px",
            background: "#e8f4fd",
          }}>
            <span style={{ width: "16px", marginRight: "3px", flexShrink: 0 }} />
            <span style={{ fontSize: "15px", fontWeight: 500, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {activeLabel}
            </span>
          </div>
        </div>
      )}

      {hasChildren && isExpanded && (
        (node.children ?? []).map((child, cidx) => (
          <SortableItem
            key={child.path}
            node={child}
            depth={depth + 1}
            isLast={cidx === (node.children ?? []).length - 1}
            ancestors={[...ancestors, !isLast]}
            selectedPath={selectedPath}
            titleMode={titleMode}
            onSelect={onSelect}
            onOpen={onOpen}
            onDelete={onDelete}
            onRename={onRename}
            onCreateChild={onCreateChild}
            onCopyToChild={onCopyToChild}
            expanded={expanded}
            toggleExpand={toggleExpand}
            overId={overId}
            activeId={activeId}
            activeLabel={activeLabel}
            dragDeltaX={dragDeltaX}
            currentProject={currentProject}
            brokenLinkMap={brokenLinkMap}
            frontmatterIssueMap={frontmatterIssueMap}
            templateIssueMap={templateIssueMap}
            showIndicators={showIndicators}
          />
        ))
      )}
    </div>
  );
}
