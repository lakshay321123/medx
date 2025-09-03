export type Country = { code2: string; code3: string; name: string; flag: string };

export const COUNTRIES: Country[] = [
  { code2: "IN", code3: "IND", name: "India", flag: "🇮🇳" },
  { code2: "US", code3: "USA", name: "United States", flag: "🇺🇸" },
  { code2: "GB", code3: "GBR", name: "United Kingdom", flag: "🇬🇧" },
  { code2: "AE", code3: "ARE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code2: "SG", code3: "SGP", name: "Singapore", flag: "🇸🇬" },
  { code2: "CA", code3: "CAN", name: "Canada", flag: "🇨🇦" },
  { code2: "AU", code3: "AUS", name: "Australia", flag: "🇦🇺" },
  { code2: "DE", code3: "DEU", name: "Germany", flag: "🇩🇪" },
  { code2: "FR", code3: "FRA", name: "France", flag: "🇫🇷" },
  { code2: "ZA", code3: "ZAF", name: "South Africa", flag: "🇿🇦" }
];

export const byCode2 = (c2: string) => COUNTRIES.find(c => c.code2 === c2.toUpperCase());
export const byCode3 = (c3: string) => COUNTRIES.find(c => c.code3 === c3.toUpperCase());
