import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
});

let mermaidCounter = 0;

interface Props {
  chart: string;
}

export default function MermaidBlock({ chart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const idRef = useRef(`mermaid-${++mermaidCounter}`);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { svg: rendered } = await mermaid.render(idRef.current, chart);
        if (!cancelled) {
          setSvg(rendered);
          setError("");
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message ?? "Failed to render diagram");
          setSvg("");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div style={{
        padding: 12, background: "#fff5f5", border: "1px solid #fcc",
        borderRadius: 4, fontSize: 12, color: "#c00", fontFamily: "monospace",
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Mermaid error</div>
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ display: "flex", justifyContent: "center", margin: "1em 0" }}
    />
  );
}
