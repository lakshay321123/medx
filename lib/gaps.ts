export function computeGaps({profile,timeline}:{profile:any;timeline:any[]}):Array<{key:string;prompt:string;saveAs:"profile"|"note"}>{
  const gaps:any[]=[];
  const hasPred = Array.isArray(profile?.conditions_predisposition)&&profile.conditions_predisposition.length>0;
  const meds = new Set<string>();
  for (const it of timeline||[]){
    if (it.kind==="observation" && Array.isArray(it.meta?.meds)) it.meta.meds.forEach((m:string)=>meds.add(m));
  }
  const lastWeight = (timeline||[]).filter(it=>/weight|bmi/i.test(`${it.name} ${JSON.stringify(it.meta||{})}`)).sort((a,b)=>+new Date(b.observed_at)-+new Date(a.observed_at))[0];
  const daysSinceWeight = lastWeight ? (Date.now()-new Date(lastWeight.observed_at).getTime())/86400000 : Infinity;

  if (!hasPred) gaps.push({ key:"predispositions", prompt:"Any family history of chronic disease? (e.g., ‘Mother — breast cancer’)", saveAs:"profile" });
  if (meds.size===0) gaps.push({ key:"meds", prompt:"Are you currently taking any medications? Please share name + dose (e.g., Metformin 500 mg).", saveAs:"profile" });
  if (daysSinceWeight>30) gaps.push({ key:"weight", prompt:"When did you last check your weight? Please share current weight (kg).", saveAs:"profile" });
  return gaps;
}
