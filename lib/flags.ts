export const flags = {
  // Trials & health information
  enableTrialsCTG: true,
  enableTrialsISRCTN: false,
  enableTrialsEUCTR: false,
  enableTrialsICTRP: false,

  // Books & patient info
  enableBooksNCBI: true,
  enableMedlinePlus: true,

  // Research sources
  enableOpenAlex: true,
  enableSemanticScholar: true,
  enableEuropePMC: true,
  enableCrossref: true,
  enableUnpaywall: true,

  // Clinical & biomolecular data
  enableHPO: true,
  enableLOINC: true,
  enableDrugCentral: true,
  enableOpenTargets: true,

  // Nutrition & safety
  enableUSDA: true,
  enableVAERS: true,

  // Geodata
  enableNominatim: true,
  enableOverpass: true,
};

export const FLAGS = {
  carryContextAcrossNewChats:
    process.env.CARRY_CONTEXT_ACROSS_NEW_CHATS === "true",
  applyMedicalPolicy:
    process.env.APPLY_MEDICAL_POLICY === "true",
} as const;
