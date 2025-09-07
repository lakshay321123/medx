export const AIDOC_JSON_INSTRUCTION = `
Return ONLY valid JSON with this shape:
{
  "reply": "assistant message",
  "save": {
    "medications": [{"name": "...", "dose": "500 mg", "route": "oral", "freq": "bid", "startedAt":"YYYY-MM-DD"}],
    "conditions": [{"label":"Type 2 Diabetes", "code":"E11", "status":"active","since":"YYYY-MM-DD"}],
    "labs": [{"panel":"LFT","name":"ALT","value":42,"unit":"U/L","refLow":0,"refHigh":40,"takenAt":"YYYY-MM-DD"}],
    "notes": [{"type":"symptom","key":"fever","value":"2 days"}],
    "prefs": [{"key":"pill_form","value":"prefers liquid syrups"}]
  },
  "observations": {
    "short": "2-3 lines; no family hx repetition; action-oriented",
    "long": "full nuance; list ACTIVE conditions; list stale panels to repeat"
  }
}
`;

