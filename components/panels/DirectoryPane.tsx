// components/panels/DirectoryPane.tsx
"use client";
import { Phone, MapPin, MessageSquare, Navigation, Star } from "lucide-react";
import AddressPicker from "@/components/directory/AddressPicker";
import { useDirectory } from "@/hooks/useDirectory";

const TYPES = [
  { key: "doctor", label: "Doctors" },
  { key: "pharmacy", label: "Pharmacies" },
  { key: "lab", label: "Labs" },
  { key: "hospital", label: "Hospitals" },
  { key: "clinic", label: "Clinics" },
  { key: "all", label: "All" },
] as const;

export default function DirectoryPane() {
  const { state, actions } = useDirectory();
  const {
    locLabel, type, q, openNow, minRating, maxKm, data, loading, summary,
  } = state;

  return (
    <div className="flex min-h-0 flex-col">
      {/* Header: compact */}
      <div className="sticky top-0 z-10 space-y-1 bg-white/90 p-2 backdrop-blur-md dark:bg-slate-900/70 border-b border-black/5 dark:border-white/10">
        <div className="text-[11px] leading-5 text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500 ring-2 ring-green-100"></span>
          {locLabel}
          <button
            onClick={actions.useMyLocation}
            className="ml-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] leading-4 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-slate-800"
            title="Use precise location"
          >
            Use my location
          </button>
        </div>

        <div className="flex flex-col gap-1 md:flex-row">
          <div className="flex-1">
            <input
              className="w-full h-10 rounded-lg border border-slate-200 bg-white/95 px-2.5 pr-8 text-[13px] leading-5 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-slate-300 focus:outline-none dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100"
              placeholder="Search doctors, pharmacies, labs"
              value={q}
              onChange={e => actions.setQ(e.target.value)}
            />
          </div>
          <div className="md:w-[320px]">
            <AddressPicker value={locLabel} onSelect={actions.setAddress} />
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto py-0.5">
          {TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => actions.setType(t.key as any)}
              className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[12.5px] ${
                type === t.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 overflow-x-auto pb-0.5">
          <button onClick={() => actions.setOpenNow(v => !v)} className="rounded-full border px-2.5 py-1 text-[12px] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10">
            Open now {openNow ? "✓" : ""}
          </button>
          <button onClick={() => actions.setMinRating(r => (r ? null : 4))} className="rounded-full border px-2.5 py-1 text-[12px] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10">
            Star 4 plus {minRating ? "✓" : ""}
          </button>
          <button onClick={() => actions.setMaxKm(k => (k ? null : 3))} className="rounded-full border px-2.5 py-1 text-[12px] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10">
            Under 3 km {maxKm ? "✓" : ""}
          </button>
        </div>
      </div>

      {/* Toolbar: compact */}
      <div className="flex items-center justify-between px-3 py-1 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
        <div>{loading ? "Loading" : summary}</div>
        <div className="rounded-full border border-slate-200 px-2 py-0.5 text-[12px] dark:border-white/10">Map</div>
      </div>

      {/* List: tighter spacing */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2 mobile-scroll-safe">
        {!loading && data.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white/80 p-3 text-[13px] text-slate-600 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300">
            No results. Try All, increase radius, or change the address.
          </div>
        )}

        {data.map((p) => (
          <div
            key={p.id}
            className="rounded-lg border border-slate-200 bg-white/85 p-2.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70"
          >
            <div className="flex items-center justify-between">
              <div className="truncate font-semibold text-[13.5px] text-slate-900 dark:text-slate-50">{p.name}</div>
              <div className="ml-2 shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-blue-900 border-blue-200 bg-blue-50 dark:bg-slate-800 dark:border-white/10 dark:text-slate-100 capitalize">
                {p.type}
              </div>
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1 shrink-0">
                <Star size={14} /> {p.rating ?? "—"}
              </span>
              {typeof p.distance_m === "number" && <span className="shrink-0">• {(p.distance_m / 1000).toFixed(1)} km</span>}
              <span className="truncate">• {p.open_now ? "Open now" : "Hours not available"}</span>
            </div>

            {p.address_short && (
              <div className="mt-0.5 truncate text-[13px] text-slate-700 dark:text-slate-200">
                {p.address_short}
              </div>
            )}

            {/* Actions: 2 per row on mobile, 4 on md+ */}
            <div className="mt-2 -mx-1 flex flex-wrap">
              <ActionSlot>
                <a
                  href={p.phones?.[0] ? `tel:${p.phones[0].replace(/\s+/g, "")}` : undefined}
                  className={`inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border px-2 text-[12.5px] font-medium transition ${
                    p.phones?.[0]
                      ? "bg-white text-slate-900 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:border-white/10"
                      : "pointer-events-none cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500"
                  }`}
                >
                  <Phone size={16} /> Call
                </a>
              </ActionSlot>

              <ActionSlot>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${p.geo.lat},${p.geo.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[12.5px] font-medium text-slate-900 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                >
                  <Navigation size={16} /> Directions
                </a>
              </ActionSlot>

              {p.whatsapp && (
                <ActionSlot>
                  <a
                    href={`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[12.5px] font-medium text-slate-900 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <MessageSquare size={16} /> WhatsApp
                  </a>
                </ActionSlot>
              )}

              <ActionSlot>
                <button
                  onClick={() => navigator.clipboard.writeText(p.address_short ?? "")}
                  className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[12.5px] font-medium text-slate-900 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                  title="Copy address"
                >
                  <MapPin size={16} /> Copy
                </button>
              </ActionSlot>
            </div>

            <div className="mt-1 text-[10.5px] text-slate-500 dark:text-slate-400">
              Data: Updated recently
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Two per row on mobile, four per row on md+ */
function ActionSlot({ children }: { children: React.ReactNode }) {
  return <div className="w-1/2 px-1 sm:w-1/4">{children}</div>;
}
