"use client";

import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import type { DirectoryPlaceType } from "@/lib/directory/types";

export type DirectoryFilters = {
  openNow: boolean;
  minRating: boolean;
  withinThreeKm: boolean;
  twentyFourSeven: boolean;
  cashless: boolean;
  wheelchair: boolean;
};

type DirectoryHeaderProps = {
  locationLabel: string;
  approximate: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  type: DirectoryPlaceType;
  onTypeChange: (value: DirectoryPlaceType) => void;
  filters: DirectoryFilters;
  onToggleFilter: (key: keyof DirectoryFilters) => void;
  resultsCount: number;
  updatedAt: Date | null;
  showMapToggle: boolean;
  mapVisible: boolean;
  onToggleMap: () => void;
};

function timeAgo(date: Date | null): string {
  if (!date) return "just now";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

const TYPE_CHIPS: Array<{ key: DirectoryPlaceType; label: string }> = [
  { key: "doctor", label: "Doctors" },
  { key: "pharmacy", label: "Pharmacies" },
  { key: "lab", label: "Labs" },
];

export default function DirectoryHeader({
  locationLabel,
  approximate,
  search,
  onSearchChange,
  type,
  onTypeChange,
  filters,
  onToggleFilter,
  resultsCount,
  updatedAt,
  showMapToggle,
  mapVisible,
  onToggleMap,
}: DirectoryHeaderProps) {
  return (
    <header className="sticky top-[56px] z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur md:top-0">
      <div className="px-4 py-3 space-y-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {approximate ? "Using approximate location" : "Using your location"} • {locationLabel || "Locating…"}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Search near me"
            value={search}
            onChange={event => onSearchChange(event.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TYPE_CHIPS.map(chip => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onTypeChange(chip.key)}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                type === chip.key
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
              }`}
            >
              <MapPin className="h-4 w-4" />
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-500">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          </span>
          <FilterChip label="Open now" active={filters.openNow} onClick={() => onToggleFilter("openNow")} />
          <FilterChip label="★ 4.0+" active={filters.minRating} onClick={() => onToggleFilter("minRating")} />
          <FilterChip label="&lt; 3 km" active={filters.withinThreeKm} onClick={() => onToggleFilter("withinThreeKm")} />
          <FilterChip label="24×7" active={filters.twentyFourSeven} onClick={() => onToggleFilter("twentyFourSeven")} />
          <FilterChip label="Cashless" active={filters.cashless} onClick={() => onToggleFilter("cashless")} />
          <FilterChip label="Wheelchair" active={filters.wheelchair} onClick={() => onToggleFilter("wheelchair")} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200/60 px-4 py-2 text-xs text-slate-500">
        <div>
          <span className="font-medium text-slate-700">{resultsCount}</span> results • updated {timeAgo(updatedAt)}
        </div>
        {showMapToggle ? (
          <button
            type="button"
            onClick={onToggleMap}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              mapVisible
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
            }`}
            aria-pressed={mapVisible}
          >
            <MapPin className="h-4 w-4" /> {mapVisible ? "Hide map" : "Map"}
          </button>
        ) : null}
      </div>
    </header>
  );
}

type FilterChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
      }`}
    >
      {label}
    </button>
  );
}
