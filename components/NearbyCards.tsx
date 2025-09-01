'use client';

import React, { useEffect, useState } from 'react';

type Item = {
  id?: number;
  title: string;
  subtitle?: string;
  address?: string;
  phone?: string | null;
  website?: string | null;
  mapsUrl: string;
  lat?: number;
  lon?: number;
  distanceKm?: number;
};

export default function NearbyCards({ query }: { query: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNearby() {
      if (!query) return;
      setLoading(true);
      setError(null);

      try {
        // Step 1: Get user location (via /api/locate)
        const locRes = await fetch('/api/locate');
        const loc = await locRes.json();
        if (!loc.lat || !loc.lng) {
          throw new Error('Could not determine location');
        }

        // Step 2: Ask backend for nearby places
        const kind = query.toLowerCase().includes('pharm')
          ? 'pharmacy'
          : 'doctor';
        const nearbyRes = await fetch(
          `/api/nearby?kind=${kind}&lat=${loc.lat}&lon=${loc.lng}&radius=5000&limit=10`
        );

        const data = await nearbyRes.json();
        if (!data.ok) throw new Error(data.error || 'Nearby search failed');
        setItems(data.items || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchNearby();
  }, [query]);

  if (loading) return <p>Searching nearby {query}…</p>;
  if (error) return <p style={{ color: 'red' }}>⚠️ {error}</p>;
  if (!items.length) return <p>No nearby results found.</p>;

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
            <div className="text-xs mt-1 opacity-70">{it.subtitle}</div>
          )}

          {/* Address */}
          {it.address && <div className="text-sm mt-2">{it.address}</div>}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
            {it.phone && (
              <a className="underline" href={`tel:${normalizePhone(it.phone)}`}>
                Call
              </a>
            )}
            {it.website && (
              <a className="underline" href={it.website} target="_blank">
                Website
              </a>
            )}
            <a className="underline" href={it.mapsUrl} target="_blank">
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
