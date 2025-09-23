import { createCanvas, loadImage } from "@napi-rs/canvas";

import { ViewCode, ViewDetectImage } from "./viewDetect";

export interface OrientedImage extends ViewDetectImage {
  view: ViewCode;
}

export interface OrientationResult {
  images: OrientedImage[];
  rotationApplied: boolean;
  warnings: string[];
  sides: Record<string, "Left" | "Right" | "Unknown">;
}

export type Rotated = {
  buffer: Buffer;
  mime: string;
  rotated: boolean;
  width: number;
  height: number;
};

function detectSide(name: string, metadata?: Record<string, any> | null): "Left" | "Right" | "Unknown" {
  if (metadata) {
    const side = metadata.side || metadata.Side || metadata.patientSide;
    if (typeof side === "string") {
      if (/left|lt\b/.test(side.toLowerCase())) return "Left";
      if (/right|rt\b/.test(side.toLowerCase())) return "Right";
    }
  }

  const lower = name.toLowerCase();
  if (/(^|[-_ ])left/.test(lower) || /\blt\b/.test(lower)) return "Left";
  if (/(^|[-_ ])right/.test(lower) || /\brt\b/.test(lower)) return "Right";

  return "Unknown";
}

function normalizeMime(mime?: string): "image/png" | "image/jpeg" {
  if (!mime) return "image/png";
  const lower = mime.toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return "image/jpeg";
  if (lower.includes("png")) return "image/png";
  return "image/png";
}

async function rotateIfNeeded(image: { buffer: Buffer; mime?: string }): Promise<Rotated | null> {
  try {
    const img = await loadImage(image.buffer);
    const width = img.width;
    const height = img.height;

    if (!width || !height) return null;

    const mime = normalizeMime(image.mime);
    const needsRotation = width > height * 1.1;

    if (!needsRotation) {
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      const buffer =
        mime === "image/jpeg" ? canvas.toBuffer("image/jpeg", 0.92) : canvas.toBuffer("image/png");
      return { buffer, mime, rotated: false, width, height };
    }

    const canvas = createCanvas(height, width);
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    const buffer =
      mime === "image/jpeg" ? canvas.toBuffer("image/jpeg", 0.92) : canvas.toBuffer("image/png");
    return { buffer, mime, rotated: true, width: canvas.width, height: canvas.height };
  } catch (error) {
    const context = "name" in image ? { name: (image as { name?: string }).name, error } : { error };
    console.warn("[orientation] failed to rotate", context);
    return null;
  }
}

export async function normalizeOrientation(images: OrientedImage[]): Promise<OrientationResult> {
  if (!Array.isArray(images) || images.length === 0) {
    return { images: [], rotationApplied: false, warnings: [], sides: {} };
  }

  const oriented: OrientedImage[] = [];
  const sides: Record<string, "Left" | "Right" | "Unknown"> = {};
  let rotationApplied = false;
  const warnings: string[] = [];

  for (const image of images) {
    const rotated = await rotateIfNeeded(image);
    if (rotated) {
      if (rotated.rotated) {
        rotationApplied = true;
      }
      oriented.push({ ...image, buffer: rotated.buffer, mime: rotated.mime });
    } else {
      oriented.push(image);
    }

    const side = detectSide(image.name, image.metadata);
    sides[image.name] = side;

    if (image.metadata && typeof image.metadata.expectedSide === "string") {
      const expected = image.metadata.expectedSide.toLowerCase();
      if ((expected.startsWith("l") && side !== "Left") || (expected.startsWith("r") && side !== "Right")) {
        warnings.push(`Marker mismatch on ${image.name}: expected ${image.metadata.expectedSide}, detected ${side}.`);
      }
    }
  }

  const uniqueSides = Array.from(new Set(Object.values(sides).filter(side => side !== "Unknown")));
  if (uniqueSides.length > 1) {
    warnings.push("Left/right markers conflict across uploaded images.");
  }

  return { images: oriented, rotationApplied, warnings, sides };
}
