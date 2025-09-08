import { useState } from "react";
export type AiDocOut={reply:string;observations?:{short?:string;long?:string};plan?:{title:string;steps:string[];nudges:string[];rulesFired:string[]}};
export function useAiDoc(threadId:string){
  const [loading,setLoading]=useState(false); const [last,setLast]=useState<AiDocOut|null>(null);
  const send=async(message:string)=>{ setLoading(true); try{
    const r=await fetch("/api/ai-doc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({threadId,message})});
    const data:AiDocOut=await r.json(); setLast(data); return data;
  }finally{ setLoading(false); } }; return {loading,last,send};
}
