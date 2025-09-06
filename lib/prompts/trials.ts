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
