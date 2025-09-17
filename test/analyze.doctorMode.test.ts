import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';

import { POST } from '../app/api/analyze/route';

process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
process.env.NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://test.local';

async function buildPdfFile(text: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const { width, height } = page.getSize();
  page.drawText(text, {
    x: 40,
    y: height - 60,
    size: fontSize,
    font,
    maxWidth: width - 80,
    lineHeight: fontSize + 2,
  });
  const pdfBytes = await pdf.save();
  return new File([pdfBytes], 'report.pdf', { type: 'application/pdf' });
}

function createRequest(doctorMode: boolean, file: File) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('doctorMode', String(doctorMode));
  return new Request('http://test.local/api/analyze', {
    method: 'POST',
    body: fd,
  });
}

function urlFromInput(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return (input as Request).url;
}

const LONG_TEXT = Array(10)
  .fill(
    'Comprehensive metabolic panel shows mild transaminitis with ALT slightly above reference range. '
  )
  .join(' ');

test('doctor mode uploads skip ingest and return empty obsIds', async () => {
  const file = await buildPdfFile(LONG_TEXT);
  const req = createRequest(true, file);
  const originalFetch = globalThis.fetch;
  let ingestCalls = 0;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlFromInput(input);
    if (url.includes('/api/ingest/from-text')) {
      ingestCalls += 1;
      return new Response(JSON.stringify({ ids: ['obs-test'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('api.openai.com')) {
      const content = 'Doctor oriented summary';
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const res = (await POST(req as any)) as Response;
    const body = await res.json();
    assert.equal(ingestCalls, 0);
    assert.deepEqual(body.obsIds, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('patient mode uploads call ingest and return obsIds', async () => {
  const file = await buildPdfFile(LONG_TEXT);
  const req = createRequest(false, file);
  const originalFetch = globalThis.fetch;
  let ingestCalls = 0;

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = urlFromInput(input);
    if (url.includes('/api/ingest/from-text')) {
      ingestCalls += 1;
      return new Response(JSON.stringify({ ids: ['obs-123'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('api.openai.com')) {
      const content = 'Patient friendly summary';
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const res = (await POST(req as any)) as Response;
    const body = await res.json();
    assert.equal(ingestCalls, 1);
    assert.deepEqual(body.obsIds, ['obs-123']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

