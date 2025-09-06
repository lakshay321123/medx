export function normalizeQuery(q: string, mainTopic: string | null) {
  if (!mainTopic) return q;
  return q.replace(/\b(it|this|that|them|there|thereof)\b/gi, mainTopic);
}
