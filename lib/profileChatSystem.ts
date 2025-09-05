export function profileChatSystem(snapshot: {
  summary?: string;
  reasons?: string;
  profile?: any;
  packet?: string;
}) {
  const { summary = "", reasons = "", profile = {}, packet = "" } = snapshot || {};
  return [
    "You are MedX’s AI Doc chat. Stay anchored to THIS PATIENT ONLY.",
    "Use the packet & snapshot below; do NOT start new topics unless asked.",
    "",
    "— Patient Packet —",
    packet || "(none)",
    "",
    "— Snapshot —",
    summary ? `Summary:\n${summary}` : "Summary: (none)",
    reasons ? `Reasons:\n${reasons}` : "Reasons: (none)",
    profile ? `Profile JSON:\n${JSON.stringify(profile)}` : "",
    "",
    "Rules: acknowledge corrections; clarify shorthand (e.g., NP → neutrophil %);",
    "avoid definitive diagnoses; suggest confirmatory tests & clinician follow-up.",
  ].join("\n");
}
