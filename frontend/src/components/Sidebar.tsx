import React, { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragMoveEvent,
  DragOverlay,
  pointerWithin,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { FileNode, CollectionStructure, FileInfo, ProjectInfo } from "../types";
import {
  flatIds,
  removeNode,
  insertBefore,
  insertAfter,
  insertAsChild,
  insertAsLastChild,
  reorder,
  findSiblingList,
  findParent,
  swapSiblings,
} from "../treeHelpers";
import { GAP, COL_W, TOP_SENTINEL } from "./SortableItemConstants";
import { SortableItem } from "./SortableItem";
import OrphanPane from "./OrphanPane";
import ProjectChip, { type ProjectChipProps } from "./ProjectChip";

const DPAD_BTN: React.CSSProperties = {
  background: "transparent", border: "1px solid #d0e8f7", cursor: "pointer",
  fontSize: "13px", color: "#1a6fa8", borderRadius: "4px", lineHeight: 1,
  display: "flex", alignItems: "center", justifyContent: "center",
};
const DPAD_ENTER = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = "#e8f4fd"; };
const DPAD_LEAVE = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = "transparent"; };

function deepestPointerCollision(args: Parameters<typeof closestCenter>[0]) {
  const hits = pointerWithin(args);
  if (hits.length === 0) return closestCenter(args);
  if (hits.length === 1) return hits;
  return [...hits].sort((a, b) => {
    const ar = args.droppableRects.get(a.id as UniqueIdentifier);
    const br = args.droppableRects.get(b.id as UniqueIdentifier);
    if (!ar || !br) return 0;
    return ar.width * ar.height - br.width * br.height;
  }).slice(0, 1);
}

function TopSentinel() {
  const { setNodeRef } = useSortable({ id: TOP_SENTINEL });
  return (
    <div ref={setNodeRef} style={{ height: `${GAP}px`, marginTop: `-${GAP}px`, marginBottom: `-${GAP}px` }} />
  );
}

interface TreeOps {
  onDelete: (path: string) => Promise<void>;
  onRename: (oldPath: string, newName: string) => Promise<void>;
  onCreateChild: (parentPath: string, filename: string) => Promise<void>;
  onCopyToChild: (parentPath: string) => Promise<void>;
}

interface Indicators {
  brokenLinkMap: Record<string, number>;
  frontmatterIssueMap: Record<string, boolean>;
  templateIssueMap: Record<string, boolean>;
}

interface SidebarProps {
  collection: CollectionStructure;
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
  onOpen: (path: string) => void;
  onCollectionChange: (c: CollectionStructure) => void;
  orphans: FileInfo[];
  onRefresh: () => Promise<void>;
  treeOps: TreeOps;
  indicators: Indicators;
  chip: ProjectChipProps;
}

