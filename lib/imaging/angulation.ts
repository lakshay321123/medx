import { createCanvas, loadImage } from "@napi-rs/canvas";

import { OrientedImage } from "./orientation";

export interface AngulationResult {
  angulation_deg: number | null;
  method: "metadata" | "landmarks" | "pca" | "none";
}

interface Point {
  x: number;
  y: number;
}

function clampAngle(angle: number) {
  const deg = Math.abs(angle);
  return Number.isFinite(deg) ? Math.min(180, Math.max(0, deg)) : null;
}

function computeAngleFromPoints(a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return null;
  const rad = Math.atan2(dy, dx);
  const angle = (rad * 180) / Math.PI;
  return clampAngle(angle);
}

function computeAngleFromLandmarks(landmarks: unknown): AngulationResult | null {
  if (!Array.isArray(landmarks) || landmarks.length < 2) return null;
  const [first, second] = landmarks;
  if (
    !first ||
    typeof first !== "object" ||
    !second ||
    typeof second !== "object" ||
    typeof (first as any).x !== "number" ||
    typeof (first as any).y !== "number" ||
    typeof (second as any).x !== "number" ||
    typeof (second as any).y !== "number"
  ) {
    return null;
  }
  const angle = computeAngleFromPoints(first as Point, second as Point);
  return angle === null ? null : { angulation_deg: Math.abs(angle), method: "landmarks" };
}

async function computePcaAngle(image: OrientedImage): Promise<AngulationResult | null> {
  try {
    const dataUrl = `data:${image.mime};base64,${image.buffer.toString("base64")}`;
    const img = await loadImage(dataUrl);
    const width = img.width;
    const height = img.height;
    if (!width || !height) return null;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, width, height);

    const points: Point[] = [];
    const step = Math.max(1, Math.floor(Math.min(width, height) / 200));
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (gray > 0.35) {
          points.push({ x, y });
        }
      }
    }

    if (points.length < 10) return null;

    let meanX = 0;
    let meanY = 0;
    for (const point of points) {
      meanX += point.x;
      meanY += point.y;
    }
    meanX /= points.length;
    meanY /= points.length;

    let sxx = 0;
    let sxy = 0;
    let syy = 0;
    for (const point of points) {
      const dx = point.x - meanX;
      const dy = point.y - meanY;
      sxx += dx * dx;
      sxy += dx * dy;
      syy += dy * dy;
    }

    const trace = sxx + syy;
    const det = sxx * syy - sxy * sxy;
    const term = Math.sqrt(Math.max(0, trace * trace / 4 - det));
    const lambda1 = trace / 2 + term;
    const eigvecX = sxy;
    const eigvecY = lambda1 - sxx;

    const magnitude = Math.hypot(eigvecX, eigvecY);
    if (!magnitude) return null;
    const angle = Math.atan2(eigvecY, eigvecX) * (180 / Math.PI);
    const normalizedAngle = angle < 0 ? angle + 180 : angle;

    return { angulation_deg: clampAngle(normalizedAngle) ?? 0, method: "pca" };
  } catch (error) {
    console.warn("[angulation] failed to analyze", { name: image.name, error });
    return null;
  }
}

export async function estimateAngulation(image: OrientedImage): Promise<AngulationResult> {
  if (!image || image.view !== "Lateral") {
    return { angulation_deg: null, method: "none" };
  }

  if (image.metadata && typeof image.metadata.angulation === "number") {
    return { angulation_deg: clampAngle(image.metadata.angulation), method: "metadata" };
  }

  const landmarkResult = computeAngleFromLandmarks(image.metadata?.landmarks);
  if (landmarkResult) return landmarkResult;

  const pcaResult = await computePcaAngle(image);
  if (pcaResult) return pcaResult;

  return { angulation_deg: null, method: "none" };
}
