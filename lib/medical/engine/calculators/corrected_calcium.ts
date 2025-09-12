import { register } from "../registry";
register({
  id: "corrected_calcium",
  label: "Corrected Ca²⁺",
  tags: ["electrolytes"],
  inputs: [{ key:"calcium_mgdl", required:true }, { key:"albumin", required:true }],
  run: ({ calcium_mgdl, albumin }) => {
    if (calcium_mgdl == null || albumin == null) return null;
    const corr = calcium_mgdl + 0.8 * (4 - albumin);
    return { id:"corrected_calcium", label:"Corrected Ca²⁺", value:+corr.toFixed(2), unit:"mg/dL", precision:2 };
  },
});
