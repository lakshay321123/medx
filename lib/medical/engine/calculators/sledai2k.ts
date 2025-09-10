import { register } from "../registry";

/**
 * SLEDAI-2K: sum of weighted items present within last 10 days.
 * Items (weights): seizures(8), psychosis(8), organic_brain(8), visual_disturb(8),
 * cranial_nerve(8), lupus_headache(8), cva(8), vasculitis(8),
 * arthritis(4), myositis(4), urinary_casts(4), hematuria(4),
 * proteinuria>0.5g/d(4), pyuria(4),
 * rash(2), alopecia(2), mucosal_ulcers(2), pleurisy(2), pericarditis(2),
 * low_complement(2), increased_anti_dsDNA(2),
 * fever(1), thrombocytopenia(1), leukopenia(1)
 */
export function computeSLEDAI(params: {
  seizures?: boolean; psychosis?: boolean; organic_brain?: boolean; visual_disturb?: boolean;
  cranial_nerve?: boolean; lupus_headache?: boolean; cva?: boolean; vasculitis?: boolean;
  arthritis?: boolean; myositis?: boolean; urinary_casts?: boolean; hematuria?: boolean;
  proteinuria_g_day?: number | null; pyuria?: boolean;
  rash?: boolean; alopecia?: boolean; mucosal_ulcers?: boolean; pleurisy?: boolean; pericarditis?: boolean;
  low_complement?: boolean; increased_anti_dsDNA?: boolean;
  fever?: boolean; thrombocytopenia?: boolean; leukopenia?: boolean;
}) {
  const w = (b: boolean | undefined, val: number) => (b ? val : 0);
  let score = 0;

  score += w(params.seizures, 8);
  score += w(params.psychosis, 8);
  score += w(params.organic_brain, 8);
  score += w(params.visual_disturb, 8);
  score += w(params.cranial_nerve, 8);
  score += w(params.lupus_headache, 8);
  score += w(params.cva, 8);
  score += w(params.vasculitis, 8);

  score += w(params.arthritis, 4);
  score += w(params.myositis, 4);
  score += w(params.urinary_casts, 4);
  score += w(params.hematuria, 4);
  if (params.proteinuria_g_day != null && params.proteinuria_g_day > 0.5) score += 4;
  score += w(params.pyuria, 4);

  score += w(params.rash, 2);
  score += w(params.alopecia, 2);
  score += w(params.mucosal_ulcers, 2);
  score += w(params.pleurisy, 2);
  score += w(params.pericarditis, 2);
  score += w(params.low_complement, 2);
  score += w(params.increased_anti_dsDNA, 2);

  score += w(params.fever, 1);
  score += w(params.thrombocytopenia, 1);
  score += w(params.leukopenia, 1);

  let band = "mild";
  if (score >= 20) band = "very_high_activity";
  else if (score >= 10) band = "high_activity";
  else if (score >= 6) band = "moderate_activity";

  return { score, activity_band: band };
}

register({
  id: "sledai2k",
  label: "SLEDAI-2K",
  inputs: [
    { key: "seizures" }, { key: "psychosis" }, { key: "organic_brain" }, { key: "visual_disturb" },
    { key: "cranial_nerve" }, { key: "lupus_headache" }, { key: "cva" }, { key: "vasculitis" },
    { key: "arthritis" }, { key: "myositis" }, { key: "urinary_casts" }, { key: "hematuria" },
    { key: "proteinuria_g_day" }, { key: "pyuria" },
    { key: "rash" }, { key: "alopecia" }, { key: "mucosal_ulcers" }, { key: "pleurisy" }, { key: "pericarditis" },
    { key: "low_complement" }, { key: "increased_anti_dsDNA" },
    { key: "fever" }, { key: "thrombocytopenia" }, { key: "leukopenia" },
  ],
  run: computeSLEDAI,
});
