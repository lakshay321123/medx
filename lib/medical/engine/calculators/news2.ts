import { register } from "../registry";

// National Early Warning Score 2 (NEWS2) — Scale 1 (default).
// Requirements: complete vitals + O₂ flag; otherwise do not emit.
register({
  id: "news2",
  label: "NEWS2",
  tags: ["vitals", "risk"],
  inputs: [
    { key: "RR", required: true },
    { key: "spo2_percent", required: true },
    { key: "on_o2", required: true },      // normalized in extract.ts
    { key: "temp_c", required: true },
    { key: "SBP", required: true },
    { key: "HR", required: true },
    { key: "consciousness", required: true }, // "A","V","P","U" or similar
    { key: "GCS" },                           // optional; <15 → not Alert
  ],
  run: ({ RR, spo2_percent, on_o2, temp_c, SBP, HR, consciousness, GCS }) => {
    // helpers
    const add = (x: number) => (isFinite(x) ? x : 0);
    const notes: string[] = [];

    // RR
    const rrScore =
      RR <= 8 ? 3 :
      RR <= 11 ? 1 :
      RR <= 20 ? 0 :
      RR <= 24 ? 2 : 3;

    // SpO2 (Scale 1)
    const s = Number(spo2_percent);
    const spo2Score =
      s <= 91 ? 3 :
      s <= 93 ? 2 :
      s <= 95 ? 1 : 0;

    // +2 if on supplemental oxygen
    const o2Score = on_o2 ? 2 : 0;

    // Temp °C
    const t = Number(temp_c);
    const tempScore =
      t <= 35.0 ? 3 :
      t <= 36.0 ? 1 :
      t <= 38.0 ? 0 :
      t <= 39.0 ? 1 : 2;

    // SBP
    const sbp = Number(SBP);
    const sbpScore =
      sbp <= 90 ? 3 :
      sbp <= 100 ? 2 :
      sbp <= 110 ? 1 :
      sbp <= 219 ? 0 : 3;

    // HR
    const hr = Number(HR);
    const hrScore =
      hr <= 40 ? 3 :
      hr <= 50 ? 1 :
      hr <= 90 ? 0 :
      hr <= 110 ? 1 :
      hr <= 130 ? 2 : 3;

    // Consciousness: Alert = 0; any V/P/U (or GCS<15) = 3
    const cRaw = String(consciousness || "").trim().toUpperCase();
    const alert = cRaw === "A" || cRaw === "ALERT" || (typeof GCS === "number" && GCS >= 15);
    const cnsScore = alert ? 0 : 3;

    const value =
      add(rrScore) + add(spo2Score) + add(o2Score) + add(tempScore) +
      add(sbpScore) + add(hrScore) + add(cnsScore);

    // Risk band (+ single-3 flag)
    const singleThrees = [rrScore, spo2Score, tempScore, sbpScore, hrScore, cnsScore].filter(v => v === 3).length;
    const band =
      value >= 7 || singleThrees >= 2 ? "high" :
      value >= 5 ? "medium" :
      value >= 1 ? "low" : "zero";
    notes.push(`risk: ${band}${on_o2 ? " (on O₂)" : ""}`);
    if (singleThrees >= 1) notes.push(`single-parameter 3s: ${singleThrees}`);

    return { id: "news2", label: "NEWS2", value, precision: 0, notes };
  },
});
