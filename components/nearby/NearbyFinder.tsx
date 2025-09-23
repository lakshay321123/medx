"use client";
import { useEffect, useState } from "react";

type Coords = { lat: number; lng: number };
type Item = {
  id: string;
  type: string;
  name: string;
  specialty?: string;
  address: string;
  phone?: string;
  distance_km: number;
  location: { lat: number; lng: number };
};

export default function NearbyFinder() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [type, setType] = useState("doctor");
  const [specialty, setSpecialty] = useState("");
  const [radius, setRadius] = useState(
    Number(process.env.NEXT_PUBLIC_NEARBY_DEFAULT_RADIUS_KM || 5)
  );
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    const fetcher = async () => {
      if (!coords) return;
      setLoading(true);
      setErr(null);
      const u = new URL("/api/nearby", window.location.origin);
      u.searchParams.set("type", type);
      u.searchParams.set("lat", String(coords.lat));
      u.searchParams.set("lng", String(coords.lng));
      u.searchParams.set("radius_km", String(radius));
      if (type === "specialist" && specialty) u.searchParams.set("specialty", specialty);
      const r = await fetch(u.toString());
      if (!r.ok) {
        setErr("Couldn’t load results");
        setLoading(false);
        return;
      }
      const j = await r.json();
      setItems(j.items || []);
      setLoading(false);
    };
    fetcher();
  }, [coords, type, specialty, radius]);

  return (
    <div className="space-y-3">
      {!coords && (
        <div className="text-sm opacity-80">
          Please allow location access or enter your location manually.
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="doctor">Clinicians</option>
          <option value="specialist">Specialists</option>
          <option value="hospital">Hospitals</option>
          <option value="clinic">Clinics</option>
          <option value="lab">Labs</option>
          <option value="pharmacy">Pharmacies</option>
        </select>
        {type === "specialist" && (
          <input
            className="border rounded px-2 py-1"
            placeholder="e.g. gynaecology, cardiology"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
        )}
        <label className="text-sm">Radius: {radius} km</label>
        <input
          type="range"
          min={1}
          max={20}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
        />
      </div>

      {loading && <div>Searching…</div>}
      {err && <div className="text-red-600 text-sm">{err}</div>}

      <div className="divide-y">
        {items.map((i) => (
          <div key={i.id} className="py-3">
            <div className="font-medium">
              {i.name}{" "}
              <span className="text-xs opacity-70">
                • {i.type}
                {i.specialty ? ` • ${i.specialty}` : ""}
              </span>
            </div>
            <div className="text-sm opacity-80">
              {i.address || "Address unavailable"}
            </div>
            <div className="text-sm flex gap-3">
              {i.phone && (
                <a href={`tel:${i.phone}`} className="underline">
                  Call
                </a>
              )}
              <a
                className="underline"
                target="_blank"
                href={`https://maps.google.com/?q=${i.location.lat},${i.location.lng}`}
              >
                Open in Maps
              </a>
              <span className="opacity-70">{i.distance_km} km</span>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <div className="py-6 text-sm opacity-70">
            No results found within {radius} km.
          </div>
        )}
      </div>
    </div>
  );
}
