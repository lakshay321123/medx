import { TrialRow } from "@/types/trials";

export const patientTrialsPrompt = (rows: TrialRow[], condition: string) => `
You are a friendly medical explainer for a layperson.
Summarize up to 5 clinical trials for "${condition}".
For each trial: Name (plain), Phase, Status, Where (city,country), What they are testing, Who might join (plain).
Avoid jargon, keep bullets short, include NCT ID in parentheses.
End with: "This is informational only, not medical advice."
Data: ${JSON.stringify(rows.slice(0,5))}
`;

export const clinicianTrialsPrompt = (rows: TrialRow[], condition: string) => `
Audience: clinician.
Provide a concise evidence snapshot for "${condition}" using the trials below.
For each: NCT ID, Phase, design keywords (e.g., randomized/controlled), primary outcome, status, notable inclusion/exclusion, location, sponsor.
Keep to crisp bullets; no fluff.
Data: ${JSON.stringify(rows.slice(0,10))}
`;

export const singleTrialPatientPrompt = (t: any) => `
You are a friendly explainer for laypeople. Summarize this single clinical trial in plain English:
- What is it about (condition, intervention)?
- Where & status & phase.
- Who might be eligible (plain summary of criteria).
- Primary outcome & important dates if available.
Keep it short (6–10 bullets), avoid jargon, include the NCT ID in the first line.
End with: "This is informational only, not medical advice."
Data: ${JSON.stringify(t)}
`;

export const singleTrialClinicianPrompt = (t: any) => `
Audience: clinician.
Provide a concise evidence snapshot:
- NCT ID, phase, design keywords (randomized? blinded?), status.
- Population (key inclusion/exclusion), intervention(s)/comparator(s).
- Primary endpoint(s), notable secondary endpoints if any.
- Sites/region & sponsor, start/primary completion/completion if known.
Keep to crisp bullets; no fluff.
Data: ${JSON.stringify(t)}
`;
