import { linter, forceLinting, setDiagnostics, type Diagnostic } from "@codemirror/lint";
import { syntaxTree } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";
import type { EditorState } from "@codemirror/state";

// -- Worker singleton --
let worker: Worker | null = null;
let ready = false;
let nextId = 0;
const pending = new Map<number, (r: Array<{ from: number; to: number; word: string }>) => void>();

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./spellcheck.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      if (data.type === "ready") ready = true;
      else if (data.type === "results") {
        pending.get(data.id)?.(data.results);
        pending.delete(data.id);
      }
    };
  }
  return worker;
}

export function initSpellWorker(personalWords: string[]) {
  ensureWorker().postMessage({ type: "init", words: personalWords });
}

export function addWordToWorker(word: string) {
  ensureWorker().postMessage({ type: "add-word", word });
}

// -- Skip ranges: nodes whose text should not be spell-checked --
const SKIP_TYPES = new Set([
  "FencedCode", "CodeBlock", "InlineCode",
  "HTMLBlock", "HTMLInline",
  "URL", "HeaderMark", "ListMark", "QuoteMark",
  "EmphasisMark", "CodeMark", "LinkMark",
  "HardBreak", "Escape",
]);

function buildSkipRanges(state: EditorState): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];

  // YAML frontmatter: skip content between leading --- delimiters
  const text = state.doc.toString();
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) ranges.push({ from: 0, to: end + 4 });
  }

  syntaxTree(state).cursor().iterate(node => {
    if (SKIP_TYPES.has(node.name)) {
      ranges.push({ from: node.from, to: node.to });
      return false;
    }
  });

  return ranges.sort((a, b) => a.from - b.from);
}

function proseTexts(state: EditorState): Array<{ from: number; text: string }> {
  const skip = buildSkipRanges(state);
  const len = state.doc.length;
  const out: Array<{ from: number; text: string }> = [];
  let pos = 0;
  for (const { from, to } of skip) {
    if (from > pos) out.push({ from: pos, text: state.doc.sliceString(pos, from) });
    pos = Math.max(pos, to);
  }
  if (pos < len) out.push({ from: pos, text: state.doc.sliceString(pos) });
  return out;
}

// -- CodeMirror lint extension --
export function spellcheckExtension(onAddWord: (word: string) => void) {
  return linter(async (view: EditorView): Promise<Diagnostic[]> => {
    if (!ready) return [];
    const texts = proseTexts(view.state);
    if (!texts.length) return [];

    const id = nextId++;
    const hits = await new Promise<Array<{ from: number; to: number; word: string }>>(resolve => {
      pending.set(id, resolve);
      ensureWorker().postMessage({ type: "check", id, texts });
    });

    return hits.map(({ from, to, word, suggestions }) => ({
      from, to,
      severity: "hint" as const,
      message: `"${word}" not in dictionary`,
      actions: [
        { name: "Add to dictionary", markClass: "cm-spell-primary", apply(view: EditorView) { onAddWord(word); view.dispatch(setDiagnostics(view.state, [])); forceLinting(view); } },
        ...suggestions.map((s: string) => ({
          name: `→ ${s}`,
          markClass: "cm-spell-suggestion",
          apply(view: EditorView, f: number, t: number) {
            view.dispatch({ changes: { from: f, to: t, insert: s } });
          },
        })),
      ],
    }));
  }, { delay: 750 });
}
