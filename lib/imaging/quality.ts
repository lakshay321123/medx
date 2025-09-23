import { createCanvas, loadImage } from "@napi-rs/canvas";

export type QualityLabel = "Good" | "Fair" | "Poor";

export interface QualityMetrics {
  blur: number; // 0 (blurry) → 1 (sharp)
  exposure: number; // 0 (poor) → 1 (balanced)
  crop: number; // 0 (cropped poorly) → 1 (full anatomy in frame)
  noise: number; // 0 (noisy) → 1 (clean)
}

export interface QualityAssessment {
  name: string;
  quality_score: number;
  label: QualityLabel;
  tip: string;
  metrics: QualityMetrics;
}

export interface QualitySummary {
  perImage: QualityAssessment[];
  overall: QualityAssessment;
  threshold: number;
}

const DEFAULT_QUALITY_MIN = 0.55;
const parsedQualityMin = Number.parseFloat(process.env.QUALITY_MIN ?? "");
const QUALITY_MIN = Number.isFinite(parsedQualityMin) ? clamp01(parsedQualityMin) : DEFAULT_QUALITY_MIN;

const TIP_BY_METRIC: Record<keyof QualityMetrics, string> = {
  blur: "Reduce blur: steady the camera or rest it on a surface.",
  exposure: "Adjust lighting: avoid backlighting and ensure even illumination.",
  crop: "Re-frame: include the entire hand/wrist in the shot.",
  noise: "Use the original image and avoid heavy compression.",
};

const WEIGHTS: Record<keyof QualityMetrics, number> = {
  blur: 0.35,
  exposure: 0.25,
  crop: 0.25,
  noise: 0.15,
};

function clamp01(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function computeQualityScore(metrics: QualityMetrics): {
  quality_score: number;
  label: QualityLabel;
  tip: string;
} {
  const normalized: QualityMetrics = {
    blur: clamp01(metrics.blur),
    exposure: clamp01(metrics.exposure),
    crop: clamp01(metrics.crop),
    noise: clamp01(metrics.noise),
  };

  const quality_score =
    normalized.blur * WEIGHTS.blur +
    normalized.exposure * WEIGHTS.exposure +
    normalized.crop * WEIGHTS.crop +
    normalized.noise * WEIGHTS.noise;

  const lowestMetric = (Object.keys(normalized) as (keyof QualityMetrics)[])
    .map(metric => ({ metric, value: normalized[metric] }))
    .sort((a, b) => a.value - b.value)[0];

  let label: QualityLabel = "Poor";
  if (quality_score >= 0.8) label = "Good";
  else if (quality_score >= QUALITY_MIN) label = "Fair";

  const tip = TIP_BY_METRIC[lowestMetric.metric];

  return { quality_score, label, tip };
}

async function computeMetricsFromBuffer(name: string, buffer: Buffer, mime: string): Promise<QualityAssessment> {
  try {
    const image = await loadImage(buffer);
    const width = image.width;
    const height = image.height;

    if (!width || !height) {
      const metrics: QualityMetrics = { blur: 0.4, exposure: 0.5, crop: 0.5, noise: 0.5 };
      const score = computeQualityScore(metrics);
      return { name, metrics, ...score };
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, width, height);

    const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 200));

    let sum = 0;
    let sumSq = 0;
    let count = 0;
    let diffSum = 0;
    let coverageCount = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    for (let y = sampleStep; y < height - sampleStep; y += sampleStep) {
      for (let x = sampleStep; x < width - sampleStep; x += sampleStep) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        const idxU = ((y - sampleStep) * width + x) * 4;
        const idxD = ((y + sampleStep) * width + x) * 4;
        const idxL = (y * width + (x - sampleStep)) * 4;
        const idxR = (y * width + (x + sampleStep)) * 4;

        const grayU = (0.299 * data[idxU] + 0.587 * data[idxU + 1] + 0.114 * data[idxU + 2]) / 255;
        const grayD = (0.299 * data[idxD] + 0.587 * data[idxD + 1] + 0.114 * data[idxD + 2]) / 255;
        const grayL = (0.299 * data[idxL] + 0.587 * data[idxL + 1] + 0.114 * data[idxL + 2]) / 255;
        const grayR = (0.299 * data[idxR] + 0.587 * data[idxR + 1] + 0.114 * data[idxR + 2]) / 255;

        const laplacian = 4 * gray - grayU - grayD - grayL - grayR;
        sum += laplacian;
        sumSq += laplacian * laplacian;
        count++;

        const neighborMean = (grayU + grayD + grayL + grayR) / 4;
        diffSum += Math.abs(gray - neighborMean);

        if (gray > 0.2) {
          coverageCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const variance = count ? sumSq / count - (sum / count) ** 2 : 0;
    const blurScore = clamp01(variance / 5);

    let brightnessSum = 0;
    let brightnessCount = 0;
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        brightnessSum += gray;
        brightnessCount++;
      }
    }

    const meanBrightness = brightnessCount ? brightnessSum / brightnessCount : 0.5;
    const exposureScore = clamp01(1 - Math.abs(meanBrightness - 0.55) / 0.55);

    const coverageArea = coverageCount
      ? ((maxX - minX + 1) * (maxY - minY + 1)) / (width * height)
      : 0;
    const cropScore = clamp01(coverageCount < count * 0.1 ? 0.4 : coverageArea);

    const noiseLevel = count ? diffSum / count : 0;
    const noiseScore = clamp01(1 - noiseLevel / 0.4);

    const metrics: QualityMetrics = {
      blur: blurScore,
      exposure: exposureScore,
      crop: cropScore,
      noise: noiseScore,
    };

    const score = computeQualityScore(metrics);
    return { name, metrics, ...score };
  } catch (error) {
    console.warn("[quality] failed to analyze image", { name, error });
    const metrics: QualityMetrics = { blur: 0.45, exposure: 0.5, crop: 0.5, noise: 0.5 };
    const score = computeQualityScore(metrics);
    return { name, metrics, ...score };
  }
}

export async function assessImageQuality(
  images: { name: string; buffer: Buffer; mime: string }[],
): Promise<QualitySummary> {
  if (!images.length) {
    const metrics: QualityMetrics = { blur: 0.5, exposure: 0.5, crop: 0.5, noise: 0.5 };
    const score = computeQualityScore(metrics);
    const placeholder: QualityAssessment = { name: "unknown", metrics, ...score };
    return { perImage: [placeholder], overall: placeholder, threshold: QUALITY_MIN };
  }

  const perImage = await Promise.all(
    images.map(image => computeMetricsFromBuffer(image.name, image.buffer, image.mime)),
  );

  const aggregateMetrics = perImage.reduce(
    (acc, current) => {
      acc.blur += current.metrics.blur;
      acc.exposure += current.metrics.exposure;
      acc.crop += current.metrics.crop;
      acc.noise += current.metrics.noise;
      return acc;
    },
    { blur: 0, exposure: 0, crop: 0, noise: 0 },
  );

  const averagedMetrics: QualityMetrics = {
    blur: aggregateMetrics.blur / perImage.length,
    exposure: aggregateMetrics.exposure / perImage.length,
    crop: aggregateMetrics.crop / perImage.length,
    noise: aggregateMetrics.noise / perImage.length,
  };

  const overallScore = computeQualityScore(averagedMetrics);
  const overall: QualityAssessment = {
    name: "overall",
    metrics: averagedMetrics,
    ...overallScore,
  };

  return { perImage, overall, threshold: QUALITY_MIN };
}
