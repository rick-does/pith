interface Props {
  format: "mkdocs" | "docusaurus";
  resultPath: string;
  onClose: () => void;
}

export default function ExportModal({ format, resultPath, onClose }: Props) {
  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 12px" }}>Export Complete</h3>
        <p style={{ fontSize: 13, color: "#333" }}>
          {format === "mkdocs"
            ? "MkDocs nav written to:"
            : "Docusaurus sidebar written to:"}
        </p>
        <code style={{ display: "block", padding: 8, background: "#f5f5f5", borderRadius: 4, fontSize: 13 }}>
          {resultPath}
        </code>
        <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          Copy this file to your {format === "mkdocs" ? "MkDocs" : "Docusaurus"} project.
        </p>
        <button onClick={onClose} style={closeBtn}>Close</button>
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
const closeBtn: React.CSSProperties = {
  background: "#333", color: "#fff", border: "none", borderRadius: 4,
  padding: "8px 20px", cursor: "pointer", fontSize: 14, marginTop: 12,
};
