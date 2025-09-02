export type DocumentType = "prescription" | "lab" | "imaging" | "clinical" | "other";

export function detectDocumentType(text: string, mime: string = "", fileName: string = ""): DocumentType {
  const lower = (text || "").toLowerCase();

  // Prescription: look for drug patterns and Rx symbols
  if (
    /\brx\b/.test(lower) ||
    /\btab\.|\bcap\.|\binj\.|\b\d+\s?mg\b|\b\d+\s?ml\b/.test(lower) ||
    /\bod\b|\bbd\b|\btds\b/.test(lower)
  ) {
    return "prescription";
  }

  // Lab report: test names, units, reference ranges
  if (
    /test name|reference range|mg\/dl|mmol\/l|µiu\/ml|cbc|hemoglobin|cholesterol|triglycerides|hba1c|thyroid/.test(
      lower
    )
  ) {
    return "lab";
  }

  // Imaging report: findings, impression, radiology terms
  if (
    /x-ray|mri|ct scan|ultrasound|impression|radiograph|findings/.test(lower)
  ) {
    return "imaging";
  }

  // Clinical / discharge notes: diagnosis + plan language
  if (
    /admitted|discharge|diagnosis|treatment|plan|follow-up|clinical history/.test(lower)
  ) {
    return "clinical";
  }

  // Fallback
  return "other";
}
