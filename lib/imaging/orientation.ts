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

async function rotateIfNeeded(image: OrientedImage): Promise<{ buffer: Buffer; rotated: boolean; width: number; height: number } | null> {
  try {
    const dataUrl = `data:${image.mime};base64,${image.buffer.toString("base64")}`;
    const img = await loadImage(dataUrl);
    const width = img.width;
    const height = img.height;

    if (!width || !height) return null;

    const needsRotation = width > height * 1.1;
    if (!needsRotation) {
      return { buffer: image.buffer, rotated: false, width, height };
    }

    const canvas = createCanvas(height, width);
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(img, -width / 2, -height / 2);
    const newMime = image.mime.includes("png") ? "image/png" : "image/jpeg";
    const buffer = canvas.toBuffer(newMime === "image/png" ? "image/png" : "image/jpeg", newMime === "image/png" ? undefined : { quality: 0.92 });
    return { buffer, rotated: true, width: canvas.width, height: canvas.height };
  } catch (error) {
    console.warn("[orientation] failed to rotate", { name: image.name, error });
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
    if (rotated && rotated.rotated) {
      rotationApplied = true;
      oriented.push({ ...image, buffer: rotated.buffer });
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
