export function htnRules({ vitals, mem }:{ vitals:any[]; mem:any }) {
  const steps: string[] = [];
  const nudges: string[] = [];
  const fired: string[] = [];
  const softAlerts: any[] = [];
  steps.push("If hypertension is suspected, record a 7-day home BP log (morning & evening) and share averages.");
  fired.push("htn.home_bp_log");
  return { steps, nudges, fired, softAlerts };
}
