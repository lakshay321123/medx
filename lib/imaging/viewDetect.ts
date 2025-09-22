import crypto from "node:crypto";

export type ViewCode = "PA" | "Lateral" | "Oblique";

export interface ViewDetectImage {
  name: string;
  buffer: Buffer;
  mime: string;
  metadata?: Record<string, any> | null;
}

export interface ViewDetectionResult<T extends ViewDetectImage = ViewDetectImage> {
  images: (T & { view: ViewCode })[];
  viewsDetected: ViewCode[];
  duplicatesPruned: number;
  missingLateral: boolean;
}

const VIEW_FROM_HINT: Record<string, ViewCode> = {
  pa: "PA",
  ap: "PA",
  frontal: "PA",
  posteroanterior: "PA",
  lateral: "Lateral",
  lat: "Lateral",
  side: "Lateral",
  oblique: "Oblique",
  obl: "Oblique",
};

function classifyView(name: string, metadata?: Record<string, any> | null): ViewCode {
  if (metadata) {
    const metaView = metadata.view || metadata.View || metadata.imageView;
    if (typeof metaView === "string") {
      const normalized = metaView.toLowerCase();
      const found = VIEW_FROM_HINT[normalized as keyof typeof VIEW_FROM_HINT];
      if (found) return found;
      const key = Object.keys(VIEW_FROM_HINT).find(k => normalized.includes(k));
      if (key) return VIEW_FROM_HINT[key as keyof typeof VIEW_FROM_HINT];
    }
  }

  const lower = name.toLowerCase();
  for (const key of Object.keys(VIEW_FROM_HINT)) {
    if (lower.includes(key)) {
      return VIEW_FROM_HINT[key as keyof typeof VIEW_FROM_HINT];
    }
  }

  return "PA";
}

function hashBuffer(buffer: Buffer) {
  return crypto.createHash("sha1").update(buffer).digest("hex");
}

export function detectViews<T extends ViewDetectImage>(images: T[]): ViewDetectionResult<T> {
  if (!Array.isArray(images) || images.length === 0) {
    return {
      images: [],
      viewsDetected: [],
      duplicatesPruned: 0,
      missingLateral: true,
    };
  }

  const seen = new Map<string, T & { view: ViewCode }>();
  let duplicatesPruned = 0;

  for (const image of images) {
    const hash = hashBuffer(image.buffer);
    const existing = seen.get(hash);
    if (existing) {
      duplicatesPruned += 1;
      continue;
    }
    const view = classifyView(image.name, image.metadata);
    seen.set(hash, { ...image, view });
  }

  const deduped = Array.from(seen.values());
  const viewsDetected = Array.from(new Set(deduped.map(image => image.view)));

  return {
    images: deduped,
    viewsDetected,
    duplicatesPruned,
    missingLateral: !viewsDetected.includes("Lateral"),
  };
}
