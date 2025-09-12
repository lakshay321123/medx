export type DoctorSBAR = {
  acuity?: string;
  abnormalities?: string[];
  impression?: string;
  immediate_steps?: string[];
  summary?: string;             // MDM (concise)
  recommended_tests?: string[];
  disposition?: string;
};

function clipWords(s: string, n: number) {
  const w = (s || "").trim().split(/\s+/);
  return w.length <= n ? s || "" : w.slice(0, n).join(" ");
}
function joinClip(items: string[] = [], maxItems: number, maxWords: number) {
  return items.filter(Boolean).slice(0, maxItems).map(x => clipWords(x, maxWords)).join(", ");
}

export function formatDoctorSBAR(
  data: DoctorSBAR,
  opts: { maxWordsPerLine?: number; maxItems?: number; mdmMaxLines?: number } = {}
) {
  const maxWords = Number(process.env.CLINICIAN_MAX_WORDS_PER_LINE || 12) || 12;
  const maxItems = opts.maxItems ?? 5;
  const mdmMax = Number(process.env.MDM_MAX_LINES || 3) || 3;

  const lines: string[] = [];
  lines.push(`Acuity: ${clipWords(data.acuity || "", maxWords)}`);
  lines.push(`Key abnormalities: ${joinClip(data.abnormalities || [], maxItems, maxWords)}`);
  lines.push(`Impression: ${clipWords(data.impression || "", maxWords)}`);
  lines.push(`Immediate steps: ${joinClip(data.immediate_steps || [], maxItems, maxWords)}`);

  const mdm = (data.summary || "").split(/\n+/).filter(Boolean).slice(0, mdmMax);
  for (const m of mdm.length ? mdm : [""]) {
    lines.push(`MDM (concise): ${clipWords(m, maxWords)}`);
  }

  lines.push(`Recommended tests: ${joinClip(data.recommended_tests || [], maxItems, maxWords)}`);
  lines.push(`Disposition: ${clipWords(data.disposition || "", maxWords)}`);

  const maxLines = Number(process.env.CLINICIAN_MAX_LINES || 12) || 12;
  return lines.slice(0, maxLines).join("\n");
}
