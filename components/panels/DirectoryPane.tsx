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
      <div className="sticky top-0 z-10 space-y-2.5 border-b border-black/5 bg-white/85 px-2.5 pb-2.5 pt-1.5 backdrop-blur dark:border-white/10 dark:bg-slate-950/60 md:space-y-3 md:px-3 md:pb-3 md:pt-2">
        <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 dark:text-slate-400 md:gap-2 md:text-[11px]">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
          <span className="truncate">Using: {locLabel}</span>
          <button
            onClick={actions.useMyLocation}
            className="ml-auto inline-flex h-8 items-center gap-1 truncate rounded-full border border-slate-200 px-2.5 text-[10.5px] font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-9 md:px-3 md:text-[11px]"
          >
            Use my location
          </button>
        </div>

        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-2">
          <div className="flex-1">
            <input
              className="h-9 w-full rounded-[10px] border border-slate-200 bg-white/90 px-3 text-[12px] text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-slate-300 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 md:h-10 md:text-[13px]"
              placeholder="Search doctors, pharmacies, labs"
              value={q}
              onChange={(event) => actions.setQ(event.target.value)}
            />
          </div>
          <div className="md:w-[320px]">
            <AddressPicker value={locLabel} onSelect={actions.setAddress} />
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 md:gap-2">
          {TYPES.map((t) => {
            const selected = type === t.key;
            return (
              <button
                key={t.key}
                onClick={() => actions.setType(t.key)}
                className={`inline-flex h-[28px] min-w-[64px] items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[11.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-[30px] md:min-w-[72px] md:px-3 md:text-[12.5px] ${
                  selected
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
                aria-pressed={selected}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 md:gap-2">
          <button
            onClick={() => actions.setOpenNow((v) => !v)}
            className={`inline-flex h-[28px] items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[11.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-[30px] md:px-3 md:text-[12px] ${
              openNow
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
            aria-pressed={openNow}
          >
            Open now
          </button>
          <button
            onClick={() => actions.setMinRating((r) => (r ? null : 4))}
            className={`inline-flex h-[28px] items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[11.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-[30px] md:px-3 md:text-[12px] ${
              minRating
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
            aria-pressed={Boolean(minRating)}
          >
            Star 4 plus
          </button>
          <button
            onClick={() => actions.setMaxKm((k) => (k ? null : 3))}
            className={`inline-flex h-[28px] items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[11.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-[30px] md:px-3 md:text-[12px] ${
              maxKm
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
            aria-pressed={Boolean(maxKm)}
          >
            Under 3 km
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 md:px-3 md:py-2 md:text-[12px]">
        <div className="truncate">{loading ? "Loading" : summary}</div>
        <div className="inline-flex h-[24px] items-center rounded-full border border-slate-200 px-2.5 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:text-slate-200 md:h-[27px] md:px-3 md:text-[12px]">
          Map
        </div>
      </div>

      <div className="mobile-scroll-safe flex-1 space-y-2.5 overflow-y-auto px-2.5 pb-3.5 md:space-y-3 md:px-3 md:pb-4">
        {!loading && data.length === 0 && (
          <div className="rounded-[10px] border border-slate-200 bg-white/75 p-3 text-[12.5px] text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300 md:rounded-[12px] md:p-4 md:text-[13px]">
            No results. Try All, increase radius, or change the address.
          </div>
        )}
        {data.map((place) => {
          const actionsList = [
            place.phones?.[0]
              ? {
                  key: "call",
                  label: "Call",
                  icon: <Phone size={16} aria-hidden />,
                  element: (
                    <a
                      href={`tel:${place.phones[0].replace(/\s+/g, "")}`}
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-[10px] border border-slate-200 bg-white/90 px-2 text-[11.5px] font-medium text-slate-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-9 md:px-2.5 md:text-[12.5px]"
                    >
                      <Phone size={16} aria-hidden /> Call
                    </a>
                  ),
                }
              : null,
            {
              key: "directions",
              label: "Directions",
              element: (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${place.geo.lat},${place.geo.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-[10px] border border-slate-200 bg-white/90 px-2 text-[11.5px] font-medium text-slate-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-9 md:px-2.5 md:text-[12.5px]"
                >
                  <Navigation size={16} aria-hidden /> Directions
                </a>
              ),
            },
            place.whatsapp
              ? {
                  key: "whatsapp",
                  label: "WhatsApp",
                  element: (
                    <a
                      href={`https://wa.me/${place.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-[10px] border border-slate-200 bg-white/90 px-2 text-[11.5px] font-medium text-slate-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-9 md:px-2.5 md:text-[12.5px]"
                    >
                      <MessageSquare size={16} aria-hidden /> WhatsApp
                    </a>
                  ),
                }
              : null,
            place.address_short
              ? {
                  key: "copy",
                  label: "Copy",
                  element: (
                    <button
                      onClick={() => navigator.clipboard.writeText(place.address_short ?? "")}
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-[10px] border border-slate-200 bg-white/90 px-2 text-[11.5px] font-medium text-slate-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-9 md:px-2.5 md:text-[12.5px]"
                      title="Copy address"
                      aria-label="Copy address"
                    >
                      <MapPin size={16} aria-hidden /> Copy
                    </button>
                  ),
                }
              : null,
          ].filter(Boolean) as {
            key: string;
            label: string;
            element: JSX.Element;
          }[];

          return (
            <div
              key={place.id}
              className="rounded-[10px] border border-slate-200 bg-white/85 p-2.5 shadow-sm backdrop-blur-sm transition hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 md:rounded-[12px] md:p-3"
            >
              <div className="flex items-start gap-2.5 md:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2.5 md:gap-3">
                    <div className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-50 md:text-[14px]" title={place.name}>
                      {place.name}
                    </div>
                    <div className="inline-flex h-[20px] items-center whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-2 text-[10.5px] capitalize text-blue-900 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-100 md:h-[22px] md:text-[11px]">
                      {place.type}
                    </div>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 truncate text-[11.5px] text-slate-600 dark:text-slate-300 md:gap-2 md:text-[12px]">
                    <span className="inline-flex shrink-0 items-center gap-1">
                      <Star size={14} aria-hidden /> {place.rating ?? "—"}
                    </span>
                    {typeof place.distance_m === "number" && (
                      <span className="shrink-0">• {(place.distance_m / 1000).toFixed(1)} km</span>
                    )}
                    <span className="truncate">
                      • {place.open_now ? "Open now" : "Hours not available"}
                    </span>
                  </div>

                  {place.address_short && (
                    <div className="mt-1 truncate text-[12.5px] text-slate-700 dark:text-slate-200 md:text-[13px]" title={place.address_short}>
                      {place.address_short}
                    </div>
                  )}
                </div>
              </div>

              {actionsList.length > 0 && (
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 md:mt-3 md:grid-cols-4 md:gap-2" aria-label="Primary actions">
                  {actionsList.map((action) => (
                    <div key={action.key} className="flex">{action.element}</div>
                  ))}
                </div>
              )}

              <div className="mt-2 text-[10.5px] text-slate-500 dark:text-slate-400 md:text-[11px]">
                Data: OpenStreetMap • Last checked {new Date(place.last_checked ?? Date.now()).toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
