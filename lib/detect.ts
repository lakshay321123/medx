export type DocumentType = 'prescription' | 'lab' | 'imaging' | 'clinical' | 'other';

/**
 * Simple rule-based document type detector.  It inspects the raw text for
 * common keywords or structures associated with typical medical documents.
 * A more advanced implementation could add ML classification when the
 * heuristic confidence is low.
 */
export function detectDocumentType(text: string, mime: string, fileName: string): DocumentType {
  const lower = text.toLowerCase();

  // --- Prescription ---
  if (/\b(rx|tab\.|cap\.|inj\.|od|bd|tds|sig)\b/.test(lower) && /\b(mg|ml|mcg)\b/.test(lower)) {
    return 'prescription';
  }

  // --- Lab Report ---
  if (/test name|reference range|mg\/dl|mmol\/l|cbc|hemoglobin|cholesterol|thyroid/.test(lower)) {
    return 'lab';
  }

  // --- Imaging Report ---
  if (/x-ray|ct\b|mri|ultrasound|impression|findings/.test(lower)) {
    return 'imaging';
  }

  // --- Clinical Note / Discharge Summary ---
  if (/admitted|discharge|diagnosis|treatment|plan/.test(lower)) {
    return 'clinical';
  }

  return 'other';
}
