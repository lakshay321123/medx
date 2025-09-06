import framesData from "./frames.json";

export type CaptureKey = "duration"|"tempC"|"painScore"|"location"|"spo2Pct";
export type Frame = {
  synonyms: string[];
  red_flags: string[];
  followups: { id: string; ask: string; capture: CaptureKey }[];
  self_care: string;
  tests: string[];
  when_to_see: string;
};
export type FramesMap = Record<string, Frame>;

const FRAMES: FramesMap = framesData as any;

export function listFrames(): [string, Frame][] {
  return Object.entries(FRAMES);
}

export function matchFrame(text: string): { key: string; frame: Frame } | null {
  const t = (text || "").toLowerCase();
  for (const [key, frame] of listFrames()) {
    if (frame.synonyms?.some(s => t.includes(s.toLowerCase()))) {
      return { key, frame };
    }
  }
  return null;
}

// simple generic fallback (e.g., respiratory)
export function fallbackFrame(text: string): { key: string; frame: Frame } | null {
  const t = (text || "").toLowerCase();
  if (["_generic_respiratory"].some(k => FRAMES[k]?.synonyms?.some(s => t.includes(s)))) {
    return { key: "_generic_respiratory", frame: FRAMES["_generic_respiratory"] };
  }
  return null;
}
