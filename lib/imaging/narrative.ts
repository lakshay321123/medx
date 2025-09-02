export function band(p: number) {
  if (p >= 0.85) return { band: "high", text: "High" };
  if (p >= 0.60) return { band: "moderate", text: "Moderate" };
  if (p >= 0.40) return { band: "borderline", text: "Borderline" };
  return { band: "low", text: "Low" };
}

export function boneSignals(preds: {label:string;score:number}[]) {
  const m = Object.fromEntries(preds.map(p => [p.label.toLowerCase(), p.score]));
  const frac = m["fracture"] ?? m["fractured"] ?? 0;
  const normal = m["normal"] ?? (1 - frac);
  return { frac, normal };
}

export function mapRegion(str: string) {
  const s = (str || "").toLowerCase();
  if (/tibia|fibula|leg/.test(s)) return "lower leg";
  if (/wrist/.test(s)) return "wrist";
  if (/hand/.test(s)) return "hand";
  if (/knee/.test(s)) return "knee";
  if (/elbow/.test(s)) return "elbow";
  if (/shoulder/.test(s)) return "shoulder";
  if (/chest|lung|thorax/.test(s)) return "chest";
  return "bone";
}

export function humanTemplate(family: "bone"|"chest", preds: {label:string;score:number}[], hintOrName: string) {
  const site = mapRegion(hintOrName);
  if (family === "bone") {
    const { frac } = boneSignals(preds);
    const b = band(frac);
    if (b.band === "high") return {
      patientSummary: `The ${site} X-ray strongly suggests a fracture.`,
      clinicianNote: `• Binary classifier fracture ≈${Math.round(frac*100)}% (${b.text} confidence)\n• Consider immobilization and orthopaedic review`
    };
    if (b.band === "moderate") return {
      patientSummary: `The ${site} X-ray may show a fracture.`,
      clinicianNote: `• Suspicious for fracture ≈${Math.round(frac*100)}%\n• Consider additional views based on exam`
    };
    if (b.band === "borderline") return {
      patientSummary: `The ${site} X-ray is inconclusive for a fracture.`,
      clinicianNote: `• Equivocal probability ≈${Math.round(frac*100)}%\n• Correlate clinically / repeat imaging if needed`
    };
    const top = preds[0];
    return {
      patientSummary: `No obvious fracture is seen in the ${site} X-ray.`,
      clinicianNote: `• Model favors no fracture (top: ${top.label} ${Math.round(top.score*100)}%)`
    };
  }

  // chest: list top labels ≥ 15%
  const strong = preds.filter(p => p.score >= 0.15).slice(0,5);
  if (!strong.length) return {
    patientSummary: "No strong abnormality seen on the chest X-ray by the AI model.",
    clinicianNote: "• No label ≥15%. Consider clinical context."
  };
  const list = strong.map(p => `${p.label} ${Math.round(p.score*100)}%`).join(", ");
  return {
    patientSummary: `The chest X-ray AI highlights: ${list}.`,
    clinicianNote: `• Top labels (≥15%): ${list}\n• Correlate clinically`
  };
}

export async function llmPolish(base: {patientSummary:string; clinicianNote:string}, ctx: {
  family: "bone"|"chest", region: string, model: string, preds: {label:string;score:number}[]
}) {
  if (!process.env.LLM_BASE_URL || !process.env.LLM_API_KEY) return null;
  const predLines = ctx.preds.slice(0,5).map(p=>`• ${p.label}: ${p.score.toFixed(2)}`).join("\n");
  const prompt = `Context:
- Modality: X-ray
- Family: ${ctx.family}
- Region: ${ctx.region}
- Model: ${ctx.model}

Model outputs (top 5):
${predLines}

Draft:
Patient: ${base.patientSummary}
Clinician:
${base.clinicianNote}

Rewrite both sections concisely (2–3 sentences for patient; 2–3 short bullets for clinician). Keep probabilities; avoid overreach.`;

  const r = await fetch(process.env.LLM_BASE_URL!, {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.LLM_API_KEY!}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.LLM_MODEL_ID || "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a clinical reporting assistant. Be concise, safe, factual." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 220
    })
  });
  const j = await r.json();
  const text = j?.choices?.[0]?.message?.content || "";
  if (!text) return null;
  const parts = text.split(/\n{2,}/);
  return {
    patientSummary: parts[0]?.trim() || base.patientSummary,
    clinicianNote: (parts[1] || base.clinicianNote).trim()
  };
}
