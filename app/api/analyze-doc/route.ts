import { NextResponse } from 'next/server';
import { extractPages } from '@/lib/pdf';
import { chunkPages } from '@/lib/chunk';
import { SCHEMA_PROMPT, askGroq, askOpenAI } from '@/lib/llm';
import { detectDocumentType } from '@/lib/detectDocumentType';
import { reduceChunks, fuseResults, emptyData, DataSet } from '@/lib/ensemble';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DEBUG = process.env.DOC_ENABLE_DEBUG === 'true';

function parseOutput(text: string, range: string): DataSet {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return emptyData();
    const data = JSON.parse(match[0]);
    const cats = ['labs', 'medications', 'diagnoses', 'impressions', 'red_flags', 'followups'];
    for (const c of cats) {
      for (const item of data[c] || []) {
        if (!item.page_range) item.page_range = range;
      }
    }
    return data;
  } catch {
    return emptyData();
  }
}

async function summarize(data: DataSet, mode: 'patient' | 'doctor'): Promise<string> {
  const prompt =
    mode === 'patient'
      ? 'Provide 5-8 bullet points in plain language based on this data:'
      : 'Provide 10-14 bullet points with clinical detail based on this data:';
  const provider = process.env.OPENAI_API_KEY ? askOpenAI : process.env.LLM_API_KEY ? askGroq : null;
  if (!provider) return '';
  try {
    const res = await provider(
      `You are a clinical summarization assistant. ${prompt}`,
      JSON.stringify(data)
    );
    return res.trim();
  } catch (e) {
    if (DEBUG) console.error('summary-error', e);
    return '';
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const pages = await extractPages(buffer);
    if (!pages.length) return NextResponse.json({ error: 'Empty text extracted' }, { status: 400 });

    const fullText = pages.map((p) => p.text).join('\n');
    const docType = detectDocumentType(fullText, file.type, file.name);

    const chunks = chunkPages(pages);
    const groqChunks: DataSet[] = [];
    const openaiChunks: DataSet[] = [];

    for (const ch of chunks) {
      const user = `Pages ${ch.page_range}:\n${ch.text}`;
      const tasks: Promise<void>[] = [];
      if (process.env.LLM_API_KEY) {
        tasks.push(
          askGroq(SCHEMA_PROMPT, user)
            .then((out) => {
              groqChunks.push(parseOutput(out, ch.page_range));
            })
            .catch((e) => {
              if (DEBUG) console.error('groq-chunk-error', e);
            })
        );
      }
      if (process.env.OPENAI_API_KEY) {
        tasks.push(
          askOpenAI(SCHEMA_PROMPT, user)
            .then((out) => {
              openaiChunks.push(parseOutput(out, ch.page_range));
            })
            .catch((e) => {
              if (DEBUG) console.error('openai-chunk-error', e);
            })
        );
      }
      if (tasks.length) await Promise.all(tasks);
    }

    const groqReduced = reduceChunks(groqChunks);
    const openaiReduced = reduceChunks(openaiChunks);
    const fused = fuseResults(groqReduced, openaiReduced);

    const patient = await summarize(fused, 'patient');
    const doctor = await summarize(fused, 'doctor');

    return NextResponse.json({
      meta: { pages: pages.length, doc_type: docType },
      raw: { groq_chunks: groqChunks, openai_chunks: openaiChunks },
      fused,
      summaries: { patient, doctor },
      disclaimer: 'AI assistance only — not a medical diagnosis. Confirm with a clinician.',
    });
  } catch (e: any) {
    if (DEBUG) console.error('analyze-doc-error', e);
    return NextResponse.json({ error: 'Failed to analyze document' }, { status: 500 });
  }
}
