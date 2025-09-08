export function stripFences(s: string) {
  if (!s) return s;
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return m ? m[1] : s;
}
export function safeParseJson<T=any>(raw:any):{ok:true;data:T}|{ok:false;error:string}{
  try{
    if(typeof raw!=="string")return{ok:true,data:raw as T};
    const s0=raw.trim(); if(!s0) return{ok:false,error:"empty"};
    try{return{ok:true,data:JSON.parse(s0) as T}}catch{}
    const s1=stripFences(s0).trim();
    try{return{ok:true,data:JSON.parse(s1) as T}}catch{}
    for(let i=s1.length-1;i>=0;i--){ if(s1[i]==="}"){ const c=s1.slice(0,i+1); try{return{ok:true,data:JSON.parse(c) as T}}catch{} }}
    return{ok:false,error:"parse-failed"};
  }catch(e:any){ return{ok:false,error:String(e?.message||e)} }
}
export function withDefaults<T extends object>(obj:any, defaults:T):T {
  return { ...(defaults as any), ...(obj||{}) } as T;
}
