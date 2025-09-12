import { register } from "../registry";
register({
  id: "corrected_na_hyperglycemia",
  label: "Corrected Na⁺ (hyperglycemia)",
  tags: ["electrolytes"],
  inputs: [{ key:"Na", required:true }, { key:"glucose_mgdl", required:true }],
  run: ({ Na, glucose_mgdl }) => {
    if (Na == null || glucose_mgdl == null) return null;
    const excess = Math.max(0, glucose_mgdl - 100);
    const per100 = glucose_mgdl > 400 ? 2.4 : 1.6; // piecewise
    const corrected = Na + per100 * (excess / 100);
    const notes = [`coef ${per100}/100 mg/dL`];
    return { id:"corrected_na_hyperglycemia", label:"Corrected Na⁺ (hyperglycemia)", value:+corrected.toFixed(1), unit:"mmol/L", precision:1, notes };
  },
});
