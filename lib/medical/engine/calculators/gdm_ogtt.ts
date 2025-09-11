export type GdmProtocol = "IADPSG_75" | "CC_100";
export type GdmInputs = {
  protocol: GdmProtocol;
  fasting_mg_dl: number;
  one_hr_mg_dl?: number;
  two_hr_mg_dl?: number;
  three_hr_mg_dl?: number;
};

export function calc_gdm_ogtt(i: GdmInputs): { abnormal_count:number; diagnostic:boolean; details:string[] } {
  const details:string[] = [];
  let abn = 0;
  if (i.protocol === "IADPSG_75") {
    if (i.fasting_mg_dl >= 92) { abn++; details.push("Fasting ≥92"); }
    if (typeof i.one_hr_mg_dl === "number" && i.one_hr_mg_dl >= 180) { abn++; details.push("1h ≥180"); }
    if (typeof i.two_hr_mg_dl === "number" && i.two_hr_mg_dl >= 153) { abn++; details.push("2h ≥153"); }
    return { abnormal_count: abn, diagnostic: abn >= 1, details };
  } else {
    if (i.fasting_mg_dl >= 95) { abn++; details.push("Fasting ≥95"); }
    if (typeof i.one_hr_mg_dl === "number" && i.one_hr_mg_dl >= 180) { abn++; details.push("1h ≥180"); }
    if (typeof i.two_hr_mg_dl === "number" && i.two_hr_mg_dl >= 155) { abn++; details.push("2h ≥155"); }
    if (typeof i.three_hr_mg_dl === "number" && i.three_hr_mg_dl >= 140) { abn++; details.push("3h ≥140"); }
    return { abnormal_count: abn, diagnostic: abn >= 2, details };
  }
}

const def = {
  id: "gdm_ogtt",
  label: "GDM OGTT Interpreter",
  inputs: [
    { id: "protocol", label: "Protocol", type: "select", options:[{label:"IADPSG (75g)",value:"IADPSG_75"},{label:"Carpenter–Coustan (100g)",value:"CC_100"}] },
    { id: "fasting_mg_dl", label: "Fasting (mg/dL)", type: "number", min: 0 },
    { id: "one_hr_mg_dl", label: "1-hour (mg/dL)", type: "number", min: 0 },
    { id: "two_hr_mg_dl", label: "2-hour (mg/dL)", type: "number", min: 0 },
    { id: "three_hr_mg_dl", label: "3-hour (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: GdmInputs) => {
    const r = calc_gdm_ogtt(args);
    const notes = [r.diagnostic ? "Meets GDM criteria" : "Does not meet GDM criteria", ...r.details];
    return { id: "gdm_ogtt", label: "GDM OGTT", value: r.abnormal_count, unit: "abnormal", precision: 0, notes, extra: r };
  },
};
export default def;
