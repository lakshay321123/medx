export type PrefKV = { key: string; value: string };

export function extractPrefsFromUser(text: string): PrefKV[] {
  const out: PrefKV[] = [];
  if (!text) return out;

  // Test-time preference
  if (/prefer(s)?\s+(morning)\s+(fasting\s+)?(tests|draws?|blood)/i.test(text)) out.push({ key: "pref_test_time", value: "morning" });
  if (/prefer(s)?\s+(afternoon)\s+(fasting\s+)?(tests|draws?|blood)/i.test(text)) out.push({ key: "pref_test_time", value: "afternoon" });
  if (/prefer(s)?\s+(evening)\s+(fasting\s+)?(tests|draws?|blood)/i.test(text)) out.push({ key: "pref_test_time", value: "evening" });

  // Medication form
  if (/(prefer|like)\s+(syrup|liquid)\s+(medicine|medication|drugs?)/i.test(text) || /don'?t\s+like\s+pills?/i.test(text)) {
    out.push({ key: "pref_med_form", value: "liquid" });
  }
  if (/(prefer|like)\s+pills?/i.test(text)) out.push({ key: "pref_med_form", value: "pill" });

  // Diet
  if (/(i'?m|i am)\s+veg(etarian)?\b/i.test(text)) out.push({ key: "diet_type", value: "vegetarian" });
  if (/(i'?m|i am)\s+vegan\b/i.test(text)) out.push({ key: "diet_type", value: "vegan" });

  // Dedupe by key
  const seen = new Map<string,string>();
  for (const i of out) seen.set(i.key, i.value);
  return Array.from(seen, ([key,value]) => ({ key, value }));
}
