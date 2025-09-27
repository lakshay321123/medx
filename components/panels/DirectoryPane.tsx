"use client";
import { useEffect, useMemo, useState } from "react";
import { Phone, MapPin, MessageSquare, Navigation, Star } from "lucide-react";

type Place = {
  id: string;
  name: string;
  type: "doctor" | "pharmacy" | "lab";
  specialties?: string[];
  rating?: number;
  reviews_count?: number;
  price_level?: number;
  distance_m?: number;
  open_now?: boolean;
  hours?: Record<string, string>;
  phones?: string[];
  whatsapp?: string | null;
  address_short?: string;
  geo: { lat: number; lng: number };
  amenities?: string[];
  services?: string[];
  images?: string[];
  source: "osm" | "google";
  source_ref?: string;
  last_checked?: string;
  rank_score?: number;
};

const SAMPLE: Place[] = [
  {
    id: "pl_01",
    name: "Sharma Cardiac Clinic",
    type: "doctor",
    specialties: ["Cardiology"],
    rating: 4.4,
    reviews_count: 128,
    price_level: 2,
    distance_m: 1200,
    open_now: true,
    hours: { mon: "10:00-21:00" },
    phones: ["+91 98xxxxxx12"],
    whatsapp: "+91 98xxxxxx12",
    address_short: "C-56, South Ex II",
    geo: { lat: 28.56, lng: 77.2 },
    amenities: ["Wheelchair", "Parking"],
    services: ["ECG", "Echo", "TMT"],
    source: "osm",
    last_checked: new Date().toISOString(),
  },
  {
    id: "pl_02",
    name: "GreenLeaf Pharmacy",
    type: "pharmacy",
    rating: 4.2,
    reviews_count: 64,
    distance_m: 650,
    open_now: true,
    phones: ["+91 9xxxxxxx50"],
    whatsapp: "+91 9xxxxxxx50",
    address_short: "A-17, Gautam Nagar",
    geo: { lat: 28.55, lng: 77.21 },
    amenities: ["Cashless"],
    services: ["Home delivery"],
    source: "google",
    last_checked: new Date().toISOString(),
  },
  {
    id: "pl_03",
    name: "NovaPath Labs",
    type: "lab",
    rating: 4.6,
    reviews_count: 210,
    distance_m: 2000,
    open_now: true,
    phones: ["+91 98xxxxxx35"],
    address_short: "E-12, Kailash Colony",
    geo: { lat: 28.548, lng: 77.22 },
    amenities: ["Parking"],
    services: ["RT-PCR", "Blood tests"],
    source: "google",
    last_checked: new Date().toISOString(),
  },
];

const TYPES = [
  { key: "doctor", label: "Doctors" },
  { key: "pharmacy", label: "Pharmacies" },
  { key: "lab", label: "Labs" },
] as const;

