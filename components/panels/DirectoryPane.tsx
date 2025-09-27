"use client";
import { Phone, MapPin, MessageSquare, Navigation, Star } from "lucide-react";
import AddressPicker from "@/components/directory/AddressPicker";
import { useDirectory } from "@/hooks/useDirectory";

type DirectoryType = ReturnType<typeof useDirectory>["state"]["type"];

const TYPES: { key: DirectoryType; label: string }[] = [
  { key: "doctor", label: "Doctors" },
  { key: "pharmacy", label: "Pharmacies" },
  { key: "lab", label: "Labs" },
  { key: "hospital", label: "Hospitals" },
  { key: "clinic", label: "Clinics" },
  { key: "all", label: "All" },
];

export default function DirectoryPane() {
  const { state, actions } = useDirectory();
  const { locLabel, type, q, openNow, minRating, maxKm, data, loading, summary } = state;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="sticky top-0 z-10 space-y-2 border-b border-black/5 bg-white/80 p-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/60 rounded-t-2xl">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500 ring-4 ring-green-100"></span>
          Using: {locLabel}
          <button
            onClick={actions.useMyLocation}
            className="ml-2 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] hover:bg-slate-50 dark:border-white/10 dark:hover:bg-slate-800"
          >
            Use my location
          </button>
        </div>

        <div className="flex flex-col gap-2 md:flex-row">
          <div className="flex-1">
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 pr-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-slate-300 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100"
              placeholder="Search doctors, pharmacies, labs"
              value={q}
              onChange={(event) => actions.setQ(event.target.value)}
            />
          </div>
          <div className="md:w-[360px]">
            <AddressPicker value={locLabel} onSelect={actions.setAddress} />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto py-1">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => actions.setType(t.key)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm ${
                type === t.key
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => actions.setOpenNow((v) => !v)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Open now {openNow ? "✓" : ""}
          </button>
          <button
            onClick={() => actions.setMinRating((r) => (r ? null : 4))}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ★ 4.0+ {minRating ? "✓" : ""}
          </button>
          <button
            onClick={() => actions.setMaxKm((k) => (k ? null : 3))}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Under 3 km {maxKm ? "✓" : ""}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
        <div>{loading ? "Loading" : summary}</div>
        <div className="rounded-full border border-slate-200 px-2 py-1 dark:border-white/10">Map</div>
      </div>

      <div className="mobile-scroll-safe flex-1 space-y-3 overflow-y-auto p-3">
        {!loading && data.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300">
            No results. Try All, increase radius, or change the address.
          </div>
        )}
        {data.map((place) => (
          <div
            key={place.id}
            className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/60"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900 dark:text-slate-50">{place.name}</div>
              <div className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] capitalize text-blue-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100">
                {place.type}
              </div>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1">
                <Star size={14} /> {place.rating ?? "—"}
              </span>
              {typeof place.distance_m === "number" && <span>• {(place.distance_m / 1000).toFixed(1)} km</span>}
              <span>• {place.open_now ? "Open now" : "Hours not available"}</span>
            </div>

            {place.address_short && (
              <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{place.address_short}</div>
            )}

            <div className="mt-3 grid grid-cols-4 gap-2">
              <a
                href={place.phones?.[0] ? `tel:${place.phones[0].replace(/\s+/g, "")}` : undefined}
                className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-sm font-medium transition ${
                  place.phones?.[0]
                    ? "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                    : "pointer-events-none cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                <Phone size={16} /> Call
              </a>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${place.geo.lat},${place.geo.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
              >
                <Navigation size={16} /> Directions
              </a>

              <a
                href={place.whatsapp ? `https://wa.me/${place.whatsapp.replace(/\D/g, "")}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-sm font-medium transition ${
                  place.whatsapp
                    ? "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                    : "pointer-events-none cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                <MessageSquare size={16} /> WhatsApp
              </a>

              <button
                onClick={() => navigator.clipboard.writeText(place.address_short ?? "")}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                title="Copy address"
              >
                <MapPin size={16} /> Copy
              </button>
            </div>

            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Data: OpenStreetMap • Last checked {new Date(place.last_checked ?? Date.now()).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
