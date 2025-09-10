export function coSeverity(cohb_percent: number, pregnant: boolean = false) {
  const severe = pregnant ? (cohb_percent >= 15) : (cohb_percent >= 25);
  return { severe, recommendation: severe ? "Consider hyperbaric oxygen if clinically appropriate." : "Treat with 100% oxygen; monitor." };
}

export function cyanideSupport(lactate_mmol_L: number, smoke_inhalation: boolean) {
  const supportive = smoke_inhalation && lactate_mmol_L >= 10;
  return { supportive, note: "Very high lactate in smoke inhalation supports cyanide toxicity consideration." };
}
