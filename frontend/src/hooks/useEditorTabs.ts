import { useState, useEffect, useRef, useCallback } from "react";
import type { EditorTab, OverlayType } from "../types";
import type { BrokenLink } from "../api";

export const TABS_KEY = (r: string, p: string) => `pith_tabs_${r}:${p}`;
export const ACTIVE_TAB_KEY = (r: string, p: string) => `pith_active_tab_${r}:${p}`;

export const TAB_STYLES = [
  { bg: "#fff3e0", text: "#555", border: "#ff8c00", indicator: "#1a6fa8" },
  { bg: "#e8f4fd", text: "#555", border: "#1a6fa8", indicator: "#ff8c00" },
];

interface Opts {
  editorContentRef: React.MutableRefObject<string>;
  savedContentRef: React.MutableRefObject<string>;
  setSelectedPath: (p: string | null) => void;
  setEditorContent: (c: string) => void;
  setSavedContent: (c: string) => void;
  setFileBrokenLinks: (l: BrokenLink[]) => void;
  setOverlayType: (t: OverlayType) => void;
}

export function useEditorTabs({
  editorContentRef, savedContentRef,
  setSelectedPath, setEditorContent, setSavedContent, setFileBrokenLinks, setOverlayType,
}: Opts) {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabContextMenu, setTabContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);

  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  const tabsRestoredRef = useRef(false);

  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

  useEffect(() => {
    if (!tabContextMenu) return;
    const handler = () => setTabContextMenu(null);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tabContextMenu]);

  const handleSwitchTab = useCallback((id: string) => {
    if (activeTabIdRef.current) {
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: editorContentRef.current } : t));
    }
    const tab = tabsRef.current.find(t => t.id === id);
    if (!tab) return;
    setActiveTabId(id);
    setSelectedPath(tab.path);
    setEditorContent(tab.content);
    setSavedContent(tab.savedContent);
    setFileBrokenLinks(tab.brokenLinks);
    setOverlayType("editor");
  }, [editorContentRef, setSelectedPath, setEditorContent, setSavedContent, setFileBrokenLinks, setOverlayType]);

  const handleCloseTab = useCallback((id: string) => {
    const currentActiveId = activeTabIdRef.current;
    const allTabs = tabsRef.current;
    const tab = allTabs.find(t => t.id === id);
    if (!tab) return;
    const isDirty = id === currentActiveId
      ? editorContentRef.current !== savedContentRef.current
      : tab.content !== tab.savedContent;
    if (isDirty && !window.confirm(`"${tab.path}" has unsaved changes.\n\nClose without saving?`)) return;
    const next = allTabs.filter(t => t.id !== id);
    setTabs(next);
    if (id === currentActiveId) {
      if (next.length === 0) {
        setActiveTabId(null);
        setOverlayType(null);
        setSelectedPath(null);
      } else {
        const idx = allTabs.findIndex(t => t.id === id);
        const newActive = next[Math.max(0, idx - 1)];
        setActiveTabId(newActive.id);
        setSelectedPath(newActive.path);
        setEditorContent(newActive.content);
        setSavedContent(newActive.savedContent);
        setFileBrokenLinks(newActive.brokenLinks);
        setOverlayType("editor");
      }
    }
  }, [editorContentRef, savedContentRef, setSelectedPath, setEditorContent, setSavedContent, setFileBrokenLinks, setOverlayType]);

  return {
    tabs, setTabs,
    activeTabId, setActiveTabId,
    tabContextMenu, setTabContextMenu,
    tabsRef, activeTabIdRef, tabsRestoredRef,
    handleSwitchTab, handleCloseTab,
  };
}
