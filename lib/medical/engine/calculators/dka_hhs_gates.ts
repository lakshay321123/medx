export interface DKAInputs {
  potassium_mEq_L: number;
  pH?: number;
}

export function insulinAndPotassiumGate(i: DKAInputs) {
  const K = i.potassium_mEq_L;
  let insulin: "hold" | "start_0_1u_kg_h" = "start_0_1u_kg_h";
  let potassiumPlan: string = "Add 20–30 mEq KCl per L if 3.3–5.3; monitor hourly.";
  if (K < 3.3) { insulin = "hold"; potassiumPlan = "Hold insulin; replete K⁺ until >3.3 mEq/L."; }
  if (K > 5.3) { insulin = "start_0_1u_kg_h"; potassiumPlan = "Start insulin; no K⁺ yet—monitor and add when K⁺ ≤5.3."; }
  const bicarb = (i.pH !== undefined && i.pH < 6.9) ? "Consider bicarbonate in severe acidemia (<6.9) with close monitoring." : "Bicarbonate not routinely indicated.";
  return { insulin, potassiumPlan, bicarbonateNote: bicarb };
}
