// lib/medical/engine/calculators/burch_wartofsky.ts
// Burch–Wartofsky Point Scale (simplified common bins).

export interface BWInput {
  temp_c?: number | null;              // Temperature
  cns?: "none"|"mild"|"moderate"|"severe"|"coma" | null;
  gi_hepatic?: "none"|"moderate"|"severe" | null;
  hr_bpm?: number | null;
  heart_failure?: "none"|"mild"|"moderate"|"severe" | null;
  atrial_fibrillation?: boolean | null;
  precipitant_present?: boolean | null;
}

export interface BWOutput { points: number; suggestive: boolean; storm_likely: boolean; components: Record<string, number>; }

function ptsTemp(t:number){ if(t>=41.1)return 30; if(t>=40)return 25; if(t>=39)return 20; if(t>=38.5)return 15; if(t>=38)return 10; if(t>=37.2)return 5; return 0; }
function ptsCNS(x:BWInput["cns"]){ if(x==="coma")return 30; if(x==="severe")return 20; if(x==="moderate")return 10; if(x==="mild")return 10; return 0; }
function ptsGI(x:BWInput["gi_hepatic"]){ if(x==="severe")return 20; if(x==="moderate")return 10; return 0; }
function ptsHR(hr:number){ if(hr>=140)return 25; if(hr>=130)return 20; if(hr>=120)return 15; if(hr>=110)return 10; if(hr>=100)return 5; return 0; }
function ptsHF(x:BWInput["heart_failure"]){ if(x==="severe")return 10; if(x==="moderate")return 10; if(x==="mild")return 5; return 0; }
function ptsAF(b:boolean){ return b?10:0; }
function ptsPrecip(b:boolean){ return b?10:0; }

export function runBurchWartofsky(i: BWInput): BWOutput {
  const comp: Record<string, number> = {};
  comp.temp = (i.temp_c ?? null) !== null ? ptsTemp(i.temp_c as number) : 0;
  comp.cns = ptsCNS(i.cns ?? "none");
  comp.gi = ptsGI(i.gi_hepatic ?? "none");
  comp.hr = (i.hr_bpm ?? null) !== null ? ptsHR(i.hr_bpm as number) : 0;
  comp.hf = ptsHF(i.heart_failure ?? "none");
  comp.af = ptsAF(!!i.atrial_fibrillation);
  comp.precip = ptsPrecip(!!i.precipitant_present);
  const pts = Object.values(comp).reduce((a,b)=>a+b,0);
  return { points: pts, suggestive: pts >= 25, storm_likely: pts >= 45, components: comp };
}
