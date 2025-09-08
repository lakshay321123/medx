import { safeParseJson, withDefaults } from "@/lib/utils/safeJson";
import OpenAI from "openai";

const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, timeout: Number(process.env.AIDOC_MODEL_TIMEOUT_MS||25000), maxRetries: 0 });

type CallIn = { system:string; user:string; instruction:string };
export async function callOpenAIJson({ system, user, instruction }: CallIn): Promise<any> {
  const model = process.env.AIDOC_MODEL || "gpt-5";
  const SOFT = Number(process.env.AIDOC_SOFT_TIMEOUT_MS||18000);
  const RETRIES = Number(process.env.AIDOC_SOFT_RETRIES||2);
  const backoff = (n:number)=>400*Math.pow(2,n);
  const tryOnce = async (n:number):Promise<any>=>{
    const ctl = new AbortController(); const timer = setTimeout(()=>ctl.abort("soft-timeout"), SOFT);
    try{
      const r = await oai.chat.completions.create({
        model, temperature:0.2, response_format:{type:"json_object"},
        messages:[{role:"system",content:system},{role:"user",content:`${instruction}\n\nUSER:\n${user}`}],
      },{signal:ctl.signal});
      const content=(r.choices?.[0]?.message?.content??"").trim();
      const parsed = safeParseJson(content);
      if(parsed.ok) return withDefaults(parsed.data,{ reply:"", save:{medications:[],conditions:[],labs:[],notes:[],prefs:[]}, observations:{short:"",long:""} });
      return { reply: content || "I captured your note.", save:{medications:[],conditions:[],labs:[],notes:[],prefs:[]}, observations:{short:"Model returned non-JSON. Using safe fallback.", long:""}, _warn:"non-json" };
    }catch(e:any){
      if((e?.name==="AbortError"||String(e).includes("soft-timeout")) && n<RETRIES){ await new Promise(r=>setTimeout(r,backoff(n))); return tryOnce(n+1); }
      throw e;
    }finally{ clearTimeout(timer); }
  };
  try{ return await tryOnce(0); }catch(err:any){
    return { reply:"I noted your message. The model is temporarily unavailable.", save:{medications:[],conditions:[],labs:[],notes:[],prefs:[]},
      observations:{short:"Temporary AI issue — safe fallback used.", long:""}, _error:String(err?.message||err) };
  }
}
