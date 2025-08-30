export type Locale = { countryCode: string; language: string };

export function serverLocale(requestHeaders: Headers): Locale {
  const cc = requestHeaders.get('x-vercel-ip-country') || 'US';
  const accept = requestHeaders.get('accept-language') || 'en-US';
  const lang = accept.split(',')[0] || 'en';
  return { countryCode: cc, language: lang };
}

export function clientLocale(): Locale {
  const lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-US';
  const cc = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').includes('Asia') ? 'IN' : 'US';
  return { countryCode: (window as any).__COUNTRY__ || cc, language: lang };
}
