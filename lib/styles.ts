// lib/styles.ts

/**
 * Short web-research brief used across the app.
 * Keep output minimal and structured for rendering.
 */
export const RESEARCH_BRIEF_STYLE = `
Be crisp.
- One-line TL;DR (<= 20 words).
- Up to 3 bullets (<= 18 words each).
- Use concrete numbers/dates when known.
- Cite provided sources as [1], [2], etc.
Return JSON exactly: {"tldr":"","bullets":[],"citations":[{"title":"","url":""}]}
`;

/**
 * Clinical-mode trial brief for clinicians.
 * Adds a "details" object for downstream rendering in Clinical mode.
 */
export const RESEARCH_TRIAL_BRIEF_STYLE = `
You are a concise medical research assistant. Summarize clinical trial records for clinicians in plain, factual language.
- One-line TL;DR (<= 20 words).
- Up to 3 bullets (<= 18 words each) with concrete numbers/dates.
- Prefer exact measures (phases, enrollment, outcomes) when available.
- Cite the ClinicalTrials.gov record as [1].
Return JSON exactly:
{
  "tldr": "",
  "bullets": [],
  "details": {
    "design": "",
    "population": "",
    "interventions": "",
    "primary_outcomes": "",
    "key_eligibility": ""
  },
  "citations": [{"title": "", "url": ""}]
}
`;
