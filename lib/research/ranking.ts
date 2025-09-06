export function rankResults(items: any[], { topic }: { topic: string }) {
  return items
    .map(x => ({ x, score: score(x, topic) }))
    .sort((a, b) => b.score - a.score)
    .map(a => a.x);
}

function score(item: any, topic: string) {
  let s = 0;
  if (item.source?.includes("ct")) s += 3;  // clinical > papers
  if ((item.title || "").toLowerCase().includes(topic.toLowerCase())) s += 3;
  if (item.extra?.recruiting) s += 2;
  if (item.date && Date.now() - Date.parse(item.date) < 365*24*3600*1000) s += 2;
  s += evidenceScore(item.extra?.evidenceLevel);
  return s;
}

function evidenceScore(level: string) {
  if (!level) return 0;
  if (/phase iii/i.test(level)) return 4;
  if (/phase ii/i.test(level)) return 3;
  if (/phase i/i.test(level)) return 2;
  if (/review|meta/i.test(level)) return 2;
  if (/adverse|label/i.test(level)) return 1;
  return 0;
}
