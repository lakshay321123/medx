import { llmCall } from '@/lib/llm/call';

export type ImagingResult = {
  family: 'bone' | 'chest';
  region?: string;
  model: string;
  predictions: { label: string; score: number }[];
  hint?: string;
  fileName?: string;
};

export function band(p: number) {
  if (p >= 0.85) return { band: 'high', text: 'High' } as const;
  if (p >= 0.60) return { band: 'moderate', text: 'Moderate' } as const;
  if (p >= 0.40) return { band: 'borderline', text: 'Borderline' } as const;
  return { band: 'low', text: 'Low' } as const;
}

export function boneSignals(preds: { label: string; score: number }[]) {
  const map = Object.fromEntries(preds.map((p) => [p.label.toLowerCase(), p.score]));
  const frac = (map['fracture'] ?? map['fractured']) ?? 0;
  const normal = map['normal'] ?? (1 - frac);
  return { frac, normal, top: preds[0] };
}

export function humanTemplate(input: ImagingResult) {
  const { family, predictions, hint } = input;
  const top = [...predictions].sort((a, b) => b.score - a.score)[0];

  if (family === 'bone') {
    const { frac } = boneSignals(predictions);
    const b = band(frac);
    const site = (hint || 'bone').toLowerCase();

    if (b.band === 'high') {
      return {
        patient: `The ${site} X-ray strongly suggests a fracture.`,
        clinician: `Binary classifier indicates fracture with ${Math.round(frac * 100)}% probability. Recommend immobilization and orthopaedic assessment as clinically indicated.`,
      };
    }
    if (b.band === 'moderate') {
      return {
        patient: `The ${site} X-ray may show a fracture.`,
        clinician: `Suspicious for fracture (≈${Math.round(frac * 100)}%). Consider additional views/CT based on exam.`,
      };
    }
    if (b.band === 'borderline') {
      return {
        patient: `The ${site} X-ray is inconclusive for a fracture.`,
        clinician: `Equivocal probability (≈${Math.round(frac * 100)}%). Correlate with focal tenderness; repeat imaging if needed.`,
      };
    }
    return {
      patient: `No obvious fracture is seen in the ${site} X-ray.`,
      clinician: `Model favors no fracture (top: ${top.label} ${Math.round(top.score * 100)}%).`,
    };
  }

  // chest
  const strong = predictions.filter((p) => p.score >= 0.15).slice(0, 5);
  if (!strong.length) {
    return {
      patient: 'No strong abnormality seen on the chest X-ray by the AI model.',
      clinician: 'No label ≥15%. Consider clinical context.',
    };
  }
  const list = strong.map((p) => `${p.label} ${Math.round(p.score * 100)}%`).join(', ');
  return {
    patient: `The chest X-ray AI highlights: ${list}.`,
    clinician: `Top chest labels (≥15%): ${list}. Correlate clinically.`,
  };
}

export async function llmPolish(gist: ReturnType<typeof humanTemplate>, ctx: ImagingResult) {
  const pred_lines = ctx.predictions
    .slice(0, 5)
    .map((p) => `• ${p.label}: ${p.score.toFixed(2)}`)
    .join('\\n');
  const primary_stmt = gist.clinician.split('.')[0] + '.';
  const conf = ctx.family === 'bone' ? band(boneSignals(ctx.predictions).frac).text : 'Model-dependent';

  const prompt = `Context:\\n- Modality: X-ray\\n- Family: ${ctx.family}\\n- Region/Hint: ${ctx.hint || ''}\\n- Model: ${ctx.model}\\n\\nModel outputs (top 5):\\n${pred_lines}\\n\\nRules-derived gist:\\n- Primary statement: ${primary_stmt}\\n- Confidence: ${conf}\\n- Safety: Always include a one-line disclaimer.\\n\\nWrite TWO short sections:\\n1) Patient-friendly summary (2–3 sentences, plain language).\\n2) Clinician note (2–3 bullet points; include probabilities and next steps).\\n\\nDo NOT mention training datasets or internal thresholds.`;

  try {
    const msg = await llmCall(
      [
        { role: 'system', content: 'You are a clinical reporting assistant. Draft concise imaging impressions.\\nNo diagnosis guarantees. Avoid overreach. Never contradict the model signals.' },
        { role: 'user', content: prompt },
      ],
      { tier: 'balanced', fallbackTier: 'smart', temperature: 0.2, max_tokens: 220 }
    );
    const text: string | undefined = msg?.content?.trim();
    if (text) {
      const [patientSummary, clinicianNote] = text.split(/\\n\\s*\\n/);
      if (patientSummary && clinicianNote) {
        return { patientSummary: patientSummary.trim(), clinicianNote: clinicianNote.trim() };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function composeImagingReport(imaging: ImagingResult) {
  const base = humanTemplate(imaging);
  const llm = await llmPolish(base, imaging).catch(() => null);

  return {
    ok: true,
    documentType: 'Imaging Report',
    modality: 'X-ray',
    family: imaging.family,
    region: imaging.region || imaging.hint || 'unspecified',
    model: imaging.model,
    predictions: imaging.predictions,
    interpretation: llm
      ? llm
      : {
          patientSummary: base.patient,
          clinicianNote: `• ${base.clinician}`,
        },
    disclaimer: 'AI assistance only — not a medical diagnosis. Confirm with a clinician.',
  };
}
