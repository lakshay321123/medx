export function buildShareCaption(message: string, brand: string, url: string) {
  const clean = (message || "").replace(/\s+/g, " ").trim();
  const max = 180;
  const trimmed = clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
  const brandLine = brand ? `${brand}` : "";
  return [trimmed, brandLine && url ? `${brandLine} • ${url}` : url].filter(Boolean).join("\n\n");
}
