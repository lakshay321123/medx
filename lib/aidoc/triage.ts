export const RED_FLAGS_MAP: Record<string, string[]> = {
  back_pain: [
    "severe weakness in legs",
    "loss of bladder or bowel control",
    "numbness in groin/saddle area",
    "fever with back pain",
    "recent significant trauma",
  ],
  chest_pain: [
    "pressure in chest",
    "pain to arm/jaw",
    "shortness of breath",
  ],
  neuro: [
    "slurred speech",
    "one-sided weakness",
    "sudden severe headache",
  ],
  sepsis: [
    "fever with confusion",
    "very fast heartbeat with fever",
  ],
};

export function detectRedFlags(symptomKey: string, userText: string): string[] {
  const t = userText.toLowerCase();
  const keys = RED_FLAGS_MAP[symptomKey] || [];
  return keys.filter(k => t.includes(k));
}
