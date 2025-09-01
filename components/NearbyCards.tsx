'use client';

import React, { useEffect, useRef, useState } from 'react';
import { normalizePhone } from './phone-utils'; // optional: or inline the function below

type Item = {
  title: string;
  subtitle?: string;
  address?: string;
  phone?: string | null;
  website?: string | null;
  mapsUrl: string;
  distanceKm?: number;
};

export default function NearbyCards({ query = 'docs near me' }: { query?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [coords, setCoords] = useState<{lat:number; lon:number} | null>(null);
  const did = useRef(false);

  useEffect(() => {
    if (did.current) return;
    did.current = true;

    (async () => {
      setBusy(true); setError(null);

      // Try browser geolocation first (fast timeout)
      try {
        const here = await new Promise<{lat:number; lon:number}>((resolve, reject) => {
          if (!('geolocation' in navigator)) return reject(new Error('Geolocation not available'));
          navigator.geolocation.getCurrentPosition(
            p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
            err => reject(new Error(err.message || 'Geolocation error')),
            { enableHighAccuracy:false, timeout: 6000, maximumAge: 60000 }
          );
        });
        setCoords(here);
        await fetchNearby(here.lat, here.lon);
      } catch {
        // Fall back to IP-based location
        try {
          const res = await fetch('/api/locate');
          const j = await res.json();
          if (j?.lat && j?.lng) {
            const here = { lat: Number(j.lat), lon: Number(j.lng) };
            setCoords(here);
            await fetchNearby(here.lat, here.lon);
          } else {
            setError('Could not determine your location. Please set it manually.');
          }
        } catch (e:any) {
          setError('Could not determine your location.');
        }
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  async function fetchNearby(lat:number, lon:number) {
    setBusy(true); setError(null);
    try {
      const url = `/api/nearby?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&q=${encodeURIComponent(query)}&radius=5000&limit=20`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || 'Nearby failed');
      setItems(data.items || []);
    } catch (e:any) {
      setError(String(e?.message || e));
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 mt-3">
      <div className="text-sm opacity-70">
        {coords ? `Searching around ${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}…` : 'Detecting your location…'}
      </div>

      {error && <div className="text-red-600 text-sm">⚠️ {error}</div>}
      {busy && <div className="text-sm">Searching…</div>}

      {items.map((it, i) => (
        <div key={i} className="rounded-xl border p-4 bg-background">
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

          {it.subtitle && <div className="text-xs mt-1 opacity-70">{it.subtitle}</div>}
          {it.address && <div className="text-sm mt-2">{it.address}</div>}

          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
            {it.phone && (
              <a className="underline" href={`tel:${(it.phone || '').replace(/[^\d+]/g, '')}`}>
                Call
              </a>
            )}
            {it.website && (
              <a className="underline" href={it.website} target="_blank" rel="noreferrer">
                Website
              </a>
            )}
            <a className="underline" href={it.mapsUrl} target="_blank" rel="noreferrer">
              Directions
            </a>
          </div>
        </div>
      ))}

      {!busy && !error && items.length === 0 && (
        <div className="text-sm opacity-70">No matches yet. Try again in a moment or widen the search.</div>
      )}
    </div>
  );
}
