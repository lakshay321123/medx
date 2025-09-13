export type AlertSeverity = "info" | "warning" | "critical";
export type AlertKind =
  | "system" | "clinical_redflag" | "drug_interaction" | "lab_critical"
  | "reminder" | "account" | "data_import";

export interface AlertItem {
  id: string;           // nanoid
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  message?: string;
  createdAt: string;    // ISO
  read?: boolean;
  meta?: Record<string, any>;
}
