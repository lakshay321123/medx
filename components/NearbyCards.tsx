'use client';
import React, { useEffect, useRef, useState } from 'react';
import { getClientLocation, loadLocation, saveLocation } from '@/lib/geo';
import { safeJson } from '@/lib/safeJson';

type Place = {
  id: number | string;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
  tags: Record<string, string>;
};

export default function NearbyCards({ kind = 'hospital' }: { kind?: 'hospital'|'clinic'|'pharmacy'|'doctor' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loc, setLoc] = useState<{ lat:number; lon:number } | null>(null);
  const [manual, setManual] = useState('');
  const did = useRef(false);

  useEffect(() => {
    if (did.current) return;
    did.current = true;

    (async () => {
      setBusy(true); setError(null);
      // 1) cached?
      const cached = loadLocation();
      if (cached) setLoc(cached);

      // 2) try browser geolocation (fast timeout)
      try {
        const here = await getClientLocation({ enableHighAccuracy:false, timeout: 6000, maximumAge: 60000 });
        setLoc(here);
        saveLocation(here);
      } catch (e:any) {
        // do nothing; user can set manually
        setError('Location permission denied or unavailable. You can set location manually.');
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  async function fetchNearby(current: { lat:number; lon:number }) {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/nearby', {
        method: 'POST',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify({ lat: current.lat, lon: current.lon, kind, radius: 2000 })
      });
      const data = await safeJson(res) as any;
      if (!data || data.ok === false) throw new Error(data?.error || 'Nearby failed');
      setPlaces(data.items || []);
    } catch (e:any) {
      setError(String(e?.message || e));
      setPlaces([]);
    } finally {
      setBusy(false);
    }
  }

  async function onUseLocation() {
    if (!loc) return;
    await fetchNearby(loc);
  }

  async function onSetManual() {
    const m = manual.trim();
    // support "lat,lon" format quickly
    const mMatch = m.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
    if (mMatch) {
      const lat = parseFloat(mMatch[1]);
      const lon = parseFloat(mMatch[3]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        const here = { lat, lon };
        setLoc(here); saveLocation(here);
        await fetchNearby(here);
        return;
      }
    }
    setError('Enter coordinates as "lat,lon" (e.g., 28.6139,77.2090)');
  }

  return (
    <div style={{border:'1px solid var(--border,#ddd)', borderRadius:12, padding:16, display:'grid', gap:12}}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div style={{ fontWeight:600 }}>Nearby: {kind}</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={onUseLocation} disabled={busy || !loc}
            style={{ padding:'8px 12px', border:'1px solid #ccc', borderRadius:8 }}>
            {busy ? 'Searching…' : 'Use my location'}
          </button>
        </div>
      </div>

      {!loc && (
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input value={manual} onChange={e=>setManual(e.target.value)} placeholder='Set location (lat,lon)'
            style={{ flex:1, padding:'8px', border:'1px solid #ccc', borderRadius:8 }} />
          <button onClick={onSetManual} style={{ padding:'8px 12px', border:'1px solid #ccc', borderRadius:8 }}>Set</button>
        </div>
      )}

      {error && <p style={{ color:'#b00', margin:0, whiteSpace:'pre-wrap' }}>⚠️ {error}</p>}

      {places.length > 0 ? (
        <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gap:8 }}>
          {places.map((p) => (
            <li key={p.id} style={{ border:'1px solid #eee', borderRadius:8, padding:12 }}>
              <div style={{ fontWeight:600 }}>{p.name}</div>
              <div style={{ color:'#555', fontSize:13 }}>
                {p.tags?.amenity || ''} • {p.distanceKm} km
                {p.tags?.phone ? ` • ${p.tags.phone}` : ''}
              </div>
              <div style={{ fontSize:12, marginTop:6 }}>
                {p.tags?.addr_full || [p.tags?.['addr:housenumber'], p.tags?.['addr:street'], p.tags?.['addr:city']].filter(Boolean).join(', ')}
              </div>
              <a target='_blank' href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`} rel='noreferrer'
                 style={{ display:'inline-block', marginTop:8, fontSize:13 }}>
                View on OpenStreetMap ↗
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color:'#555', margin:0 }}>{busy ? 'Searching…' : 'No results yet. Use location or set coordinates.'}</p>
      )}
    </div>
  );
}
