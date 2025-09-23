export function buildShareCaption(message: string, brand: string, url: string) {
  const clean = (message || "").replace(/\s+/g, " ").trim();
  const max = 180;
  const trimmed = clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
  const brandLine = brand ? `${brand}` : "";
  return [trimmed, brandLine && url ? `${brandLine} • ${url}` : url].filter(Boolean).join("\n\n");
}

export function buildShareIntentCaption(message: string, brand: string) {
  const prefix = `AI answer from ${brand}`.trim();
  const cleanWords = (message || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  const prefixWordCount = prefix.split(/\s+/).filter(Boolean).length;
  const targetTotal = 12;
  const snippetWordCount = Math.max(5, targetTotal - prefixWordCount);
  const snippet = cleanWords.slice(0, snippetWordCount);

  const fillerWords = [
    "trusted",
    "insights",
    "to",
    "share",
    "with",
    "others",
    "today",
  ];

  if (!snippet.length) {
    return `${prefix}: ${fillerWords.join(" ")}`;
  }

  while (prefixWordCount + snippet.length < 10 && fillerWords.length) {
    snippet.push(fillerWords.shift()!);
  }

  if (cleanWords.length > snippetWordCount) {
    const lastIndex = Math.max(0, snippet.length - 1);
    snippet[lastIndex] = `${snippet[lastIndex].replace(/[.,;:!?]+$/, "")}…`;
  }

  return `${prefix}: ${snippet.join(" ")}`.trim();
}
