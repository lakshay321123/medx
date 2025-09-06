export function dedupeResults(items: any[]) {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const it of items) {
    const key = (it.id || it.url || it.title).toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(it); }
  }
  return out;
}
