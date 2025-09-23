import { Buffer } from "node:buffer";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const assessImageQualityMock = vi.fn();
const detectViewsMock = vi.fn();
const normalizeOrientationMock = vi.fn();
const estimateAngulationMock = vi.fn();
const deriveRedFlagsMock = vi.fn();
const applyCalibrationMock = vi.fn();

vi.mock("@/lib/imaging/quality", () => ({
  assessImageQuality: assessImageQualityMock,
}));

vi.mock("@/lib/imaging/viewDetect", () => ({
  detectViews: detectViewsMock,
}));

vi.mock("@/lib/imaging/orientation", () => ({
  normalizeOrientation: normalizeOrientationMock,
}));

vi.mock("@/lib/imaging/angulation", () => ({
  estimateAngulation: estimateAngulationMock,
}));

vi.mock("@/lib/imaging/redFlags", () => ({
  deriveRedFlags: deriveRedFlagsMock,
}));

vi.mock("@/lib/imaging/calibration", () => ({
  applyCalibration: applyCalibrationMock,
}));

vi.mock("@/lib/imaging/handHeuristics", async () => {
  const actual = await vi.importActual<typeof import("../lib/imaging/handHeuristics")>("../lib/imaging/handHeuristics");
  return actual;
});

vi.mock("@/lib/imaging/findings", async () => {
  const actual = await vi.importActual<typeof import("../lib/imaging/findings")>("../lib/imaging/findings");
  return actual;
});

const fetchMock = vi.fn();

async function loadRoute() {
  const module = await import("../app/api/imaging/analyze/route");
  return module.POST;
}

describe("view detection hint parsing", () => {
  it("respects word boundaries for short keys", async () => {
    const actual = await vi.importActual<typeof import("../lib/imaging/viewDetect")>("../lib/imaging/viewDetect");
    expect(actual.viewFromFilename("hand-pa.jpg")).toBe("PA");
    expect(actual.viewFromFilename("lat-elbow.png")).toBe("Lateral");
    expect(actual.viewFromFilename("scapula.jpg")).toBeNull();
    expect(actual.viewFromFilename("plate-123.jpeg")).toBeNull();
  });
});

describe("calibration guards", () => {
  const originalYes = process.env.DECISION_THRESHOLD_YES;
  const originalLikely = process.env.DECISION_THRESHOLD_LIKELY;

  afterEach(() => {
    process.env.DECISION_THRESHOLD_YES = originalYes;
    process.env.DECISION_THRESHOLD_LIKELY = originalLikely;
  });

  it("clamps inputs and caps penalties", async () => {
    process.env.DECISION_THRESHOLD_YES = "not-a-number";
    process.env.DECISION_THRESHOLD_LIKELY = "0.4";
    const actual = await vi.importActual<typeof import("../lib/imaging/calibration")>("../lib/imaging/calibration");
    const result = actual.applyCalibration({
      confidenceRaw: 0.8,
      qualityScore: 1.4,
      hasLateral: false,
      viewCount: 3,
      redFlagCount: 99,
    });
    expect(result.confidence_calibrated).toBeCloseTo(0.45, 2);
    expect(result.decision_tier).toBe("Likely");
  });

  it("enforces YES >= Likely when envs inverted", async () => {
    process.env.DECISION_THRESHOLD_YES = "0.4";
    process.env.DECISION_THRESHOLD_LIKELY = "0.9";
    const actual = await vi.importActual<typeof import("../lib/imaging/calibration")>("../lib/imaging/calibration");
    const [yes, likely] = actual.getDecisionThresholds();
    expect(yes).toBeGreaterThanOrEqual(likely);
    expect(yes).toBeCloseTo(0.9, 5);
    expect(likely).toBeCloseTo(0.4, 5);
  });
});

function buildFile(name: string) {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/jpeg" });
}

function makeForm(files: File[], checklist = { openCut: false, numbness: false, severeSwelling: false }) {
  const form = new FormData();
  files.forEach(file => form.append("files[]", file));
  if (files[0]) {
    form.append("file", files[0]);
  }
  form.append("redFlagChecklist", JSON.stringify(checklist));
  return form;
}

