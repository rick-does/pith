import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, ViewUpdate, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, historyKeymap, history } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { nord } from "@uiw/codemirror-theme-nord";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { monokai } from "@uiw/codemirror-theme-monokai";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
import { solarizedLight, solarizedDark } from "@uiw/codemirror-theme-solarized";
import { abyss } from "@uiw/codemirror-theme-abyss";
import { andromeda } from "@uiw/codemirror-theme-andromeda";
import { bbedit } from "@uiw/codemirror-theme-bbedit";
import { bespin } from "@uiw/codemirror-theme-bespin";
import { duotoneDark, duotoneLight } from "@uiw/codemirror-theme-duotone";
import { eclipse } from "@uiw/codemirror-theme-eclipse";
import { gruvboxDark } from "@uiw/codemirror-theme-gruvbox-dark";
import { materialDark, materialLight } from "@uiw/codemirror-theme-material";
import { okaidia } from "@uiw/codemirror-theme-okaidia";
import { sublime } from "@uiw/codemirror-theme-sublime";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { xcodeLight, xcodeDark } from "@uiw/codemirror-theme-xcode";
import { vim, Vim } from "@replit/codemirror-vim";

export const EDITOR_THEMES: { id: string; label: string }[] = [
  { id: "one-dark",        label: "One Dark" },
  { id: "monokai",         label: "Monokai" },
  { id: "andromeda",       label: "Andromeda" },
  { id: "gruvbox-dark",    label: "Gruvbox Dark" },
  { id: "xcode-dark",      label: "Xcode Dark" },
  { id: "---",             label: "---" },
  { id: "xcode-light",     label: "Xcode Light" },
  { id: "solarized-light", label: "Solarized Light" },
];

function themeExtension(theme: string): Extension {
  switch (theme) {
    case "dracula":         return dracula;
    case "nord":            return nord;
    case "tokyo-night":     return tokyoNight;
    case "monokai":         return monokai;
    case "github-light":    return githubLight;
    case "github-dark":     return githubDark;
    case "solarized-light": return solarizedLight;
    case "solarized-dark":  return solarizedDark;
    case "abyss":           return abyss;
    case "andromeda":       return andromeda;
    case "bbedit":          return bbedit;
    case "bespin":          return bespin;
    case "duotone-dark":    return duotoneDark;
    case "duotone-light":   return duotoneLight;
    case "eclipse":         return eclipse;
    case "gruvbox-dark":    return gruvboxDark;
    case "material-dark":   return materialDark;
    case "material-light":  return materialLight;
    case "okaidia":         return okaidia;
    case "sublime":         return sublime;
    case "vscode-dark":     return vscodeDark;
    case "xcode-light":     return xcodeLight;
    case "xcode-dark":      return xcodeDark;
    case "one-dark":
    default:                return oneDark;
  }
}

export interface CodeEditorHandle {
  insertText: (text: string) => void;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  language?: "markdown" | "yaml";
  viMode?: boolean;
  theme?: string;
  readOnly?: boolean;
  onSave?: () => Promise<void> | void;
  onClose?: () => void;
}

const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor({ value, onChange, language = "markdown", viMode = true, theme = "one-dark", readOnly = false, onSave, onClose }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useImperativeHandle(ref, () => ({
    insertText(text: string) {
      const view = viewRef.current;
      if (!view) return;
      const { from } = view.state.selection.main;
      view.dispatch({ changes: { from, insert: text }, selection: { anchor: from + text.length } });
      view.focus();
    },
  }));

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
    extensions.push(themeExtension(theme));
    if (language === "markdown") {
      extensions.push(markdown());
      extensions.push(EditorView.contentAttributes.of({ spellcheck: "true" }));
    } else extensions.push(yaml());
    if (readOnly) extensions.push(EditorState.readOnly.of(true));

    const state = EditorState.create({ doc: value, extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, viMode, theme, readOnly]);

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
});

export default CodeEditor;
