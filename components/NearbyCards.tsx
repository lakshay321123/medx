'use client';

type Item = {
  title: string;
  subtitle?: string;
  address?: string;
  phone?: string | null;
  website?: string | null;
  mapsUrl: string;
  distanceKm?: number;
};

export default function NearbyCards({ items }: { items: Item[] }) {
  return (
    <div className="grid gap-3 mt-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border p-4 bg-background">
          {/* Name */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-base font-semibold leading-tight">
              {it.title || 'Unknown'}
            </div>
            {typeof it.distanceKm === 'number' && (
              <div className="text-xs px-2 py-1 rounded-full border opacity-80">
                {it.distanceKm} km
              </div>
            )}
          </div>

          {/* Type */}
          {it.subtitle && (
            <div className="text-xs mt-1 opacity-70">
              {it.subtitle}
            </div>
          )}

          {/* Address */}
          {it.address && (
            <div className="text-sm mt-2">
              {it.address}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
            {it.phone && (
              <a className="underline" href={`tel:${normalizePhone(it.phone)}`}>
                Call
              </a>
            )}
            {it.website && (
<<<<<<< HEAD
              <a className="underline" href={it.website} target="_blank">
                Website
              </a>
            )}
            <a className="underline" href={it.mapsUrl} target="_blank">
=======
              <a
                className="underline"
                href={it.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                Website
              </a>
            )}
            <a
              className="underline"
              href={it.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
>>>>>>> 9f1ebfc8f7123c8bee6dc20e18eafec211bd1e44
              Directions
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function normalizePhone(p?: string | null) {
  if (!p) return '';
  // remove spaces and dashes; keep + and digits
  return p.replace(/[^\d+]/g, '');
}
