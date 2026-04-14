import { useState, useEffect } from "react";

interface StatsData {
  word_count: number;
  sentence_count: number;
  paragraph_count: number;
  avg_sentence_length: number;
  flesch_reading_ease: number;
  flesch_reading_ease_label: string;
  flesch_kincaid_grade: number;
  gunning_fog: number;
  automated_readability_index: number;
  coleman_liau_index: number;
}

interface Props {
  project: string;
  filePath: string;
}

export default function StatsPanel({ project, filePath }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!collapsed) {
      setStats(null);
      setError(null);
      setLoading(true);
      fetch(`/api/projects/${project}/stats/${filePath}`)
        .then(r => {
          if (!r.ok) throw new Error("Failed to load stats");
          return r.json();
        })
        .then(data => { setStats(data); setLoading(false); })
        .catch(e => { setError(e.message); setLoading(false); });
    }
  }, [collapsed, project, filePath]);

  return (
    <div style={{ borderBottom: "1px solid #333", background: "#111", flexShrink: 0 }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: "6px 12px", cursor: "pointer", display: "flex",
          alignItems: "center", gap: 6, userSelect: "none",
        }}
      >
        <span style={{ fontSize: 10, color: "#888" }}>{collapsed ? "\u25B6" : "\u25BC"}</span>
        <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Stats</span>
      </div>

      {!collapsed && (
        <div style={{ padding: "4px 12px 10px" }}>
          {loading && <span style={{ fontSize: 12, color: "#888" }}>Loading…</span>}
          {error && <span style={{ fontSize: 12, color: "#f66" }}>{error}</span>}
          {stats && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
                <Row label="Words" value={String(stats.word_count)} />
                <Row label="Sentences" value={String(stats.sentence_count)} />
                <Row label="Paragraphs" value={String(stats.paragraph_count)} />
                <Row label="Avg sentence length" value={`${stats.avg_sentence_length} words`} />
              </div>
              <div style={{ fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 4, paddingTop: 4, borderTop: "1px solid #222" }}>
                Readability
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Row label="Flesch Reading Ease" value={`${stats.flesch_reading_ease}`} note={stats.flesch_reading_ease_label} />
                <Row label="Flesch-Kincaid Grade" value={`${stats.flesch_kincaid_grade}`} />
                <Row label="Gunning Fog" value={`${stats.gunning_fog}`} />
                <Row label="Automated Readability" value={`${stats.automated_readability_index}`} />
                <Row label="Coleman-Liau" value={`${stats.coleman_liau_index}`} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "#888", width: 150, flexShrink: 0, textAlign: "right" }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: "#ccc" }}>{value}</span>
      {note && <span style={{ fontSize: 11, color: "#888" }}>{note}</span>}
    </div>
  );
}
