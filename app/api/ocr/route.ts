import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  const apiKey = process.env.OCRSPACE_API_KEY || 'helloworld';
  const buffer = Buffer.from(await file.arrayBuffer());

  const fd = new FormData();
  fd.append("file", new Blob([buffer], { type: file.type || 'image/jpeg' }), file.name || 'image.jpg');
  fd.append("language", "eng");
  fd.append("OCREngine", "2");
  fd.append("scale", "true");
  fd.append("isTable", "false");

  const resp = await fetch("https://api.ocr.space/parse/image", { method: "POST", headers: { apikey: apiKey }, body: fd });
  if (!resp.ok) {
    const t = await resp.text();
    return NextResponse.json({ error: `OCR error ${resp.status}`, detail: t }, { status: 500 });
  }
  const j = await resp.json();
  const text = j?.ParsedResults?.[0]?.ParsedText || '';
  return NextResponse.json({ text });
}
