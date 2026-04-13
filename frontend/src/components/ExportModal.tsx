import { useState } from "react";

interface Props {
  format: "mkdocs" | "docusaurus";
  resultPath: string;
  onExport: () => Promise<void>;
  onClose: () => void;
}

export default function ExportModal({ format, resultPath, onExport, onClose }: Props) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      await onExport();
    } catch (e: any) {
      setError(e.message ?? "Export failed");
      setExporting(false);
    }
  };

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 12px" }}>
          Export to {format === "mkdocs" ? "MkDocs" : "Docusaurus"}
        </h3>
        <p style={{ fontSize: 13, color: "#666" }}>
          This will write the current hierarchy as a {format === "mkdocs" ? "MkDocs nav (mkdocs.yml)" : "Docusaurus sidebar (sidebars.js)"} file to the project folder.
        </p>
        {error && <p style={{ fontSize: 13, color: "#c00" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...btn, background: "#eee", color: "#333" }}>Cancel</button>
          <button onClick={handleExport} disabled={exporting} style={btn}>
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
};
const modal: React.CSSProperties = {
  background: "#fff", borderRadius: 8, padding: 24, minWidth: 320,
  boxShadow: "0 4px 24px rgba(0,0,0,.2)",
};
const btn: React.CSSProperties = {
  background: "#1a6fa8", color: "#fff", border: "none", borderRadius: 4,
  padding: "8px 20px", cursor: "pointer", fontSize: 14,
};
