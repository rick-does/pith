import nspell from "nspell";

type Checker = ReturnType<typeof nspell>;
let checker: Checker | null = null;

self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data;

  if (type === "init") {
    const [affRes, dicRes] = await Promise.all([
      fetch("/dictionaries/en_US.aff"),
      fetch("/dictionaries/en_US.dic"),
    ]);
    const aff = await affRes.text();
    const dic = await dicRes.text();
    checker = nspell({ aff, dic });
    for (const word of (e.data.words as string[])) checker.add(word);
    self.postMessage({ type: "ready" });

  } else if (type === "check") {
    if (!checker) { self.postMessage({ type: "results", id: e.data.id, results: [] }); return; }
    const texts: Array<{ from: number; text: string }> = e.data.texts;
    const results: Array<{ from: number; to: number; word: string; suggestions: string[] }> = [];
    const wordRe = /[a-zA-Z\u00C0-\u024F][a-zA-Z'\u00C0-\u024F]*/g;
    for (const { from, text } of texts) {
      wordRe.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = wordRe.exec(text)) !== null) {
        const word = m[0].replace(/'$/, "");
        if (word.length < 2) continue;
        if (!checker.correct(word))
          results.push({ from: from + m.index, to: from + m.index + word.length, word, suggestions: checker.suggest(word).slice(0, 5) });
      }
    }
    self.postMessage({ type: "results", id: e.data.id, results });

  } else if (type === "add-word") {
    checker?.add(e.data.word);
  }
};
