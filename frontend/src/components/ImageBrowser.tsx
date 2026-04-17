import { useState, useEffect, useRef } from "react";
import { listImages, uploadImages, deleteImage, openImagesFolder } from "../api";
import type { ImageInfo } from "../api";

interface Props {
  project: string;
  editorOpen: boolean;
  selectedPath: string | null;
  onInsert: (markdown: string) => void;
  onClose: () => void;
  triggerAdd?: boolean;
}

export default function ImageBrowser({ project, editorOpen, selectedPath, onInsert, onClose, triggerAdd }: Props) {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listImages(project)
      .then(setImages)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [project]);

  useEffect(() => {
    if (triggerAdd) fileInputRef.current?.click();
  }, [triggerAdd]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    try {
      await uploadImages(project, e.target.files);
      load();
    } catch {
      setError("Upload failed");
    }
    e.target.value = "";
  };

  const handleDelete = async (name: string) => {
    setDeleting(name);
    try {
      await deleteImage(project, name);
      setImages((imgs) => imgs.filter((i) => i.name !== name));
    } catch {
      setError("Delete failed");
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const handleInsert = (name: string) => {
    const depth = selectedPath ? selectedPath.split("/").length - 1 : 0;
    const prefix = "../".repeat(depth + 1);
    onInsert(`![](${prefix}images/${encodeURIComponent(name)})`);
    onClose();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px",
        width: "680px", maxWidth: "95vw", maxHeight: "80vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }} onClick={(e) => e.stopPropagation()}>

        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #333", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#ccc", flex: 1 }}>Project images</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={btnStyle}
            onMouseEnter={btnHover} onMouseLeave={btnLeave}
          >Add images</button>
          <button
            onClick={() => openImagesFolder(project)}
            style={btnStyle}
            onMouseEnter={btnHover} onMouseLeave={btnLeave}
            title="Open images folder in file manager"
          >Open folder</button>
          <button onClick={onClose} style={{ ...btnStyle, marginLeft: 4 }} onMouseEnter={btnHover} onMouseLeave={btnLeave}>&#10005;</button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleUpload}
        />

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {loading && <span style={{ fontSize: 13, color: "#888" }}>Loading…</span>}
          {error && <span style={{ fontSize: 13, color: "#f66" }}>{error}</span>}
          {!loading && !error && images.length === 0 && (
            <div style={{ fontSize: 13, color: "#666", textAlign: "center", padding: "32px 0" }}>
              No images yet. Click <strong style={{ color: "#aaa" }}>Add images</strong> to add some.
            </div>
          )}
          {!loading && images.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
              {images.map((img) => (
                <div key={img.name} style={{ position: "relative" }}>
                  <div
                    onClick={() => editorOpen ? handleInsert(img.name) : undefined}
                    style={{
                      background: "#111", border: "1px solid #333", borderRadius: 4,
                      overflow: "hidden", cursor: editorOpen ? "pointer" : "default",
                    }}
                    title={editorOpen ? `Insert ${img.name}` : img.name}
                  >
                    <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      <img
                        src={`/api/projects/${project}/image/${encodeURIComponent(img.name)}`}
                        alt={img.name}
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    </div>
                    <div style={{ padding: "4px 6px", borderTop: "1px solid #222" }}>
                      <div style={{ fontSize: 11, color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={img.name}>{img.name}</div>
                      <div style={{ fontSize: 10, color: "#666" }}>{formatSize(img.size)}</div>
                    </div>
                  </div>
                  {confirmDelete === img.name ? (
                    <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 3 }}>
                      <button
                        onClick={() => handleDelete(img.name)}
                        disabled={deleting === img.name}
                        style={{ ...deleteBtnStyle, background: "#8b0000", color: "#fff" }}
                      >{deleting === img.name ? "…" : "Delete"}</button>
                      <button onClick={() => setConfirmDelete(null)} style={deleteBtnStyle}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(img.name); }}
                      style={{ position: "absolute", top: 4, right: 4, ...deleteBtnStyle, opacity: 0 }}
                      className="img-delete-btn"
                      title={`Delete ${img.name}`}
                    >&#10005;</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {editorOpen && images.length > 0 && (
          <div style={{ padding: "8px 16px", borderTop: "1px solid #333", fontSize: 12, color: "#666" }}>
            Click an image to insert it at the cursor position
          </div>
        )}
      </div>

      <style>{`.img-delete-btn { transition: opacity 0.15s; } .img-delete-btn:hover { opacity: 1 !important; } div:hover > .img-delete-btn { opacity: 0.7 !important; }`}</style>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "4px 10px", fontSize: "12px", background: "#222", color: "#aaa",
  border: "1px solid #333", borderRadius: 3, cursor: "pointer",
};
const btnHover = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = "#1a3a5c";
  e.currentTarget.style.color = "#7ec8f7";
  e.currentTarget.style.borderColor = "#2a6a9a";
};
const btnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = "#222";
  e.currentTarget.style.color = "#aaa";
  e.currentTarget.style.borderColor = "#333";
};
const deleteBtnStyle: React.CSSProperties = {
  padding: "2px 6px", fontSize: "11px", background: "#2a2a2a", color: "#888",
  border: "1px solid #444", borderRadius: 2, cursor: "pointer",
};
