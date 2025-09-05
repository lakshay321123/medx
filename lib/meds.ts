const DIC = { metformin:["metformin","glycomet"], atorvastatin:["atorvastatin","lipitor"] } as Record<string,string[]>;
const flat = Object.entries(DIC).flatMap(([g,arr])=>arr.map(a=>({alias:a,g})));
export type ExtractedMed = { raw: string; norm?: string; doseMg?: number; confidence: number };
export function extractMeds(t:string):ExtractedMed[]{
  const out:ExtractedMed[]=[]; const rx=/([A-Za-z][A-Za-z\-]+)\s+(\d{1,4})\s?(mg|mcg|ml)\b/gi; let m;
  while((m=rx.exec(t))){ const raw=`${m[1]} ${m[2]} ${m[3]}`; 
    const alias=flat.find(x=>x.alias.toLowerCase()===m[1].toLowerCase());
    out.push({ raw, norm: alias?.g || m[1], doseMg: m[3].toLowerCase()==="mg"?+m[2]:undefined, confidence: alias?0.9:0.6 });
  }
  if (!out.length){
    const name=(t.match(/\b([A-Za-z][A-Za-z\-]{3,})\b/ )||[])[1];
    if (name) out.push({ raw:name, confidence:0.3 });
  }
  return out;
}
