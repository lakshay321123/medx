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
  return s;
}
