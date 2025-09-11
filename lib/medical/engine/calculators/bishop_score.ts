// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type BishopInputs = {
  dilation_cm: number;
  effacement_percent: number;
  station: -3|-2|-1|0|1|2;
  consistency: "firm"|"medium"|"soft";
  position: "posterior"|"mid"|"anterior";
};

function score_dilation(cm: number): number {
  if (cm >= 5) return 3;
  if (cm >= 3) return 2;
  if (cm >= 1) return 1;
  return 0;
}
function score_effacement(pct: number): number {
  if (pct >= 80) return 3;
  if (pct >= 60) return 2;
  if (pct >= 40) return 1;
  return 0;
}
function score_station(st: number): number {
  if (st >= 1) return 3;
  if (st >= -0) return 2; // -1 to 0
  if (st >= -2) return 1; // -2
  return 0; // -3
}
function score_consistency(c: string): number { return c === "soft" ? 2 : c === "medium" ? 1 : 0; }
function score_position(p: string): number { return p === "anterior" ? 2 : p === "mid" ? 1 : 0; }

export function calc_bishop_score(i: BishopInputs): number {
  return score_dilation(i.dilation_cm) + score_effacement(i.effacement_percent) + score_station(i.station) + score_consistency(i.consistency) + score_position(i.position);
}

const def = {
  id: "bishop_score",
  label: "Bishop Score (induction readiness)",
  inputs: [
    { id: "dilation_cm", label: "Cervical dilation (cm)", type: "number", min: 0, max: 10 },
    { id: "effacement_percent", label: "Effacement (%)", type: "number", min: 0, max: 100 },
    { id: "station", label: "Fetal station", type: "select", options: [
      {label:"-3", value:-3},{label:"-2", value:-2},{label:"-1", value:-1},{label:"0", value:0},{label:"+1", value:1},{label:"+2", value:2}
    ]},
    { id: "consistency", label: "Cervical consistency", type: "select", options: [
      {label:"Firm", value:"firm"},{label:"Medium", value:"medium"},{label:"Soft", value:"soft"}
    ]},
    { id: "position", label: "Cervical position", type: "select", options: [
      {label:"Posterior", value:"posterior"},{label:"Mid", value:"mid"},{label:"Anterior", value:"anterior"}
    ]}
  ],
  run: (args: BishopInputs) => {
    const v = calc_bishop_score(args);
    return { id: "bishop_score", label: "Bishop Score", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
