export function getResearchFlagFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const v = new URLSearchParams(window.location.search).get('research');
  return v === '1' || v === 'true';
}
