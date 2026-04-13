import { useState, useEffect, useRef, useCallback, CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { fetchMarkdown } from "../api";

export interface OrphanItemProps {
  path: string;
  title: string;
  titleMode: boolean;
  isMultiSelected: boolean;
  onMultiSelect: (path: string, ctrl: boolean) => void;
  onAddToSelection: (path: string) => void;
  onOpen: (path: string) => void;
  onDelete: (path: string) => void;
  onAddToHierarchy: (path: string) => void;
  currentProject: string;
  setChipRef: (el: HTMLElement | null) => void;
  activeId: string | null;
}

export function OrphanItem({ path, title, titleMode, isMultiSelected, onMultiSelect, onAddToSelection, onOpen, onDelete, onAddToHierarchy, currentProject, setChipRef, activeId }: OrphanItemProps) {
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

  const mi: CSSProperties = { padding: "7px 14px", fontSize: "13px", cursor: "pointer", color: "#1a1a1a", whiteSpace: "nowrap" };

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
            background: isMultiSelected ? "#fff3e0" : hovered ? "#fff8f0" : "transparent",
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
              onAddToHierarchy(path);
            } else {
              clickTimerRef.current = setTimeout(() => {
                clickTimerRef.current = null;
                onMultiSelect(path, e.ctrlKey || e.metaKey);
              }, 250);
            }
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => { setHovered(false); setPreviewContent(null); setPreviewFixed(null); }}
        >
          <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, padding: "5px 10px 5px 12px" }}>
            <span style={{ fontSize: "15px", fontWeight: 500, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }} title={tooltip}>
              {label}
            </span>
          </div>
          {(isMultiSelected || hovered) && (
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
