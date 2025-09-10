import { describe, it, expect } from "vitest";
import { formatRecommendation } from "../lib/rec/format";

describe("meds summary", () => {
  it("formats OTC med with neutral legal", () => {
    const out = formatRecommendation({
      name: "Paracetamol",
      is_otc: true,
      requires_prescription: false,
      active_ingredients: [{ name: "Paracetamol", strength: 500, unit: "mg" }],
      indications: ["Fever"],
      adult_dose: "500 mg q6–8h; max 3 g/day",
      pediatric_dose: "10–15 mg/kg q6–8h",
      common_side_effects: ["Nausea"],
      serious_side_effects: ["Liver injury"],
      contraindications: ["Severe liver disease"],
      interactions: ["Alcohol"],
      pregnancy_safety: "Generally safe",
      lactation_safety: "Compatible",
      brands: ["Dolo 650"],
      references: []
    });
    expect(out.title).toContain("Paracetamol");
    expect(out.legal.toLowerCase()).toContain("general information");
  });
});
