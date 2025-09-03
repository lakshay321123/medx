export type NearPayload = {
  radiusKm: number;
  specialtyQuery?: string;
};

export function parseNearIntent(text: string): NearPayload | null {
  const q = text.trim();
  if (!/\bnear me\b/i.test(q)) return null;
  const specialty = q.replace(/\bnear me\b/i, "").trim();
  return { radiusKm: 5, specialtyQuery: specialty || undefined };
}

