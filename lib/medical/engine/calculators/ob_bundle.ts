import { register } from "../registry";

// Bishop score components (each 0-3); total 0-13
export type BishopInputs = { Dilation_cm: number, Effacement_pct: number, Station: number, Consistency: "firm"|"medium"|"soft", Position: "posterior"|"mid"|"anterior" };
export function runBishop(i: BishopInputs) {
  if (!i) return null;
  const dil = i.Dilation_cm>=5?3: i.Dilation_cm>=3?2: i.Dilation_cm>=1?1:0;
  const eff = i.Effacement_pct>=80?3: i.Effacement_pct>=60?2: i.Effacement_pct>=40?1:0;
  const st  = i.Station>=+1?3: i.Station==0?2: i.Station==-1?1:0;
  const cons = i.Consistency==="soft"?2: i.Consistency==="medium"?1:0;
  const pos  = i.Position==="anterior"?2: i.Position==="mid"?1:0;
  const score = dil+eff+st+cons+pos;
  return { score };
}

// APGAR at 1/5 minutes: each component 0-2
export type APGARInputs = { HR:0|1|2, Resp:0|1|2, Tone:0|1|2, Reflex:0|1|2, Color:0|1|2 };
export function runAPGAR(a: APGARInputs) {
  if (!a) return null;
  const score = a.HR + a.Resp + a.Tone + a.Reflex + a.Color;
  return { score };
}

// HELLP simplified flags
export type HELLPInputs = { Platelets_k: number, AST: number, ALT: number, LDH: number };
export function runHELLP({Platelets_k, AST, ALT, LDH}: HELLPInputs) {
  if ([Platelets_k,AST,ALT,LDH].some(v => v==null || !isFinite(v as number))) return null;
  const lowPlt = Platelets_k < 100;
  const hemolysis = LDH >= 600; // commonly used threshold; verify per lab
  const elevatedLFT = (AST>=70 || ALT>=70);
  const hellp = lowPlt && hemolysis && elevatedLFT;
  return { lowPlt, hemolysis, elevatedLFT, hellp };
}

register({ id:"bishop_score", label:"Bishop Score", inputs:[{key:"Dilation_cm",required:true},{key:"Effacement_pct",required:true},{key:"Station",required:true},{key:"Consistency",required:true},{key:"Position",required:true}], run: runBishop as any });
register({ id:"apgar_score", label:"APGAR Score", inputs:[{key:"HR",required:true},{key:"Resp",required:true},{key:"Tone",required:true},{key:"Reflex",required:true},{key:"Color",required:true}], run: runAPGAR as any });
register({ id:"hellp_flags", label:"HELLP (flags)", inputs:[{key:"Platelets_k",required:true},{key:"AST",required:true},{key:"ALT",required:true},{key:"LDH",required:true}], run: runHELLP as any });
