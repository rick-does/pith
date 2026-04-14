import { useEffect, useRef } from "react";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, ViewUpdate, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, historyKeymap, history } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import { vim, Vim } from "@replit/codemirror-vim";

interface Props {
  value: string;
  onChange: (val: string) => void;
  language?: "markdown" | "yaml";
  viMode?: boolean;
  dark?: boolean;
  readOnly?: boolean;
  onSave?: () => Promise<void> | void;
  onClose?: () => void;
}

export default function CodeEditor({ value, onChange, language = "markdown", viMode = true, dark = true, readOnly = false, onSave, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!containerRef.current) return;

    const extensions: Extension[] = [
      history(),
      lineNumbers(),
      highlightActiveLine(),
      EditorView.lineWrapping,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        "&": { height: "100%", fontSize: "14px" },
        ".cm-scroller": { overflow: "auto", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
      }),
    ];

    if (viMode) {
      Vim.defineEx("write", "w", () => { onSaveRef.current?.(); });
      Vim.defineEx("xit", "x", () => { Promise.resolve(onSaveRef.current?.()).then(() => onCloseRef.current?.()); });
      extensions.push(vim());
    }
    if (dark) extensions.push(oneDark);
    if (language === "markdown") extensions.push(markdown());
    else extensions.push(yaml());
    if (readOnly) extensions.push(EditorState.readOnly.of(true));

    const state = EditorState.create({ doc: value, extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, viMode, dark, readOnly]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
