import { Topic } from "../topic/normalize";

export type Trial = { title: string; condition?: string };

export function scoreTrialRelevance(t: Trial, topic: Topic): number {
  const title = (t.title || "").toLowerCase();
  let s = 0;
  if (title.includes(topic.canonical)) s += 2;
  if (topic.synonyms.some(k => title.includes(k.toLowerCase()))) s += 2;
  if (topic.anatomy && title.includes(topic.anatomy)) s += 1;
  if (topic.excludes.some(re => re.test(title))) s -= 2;
  return s;
}

export function filterTrials(trials: Trial[], topic: Topic): Trial[] {
  return trials.filter(t => scoreTrialRelevance(t, topic) >= 2);
}

export async function searchTrials(topic: Topic): Promise<Trial[]> {
  const syn = topic.synonyms.map(s => `"${s}"`).join(" OR ");
  const anatomy = topic.anatomy ? ` AND ${topic.anatomy}` : "";
  const exclude = topic.excludes.map(re => ` NOT ${re.source.replace(/\\b/g,"")}`).join("");
  const expr = encodeURIComponent(`(${syn})${anatomy}${exclude}`);
  const url = `https://clinicaltrials.gov/api/query/study_fields?expr=${expr}&fields=Condition,BriefTitle&max_rnk=20&fmt=json`;
  try {
    const r = await fetch(url);
    const j = await r.json();
    const studies = j.StudyFieldsResponse?.StudyFields || [];
    const trials: Trial[] = studies.map((s: any) => ({ title: s.BriefTitle?.[0] || "", condition: s.Condition?.[0] }));
    return filterTrials(trials, topic);
  } catch {
    return [];
  }
}
