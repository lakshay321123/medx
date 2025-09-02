import pdf from "pdf-parse/lib/pdf-parse.js";
import { createCanvas } from "@napi-rs/canvas";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text || "";
  } catch {
    return "";
  }
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
  const doc = await pdfjs
    .getDocument({ data: buffer, disableWorker: true } as any)
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

