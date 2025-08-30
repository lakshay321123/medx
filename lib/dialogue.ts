export type Mode = 'patient' | 'doctor';

export type Intent =
  | 'nearby'
  | 'clinical_trials'
  | 'condition_overview'
  | 'medication_advice'
  | 'drug_interactions'
  | 'concept_lookup'
  | 'doc_finder_spine_group'
  | 'unknown';

export type Slots = {
  // common slots
  condition?: string;        // e.g., "thyroid cancer", "dry cough"
  specialty?: string;        // e.g., "gynecology"
  specialtyGroup?: string;   // e.g., "spine"
  location?: { lat?: number; lon?: number };
  countryCode?: string | null;
  audience?: 'patient' | 'doctor' | 'general';
  // search controls
  radiusKm?: number;
  language?: string;
};

export type DialogueState = {
  mode: Mode;
  intent: Intent;
  slots: Slots;
  missing: Array<keyof Slots>;
  confidence: number; // 0-1
};

export function initialState(mode: Mode, countryCode?: string | null): DialogueState {
  return { mode, intent: 'unknown', slots: { countryCode }, missing: [], confidence: 0.0 };
}

// Very light rules on when to clarify
export function needsClarification(s: DialogueState): boolean {
  // Nearby: need at least kind (doctor/pharmacy/clinic/hospital) OR specialty/specialtyGroup
  if (s.intent === 'nearby') {
    const hasTarget = !!(s.slots.specialty || s.slots.specialtyGroup);
    const hasLoc = !!(s.slots.location?.lat && s.slots.location?.lon);
    // We can IP-fallback, so don't block on location.
    return !hasTarget; // ask "Which type …?"
  }
  if (s.intent === 'medication_advice') {
    // Need condition & country for region-aware OTC
    return !s.slots.condition;
  }
  if (s.intent === 'clinical_trials') {
    return !s.slots.condition;
  }
  return false;
}

// Short, specific clarifying questions
export function clarificationPrompt(s: DialogueState): string | null {
  if (!needsClarification(s)) return null;
  if (s.intent === 'nearby') {
    return `Which specialist do you need nearby? For example: **Gynecologist**, **Cardiologist**, **Orthopedic**, or **Spine clinic**.`;
  }
  if (s.intent === 'medication_advice') {
    return `Is this for **dry cough** or **wet/productive cough**? Any other symptoms (fever, wheeze, chest pain)?`;
  }
  if (s.intent === 'clinical_trials') {
    return `Which condition should I search trials for? For example: **breast cancer**, **glioblastoma**, **thyroid cancer**.`;
  }
  return null;
}

// Confirm + proceed sentence, kept short
export function confirmLine(s: DialogueState): string | null {
  if (s.intent === 'nearby' && (s.slots.specialty || s.slots.specialtyGroup)) {
    const label = s.slots.specialtyGroup || s.slots.specialty || 'doctors';
    return `Okay — I’ll search for **${title(label)}** near you.`;
  }
  if (s.intent === 'clinical_trials' && s.slots.condition) {
    return `Okay — pulling the latest **clinical trials** for **${s.slots.condition}**…`;
  }
  if (s.intent === 'medication_advice' && s.slots.condition) {
    return `Okay — here’s guidance for **${s.slots.condition}** in your country.`;
  }
  return null;
}

export function followUps(s: DialogueState): string[] {
  // Contextual follow-ups (max 4)
  if (s.intent === 'nearby') {
    const chips = ['Within 2 km', 'Open now', 'Show hospitals', 'Increase radius'];
    if (s.slots.specialty === 'gynecology' || s.slots.specialtyGroup === 'spine')
      chips.unshift('Filter by women doctors');
    return chips.slice(0,4);
  }
  if (s.intent === 'clinical_trials') {
    return ['Filter to Phase 3', 'Only recruiting', 'Show India only', 'Get eligibility summary'];
  }
  if (s.intent === 'medication_advice') {
    return ['Show interactions', 'Non-drowsy options', 'When to see a doctor', 'Home care tips'];
  }
  if (s.intent === 'condition_overview') {
    return ['Common tests', 'Red-flag symptoms', 'Latest guidelines', 'See clinical trials'];
  }
  return ['Explain more', 'Show trusted sources'];
}

export function title(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
