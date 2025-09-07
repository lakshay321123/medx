const bannedOpeners = [
  "it looks like we're starting fresh",
  "it seems like we're starting fresh",
];

export function sanitizeLLM(text: string): string {
  let t = text;

  // Remove UI glyphs
  t = t.replace(/👍|👎/g, "");

  // Remove echoed CTAs at end
  t = t.replace(/Would like to know.+\?\s*$/gim, "");

  // Collapse duplicate consecutive lines
  const lines = t.split(/\n{1,}/);
  const dedup: string[] = [];
  for (const ln of lines) {
    if (dedup.length === 0 || dedup[dedup.length - 1].trim() !== ln.trim()) {
      dedup.push(ln);
    }
  }
  t = dedup.join("\n\n");

  // Strip banned openers
  for (const bad of bannedOpeners) {
    const rx = new RegExp("^" + bad.replace(/[.*+?^${}()|[\]\]/g, "\\$&"), "i");
    t = t.replace(rx, "").trim();
  }

  // Fix common typos
  t = t.replace(/\bboneless,less\b/gi, "boneless, skinless")
       .replace(/\ba of\b/gi, "a");

  return t.trim();
}
