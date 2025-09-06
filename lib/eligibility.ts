import { TrialRow } from "@/types/trials";

export function hintEligibility(trial: TrialRow, profile: {
  age?: number; sex?: "male"|"female"|"other";
  comorbids?: string[]; meds?: string[];
}) {
  const hints:string[] = [];
  const txt = (trial.eligibility || "").toLowerCase();

  if (profile?.age != null) {
    // crude: look for "years" with numbers; flag if e.g. "18 Years to 65 Years"
    const m = txt.match(/(\d+)\s*years?\s*to\s*(\d+)\s*years?/);
    if (m) {
      const min = Number(m[1]), max = Number(m[2]);
      if (profile.age < min) hints.push(`Age < ${min}`);
      if (profile.age > max) hints.push(`Age > ${max}`);
    }
  }
  if (profile?.sex && /female/.test(txt) && profile.sex === "male") hints.push("Sex may be female-only");
  if (profile?.sex && /male/.test(txt) && profile.sex === "female") hints.push("Sex may be male-only");

  if (profile?.comorbids?.length) {
    for (const c of profile.comorbids) {
      if (txt.includes(c.toLowerCase())) hints.push(`Check comorbid: ${c}`);
    }
  }
  return hints.slice(0,3); // keep it light
}
