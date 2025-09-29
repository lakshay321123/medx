"use client";
import { useMemo } from "react";
import { Phone, MessageSquare, Navigation, Star } from "lucide-react";
import AddressPicker from "@/components/directory/AddressPicker";
import { tfmt, useT } from "@/components/hooks/useI18n";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { useDirectory } from "@/hooks/useDirectory";
import { ISO_COUNTRIES } from "@/lib/i18n/isoCountries";

type DirectoryType = ReturnType<typeof useDirectory>["state"]["type"];

const PREFS_STORAGE_KEY = "medx-prefs-v1";

export default function DirectoryPane() {
  const { lang } = usePrefs();
  const storedLang = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { lang?: string } | null;
      const saved = typeof parsed?.lang === "string" ? parsed.lang : null;
      return saved && saved.length > 0 ? saved : null;
    } catch {
      return null;
    }
  }, []);
  const appLang = useMemo(() => {
    if (lang && lang !== "en") return lang;
    if (storedLang && storedLang !== "en") return storedLang;
    return lang || storedLang || "en";
  }, [lang, storedLang]);
  const { state, actions } = useDirectory({ lang: appLang });
  const { locLabel, type, q, openNow, minRating, maxKm, data, loading, updatedAt } = state;
  const t = useT();

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(appLang, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }),
    [appLang],
  );
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(appLang, {
        maximumFractionDigits: 1,
      }),
    [appLang],
  );
  const updatedAtDate = updatedAt ? new Date(updatedAt) : null;
  const countLine = tfmt(t("{count} results"), { count: data.length });
  const resultsLine = updatedAtDate
    ? tfmt(t("{count} results · updated {date}"), {
        count: data.length,
        date: dateFormatter.format(updatedAtDate),
      })
    : countLine;
  const summaryText = loading ? t("Loading") : resultsLine;
  const regionDisplay = useMemo(() => {
    try {
      return new Intl.DisplayNames([appLang], { type: "region" });
    } catch {
      return null;
    }
  }, [appLang]);
  const locationLabel = useMemo(() => {
    if (locLabel === "Current location") {
      return t("Current location");
    }
    if (!locLabel) return "";
    if (!regionDisplay || appLang.toLowerCase().startsWith("en")) {
      return locLabel;
    }
    const parts = locLabel.split(",").map(part => part.trim()).filter(Boolean);
    if (parts.length === 0) return locLabel;
    const last = parts[parts.length - 1];
    const iso = last.toUpperCase();
    if (ISO_COUNTRIES.has(iso)) {
      const localizedRegion = regionDisplay.of(iso);
      if (localizedRegion && localizedRegion !== iso) {
        const formattedParts = [...parts.slice(0, -1), localizedRegion];
        return formattedParts.join(", ");
      }
    }
    return locLabel;
  }, [locLabel, regionDisplay, appLang, t]);

  const typeOptions: { key: DirectoryType; label: string }[] = [
    { key: "all", label: t("All") },
    { key: "doctor", label: t("Doctors") },
    { key: "pharmacy", label: t("Pharmacies") },
    { key: "lab", label: t("Labs") },
    { key: "hospital", label: t("Hospitals") },
    { key: "clinic", label: t("Clinics") },
  ];
  const cardTypeLabels: Partial<Record<DirectoryType, string>> = {
    doctor: t("Doctor"),
  };

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[388px] flex-col md:mx-0 md:max-w-none">
      <div className="sticky top-0 z-10 space-y-1 border-b border-black/5 bg-white/85 px-2 pb-1 pt-1 backdrop-blur dark:border-white/10 dark:bg-slate-950/60 md:space-y-3 md:px-3 md:pb-3 md:pt-2">
        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 md:gap-2 md:text-[11px]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500"></span>
          <span className="truncate">{t("Using:")} {locationLabel}</span>
          <button
            onClick={actions.useMyLocation}
            className="ml-auto inline-flex h-[30px] items-center gap-1 truncate rounded-full border border-slate-200 px-2.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-9 md:px-3 md:text-[11px]"
          >
            {t("Use my location")}
          </button>
        </div>

        <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
          <div className="flex-1">
            <input
              className="h-[34px] w-full rounded-[10px] border border-slate-200 bg-white/90 px-3 text-[12px] text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-slate-300 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 md:h-10 md:rounded-[10px] md:px-3 md:text-[13px]"
              placeholder={t("Search doctors, pharmacies, labs")}
              value={q}
              onChange={(event) => actions.setQ(event.target.value)}
            />
          </div>
          <div className="md:w-[320px]">
            <AddressPicker value={locLabel} onSelect={actions.setAddress} />
          </div>
        </div>

        <div className="flex flex-wrap gap-1 pb-0.5 md:flex-nowrap md:gap-2 md:overflow-x-auto">
          {typeOptions.map((option) => {
            const selected = type === option.key;
            return (
              <button
                key={option.key}
                onClick={() => actions.setType(option.key)}
                className={`inline-flex h-[26px] min-w-[64px] items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[11.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-[30px] md:min-w-[72px] md:px-3 md:text-[12.5px] ${
                  selected
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
                aria-pressed={selected}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-1 pb-0.5 md:flex-nowrap md:gap-2 md:overflow-x-auto">
          <button
            onClick={() => actions.setOpenNow((v) => !v)}
            className={`inline-flex h-[26px] items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[11.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-[30px] md:px-3 md:text-[12px] ${
              openNow
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
            aria-pressed={openNow}
          >
            {t("Open now")}
          </button>
          <button
            onClick={() => actions.setMinRating((r) => (r ? null : 4))}
            className={`inline-flex h-[26px] items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[11.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-[30px] md:px-3 md:text-[12px] ${
              minRating
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
            aria-pressed={Boolean(minRating)}
          >
            {t("4+ stars")}
          </button>
          <button
            onClick={() => actions.setMaxKm((k) => (k ? null : 3))}
            className={`inline-flex h-[26px] items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[11.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-[30px] md:px-3 md:text-[12px] ${
              maxKm
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
            aria-pressed={Boolean(maxKm)}
          >
            {tfmt(t("Under {km} km"), { km: 3 })}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400 md:px-3 md:py-2 md:text-[12px]">
        <div className="truncate">{summaryText}</div>
        <div className="inline-flex h-[22px] items-center rounded-full border border-slate-200 px-2.5 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:text-slate-200 md:h-[27px] md:px-3 md:text-[12px]">
          {t("Map")}
        </div>
      </div>

      <div className="mobile-scroll-safe flex-1 space-y-1.5 overflow-y-auto px-2 pb-2 md:space-y-3 md:px-3 md:pb-4">
        {!loading && data.length === 0 && (
          <div className="rounded-[10px] border border-slate-200 bg-white/75 p-2.5 text-[12px] text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300 md:rounded-[12px] md:p-4 md:text-[13px]">
            {t("No results. Try All, increase radius, or change the address.")}
          </div>
        )}
        {data.map((place) => {
          const typeLabel =
            place.category_display ??
            cardTypeLabels[place.type] ??
            typeOptions.find((option) => option.key === place.type)?.label ??
            place.type;

          const reviewsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            place.name,
          )}`;

          const actionsList = [
            {
              key: "directions",
              render: (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${place.geo.lat},${place.geo.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-[30px] w-full items-center justify-center gap-1 rounded-[10px] border border-slate-200 bg-white/90 px-2.5 text-[11.5px] font-medium text-slate-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-9 md:rounded-[10px] md:px-2.5 md:text-[12.5px]"
                >
                  <Navigation size={14} aria-hidden /> {t("Directions")}
                </a>
              ),
            },
            place.phones?.[0]
              ? {
                  key: "call",
                  render: (
                    <a
                      href={`tel:${place.phones[0].replace(/\s+/g, "")}`}
                      className="flex h-[30px] w-full items-center justify-center gap-1 rounded-[10px] border border-slate-200 bg-white/90 px-2.5 text-[11.5px] font-medium text-slate-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-9 md:rounded-[10px] md:px-2.5 md:text-[12.5px]"
                    >
                      <Phone size={14} aria-hidden /> {t("Call")}
                    </a>
                  ),
                }
              : null,
            place.whatsapp
              ? {
                  key: "message",
                  render: (
                    <a
                      href={`https://wa.me/${place.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-[30px] w-full items-center justify-center gap-1 rounded-[10px] border border-slate-200 bg-white/90 px-2.5 text-[11.5px] font-medium text-slate-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-9 md:rounded-[10px] md:px-2.5 md:text-[12.5px]"
                    >
                      <MessageSquare size={14} aria-hidden /> {t("Message")}
                    </a>
                  ),
                }
              : null,
            place.rating != null
              ? {
                  key: "reviews",
                  render: (
                    <a
                      href={reviewsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-[30px] w-full items-center justify-center gap-1 rounded-[10px] border border-slate-200 bg-white/90 px-2.5 text-[11.5px] font-medium text-slate-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900 dark:focus-visible:ring-blue-500/50 dark:focus-visible:ring-offset-slate-950 md:h-9 md:rounded-[10px] md:px-2.5 md:text-[12.5px]"
                    >
                      <Star size={14} aria-hidden /> {t("Reviews")}
                    </a>
                  ),
                }
              : null,
          ].filter(Boolean) as {
            key: string;
            render: JSX.Element;
          }[];

          return (
            <div
              key={place.id}
              className="rounded-[10px] border border-slate-200 bg-white/85 p-2 shadow-sm backdrop-blur-sm transition hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 md:rounded-[12px] md:p-3"
            >
              <div className="flex items-start gap-1.5 md:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2 md:gap-3">
                    <div
                      className="break-words text-[12.5px] font-semibold leading-[1.35] text-slate-900 dark:text-slate-50 md:truncate md:text-[14px]"
                      title={place.name}
                    >
                      {place.name}
                    </div>
                  <div className="inline-flex h-[16px] items-center whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-1.5 text-[9px] capitalize text-blue-900 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-100 md:h-[22px] md:px-2 md:text-[11px]">
                      {typeLabel}
                  </div>
                </div>

                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] text-slate-600 dark:text-slate-300 md:flex-nowrap md:gap-2 md:text-[12px]">
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <Star size={14} aria-hidden /> {place.rating ?? "—"}
                  </span>
                  {typeof place.distance_m === "number" && (
                    <span className="shrink-0">
                      • {`${numberFormatter.format(place.distance_m / 1000)} ${t("km")}`}
                    </span>
                  )}
                  <span className="truncate md:whitespace-nowrap">
                    • {place.open_now ? t("Open now") : t("Hours not available")}
                  </span>
                </div>

                {place.address_short && (
                    <div
                      className="mt-1 text-[12px] leading-snug text-slate-700 dark:text-slate-200 md:mt-1.5 md:truncate md:text-[13px]"
                      title={place.address_short}
                    >
                      {place.address_short}
                    </div>
                  )}
                </div>
              </div>

              {actionsList.length > 0 && (
                <div
                  className="mt-1.5 flex flex-wrap gap-1.5 md:mt-3 md:grid md:grid-cols-4 md:gap-2"
                  aria-label={t("Primary actions")}
                >
                  {actionsList.map((action) => (
                    <div key={action.key} className="flex min-w-[76px] flex-1 md:min-w-0">
                      {action.render}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 md:mt-2 md:text-[11px]">
                {t("Data")}: {place.source ?? "—"}
                {(() => {
                  if (!place.last_checked) return null;
                  const parsed = new Date(place.last_checked);
                  if (Number.isNaN(parsed.getTime())) return null;
                  return (
                    <>
                      {" · "}
                      {tfmt(t("Last checked: {date}"), {
                        date: dateFormatter.format(parsed),
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
