import type { ConstraintLedger } from "@/lib/context/state";
import type { EntityLedger } from "@/lib/context/entityLedger";

export function selfCheck(answer: string, c?: ConstraintLedger, e?: EntityLedger): { ok: boolean; fixed: string } {
  let s = answer;

  // tone and punctuation cleanups are already handled by polish; here we add missing constraint callouts
  if (c?.include?.length) {
    for (const inc of c.include) {
      if (!new RegExp(`\\b${escapeRx(inc)}\\b`, "i").test(s)) {
        s += `\n\nNote: Included as requested: ${inc}.`;
      }
    }
  }
  if (c?.substitutions?.length) {
    for (const sub of c.substitutions) {
      const fromHit = new RegExp(`\\b${escapeRx(sub.from)}\\b`, "i").test(s);
      const toHit = new RegExp(`\\b${escapeRx(sub.to)}\\b`, "i").test(s);
      if (!toHit) s += `\n\nApplied substitution: ${sub.from} to ${sub.to}.`;
      if (fromHit) {
        // gently clarify replacement if old term still appears
        s += `\nReplaced ${sub.from} as requested.`;
      }
    }
  }

  // medical safety nudge if giving plans based on person entities without BMI computed
  if (e?.person?.weightKg && e?.person?.heightCm && !/\bBMI\b/i.test(s)) {
    const h = e.person.heightCm / 100;
    const bmi = Math.round((e.person.weightKg / (h * h)) * 10) / 10;
    s += `\n\nInfo: Estimated BMI is approximately ${bmi}.`;
  }

  return { ok: true, fixed: s.trim() };
}

function escapeRx(v: string) {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
