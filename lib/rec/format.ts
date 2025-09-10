export function formatRecommendation(med: any) {
  const badges: string[] = [];
  if (med.is_otc) badges.push("OTC");
  if (med.requires_prescription) badges.push("Rx only");
  const s = (x?: string[] | string) =>
    Array.isArray(x) ? x.join(", ") : (x || "");
  const legal = med.requires_prescription
    ? "This medicine requires a valid prescription in your region. General information only."
    : "OTC guidance. General information only.";
  return {
    title: `${med.name}${badges.length ? ` • ${badges.join(" · ")}` : ""}`,
    summary: {
      Actives: s(med.active_ingredients?.map((a: any) => `${a.name} ${a.strength}${a.unit}`)),
      Uses: s(med.indications),
      AdultDose: med.adult_dose || "",
      PediatricDose: med.pediatric_dose || "",
      SideEffects: s(med.common_side_effects),
      Serious: s(med.serious_side_effects),
      Contraindications: s(med.contraindications),
      Interactions: s(med.interactions),
      Pregnancy: med.pregnancy_safety || "",
      Lactation: med.lactation_safety || "",
      Brands: s(med.brands)
    },
    legal,
    references: med.references || []
  };
}
