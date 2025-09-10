// lib/medical/engine/calculators/bishop.ts
export interface BishopInput {
  dilation_cm?: number | null; // 0-10
  effacement_pct?: number | null; // 0-100
  station?: number | null; // -3 to +3
  consistency?: "firm"|"medium"|"soft"|null;
  position?: "posterior"|"mid"|"anterior"|null;
}
export interface BishopOutput { points: number; components: Record<string, number>; favorability: "unfavorable"|"favorable"; }

export function runBishop(i: BishopInput): BishopOutput {
  const comp: Record<string, number> = {};
  const d = i.dilation_cm ?? 0;
  comp.dilation = d >= 5 ? 3 : d >= 3 ? 2 : d >= 1 ? 1 : 0;
  const e = i.effacement_pct ?? 0;
  comp.effacement = e >= 80 ? 3 : e >= 60 ? 2 : e >= 40 ? 1 : 0;
  const s = i.station ?? -3;
  comp.station = s >= 1 ? 3 : s === 0 ? 2 : s === -1 ? 1 : 0;
  comp.consistency = i.consistency === "soft" ? 2 : i.consistency === "medium" ? 1 : 0;
  comp.position = i.position === "anterior" ? 2 : i.position === "mid" ? 1 : 0;
  const pts = Object.values(comp).reduce((a,b)=>a+b,0);
  return { points: pts, components: comp, favorability: pts >= 8 ? "favorable" : "unfavorable" };
}
