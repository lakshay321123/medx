export function extractTriggersFrom(text: string): string[] {
  const t = (text || "").toLowerCase();
  const hits = new Set<string>();

  // patterns (expand later)
  if (/\bemail|inbox|notification|slack|message(s)?\b/.test(t)) hits.add("notifications");
  if (/\bboss|manager|supervisor|review\b/.test(t)) hits.add("boss criticism");
  if (/\bdeadline|due|submit|exam|test\b/.test(t)) hits.add("deadlines");
  if (/\bnigh|late\b.*\bwork|email|screen/.test(t)) hits.add("late-night work");
  if (/\bcrowd|train|bus|traffic|commute\b/.test(t)) hits.add("commute/crowds");
  if (/\bfamily|home|parents|partner|argument|fight\b/.test(t)) hits.add("family conflict");
  if (/\bsocial|party|drinks?\b/.test(t)) hits.add("social events");
  if (/\bsleep|insomnia|awake|bed\b/.test(t)) hits.add("poor sleep");

  return Array.from(hits).slice(0, 6);
}
