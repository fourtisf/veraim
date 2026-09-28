// Tiny syntax highlighter for the API code samples (same rules as the prototype).
export function highlight(src: string) {
  const s = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return s.replace(
    /((?<![:\w])\/\/.*$|#.*$)|("[^"\n]*"|'[^'\n]*')|\b(import|from|const|await|new|print|curl)\b|\b(run|log|Prova)\b/gm,
    (_m, c, st, kw, fn) =>
      c ? `<span class="c">${c}</span>` : st ? `<span class="s">${st}</span>` : kw ? `<span class="k">${kw}</span>` : `<span class="f">${fn}</span>`
  );
}
