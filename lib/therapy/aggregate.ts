// lib/therapy/aggregate.ts

type Note = {
  summary: string;
  meta?: { topics?: string[]; triggers?: string[]; emotions?: string[]; goals?: string[] } | null;
  mood?: string | null;
  next_step?: string | null;
  created_at?: string;
};

export type ProfileUpdate = {
  personality: Record<string, any>;
  topics: Record<string, number>;
  triggers: Record<string, number>;
  values: Record<string, boolean>;
  supports: Record<string, number>;
  mood_stats: { baseline: string; counts: Record<string, number> };
  recent_goals: string[];
};

// simple lower-casing + count helper
function countStrings(arr: (string | null | undefined)[] = []) {
  const map: Record<string, number> = {};
  for (const x of arr) {
    const k = (x || "").trim().toLowerCase();
    if (!k) continue;
    map[k] = (map[k] || 0) + 1;
  }
  return map;
}

export function aggregateNotes(notes: Note[]): ProfileUpdate {
  const topics: string[] = [];
  const triggers: string[] = [];
  const emotions: string[] = [];
  const goals: string[] = [];
  const moods: string[] = [];
  const supports: string[] = []; // placeholder (can be filled by smarter extraction later)

  for (const n of notes) {
    if (n.meta?.topics) topics.push(...n.meta.topics);
    if (n.meta?.triggers) triggers.push(...n.meta.triggers);
    if (n.meta?.emotions) emotions.push(...n.meta.emotions);
    if (n.meta?.goals) goals.push(...n.meta.goals);
    if (n.next_step) goals.push(n.next_step);
    if (n.mood) moods.push(n.mood);
  }

  const topicCounts = countStrings(topics);
  const triggerCounts = countStrings(triggers);
  const moodCounts = countStrings(moods);

  // naive baseline = most frequent mood, else neutral
  const baseline =
    Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";

  // values/personality are placeholders for now; filled by GPT step later
  const values: Record<string, boolean> = {};
  const personality: Record<string, any> = {};

  // keep last 5 distinct goals
  const recentGoals = Array.from(new Set(goals.map(g => (g || "").trim()).filter(Boolean))).slice(-5);

  return {
    personality,
    topics: topicCounts,
    triggers: triggerCounts,
    values,
    supports: countStrings(supports),
    mood_stats: { baseline, counts: moodCounts },
    recent_goals: recentGoals,
  };
}
