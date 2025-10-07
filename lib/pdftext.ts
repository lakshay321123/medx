import pdf from "pdf-parse/lib/pdf-parse.js";
import { createCanvas } from "@napi-rs/canvas";

type BinarySource = Buffer | Uint8Array;

let pdfjsModulePromise: Promise<any> | null = null;

async function getPdfJs() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import("pdfjs-dist/legacy/build/pdf.mjs").then(mod => {
      (mod as any).GlobalWorkerOptions.workerSrc = "";
      return mod;
    });
  }
  return pdfjsModulePromise;
}

function toUint8Array(buffer: BinarySource): Uint8Array {
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(buffer)) {
    return Uint8Array.from(buffer);
  }
  return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
}

async function extractWithPdfJs(buffer: BinarySource): Promise<string> {
  const pdfjs = await getPdfJs();
  const doc = await pdfjs
    .getDocument({ data: toUint8Array(buffer), disableWorker: true } as any)
    .promise;

  let combined = "";
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = (textContent.items as any[])
      .map(item => (typeof item?.str === "string" ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    if (pageText) {
      combined += pageText + "\n";
    }
  }
  return combined.trim();
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const text = await extractWithPdfJs(buffer);
    if (text) return text;
  } catch {
    // ignore and try pdf-parse below
  }

  try {
    const data = await pdf(buffer);
    const text = typeof data.text === "string" ? data.text.trim() : "";
    if (text) return text;
  } catch {
    // ignore
  }

  return "";
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
  const pdfjs = await getPdfJs();
  const doc = await pdfjs
    .getDocument({ data: toUint8Array(buffer), disableWorker: true } as any)
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

