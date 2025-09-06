import type { Citation } from "./orchestrator";

export function composeTrialsAnswer(userQuery: string, trials: Citation[], papers: Citation[]) {
  const header = `Here are the most relevant **clinical trials** for: **${userQuery}**`;
  const tableHead = "| Trial (Registry) | Phase | Status | Last Update |\n|---|---|---|---|";
  const rows = trials.slice(0, 8).map(t => {
    const title = sanitize(t.title);
    const id = t.id || "—";
    const phase = (t.extra?.phase || "").replace(/phase\s*/i, "Phase ").trim() || "—";
    const status = t.extra?.status || "—";
    const date = t.date || "—";
    return `| [${title}](${t.url}) (${id}) | ${phase} | ${status} | ${date} |`;
  });

  const trialsBlock = rows.length ? [tableHead, ...rows].join("\n") : "";

  const pubBlock = (papers || [])
    .slice(0, 3)
    .map(p => `- ${sanitize(p.title)} (${p.date || "—"}) — ${p.url}`)
    .join("\n");

  const parts = [header];
  if (trialsBlock) parts.push("", trialsBlock);
  if (pubBlock) parts.push("\n**Related publications:**\n" + pubBlock);

  return parts.join("\n");
}

function sanitize(s?: string){
  return (s || "").replace(/\|/g, "\\|").trim();
}
