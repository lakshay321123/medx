export function NextStepsCard({plan}:{plan?:{title:string;steps:string[];nudges:string[]}}){
  if(!plan) return null; const {title,steps=[],nudges=[]}=plan;
  return (<div className="rounded-2xl border p-4 shadow-sm">
    <div className="font-semibold mb-2">{title}</div>
    {steps.length>0 && <ol className="list-decimal ml-5 space-y-1">{steps.map((s,i)=><li key={i}>{s}</li>)}</ol>}
    {nudges.length>0 && <div className="mt-3 text-sm opacity-80"><div className="font-medium mb-1">Nudges</div><ul className="list-disc ml-5 space-y-1">{nudges.map((n,i)=><li key={i}>{n}</li>)}</ul></div>}
  </div>);
}