export default function DirectoryPane() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<"doctor" | "pharmacy" | "lab">("doctor");
  const [openNow, setOpenNow] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [maxKm, setMaxKm] = useState<number | null>(null);

  // TODO: replace with real /api/directory/search later. For now, mock guarantees build.
  const [data, setData] = useState<Place[]>(SAMPLE);
  useEffect(() => {
    // keep placeholder so wiring is trivial later:
    // fetch(`/api/directory/search?...`).then(r => r.json()).then(setData).catch(()=>setData(SAMPLE))
    setData(SAMPLE);
  }, []);

  const results = useMemo(() => {
    return data
      .filter(p => p.type === active)
      .filter(p => (q ? p.name.toLowerCase().includes(q.toLowerCase()) : true))
      .filter(p => (openNow ? p.open_now : true))
      .filter(p => (minRating ? (p.rating ?? 0) >= minRating : true))
      .filter(p => (maxKm ? ((p.distance_m ?? 0) / 1000) <= maxKm : true));
  }, [data, active, q, openNow, minRating, maxKm]);

  return (
    <div className="flex min-h-0 flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 space-y-2 bg-white/80 p-3 backdrop-blur dark:bg-slate-900/60 border-b border-black/5 dark:border-white/10 rounded-t-2xl">
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500 ring-4 ring-green-100"></span>
          Using your location • South Delhi
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              className="w-full h-10 rounded-xl border border-slate-200 bg-white/90 px-3 pr-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-slate-300 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100"
              placeholder="Search doctors, pharmacies, labs"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15.5 15.5L21 21" stroke="#6b7280" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="10.5" cy="10.5" r="6.5" stroke="#6b7280" strokeWidth="1.6"/>
            </svg>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Near me</span>
        </div>

        <div className="flex gap-2 overflow-x-auto py-1">
          {TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm ${
                active === t.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setOpenNow(v => !v)} className="rounded-full border px-3 py-1 text-xs text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10">
            Open now {openNow ? "✓" : ""}
          </button>
          <button onClick={() => setMinRating(r => (r ? null : 4))} className="rounded-full border px-3 py-1 text-xs text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10">
            ★ 4.0+ {minRating ? "✓" : ""}
          </button>
          <button onClick={() => setMaxKm(k => (k ? null : 3))} className="rounded-full border px-3 py-1 text-xs text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10">
            &lt; 3 km {maxKm ? "✓" : ""}
          </button>
          <span className="rounded-full border px-3 py-1 text-xs text-slate-400 border-slate-200 dark:border-white/10">24×7</span>
          <span className="rounded-full border px-3 py-1 text-xs text-slate-400 border-slate-200 dark:border-white/10">Cashless</span>
          <span className="rounded-full border px-3 py-1 text-xs text-slate-400 border-slate-200 dark:border-white/10">Wheelchair</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
        <div>{results.length} results • updated just now</div>
        <div className="rounded-full border border-slate-200 px-2 py-1 dark:border-white/10">Map</div>
      </div>

      {/* List */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3 mobile-scroll-safe">
        {results.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900 dark:text-slate-50">{p.name}</div>
              <div className="rounded-full border px-2 py-0.5 text-[11px] text-blue-900 border-blue-200 bg-blue-50 dark:bg-slate-800 dark:border-white/10 dark:text-slate-100 capitalize">
                {p.type === "doctor" ? (p.specialties?.[0] ?? "Doctor") : p.type === "pharmacy" ? "Pharmacy" : "Diagnostic Lab"}
              </div>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1">
                <Star size={14} /> {p.rating ?? "—"}
              </span>
              <span>• {(p.distance_m ?? 0) / 1000} km</span>
              <span>• {p.open_now ? "Open now" : "Closed"}</span>
              {p.price_level ? <span>• {"₹".repeat(p.price_level)}</span> : null}
            </div>

            <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{p.address_short}</div>

            <div className="mt-2 flex flex-wrap gap-1">
              {(p.services ?? []).slice(0, 3).map(s => (
                <span key={s} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] dark:border-white/10 dark:bg-slate-800">{s}</span>
              ))}
              {(p.amenities ?? []).slice(0, 3).map(a => (
                <span key={a} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] dark:border-white/10 dark:bg-slate-800">{a}</span>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {/* Call */}
              <a
                href={p.phones?.[0] ? `tel:${p.phones[0].replace(/\s+/g, "")}` : undefined}
                className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-sm font-medium transition ${
                  p.phones?.[0]
                    ? "bg-white text-slate-900 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:border-white/10"
                    : "pointer-events-none cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                <Phone size={16} /> Call
              </a>

              {/* Directions → Google Maps */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${p.geo.lat},${p.geo.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
              >
                <Navigation size={16} /> Directions
              </a>

              {/* WhatsApp */}
              <a
                href={p.whatsapp ? `https://wa.me/${p.whatsapp.replace(/\D/g, "")}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-sm font-medium transition ${
                  p.whatsapp
                    ? "bg-white text-slate-900 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:border-white/10"
                    : "pointer-events-none cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                <MessageSquare size={16} /> WhatsApp
              </a>

              {/* Address copy (simple) */}
              <button
                onClick={() => navigator.clipboard.writeText(p.address_short ?? "")}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                title="Copy address"
              >
                <MapPin size={16} /> Copy
              </button>
            </div>

            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Data: Open data / Google • Last checked {new Date(p.last_checked ?? Date.now()).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
