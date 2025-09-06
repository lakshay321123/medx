import type { Citation } from "./orchestrator";
import { isSelfDisclosure } from "@/lib/research/queryInterpreter";

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

export function composeAnswer(
  userQuery: string,
  trials: any[],
  papers: any[],
  opts: { mode: string },
) {
  const selfDisclosure = isSelfDisclosure(userQuery);

  if (opts.mode === "patient") {
    const intro = selfDisclosure
      ? "I’m sorry to hear about your diagnosis. Here’s clear, simple information you can take to your doctor."
      : "Here’s clear, simple information about this condition and possible trials you may want to discuss with your doctor.";

    const trialsBlock = trials
      .slice(0, 2)
      .map((t) => `- [${t.title}](${t.url}) (Phase ${t.extra?.phase || "?"})`)
      .join("\n");

    return [
      intro,
      trialsBlock ||
        "I couldn’t find active trials right now. You can check [ClinicalTrials.gov](https://clinicaltrials.gov) for the latest.",
      "**Resources:** American Cancer Society, National Cancer Institute",
    ].join("\n\n");
  }

  // Research or Doctor mode → keep full detail
  return composeTrialsAnswer(userQuery, trials, papers);
}

function sanitize(s?: string){
  return (s || "").replace(/\|/g, "\\|").trim();
}
