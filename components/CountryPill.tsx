'use client';
import { useLocale } from '@/lib/locale';

const COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'EU', name: 'European Union' },
  // add more as needed
];

export default function CountryPill() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
      <span>Country:</span>
      <select
        className="bg-transparent outline-none"
        value={locale.countryCode || ''}
        onChange={(e) => {
          const code = e.target.value || null;
          const item = COUNTRIES.find(c => c.code === code) || null;
          setLocale({ countryCode: item?.code || null, countryName: item?.name || null });
        }}
      >
        <option value="">Auto</option>
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
