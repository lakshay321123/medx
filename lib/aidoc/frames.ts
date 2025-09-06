import framesData from './frames.json' assert { type: 'json' };

export type Followup = { key: string; question: string };
export type Frame = {
  synonyms: string[];
  red_flags: string[];
  followups: Followup[];
  self_care: string;
  tests: string[];
  when_to_see: string;
};

const FRAMES: Record<string, Frame> = framesData as any;

export function matchFrame(text: string): { key: string; frame: Frame } | null {
  const q = text.toLowerCase();
  for (const [key, frame] of Object.entries(FRAMES)) {
    for (const syn of frame.synonyms) {
      if (q.includes(syn.toLowerCase())) return { key, frame };
    }
  }
  return null;
}

export function fallbackFrame(text: string): { key: string; frame: Frame } | null {
  const generic = FRAMES['_generic_respiratory'];
  if (!generic) return null;
  const q = text.toLowerCase();
  for (const syn of generic.synonyms) {
    if (q.includes(syn.toLowerCase())) return { key: '_generic_respiratory', frame: generic };
  }
  return null;
}

export { FRAMES };
