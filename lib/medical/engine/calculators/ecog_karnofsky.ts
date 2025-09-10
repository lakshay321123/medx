// lib/medical/engine/calculators/ecog_karnofsky.ts
export interface ECOGFromKPSInput { karnofsky?: number | null; }
export interface ECOGFromKPSOutput { ecog: 0|1|2|3|4|5; description: string; }

export function runECOGFromKarnofsky(i: ECOGFromKPSInput): ECOGFromKPSOutput {
  const k = i.karnofsky ?? 100;
  let ecog: ECOGFromKPSOutput["ecog"] = 0;
  if (k >= 90) ecog = 0;
  else if (k >= 70) ecog = 1;
  else if (k >= 50) ecog = 2;
  else if (k >= 30) ecog = 3;
  else if (k >= 10) ecog = 4;
  else ecog = 5;
  const desc = ["Fully active","Restricted in strenuous activity","Ambulatory, unable to work","Limited self-care","Bedbound >50%","Dead"][ecog];
  return { ecog, description: desc };
}
