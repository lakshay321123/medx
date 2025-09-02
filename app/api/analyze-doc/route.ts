import { NextResponse } from 'next/server';
import { extractPdf } from '@/lib/pdf';
import { chunkPages } from '@/lib/chunk';
import { SCHEMA_PROMPT, askGroq, askOpenAI } from '@/lib/llm';
import { detectDocumentType } from '@/lib/detectDocumentType';
import { mergeChunks, makeSummaries, emptyData, DataSet } from '@/lib/ensemble';

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

export async function POST(req: Request) {
  const t0 = Date.now();
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const mode = ((form.get('mode') as string) || 'both') as 'patient' | 'doctor' | 'both';
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const pages = await extractPdf(buffer);
    if (!pages.length) return NextResponse.json({ error: 'Empty text extracted' }, { status: 400 });

    const extraction = {
      totalPages: pages.length,
      nativeTextPages: pages.filter((p) => !p.ocr && !(p.warnings || []).length).length,
      ocredPages: pages.filter((p) => p.ocr && !(p.warnings || []).length).length,
      failedPages: pages.filter((p) => (p.warnings || []).length).length,
    };

    const fullText = pages.map((p) => p.text).join('\n');
    const docType = detectDocumentType(fullText, file.type, file.name);

    const chunks = chunkPages(pages.map((p) => ({ page: p.page, text: p.text })));
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

    const fused = mergeChunks(groqChunks, openaiChunks);
    const summaries = await makeSummaries(fused, mode);
    const elapsed = Date.now() - t0;

    return NextResponse.json({
      meta: { pages: pages.length, doc_type: docType, elapsed_ms: elapsed, extraction },
      raw: { groq_chunks: groqChunks, openai_chunks: openaiChunks },
      fused,
      summaries,
      disclaimer: 'AI assistance only — not a medical diagnosis. Confirm with a clinician.',
    });
  } catch (e: any) {
    if (DEBUG) console.error('analyze-doc-error', e);
    return NextResponse.json({ error: 'Failed to analyze document' }, { status: 500 });
  }
}
