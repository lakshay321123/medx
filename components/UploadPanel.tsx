'use client';
import React, { useRef, useState } from 'react';
import { safeJson } from '@/lib/safeJson';

// Lazy load tesseract & pdfjs only when needed
async function clientOcr(file: File, maxPages = 3): Promise<string> {
  // 1) Load pdfjs (browser bundle)
  // @ts-ignore
  const pdfjs = await import('pdfjs-dist/build/pdf');
  // @ts-ignore
  const pdfjsViewer = await import('pdfjs-dist/web/pdf_viewer'); // ensures CSS/worker maps exist
  // @ts-ignore - set worker src for browser execution
  const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
  // @ts-ignore
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

  const buf = await file.arrayBuffer();
  // @ts-ignore
  const loadingTask = pdfjs.getDocument({ data: buf });
  const pdf = await loadingTask.promise;

  // 2) Load tesseract only now
  const Tesseract = await import('tesseract.js');

  let allText = '';
  const pages = Math.min(pdf.numPages, maxPages);

  for (let p = 1; p <= pages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 2.0 }); // 2x for better OCR

    // Create canvas in the browser and render
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // @ts-ignore
    const renderTask = page.render({ canvasContext: ctx, viewport });
    await renderTask.promise;

    // Convert to blob → data URL for Tesseract
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/png'));
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    const result = await Tesseract.recognize(dataUrl, 'eng', {
      // hint: you can add 'osd' traineddata later if needed
      // logger: m => console.log(m) // progress
    });
    allText += '\n' + (result?.data?.text || '');
  }

  return allText.trim();
}

type APIAnalyzeDoc = {
  ok: boolean;
  detectedType?: 'blood'|'prescription'|'other';
  preview?: string;
  note?: string;
  scanned?: boolean;
};

export default function UploadPanel() {
  const [busy, setBusy] = useState(false);
  const [serverResult, setServerResult] = useState<APIAnalyzeDoc | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [finalResult, setFinalResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastFile = useRef<File | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    lastFile.current = file;
    setBusy(true); setError(null); setFinalResult(null); setServerResult(null); setOcrText('');

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await safeJson<APIAnalyzeDoc>(res);

      if (!data || (data as any).ok === false) {
        throw new Error((data as any)?.error || 'Upload failed');
      }
      setServerResult(data as APIAnalyzeDoc);

      if ((data as APIAnalyzeDoc).scanned) {
        // show OCR button; do nothing else yet
      } else {
        setFinalResult(data);
      }
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function runOcr() {
    const f = lastFile.current;
    if (!f) return;
    setBusy(true); setError(null);
    try {
      const text = await clientOcr(f, 3); // OCR first 3 pages
      setOcrText(text);

      const res = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await safeJson(res);
      if (!data || (data as any).ok === false) {
        throw new Error((data as any)?.error || 'OCR analyze failed');
      }
      setFinalResult(data);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{border:'1px solid var(--border, #ddd)', borderRadius:12, padding:16, display:'grid', gap:12}}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div style={{ fontWeight:600 }}>Upload a medical PDF</div>
        <label style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 12px',
          border:'1px solid #ccc', borderRadius:8, cursor: busy ? 'default' : 'pointer',
          background: busy ? '#f0f0f0' : 'white', opacity: busy ? 0.7 : 1 }}>
          <span>{busy ? 'Processing…' : 'Choose PDF'}</span>
          <input ref={fileRef} type="file" accept="application/pdf" onChange={onFile} style={{ display:'none' }} disabled={busy}/>
        </label>
      </div>

      {error && <p style={{ color:'#b00', margin:0, whiteSpace:'pre-wrap' }}>⚠️ {error}</p>}

      {serverResult && (
        <div style={{ border:'1px solid #eee', borderRadius:8, padding:12 }}>
          <div><b>Detected:</b> {serverResult.detectedType}</div>
          {serverResult.note && <div style={{color:'#555'}}>{serverResult.note}</div>}
          {serverResult.preview && <pre style={{whiteSpace:'pre-wrap'}}>{serverResult.preview}</pre>}

          {serverResult.scanned && (
            <button
              onClick={runOcr}
              disabled={busy}
              style={{marginTop:12, padding:'8px 12px', border:'1px solid #ccc', borderRadius:8}}
            >
              {busy ? 'Running OCR…' : 'Run OCR (extract text)'}
            </button>
          )}
        </div>
      )}

      {ocrText && (
        <div style={{ border:'1px solid #eee', borderRadius:8, padding:12 }}>
          <div style={{fontWeight:600}}>OCR raw text (first pages)</div>
          <pre style={{whiteSpace:'pre-wrap', maxHeight:200, overflow:'auto'}}>{ocrText}</pre>
        </div>
      )}

      {finalResult && (
        <div style={{ border:'1px solid #eee', borderRadius:8, padding:12 }}>
          <div style={{fontWeight:600}}>Analysis</div>
          <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(finalResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
