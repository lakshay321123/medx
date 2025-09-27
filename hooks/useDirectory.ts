"use client";
import { useEffect, useMemo, useState } from "react";

export type DirType = "all" | "doctor" | "pharmacy" | "lab" | "hospital" | "clinic";
export type Place = {
  id: string;
  name: string;
  type: DirType;
  distance_m?: number;
  open_now?: boolean;
  rating?: number;
  phones?: string[];
  whatsapp?: string | null;
  address_short?: string;
  geo: { lat: number; lng: number };
  source: "osm";
  last_checked?: string;
};

export function useDirectory() {
  const [lat, setLat] = useState<number | null>(28.567);
  const [lng, setLng] = useState<number | null>(77.209);
  const [locLabel, setLocLabel] = useState("South Delhi");
  const [type, setType] = useState<DirType>("doctor");
  const [q, setQ] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [maxKm, setMaxKm] = useState<number | null>(null);
  const [radius, setRadius] = useState(5000);
  const [data, setData] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  async function fetchData() {
    if (lat == null || lng == null) return;
    setLoading(true);
    try {
      const url = new URL("/api/directory/search", window.location.origin);
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lng", String(lng));
      url.searchParams.set("radius", String(radius));
      url.searchParams.set("type", type);
      if (q) url.searchParams.set("q", q);
      if (openNow) url.searchParams.set("open_now", "1");
      if (minRating) url.searchParams.set("min_rating", String(minRating));
      if (maxKm) url.searchParams.set("max_km", String(maxKm));

      const response = await fetch(url.toString(), { cache: "no-store" });
      const json = await response.json();
      setData(json.data || []);
      setUpdatedAt(json.updatedAt || null);
    } catch (error) {
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, radius, type, q, openNow, minRating, maxKm]);

  function setAddress(option: { label: string; lat: number; lng: number }) {
    setLocLabel(option.label);
    setLat(option.lat);
    setLng(option.lng);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocLabel("Current location");
      },
      () => {
        // ignore errors
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 },
    );
  }

  const summary = useMemo(() => {
    const updated = updatedAt ? ` • updated ${new Date(updatedAt).toLocaleDateString()}` : "";
    return `${data.length} results${updated}`;
  }, [data.length, updatedAt]);

  return {
    state: {
      lat,
      lng,
      locLabel,
      type,
      q,
      openNow,
      minRating,
      maxKm,
      radius,
      data,
      loading,
      summary,
    },
    actions: {
      setType,
      setQ,
      setOpenNow,
      setMinRating,
      setMaxKm,
      setRadius,
      setAddress,
      useMyLocation,
      refetch: fetchData,
    },
  } as const;
}
