import { NextResponse } from 'next/server';
import { openaiVision } from '@/lib/llm';

export const runtime = 'nodejs';

const HF_TOKEN = process.env.HF_API_TOKEN || process.env.HF_API_KEY;
const HF_BONE_MODEL = process.env.HF_BONE_MODEL || 'prithivMLmods/Bone-Fracture-Detection';

type HFRes = { label:string; score:number }[];

async function callHF(buf: Buffer, modelId: string): Promise<Record<string,number>> {
  if (!HF_TOKEN) throw new Error('HF_API_TOKEN missing');
  const r = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
    method:'POST',
    headers:{ Authorization:`Bearer ${HF_TOKEN}`, 'Content-Type':'application/octet-stream' },
    body: buf
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`HF: ${JSON.stringify(j)}`);
  const arr: HFRes = Array.isArray(j) ? j : (j?.[0] || []);
  const map: Record<string,number> = {};
  for (const it of arr) if (it?.label) map[it.label.toLowerCase()] = it.score;
  return map;
}

function toDataUrl(buf: Buffer, mime='image/jpeg'){ return `data:${mime};base64,${buf.toString('base64')}`; }

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const files = (fd.getAll('files[]') as File[]) || [];
    if (!files.length) return NextResponse.json({ error:'files[] missing' }, { status:400 });

    const out:any[] = [];
    for (const f of files){
      const ab = await f.arrayBuffer();
      const buf = Buffer.from(ab);
      const probs = await callHF(buf, HF_BONE_MODEL);

      const pFrac = probs['fractured'] ?? probs['fracture'] ?? probs['positive'] ?? 0;
      const pNorm = probs['not fractured'] ?? probs['negative'] ?? (1 - pFrac);

      const system = `You are a radiologist. Write a clinically useful report:
Technique; Findings (bones/joints/soft tissues); Impression (≤3 bullets, start with probability if available); Recommendations; Limitations.
Be cautious: do not assert side or exact location unless evident. Convey uncertainty clearly.`;

      const prompt = `Model context:
- HF model: ${HF_BONE_MODEL}
- Probabilities: Fractured=${(pFrac*100).toFixed(1)}%, NotFractured=${(pNorm*100).toFixed(1)}%
- Other labels: ${Object.entries(probs).map(([k,v])=>`${k}:${(v*100).toFixed(1)}%`).join(', ') || 'n/a'}

Use the image to ground the narrative. Do not over-diagnose beyond what's visible.`;

      const mime = f.type || 'image/jpeg';
      const dataUrl = toDataUrl(buf, mime);
      const report = await openaiVision({ system, prompt, imageDataUrl: dataUrl });

      out.push({
        filename: f.name,
        model: HF_BONE_MODEL,
        probabilities: { fractured: pFrac, notFractured: pNorm, raw: probs },
        report
      });
    }

    return NextResponse.json({
      count: out.length,
      results: out,
      disclaimer: 'AI assistance only — not a medical diagnosis. Confirm with a clinician.'
    });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'imaging analyze failed' }, { status:500 });
  }
}

