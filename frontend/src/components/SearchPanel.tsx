import { useState, useRef, useEffect, useCallback } from "react";
import { searchProject, SearchResult } from "../api";

interface Props {
  currentProject: string;
  onOpen: (path: string) => void;
  onClose: () => void;
}

export default function SearchPanel({ currentProject, onOpen, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const r = await searchProject(currentProject, q);
      setResults(r);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [currentProject]);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
  };

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

  return (
    <div style={{
      position: "fixed", top: 50, right: 0, bottom: 0,
      width: 480, background: "#1a1a2e", zIndex: 50,
      display: "flex", flexDirection: "column",
      borderLeft: "1px solid #333",
      boxShadow: "-4px 0 24px rgba(0,0,0,0.18)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 12px", background: "#111",
        borderBottom: "1px solid #333", flexShrink: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="#888" strokeWidth="2"/>
            <line x1="10" y1="10" x2="14.5" y2="14.5" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search across all files..."
          style={{
            flex: 1, background: "#1a1a2e", border: "1px solid #444",
            borderRadius: 4, color: "#ccc", fontSize: 14,
            padding: "6px 10px", outline: "none",
          }}
        />
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", color: "#888",
            fontSize: 18, cursor: "pointer", padding: "2px 6px",
            borderRadius: 4,
          }}
        >&#10005;</button>
      </div>

      {query.trim() && (
        <div style={{
          padding: "6px 12px", fontSize: 12, color: "#666",
          borderBottom: "1px solid #333", flexShrink: 0,
        }}>
          {searching ? "Searching..." : `${totalMatches} match${totalMatches !== 1 ? "es" : ""} in ${results.length} file${results.length !== 1 ? "s" : ""}`}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {results.map((result) => (
          <div key={result.path} style={{ marginBottom: 4 }}>
            <div
              onClick={() => onOpen(result.path)}
              style={{
                padding: "6px 12px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(107,140,255,0.1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "#ccc", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {result.title}
              </span>
              <span style={{ fontSize: 11, color: "#666", flexShrink: 0 }}>
                {result.path}
              </span>
              <span style={{ fontSize: 11, color: "#6b8cff", flexShrink: 0 }}>
                {result.matches.length}
              </span>
            </div>
            {result.matches.slice(0, 5).map((m, i) => (
              <div
                key={i}
                onClick={() => onOpen(result.path)}
                style={{
                  padding: "3px 12px 3px 28px", cursor: "pointer",
                  fontSize: 12, color: "#999", fontFamily: "monospace",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(107,140,255,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
              >
                <span style={{ color: "#555", marginRight: 8 }}>{m.line}</span>
                <HighlightedText text={m.text} query={query} />
              </div>
            ))}
            {result.matches.length > 5 && (
              <div style={{ padding: "2px 12px 2px 28px", fontSize: 11, color: "#555" }}>
                +{result.matches.length - 5} more
              </div>
            )}
          </div>
        ))}

        {query.trim() && !searching && results.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "#555", fontSize: 13 }}>
            No results found
          </div>
        )}
      </div>
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: { text: string; highlight: boolean }[] = [];
  let lastIndex = 0;
  let idx = lower.indexOf(q);
  while (idx !== -1) {
    if (idx > lastIndex) parts.push({ text: text.slice(lastIndex, idx), highlight: false });
    parts.push({ text: text.slice(idx, idx + q.length), highlight: true });
    lastIndex = idx + q.length;
    idx = lower.indexOf(q, lastIndex);
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), highlight: false });
  return (
    <span>
      {parts.map((p, i) =>
        p.highlight
          ? <span key={i} style={{ color: "#f90", fontWeight: 600 }}>{p.text}</span>
          : <span key={i}>{p.text}</span>
      )}
    </span>
  );
}
