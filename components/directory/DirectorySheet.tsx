"use client";

import { X, Phone, ExternalLink, Send, Star, MapPin, Clock, Building2 } from "lucide-react";
import type { ReactNode } from "react";
import type { DirectoryPlace } from "@/lib/directory/types";

interface DirectorySheetProps {
  place: DirectoryPlace;
  onClose: () => void;
}

export default function DirectorySheet({ place, onClose }: DirectorySheetProps) {
  const directionsHref = place.geo
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.geo.lat},${place.geo.lng}`
    : null;
  const whatsappNumber = place.whatsapp || (place.phones[0] ?? "");
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}` : null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
      <button
        type="button"
        className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500"
        aria-label="Close"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="mt-4 space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{place.name}</h3>
            {place.specialties[0] ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {place.specialties[0]}
              </span>
            ) : null}
          </div>
          <div className="text-sm text-slate-500">
            {place.rating ? `★ ${place.rating.toFixed(1)}` : "No rating"}
            {place.distance_m != null ? ` • ${(place.distance_m / 1000).toFixed(1)} km away` : ""}
          </div>
        </div>

        <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={place.address_short || "Not available"} />
        <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={place.phones.join(", ") || "Not available"} />
        <InfoRow
          icon={<Building2 className="h-4 w-4" />}
          label="Services"
          value={place.services.length ? place.services.join(", ") : "Not listed"}
        />
        <InfoRow
          icon={<Building2 className="h-4 w-4" />}
          label="Amenities"
          value={place.amenities.length ? place.amenities.join(", ") : "Not listed"}
        />
        <InfoRow
          icon={<Clock className="h-4 w-4" />}
          label="Hours"
          value={
            place.hours && Object.keys(place.hours).length
              ? Object.values(place.hours).join(" • ")
              : "Not provided"
          }
        />

        <div className="grid grid-cols-2 gap-2 text-sm font-medium text-slate-700">
          <SheetButton label="Call" icon={<Phone className="h-4 w-4" />} href={place.phones[0] ? `tel:${place.phones[0]}` : undefined} />
          <SheetButton label="Directions" icon={<ExternalLink className="h-4 w-4" />} href={directionsHref || undefined} />
          <SheetButton label="WhatsApp" icon={<Send className="h-4 w-4" />} href={whatsappHref || undefined} />
          <SheetButton label="Book" icon={<Star className="h-4 w-4" />} disabled />
        </div>

        <p className="text-xs text-slate-400">
          Data source: {place.source.toUpperCase()} • Last checked 2d ago
        </p>
      </div>
    </div>
  );
}

type InfoRowProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="mt-0.5 text-sm text-slate-700">{value}</div>
      </div>
    </div>
  );
}

type SheetButtonProps = {
  icon: ReactNode;
  label: string;
  href?: string;
  disabled?: boolean;
};

function SheetButton({ icon, label, href, disabled }: SheetButtonProps) {
  const className = `inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 transition ${
    disabled
      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600"
  }`;

  if (href && !disabled) {
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer">
        {icon}
        {label}
      </a>
    );
  }

  return (
    <button type="button" className={className} disabled={disabled}>
      {icon}
      {label}
    </button>
  );
}