describe("imaging pipeline orchestration", () => {
  beforeEach(() => {
    vi.resetModules();
    assessImageQualityMock.mockReset();
    detectViewsMock.mockReset();
    normalizeOrientationMock.mockReset();
    estimateAngulationMock.mockReset();
    deriveRedFlagsMock.mockReset();
    applyCalibrationMock.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock as any;
    process.env.OPENAI_API_KEY = "test-key";
    process.env.DECISION_THRESHOLD_YES = "0.85";
    process.env.DECISION_THRESHOLD_LIKELY = "0.6";
    process.env.QUALITY_MIN = "0.55";
  });

  it("returns angulation and YES tier when PA and lateral are present", async () => {
    const paBuffer = Buffer.from("pa");
    const latBuffer = Buffer.from("lat");

    assessImageQualityMock.mockResolvedValue({
      perImage: [
        { name: "hand-pa.jpg", quality_score: 0.92, label: "Good", tip: "", metrics: { blur: 0.9, exposure: 0.9, crop: 0.9, noise: 0.9 } },
        { name: "hand-lat.jpg", quality_score: 0.9, label: "Good", tip: "", metrics: { blur: 0.9, exposure: 0.9, crop: 0.9, noise: 0.9 } },
      ],
      overall: { name: "overall", quality_score: 0.91, label: "Good", tip: "", metrics: { blur: 0.9, exposure: 0.9, crop: 0.9, noise: 0.9 } },
      threshold: 0.55,
    });

    detectViewsMock.mockReturnValue({
      images: [
        { name: "hand-pa.jpg", mime: "image/jpeg", buffer: paBuffer, metadata: null, view: "PA" },
        { name: "hand-lat.jpg", mime: "image/jpeg", buffer: latBuffer, metadata: null, view: "Lateral" },
      ],
      viewsDetected: ["PA", "Lateral"],
      duplicatesPruned: 0,
      missingLateral: false,
    });

    normalizeOrientationMock.mockResolvedValue({
      images: [
        { name: "hand-pa.jpg", mime: "image/jpeg", buffer: paBuffer, metadata: null, view: "PA" },
        { name: "hand-lat.jpg", mime: "image/jpeg", buffer: latBuffer, metadata: null, view: "Lateral" },
      ],
      rotationApplied: false,
      warnings: [],
      sides: { "hand-pa.jpg": "Right", "hand-lat.jpg": "Right" },
    });

    estimateAngulationMock.mockResolvedValue({ angulation_deg: 32, method: "metadata" });

    deriveRedFlagsMock.mockReturnValue({ merged: ["Severe swelling"], checklistFlags: ["Severe swelling"] });

    applyCalibrationMock.mockReturnValue({ confidence_calibrated: 0.91, decision_tier: "YES" });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                fracture_present: true,
                bone: "Radius",
                region: "distal",
                suspected_type: "Fracture",
                angulation_deg: 25,
                confidence_0_1: 0.9,
                red_flags: ["Soft tissue swelling"],
              }),
            },
          },
        ],
      }),
    } as any);

    const filePa = buildFile("hand-pa.jpg");
    const fileLat = buildFile("hand-lat.jpg");
    const form = makeForm([filePa, fileLat], { openCut: false, numbness: false, severeSwelling: true });
    const POST = await loadRoute();
    const res = await POST(new Request("http://localhost/api/imaging/analyze", { method: "POST", body: form }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.findings.angulation_deg).toBe(32);
    expect(data.findings.decision_tier).toBe("YES");
    expect(data.metrics.angulation_deg).toBe(32);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("promotes Likely tier and requests lateral when missing", async () => {
    assessImageQualityMock.mockResolvedValue({
      perImage: [
        { name: "hand-pa.jpg", quality_score: 0.7, label: "Fair", tip: "", metrics: { blur: 0.7, exposure: 0.7, crop: 0.7, noise: 0.7 } },
      ],
      overall: { name: "overall", quality_score: 0.7, label: "Fair", tip: "", metrics: { blur: 0.7, exposure: 0.7, crop: 0.7, noise: 0.7 } },
      threshold: 0.55,
    });

    detectViewsMock.mockReturnValue({
      images: [{ name: "hand-pa.jpg", mime: "image/jpeg", buffer: Buffer.from("pa"), metadata: null, view: "PA" }],
      viewsDetected: ["PA"],
      duplicatesPruned: 0,
      missingLateral: true,
    });

    normalizeOrientationMock.mockResolvedValue({
      images: [{ name: "hand-pa.jpg", mime: "image/jpeg", buffer: Buffer.from("pa"), metadata: null, view: "PA" }],
      rotationApplied: false,
      warnings: [],
      sides: { "hand-pa.jpg": "Right" },
    });

    estimateAngulationMock.mockResolvedValue({ angulation_deg: null, method: "none" });

    deriveRedFlagsMock.mockReturnValue({ merged: [], checklistFlags: [] });

    applyCalibrationMock.mockReturnValue({ confidence_calibrated: 0.68, decision_tier: "Likely" });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                fracture_present: true,
                bone: "Radius",
                region: "distal",
                suspected_type: "Fracture",
                angulation_deg: null,
                confidence_0_1: 0.7,
                red_flags: [],
              }),
            },
          },
        ],
      }),
    } as any);

    const form = makeForm([buildFile("hand-pa.jpg")]);
    const POST = await loadRoute();
    const res = await POST(new Request("http://localhost/api/imaging/analyze", { method: "POST", body: form }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.findings.decision_tier).toBe("Likely");
    expect(data.nextStep).toMatch(/lateral/i);
    expect(data.views.missingLateral).toBe(true);
  });

  it("blocks analysis when quality score is poor", async () => {
    assessImageQualityMock.mockResolvedValue({
      perImage: [{ name: "hand-pa.jpg", quality_score: 0.4, label: "Poor", tip: "Hold steady", metrics: { blur: 0.3, exposure: 0.4, crop: 0.5, noise: 0.4 } }],
      overall: { name: "overall", quality_score: 0.4, label: "Poor", tip: "Hold steady", metrics: { blur: 0.3, exposure: 0.4, crop: 0.5, noise: 0.4 } },
      threshold: 0.55,
    });

    const form = makeForm([buildFile("hand-pa.jpg")]);
    const POST = await loadRoute();
    const res = await POST(new Request("http://localhost/api/imaging/analyze", { method: "POST", body: form }));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.error).toContain("Quality: Poor");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces left/right mismatch warnings", async () => {
    assessImageQualityMock.mockResolvedValue({
      perImage: [{ name: "hand-pa.jpg", quality_score: 0.8, label: "Good", tip: "", metrics: { blur: 0.8, exposure: 0.8, crop: 0.8, noise: 0.8 } }],
      overall: { name: "overall", quality_score: 0.8, label: "Good", tip: "", metrics: { blur: 0.8, exposure: 0.8, crop: 0.8, noise: 0.8 } },
      threshold: 0.55,
    });

    detectViewsMock.mockReturnValue({
      images: [{ name: "hand-pa.jpg", mime: "image/jpeg", buffer: Buffer.from("pa"), metadata: null, view: "PA" }],
      viewsDetected: ["PA"],
      duplicatesPruned: 0,
      missingLateral: true,
    });

    normalizeOrientationMock.mockResolvedValue({
      images: [{ name: "hand-pa.jpg", mime: "image/jpeg", buffer: Buffer.from("pa"), metadata: null, view: "PA" }],
      rotationApplied: false,
      warnings: ["Left/right markers conflict"],
      sides: { "hand-pa.jpg": "Left" },
    });

    estimateAngulationMock.mockResolvedValue({ angulation_deg: null, method: "none" });

    deriveRedFlagsMock.mockReturnValue({ merged: [], checklistFlags: [] });

    applyCalibrationMock.mockReturnValue({ confidence_calibrated: 0.6, decision_tier: "Likely" });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                fracture_present: false,
                bone: "Radius",
                region: "distal",
                suspected_type: "",
                angulation_deg: null,
                confidence_0_1: 0.6,
                red_flags: [],
              }),
            },
          },
        ],
      }),
    } as any);

    const form = makeForm([buildFile("hand-pa.jpg")]);
    const POST = await loadRoute();
    const res = await POST(new Request("http://localhost/api/imaging/analyze", { method: "POST", body: form }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data.warnings)).toBe(true);
    expect(data.warnings[0]).toMatch(/left\/right/i);
  });

  it("reports duplicatesPruned when duplicate images are provided", async () => {
    assessImageQualityMock.mockResolvedValue({
      perImage: [
        { name: "a.jpg", quality_score: 0.9, label: "Good", tip: "", metrics: { blur: 0.9, exposure: 0.9, crop: 0.9, noise: 0.9 } },
        { name: "b.jpg", quality_score: 0.9, label: "Good", tip: "", metrics: { blur: 0.9, exposure: 0.9, crop: 0.9, noise: 0.9 } },
      ],
      overall: { name: "overall", quality_score: 0.9, label: "Good", tip: "", metrics: { blur: 0.9, exposure: 0.9, crop: 0.9, noise: 0.9 } },
      threshold: 0.55,
    });

    detectViewsMock.mockReturnValue({
      images: [
        { name: "a.jpg", mime: "image/jpeg", buffer: Buffer.from("x"), metadata: null, view: "PA" },
        { name: "b.jpg", mime: "image/jpeg", buffer: Buffer.from("x"), metadata: null, view: "PA" },
      ],
      viewsDetected: ["PA"],
      duplicatesPruned: 1,
      missingLateral: true,
    });

    normalizeOrientationMock.mockResolvedValue({
      images: [{ name: "a.jpg", mime: "image/jpeg", buffer: Buffer.from("x"), metadata: null, view: "PA" }],
      rotationApplied: false,
      warnings: [],
      sides: { "a.jpg": "Right" },
    });

    estimateAngulationMock.mockResolvedValue({ angulation_deg: null, method: "none" });
    deriveRedFlagsMock.mockReturnValue({ merged: [], checklistFlags: [] });
    applyCalibrationMock.mockReturnValue({ confidence_calibrated: 0.65, decision_tier: "Likely" });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ fracture_present: true, confidence_0_1: 0.65 }) } }],
      }),
    } as any);

    const form = makeForm([buildFile("a.jpg"), buildFile("b.jpg")]);
    const POST = await loadRoute();
    const res = await POST(new Request("http://localhost/api/imaging/analyze", { method: "POST", body: form }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.views.duplicatesPruned).toBeGreaterThan(0);
  });
});
