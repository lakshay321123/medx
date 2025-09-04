import { supabaseAdmin } from '@/lib/supabase/admin';
import type { RiskInputs } from './score';

type ObsRow = {
  kind: string;
  value_num: number | null;
  value_text: string | null;
  unit: string | null;
  observed_at: string;
};

const K = {
  HBA1C: 'hba1c',
  FPG: 'fasting_glucose',
  BMI: 'bmi',
  EGFR: 'egfr',
  SMOKING: 'smoking',
  FHX: 'family_history',
} as const;

export async function deriveInputs(userId: string, threadId?: string): Promise<RiskInputs> {
  const sb = supabaseAdmin();
  let q = sb.from('observations')
    .select('kind,value_num,value_text,unit,observed_at')
    .eq('user_id', userId)
    .order('observed_at', { ascending: false })
    .limit(200);
  if (threadId) q = q.eq('thread_id', threadId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  // pick first occurrence by kind (latest due to ordering)
  const pick = (kind: string): ObsRow | undefined => data?.find(r => r.kind === kind);

  const hba1c = num(pick(K.HBA1C));
  const fpg   = num(pick(K.FPG));
  const bmi   = num(pick(K.BMI));
  const egfr  = num(pick(K.EGFR));

  const smoking       = bool(pick(K.SMOKING));
  const familyHistory = bool(pick(K.FHX));

  return { hba1c, fastingGlucose: fpg, bmi, egfr, smoking, familyHistory };
}

function num(row?: ObsRow): number | undefined {
  if (!row) return undefined;
  if (row.value_num !== null && !Number.isNaN(row.value_num)) return row.value_num;
  const n = parseFloat((row.value_text || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function bool(row?: ObsRow): boolean | undefined {
  if (!row) return undefined;
  if (row.value_text != null) {
    const t = row.value_text.toString().toLowerCase();
    if (['yes','true','1','y'].includes(t)) return true;
    if (['no','false','0','n'].includes(t)) return false;
  }
  if (row.value_num != null) return row.value_num !== 0;
  return undefined;
}
