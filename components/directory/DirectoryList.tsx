"use client";

import { useMemo } from "react";
import type { MouseEvent, ReactNode } from "react";
import { Copy, ExternalLink, MapPin, Phone, Send, Star, Tag } from "lucide-react";
import type { DirectoryPlace } from "@/lib/directory/types";

type DirectoryListProps = {
  places: DirectoryPlace[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function DirectoryList({ places, loading, error, selectedId, onSelect }: DirectoryListProps) {
  if (loading) {
    return (
      <div className="space-y-3 px-4 py-4">
        {[1, 2, 3].map(item => (
          <div
            key={item}
            className="animate-pulse rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm"
          >
            <div className="h-4 w-1/2 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
            <div className="mt-4 h-3 w-2/3 rounded bg-slate-100" />
            <div className="mt-6 flex gap-2">
              <div className="h-8 w-16 rounded-full bg-slate-100" />
              <div className="h-8 w-16 rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!places.length) {
    return (
      <div className="px-4 py-12 text-center text-sm text-slate-500">
        No results found nearby. Try broadening your filters or search.
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-4">
      {places.map(place => (
        <Card key={place.id} place={place} selected={place.id === selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

type CardProps = {
  place: DirectoryPlace;
  selected: boolean;
  onSelect: (id: string) => void;
};

function Card({ place, selected, onSelect }: CardProps) {
  const directionsHref = place.geo
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.geo.lat},${place.geo.lng}`
    : null;
  const whatsappNumber = place.whatsapp || (place.phones[0] ?? "");
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}` : null;

  const meta = useMemo(() => {
    const parts: string[] = [];
    if (place.rating) parts.push(`★ ${place.rating.toFixed(1)}`);
    if (place.distance_m != null) parts.push(`${(place.distance_m / 1000).toFixed(1)} km`);
    if (place.open_now) parts.push("Open now");
    if (place.price_level) parts.push("₹".repeat(Math.min(3, place.price_level)));
    return parts.join(" • ");
  }, [place.rating, place.distance_m, place.open_now, place.price_level]);

  const badges = [...place.services.slice(0, 2), ...place.amenities.slice(0, 2)];

  return (
    <article
      className={`cursor-pointer rounded-2xl border p-4 shadow-sm transition ${
        selected
          ? "border-blue-500 bg-blue-50/70"
          : "border-slate-200 bg-white/80 hover:border-blue-200 hover:shadow"
      }`}
      onClick={() => onSelect(place.id)}
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(place.id);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{place.name}</h3>
            {place.specialties[0] ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {place.specialties[0]}
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {meta || "No rating available"}
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{place.type}</span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <MapPin className="h-4 w-4 text-slate-400" />
        <span>{place.address_short || "Address unavailable"}</span>
        {place.address_short ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
            onClick={event => {
              event.stopPropagation();
              if (place.address_short && navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(place.address_short).catch(() => {});
              }
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        ) : null}
      </div>

      {badges.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {badges.map(badge => (
            <span key={badge} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              <Tag className="h-3.5 w-3.5" />
              {badge}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-medium text-slate-700 sm:grid-cols-4">
        <ActionButton
          icon={<Phone className="h-4 w-4" />}
          label="Call"
          href={place.phones[0] ? `tel:${place.phones[0]}` : undefined}
          disabled={!place.phones.length}
          onClick={event => event.stopPropagation()}
        />
        <ActionButton
          icon={<ExternalLink className="h-4 w-4" />}
          label="Directions"
          href={directionsHref || undefined}
          disabled={!directionsHref}
          onClick={event => event.stopPropagation()}
        />
        <ActionButton
          icon={<Send className="h-4 w-4" />}
          label="WhatsApp"
          href={whatsappHref || undefined}
          disabled={!whatsappHref}
          onClick={event => event.stopPropagation()}
        />
        <ActionButton
          icon={<Star className="h-4 w-4" />}
          label="Book"
          disabled
          onClick={event => event.stopPropagation()}
        />
      </div>
    </article>
  );
}

type ActionButtonProps = {
  icon: ReactNode;
  label: string;
  href?: string;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
};

function ActionButton({ icon, label, href, disabled, onClick }: ActionButtonProps) {
  const className = `inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
    disabled
      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600"
  }`;

  if (href && !disabled) {
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer" onClick={event => onClick?.(event)}>
        {icon}
        {label}
      </a>
    );
  }

  return (
    <button type="button" className={className} disabled={disabled} onClick={event => onClick?.(event)}>
      {icon}
      {label}
    </button>
  );
}
