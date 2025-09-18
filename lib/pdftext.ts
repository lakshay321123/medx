import pdf from "pdf-parse/lib/pdf-parse.js";
import { createCanvas } from "@napi-rs/canvas";
import { inflateSync } from "node:zlib";

function extractWithZlibStreams(buffer: Buffer): string {
  const src = buffer.toString("latin1");
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const segments: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(src))) {
    try {
      const inflated = inflateSync(Buffer.from(match[1], "latin1")).toString("utf8");
      const hexRe = /<([0-9A-Fa-f\s]+)>/g;
      let hexMatch: RegExpExecArray | null;
      while ((hexMatch = hexRe.exec(inflated))) {
        const hex = hexMatch[1].replace(/\s+/g, "");
        if (hex.length % 2 === 0 && hex.length) {
          const text = Buffer.from(hex, "hex").toString("utf8");
          if (text.trim()) segments.push(text.trim());
        }
      }
      const parenRe = /\((?:\\\(|\\\)|\\\\|[^()])*\)/g;
      let parenMatch: RegExpExecArray | null;
      while ((parenMatch = parenRe.exec(inflated))) {
        const raw = parenMatch[0].slice(1, -1);
        const text = raw
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\")
          .trim();
        if (text) segments.push(text);
      }
    } catch {
      continue;
    }
  }
  return segments.join(" \n ");
}

async function extractWithPdfJs(buffer: Buffer): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    (pdfjs as any).GlobalWorkerOptions.workerSrc = "";
    const data = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer;
    const doc = await pdfjs.getDocument({ data, disableWorker: true } as any).promise;
    const totalPages =
      typeof (doc as any).numPages === "number" && Number.isFinite((doc as any).numPages)
        ? Math.min((doc as any).numPages, 12)
        : 0;
    const pages: string[] = [];
    for (let i = 1; i <= totalPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = (content.items || [])
        .map((item: any) => (typeof item?.str === "string" ? item.str : ""))
        .filter(Boolean)
        .join(" ")
        .trim();
      if (text) pages.push(text);
      page.cleanup();
    }
    return pages.join("\n");
  } catch {
    return "";
  }
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    if (data.text && data.text.trim()) return data.text;
  } catch {
    // fall through to pdf.js extraction
  }
  const viaPdfJs = await extractWithPdfJs(buffer);
  if (viaPdfJs && viaPdfJs.trim()) return viaPdfJs;
  return extractWithZlibStreams(buffer);
}

class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }
  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext: any) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

export async function rasterizeFirstPage(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  (pdfjs as any).GlobalWorkerOptions.workerSrc = "";
  const data = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer;
  const doc = await pdfjs
    .getDocument({ data, disableWorker: true } as any)
    .promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvasFactory = new NodeCanvasFactory();
  const { canvas, context } = canvasFactory.create(
    viewport.width,
    viewport.height
  );
  await page.render({ canvasContext: context, viewport, canvasFactory } as any).promise;
  return canvas.toDataURL("image/png");
}

