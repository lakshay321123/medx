import data from '@/data/emergency.json';

export type EmergencyNumbers = Record<string, string>;

export function emergencyNumbers(region?: string): EmergencyNumbers | null {
  const enabled = (process.env.EMERGENCY_CALL_BUTTONS || '').toLowerCase() === 'true';
  if (!enabled) return null;
  const key = (region || '').toUpperCase();
  const numbers = (data as Record<string, EmergencyNumbers>)[key];
  return numbers || null;
}
