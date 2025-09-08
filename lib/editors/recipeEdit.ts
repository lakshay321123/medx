// lib/editors/recipeEdit.ts
// Minimal, markdown-safe text edits. No parsing library—keep robust & simple.

export function replaceEverywhere(md: string, from: string, to: string) {
  if (!from || from.toLowerCase() === to.toLowerCase()) return md;
  const esc = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(esc, "gi");
  return md.replace(re, to);
}

export function addLineToSection(md: string, section: "Ingredients" | "Instructions", line: string) {
  if (!line.trim()) return md;
  const re = new RegExp(`(^|\\n)\\s*#*\\s*${section}\\s*:?\\s*\\n`, "i");
  const m = md.match(re);
  if (!m) {
    // fallback: append new section at end
    return md + `\n\n## ${section}\n- ${line.trim()}\n`;
  }
  const idx = m.index! + m[0].length;
  return md.slice(0, idx) + `- ${line.trim()}\n` + md.slice(idx);
}

export function removeEverywhere(md: string, what: string) {
  if (!what.trim()) return md;
  const esc = what.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const lineRE = new RegExp(`^.*${esc}.*$\\n?`, "gmi");
  let out = md.replace(lineRE, (ln) => {
    // try not to nuke headings
    return /^#/.test(ln) ? ln : "";
  });
  // also general text occurrences
  const wordRE = new RegExp(esc, "gi");
  out = out.replace(wordRE, "");
  return out;
}

export function addBurrataIfMissing(md: string) {
  if (/burrata/i.test(md)) return md;
  let out = addLineToSection(md, "Ingredients", "1 ball burrata (about 8 oz)");
  out = addLineToSection(out, "Instructions", "Tear burrata into pieces and fold through the warm sauce just before serving.");
  return out;
}
