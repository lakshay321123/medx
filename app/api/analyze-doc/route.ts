import { NextResponse } from 'next/server';
import { groqChat, openaiText, mergeSummaries } from '@/lib/llm';

export const runtime = 'nodejs';

type ChatMsg = { role:'system'|'user'|'assistant'; content:string };

async function extractPdfText(buf: Buffer) {
  const pdf = (await import('pdf-parse')).default as any;
  const d = await pdf(buf);
  const text = (d.text || '').trim();
  return { pages: d.numpages || 0, text };
}

function labsFromText(text: string){
  // light parser: “Name 12.3 unit (4.0-11.0)”
  const rows: {name:string; value?:number; units?:string; low?:number; high?:number; flag?:'H'|'L'|'N'}[] = [];
  const lines = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  for (const line of lines){
    const m = line.match(/^([A-Za-z][A-Za-z0-9 \-\/%\+]+?)[:\s]+(-?\d+(?:\.\d+)?)\s*([^\s\(\)]*)\s*\(([^)]+)\)/);
    if (m){
      const name = m[1].trim(); const value = Number(m[2]); const units = m[3] || undefined;
      const rr = m[4].match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
      let low:number|undefined, high:number|undefined, flag:'H'|'L'|'N'|undefined;
      if (rr){ low = Number(rr[1]); high = Number(rr[2]); if (isFinite(value) && low!=null && high!=null) flag = value<low?'L':value>high?'H':'N'; }
      rows.push({name,value,units,low,high,flag});
    }
  }
  return rows;
}

const SYS_PATIENT = `You are a medical explainer. Use clear, calm, non-alarming language (8th–10th grade). Avoid jargon.`;
const SYS_DOCTOR  = `You are a clinician. Produce a concise, structured note useful for a doctor. Use headings and keep claims evidence-based.`;

function makePatientPrompt(text:string, labs:any[]){
  const flags = labs.filter((l:any)=>l.flag && l.flag!=='N')
   .map((l:any)=>`${l.name}: ${l.value ?? ''} ${l.units ?? ''} ${l.low!=null&&l.high!=null?`(ref ${l.low}-${l.high})`:''} [${l.flag}]`)
   .join('\n') || 'None detected';
  return `DOCUMENT (may include labs/prescriptions):\n---\n${text}\n---\nAbnormal/flagged labs:\n${flags}\n\nWrite a friendly patient summary:\n- What the results generally mean\n- Items that might need attention\n- Simple next steps and when to seek care\n- Short disclaimer that this is not a diagnosis`;
}

function makeDoctorPrompt(text:string, labs:any[]){
  const table = labs.map((l:any)=>`- ${l.name}: ${l.value ?? ''} ${l.units ?? ''} ${l.low!=null&&l.high!=null?`(ref ${l.low}-${l.high})`:''} ${l.flag?`[${l.flag}]`:''}`).join('\n') || 'No parsable labs found';
  return `SOURCE:\n${text}\n\nEXTRACTED LABS:\n${table}\n\nWrite a clinician-facing summary with:\nHPI/Context (if evident)\nKey Results (flag H/L)\nInterpretation/Differentials (only if supported)\nMedications/interactions (if present)\nFollow-up & Plan\nRed Flags\nLimitations`;
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    const doctorMode = (fd.get('doctorMode') || 'false').toString() === 'true';
    if (!file) return NextResponse.json({ error:'file missing' }, { status:400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const { pages, text } = await extractPdfText(buf);
    const labs = labsFromText(text);

    const patientUser = makePatientPrompt(text, labs);
    const doctorUser  = makeDoctorPrompt(text, labs);

    // run both providers for ensemble
    const [pGroq, pOAI] = await Promise.all([
      groqChat([{role:'system',content:SYS_PATIENT},{role:'user',content:patientUser}]),
      openaiText([{role:'system',content:SYS_PATIENT},{role:'user',content:patientUser}])
    ]);
    const patientSummary = mergeSummaries(pGroq, pOAI);

    let doctorSummary: string | null = null, dGroq = '', dOAI = '';
    if (doctorMode){
      [dGroq, dOAI] = await Promise.all([
        groqChat([{role:'system',content:SYS_DOCTOR},{role:'user',content:doctorUser}]),
        openaiText([{role:'system',content:SYS_DOCTOR},{role:'user',content:doctorUser}])
      ]);
      doctorSummary = mergeSummaries(dGroq, dOAI);
    }

    return NextResponse.json({
      pages, labs,
      patient: { summary: patientSummary, groq: pGroq, openai: pOAI },
      doctor : doctorMode ? { summary: doctorSummary, groq: dGroq, openai: dOAI } : null,
      disclaimer: 'AI assistance only — not a medical diagnosis. Confirm with a clinician.'
    });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'analyze-doc failed' }, { status:500 });
  }
}

