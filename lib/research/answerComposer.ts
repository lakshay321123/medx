import type { Citation } from "./orchestrator";

export function composeTrialsAnswer(q: string, trials: Citation[], papers: Citation[]) {
  const head = "| Trial (NCT) | Phase | Status | Last Update |\n|---|---|---|---|";
  const rows = trials.slice(0, 8).map(t => {
    const nct = t.id || "—";
    const title = sanitize(t.title);
    const phase = (t.extra?.phase || "").replace(/phase\s*/i, "Phase ").trim() || "—";
    const status = t.extra?.status || "—";
    const date = t.date || "—";
    return `| [${title}](${t.url}) (${nct}) | ${phase} | ${status} | ${date} |`;
  });

  const trialsBlock = rows.length ? [head, ...rows].join("\n") : "_No matching trials found._";

  const papersBlock = (papers || [])
    .slice(0, 3)
    .map(p => `- ${sanitize(p.title)} (${p.date || "—"}) — ${p.url}`)
    .join("\n");

  return [
    `Here are the most relevant clinical trials for **${q}**:`,
    "",
    trialsBlock,
    papersBlock ? "\nKey related publications:\n" + papersBlock : "",
  ].join("\n");
}

function sanitize(s?: string) {
  return (s || "").replace(/\|/g, "\\|").trim();
}