export default function Sidebar({ collection, selectedPath, onSelect, onOpen, onCollectionChange, orphans, onRefresh, treeOps, indicators, chip }: SidebarProps) {
  const [orphanSort, setOrphanSort] = useState<"recent" | "alpha" | "custom">("recent");
  const [orphanOrder, setOrphanOrder] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(flatIds(collection.root)));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dragDeltaX, setDragDeltaX] = useState(0);
  const prevMoveRef = useRef<{ overId: string | null; zone: string }>({ overId: null, zone: "" });
  const treeRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const orphanArrowRef = useRef<HTMLButtonElement>(null);
  const [dpadTop, setDpadTop] = useState<number | null>(null);
  const [selectedOrphans, setSelectedOrphans] = useState<Set<string>>(new Set());
  const lastSelectedOrphanRef = useRef<string | null>(null);
  const [rubberBand, setRubberBand] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const orphanSectionRef = useRef<HTMLDivElement>(null);
  const orphanChipRefs = useRef<Map<string, HTMLElement>>(new Map());
  const cursorOverZoneRef = useRef(false);

  useEffect(() => {
    if (selectedOrphans.size === 0 || selectedPath) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "ArrowLeft") return;
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      e.preventDefault();
      if (e.key === "ArrowLeft") {
        addOrphansToCollection([...selectedOrphans]);
        return;
      }
      if (selectedOrphans.size !== 1) return;
      const path = [...selectedOrphans][0];
      setOrphanSort("custom");
      setOrphanOrder(prev => {
        const list = prev.length ? prev : orphans.map(o => o.path);
        const idx = list.indexOf(path);
        if (idx === -1) return list;
        if (e.key === "ArrowUp" && idx === 0) return list;
        if (e.key === "ArrowDown" && idx === list.length - 1) return list;
        const next = [...list];
        const swap = e.key === "ArrowUp" ? idx - 1 : idx + 1;
        [next[idx], next[swap]] = [next[swap], next[idx]];
        return next;
      });
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedOrphans, selectedPath, orphans]);

  useEffect(() => {
    setExpanded(prev => {
      const currentPaths = new Set(flatIds(collection.root));
      const next = new Set(prev);
      currentPaths.forEach(p => { if (!next.has(p)) next.add(p); });
      next.forEach(p => { if (!currentPaths.has(p)) next.delete(p); });
      return next;
    });
  }, [collection]);

  useEffect(() => { setSelectedOrphans(new Set()); setOrphanOrder([]); setOrphanSort("recent"); }, [chip.currentProject]);

  useEffect(() => {
    if (!orphanArrowRef.current || !sidebarRef.current) { setDpadTop(null); return; }
    const sidebarRect = sidebarRef.current.getBoundingClientRect();
    const btnRect = orphanArrowRef.current.getBoundingClientRect();
    setDpadTop(btnRect.top + btnRect.height / 2 - sidebarRect.top);
  }, [selectedPath]);

  useEffect(() => {
    setOrphanOrder(prev => {
      const paths = orphans.map(o => o.path);
      const kept = prev.filter(p => paths.includes(p));
      const added = paths.filter(p => !prev.includes(p));
      return [...kept, ...added];
    });
  }, [orphans]);

  const getSortedOrphanPaths = useCallback((): string[] => {
    if (orphanSort === "alpha") return [...orphans].sort((a, b) => (chip.titleMode ? a.title : a.path).localeCompare(chip.titleMode ? b.title : b.path)).map(o => o.path);
    if (orphanSort === "custom") return orphanOrder.filter(p => orphans.some(o => o.path === p));
    return orphans.map(o => o.path);
  }, [orphans, orphanSort, orphanOrder, chip.titleMode]);

  const handleOrphanSelect = (path: string, ctrl: boolean, shift: boolean) => {
    onSelect(null);
    if (shift && lastSelectedOrphanRef.current) {
      const sorted = getSortedOrphanPaths();
      const lastIdx = sorted.indexOf(lastSelectedOrphanRef.current);
      const curIdx = sorted.indexOf(path);
      if (lastIdx !== -1 && curIdx !== -1) {
        const from = Math.min(lastIdx, curIdx);
        const to = Math.max(lastIdx, curIdx);
        const range = sorted.slice(from, to + 1);
        setSelectedOrphans(prev => {
          const next = new Set(prev);
          for (const p of range) next.add(p);
          return next;
        });
        return;
      }
    }
    setSelectedOrphans(prev => {
      if (ctrl) { const next = new Set(prev); next.has(path) ? next.delete(path) : next.add(path); return next; }
      if (prev.size === 1 && prev.has(path)) return new Set<string>();
      return new Set([path]);
    });
    lastSelectedOrphanRef.current = path;
  };

  const handleHierarchySelect = useCallback((path: string | null) => {
    if (path !== null) setSelectedOrphans(new Set());
    onSelect(path);
  }, [onSelect]);

  const orphanPathsToNodes = (paths: string[]): FileNode[] =>
    paths.map(p => { const info = orphans.find(o => o.path === p)!; return { path: p, title: info.title, order: 0, children: [] }; });

  const addOrphansToCollection = (paths: string[]) => {
    onCollectionChange({ root: reorder([...collection.root, ...orphanPathsToNodes(paths)]) });
    setSelectedOrphans(new Set());
    setTimeout(() => onRefresh(), 300);
  };

  const startRubberBand = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-orphan-chip], button, input')) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const onMove = (ev: MouseEvent) => {
      setRubberBand({ x1: startX, y1: startY, x2: ev.clientX, y2: ev.clientY });
      const selL = Math.min(ev.clientX, startX), selR = Math.max(ev.clientX, startX);
      const selT = Math.min(ev.clientY, startY), selB = Math.max(ev.clientY, startY);
      const next = new Set<string>();
      orphanChipRefs.current.forEach((el, p) => {
        const r = el.getBoundingClientRect();
        if (r.left < selR && r.right > selL && r.top < selB && r.bottom > selT) next.add(p);
      });
      setSelectedOrphans(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setRubberBand(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleRowMouseDown = (e: React.MouseEvent) => {
    if (treeRef.current?.contains(e.target as Node)) return;
    startRubberBand(e);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } }));

  const toggleExpand = (path: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(path) ? next.delete(path) : next.add(path);
    return next;
  });

  const handleDelete = async (path: string) => {
    await treeOps.onDelete(path);
  };

  const refocusTree = () => setTimeout(() => treeRef.current?.focus(), 0);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    if (!selectedPath) return;
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    const root = collection.root;
    if (e.key === "ArrowRight") {
      const found = findSiblingList(root, selectedPath);
      if (!found || found.idx === 0) return;
      const [withoutNode, node] = removeNode(root, selectedPath);
      if (!node) return;
      const prevSibling = found.list[found.idx - 1];
      onCollectionChange({ root: reorder(insertAsLastChild(withoutNode, prevSibling.path, node)) });
      setExpanded(prev => { const s = new Set(prev); s.add(prevSibling.path); return s; });
      refocusTree();
      return;
    }
    if (e.key === "ArrowLeft") {
      const parent = findParent(root, selectedPath);
      if (!parent) return;
      const [withoutNode, node] = removeNode(root, selectedPath);
      if (!node) return;
      onCollectionChange({ root: reorder(insertAfter(withoutNode, parent.path, node)) });
      refocusTree();
      return;
    }
    if (e.key === "ArrowUp") {
      const nr = swapSiblings(root, selectedPath, "up");
      if (nr !== root) { onCollectionChange({ root: reorder(nr) }); refocusTree(); return; }
      const parent = findParent(root, selectedPath);
      if (!parent) return;
      const parentSiblings = findSiblingList(root, parent.path);
      if (parentSiblings && parentSiblings.idx > 0) {
        const prevUncle = parentSiblings.list[parentSiblings.idx - 1];
        const [withoutNode, node] = removeNode(root, selectedPath);
        if (!node) return;
        onCollectionChange({ root: reorder(insertAsLastChild(withoutNode, prevUncle.path, node)) });
        setExpanded(prev => { const s = new Set(prev); s.add(prevUncle.path); return s; });
      } else {
        const [withoutNode, node] = removeNode(root, selectedPath);
        if (!node) return;
        onCollectionChange({ root: reorder(insertBefore(withoutNode, parent.path, node)) });
      }
      refocusTree();
      return;
    }
    if (e.key === "ArrowDown") {
      const nr = swapSiblings(root, selectedPath, "down");
      if (nr !== root) { onCollectionChange({ root: reorder(nr) }); refocusTree(); return; }
      const parent = findParent(root, selectedPath);
      if (!parent) return;
      const parentSiblings = findSiblingList(root, parent.path);
      if (parentSiblings && parentSiblings.idx < parentSiblings.list.length - 1) {
        const nextUncle = parentSiblings.list[parentSiblings.idx + 1];
        const [withoutNode, node] = removeNode(root, selectedPath);
        if (!node) return;
        onCollectionChange({ root: reorder(insertAsChild(withoutNode, nextUncle.path, node)) });
        setExpanded(prev => { const s = new Set(prev); s.add(nextUncle.path); return s; });
      } else {
        const [withoutNode, node] = removeNode(root, selectedPath);
        if (!node) return;
        onCollectionChange({ root: reorder(insertAfter(withoutNode, parent.path, node)) });
      }
      refocusTree();
    }
  }, [selectedPath, collection, expanded, onCollectionChange, setExpanded]);

  const fireArrow = useCallback((dir: string) => {
    handleKeyDown({ key: `Arrow${dir.charAt(0).toUpperCase() + dir.slice(1)}`, preventDefault: () => {}, target: { tagName: "DIV" } } as any);
    refocusTree();
  }, [handleKeyDown]);

  function computeNewRoot(dragged: string, target: string, deltaX: number): FileNode[] | null {
    if (target !== TOP_SENTINEL && orphans.some(o => o.path === target)) return null;
    const isOrphan = orphans.some(o => o.path === dragged);
    const withoutDragged = isOrphan ? collection.root : removeNode(collection.root, dragged)[0];
    const draggedNode = isOrphan ? orphanPathsToNodes([dragged])[0] : removeNode(collection.root, dragged)[1];
    if (!draggedNode) return null;
    if (target === TOP_SENTINEL) return reorder([draggedNode, ...withoutDragged]);
    if (deltaX > 30) return reorder(insertAsChild(withoutDragged, target, draggedNode));
    if (deltaX < -30) return reorder([...withoutDragged, draggedNode]);
    if (!isOrphan) {
      const flatList = flatIds(collection.root);
      if (flatList.indexOf(dragged) > flatList.indexOf(target)) {
        return reorder(insertBefore(withoutDragged, target, draggedNode));
      }
    }
    return reorder(insertAfter(withoutDragged, target, draggedNode));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
    setDragDeltaX(0);
    prevMoveRef.current = { overId: null, zone: "" };
    cursorOverZoneRef.current = false;
  }
  function pointerZoneDeltaX(activatorEvent: Event, deltaX: number, overRect: { left: number; width: number } | undefined): number {
    if (!overRect) return 0;
    const ptr = activatorEvent as PointerEvent;
    return (ptr.clientX + deltaX) > (overRect.left + overRect.width / 2) ? 100 : 0;
  }

  function handleDragMove(event: DragMoveEvent) {
    const newOverId = event.over?.id as string ?? null;
    const dx = pointerZoneDeltaX(event.activatorEvent, event.delta.x, event.over?.rect);
    const newZone = dx > 30 ? "nest" : "sibling";
    setOverId(newOverId);
    const prev = prevMoveRef.current;
    if (newOverId !== prev.overId || newZone !== prev.zone) {
      prevMoveRef.current = { overId: newOverId, zone: newZone };
      setDragDeltaX(dx);
    }
    if (orphanSectionRef.current) {
      const ptr = event.activatorEvent as PointerEvent;
      const cx = ptr.clientX + event.delta.x, cy = ptr.clientY + event.delta.y;
      const r = orphanSectionRef.current.getBoundingClientRect();
      cursorOverZoneRef.current = cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
    }
  }
  function handleDragOver(event: DragOverEvent) { setOverId(event.over?.id as string ?? null); }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over, delta } = event;
    setActiveId(null); setOverId(null); setDragDeltaX(0);
    const droppedOnZone = cursorOverZoneRef.current;
    cursorOverZoneRef.current = false;
    const dragged = active.id as string;
    const isFromHierarchy = !orphans.some(o => o.path === dragged);
    if (isFromHierarchy && (droppedOnZone || (over && orphans.some(o => o.path === over.id as string)))) {
      const [newRoot] = removeNode(collection.root, dragged);
      onSelect(null);
      onCollectionChange({ root: reorder(newRoot) });
      setTimeout(() => onRefresh(), 300);
      return;
    }
    if (!over || active.id === over.id) return;
    const target = over.id as string;
    const wasOrphan = orphans.some(o => o.path === dragged);
    const targetIsOrphan = orphans.some(o => o.path === target);
    if (wasOrphan && targetIsOrphan) {
      setOrphanSort("custom");
      setOrphanOrder(prev => {
        const from = prev.indexOf(dragged);
        const to = prev.indexOf(target);
        if (from === -1 || to === -1) return prev;
        const next = [...prev];
        next.splice(from, 1);
        next.splice(to, 0, dragged);
        return next;
      });
      return;
    }
    const effectiveDx = pointerZoneDeltaX(event.activatorEvent, delta.x, over?.rect);

    // Multi-orphan drag to hierarchy
    if (wasOrphan && !targetIsOrphan && selectedOrphans.has(dragged) && selectedOrphans.size > 1) {
      const pathsToMove = [...selectedOrphans];
      const newNodes = orphanPathsToNodes(pathsToMove);
      let root = collection.root;
      if (target === TOP_SENTINEL) {
        root = [...newNodes, ...root];
      } else if (effectiveDx > 30) {
        for (const n of newNodes) root = insertAsChild(root, target, n);
        setExpanded(prev => { const s = new Set(prev); s.add(target); return s; });
      } else {
        for (const n of [...newNodes].reverse()) root = insertAfter(root, target, n);
      }
      setSelectedOrphans(new Set());
      onCollectionChange({ root: reorder(root) });
      setTimeout(() => onRefresh(), 300);
      refocusTree();
      return;
    }

    const newNodes = computeNewRoot(dragged, target, effectiveDx);
    if (!newNodes) return;
    if (effectiveDx > 30) setExpanded(prev => { const s = new Set(prev); s.add(target); return s; });
    onCollectionChange({ root: newNodes });
    if (wasOrphan) {
      setSelectedOrphans(new Set());
      setTimeout(() => onRefresh(), 300);
    }
    refocusTree();
  }

  const activeDepth = (() => {
    if (!activeId || orphans.some(o => o.path === activeId)) return 0;
    function find(nodes: FileNode[], d: number): number {
      for (const n of nodes) {
        if (n.path === activeId) return d;
        const r = find(n.children ?? [], d + 1);
        if (r > 0) return r;
      }
      return 0;
    }
    return find(collection.root, 1);
  })();

  const allIds = [TOP_SENTINEL, ...flatIds(collection.root), ...orphans.map(o => o.path)];

  const activeLabel = activeId ? (() => {
    const orphan = orphans.find(o => o.path === activeId);
    if (orphan) return chip.titleMode ? orphan.title : orphan.path;
    const [, node] = removeNode(collection.root, activeId);
    return node ? (chip.titleMode ? node.title : node.path) : activeId;
  })() : "";

  return (
    <div ref={sidebarRef} style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff", paddingLeft: "1in", marginRight: "1in", position: "relative" }}>

      {selectedPath && flatIds(collection.root).includes(selectedPath) && (
        <div style={{ position: "absolute", left: 0, top: dpadTop ?? 280, width: "1in", display: "flex", justifyContent: "center", zIndex: 5, transform: "translateY(-50%)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto auto auto" }}>
            <div />
            <button onClick={() => fireArrow("up")} title="Move up" style={{ ...DPAD_BTN, padding: "4px 6px" }} onMouseEnter={DPAD_ENTER} onMouseLeave={DPAD_LEAVE}>&#9650;</button>
            <div />
            <button onClick={() => fireArrow("left")} title="Unnest" style={{ ...DPAD_BTN, padding: "4px 5px" }} onMouseEnter={DPAD_ENTER} onMouseLeave={DPAD_LEAVE}>&#9664;</button>
            <div style={{ width: "4px" }} />
            <button onClick={() => fireArrow("right")} title="Nest" style={{ ...DPAD_BTN, padding: "4px 5px" }} onMouseEnter={DPAD_ENTER} onMouseLeave={DPAD_LEAVE}>&#9654;</button>
            <div />
            <button onClick={() => fireArrow("down")} title="Move down" style={{ ...DPAD_BTN, padding: "4px 6px" }} onMouseEnter={DPAD_ENTER} onMouseLeave={DPAD_LEAVE}>&#9660;</button>
            <div />
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={deepestPointerCollision} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flex: 1, gap: "50px", minHeight: 0, overflow: "hidden" }} onMouseDown={handleRowMouseDown}>

            <div ref={treeRef} style={{ overflowY: "auto", minHeight: 0, paddingTop: "8px", paddingBottom: "8px", outline: "none" }} tabIndex={0} onKeyDown={handleKeyDown}>

              {!chip.currentProject && (
                <div style={{ color: "#aaa", padding: "16px", fontSize: "13px", textAlign: "center" }}>
                  No projects yet.{" "}
                  <span onClick={() => chip.onNewProject()} style={{ color: "#1a6fa8", cursor: "pointer", textDecoration: "underline" }}>
                    Create one
                  </span>
                </div>
              )}

              {chip.currentProject && (
                <ProjectChip {...chip} />
              )}

              <TopSentinel />

              {collection.root.map((node, idx) => (
                <SortableItem
                  key={node.path}
                  node={node}
                  depth={1}
                  isLast={idx === collection.root.length - 1}
                  ancestors={[]}
                  showTopIndicator={idx === 0 && activeId !== null && overId === TOP_SENTINEL}
                  selectedPath={selectedPath}
                  titleMode={chip.titleMode}
                  onSelect={handleHierarchySelect}
                  onOpen={onOpen}
                  onDelete={handleDelete}
                  onRename={treeOps.onRename}
                  onCreateChild={treeOps.onCreateChild}
                  onCopyToChild={treeOps.onCopyToChild}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  overId={overId}
                  activeId={activeId}
                  activeLabel={activeLabel}
                  dragDeltaX={dragDeltaX}
                  currentProject={chip.currentProject}
                  brokenLinkMap={indicators.brokenLinkMap}
                  frontmatterIssueMap={indicators.frontmatterIssueMap}
                  templateIssueMap={indicators.templateIssueMap}
                  showIndicators={chip.showIndicators}
                />
              ))}

              {collection.root.length === 0 && orphans.length === 0 && (
                <div style={{ color: "#aaa", padding: "16px", fontSize: "13px", textAlign: "center" }}>
                  No markdown files yet. Create one with + New file.
                </div>
              )}
            </div>

            <OrphanPane
              orphans={orphans} titleMode={chip.titleMode} activeId={activeId} currentProject={chip.currentProject}
              selectedOrphans={selectedOrphans} onOrphanSelect={handleOrphanSelect}
              onAddToSelection={(path) => setSelectedOrphans(prev => { const next = new Set(prev); next.add(path); return next; })}
              orphanSort={orphanSort} setOrphanSort={setOrphanSort} orphanOrder={orphanOrder}
              rubberBand={rubberBand} orphanSectionRef={orphanSectionRef} orphanChipRefs={orphanChipRefs}
              onOpen={onOpen} onDelete={handleDelete} onAddOrphansToCollection={addOrphansToCollection} onRefresh={onRefresh}
              arrowBtnRef={orphanArrowRef}
              brokenLinkMap={indicators.brokenLinkMap}
              frontmatterIssueMap={indicators.frontmatterIssueMap}
              templateIssueMap={indicators.templateIssueMap}
              showIndicators={chip.showIndicators}
            />

          </div>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
          {activeId ? (() => {
            const isOrphanDrag = orphans.some(o => o.path === activeId);
            const isMultiOrphanDrag = isOrphanDrag && selectedOrphans.has(activeId) && selectedOrphans.size > 1;
            const labels = isMultiOrphanDrag
              ? [...selectedOrphans].map(p => {
                  const o = orphans.find(x => x.path === p);
                  return o ? (chip.titleMode ? o.title : o.path) : p;
                })
              : [activeLabel];
            return (
              <div style={{ marginLeft: activeDepth > 0 ? `${(activeDepth + 1) * COL_W}px` : 0 }}>
                {labels.map((label, i) => (
                  <div key={i} style={{
                    display: "inline-flex", alignItems: "center",
                    width: "2.5in", borderRadius: "6px",
                    border: "1.5px solid #1a6fa8",
                    background: !isOrphanDrag ? "#e8f4fd" : "#fff",
                    boxShadow: i === 0
                      ? (!isOrphanDrag
                          ? "inset 5px 0 0 0 #1a6fa8, 0 6px 20px rgba(0,0,0,0.22)"
                          : "0 6px 20px rgba(0,0,0,0.22)")
                      : "none",
                    opacity: 0.97, userSelect: "none",
                    padding: "5px 10px 5px 12px",
                    marginTop: i > 0 ? "4px" : 0,
                  }}>
                    <span style={{ fontSize: "15px", fontWeight: 500, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                  </div>
                ))}
              </div>
            );
          })() : null}
        </DragOverlay>
      </DndContext>

    </div>
  );
}
