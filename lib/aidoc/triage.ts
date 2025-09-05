export const RED_FLAGS: Record<string, string[]> = {
  chest_pain: [
    "sudden chest pain", "pressure in chest", "pain spreading to arm/jaw",
    "shortness of breath with chest pain"
  ],
  neuro: [
    "sudden weakness one side", "slurred speech", "confusion", "sudden severe headache"
  ],
  sepsis: [
    "fever with confusion", "very fast heartbeat with fever", "very drowsy hard to wake"
  ],
};

export function matchRedFlags(text: string): string[] {
  const t = text.toLowerCase();
  const hits: string[] = [];
  for (const list of Object.values(RED_FLAGS)) {
    for (const k of list) if (t.includes(k)) hits.push(k);
  }
  return hits;
}
