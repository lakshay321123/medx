"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl, { Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DirectoryPlace } from "@/lib/directory/types";

interface DirectoryMapProps {
  places: DirectoryPlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  userLocation: { lat: number; lng: number } | null;
}

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export default function DirectoryMap({ places, selectedId, onSelect, userLocation }: DirectoryMapProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mapRef.current || !containerRef.current) return;

    const center = userLocation ? [userLocation.lng, userLocation.lat] : [77.209, 28.6139];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom: 13,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) return;
    map.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: Math.max(map.getZoom(), 12), speed: 0.6 });
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (places.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();

    places.forEach(place => {
      if (!place.geo) return;
      const marker = new maplibregl.Marker({ color: place.id === selectedId ? "#2563eb" : "#1f2937" })
        .setLngLat([place.geo.lng, place.geo.lat])
        .addTo(map);
      marker.getElement().addEventListener("click", event => {
        event.stopPropagation();
        onSelect(place.id);
      });
      markersRef.current.push(marker);
      bounds.extend([place.geo.lng, place.geo.lat]);
    });

    if (userLocation) {
      const userMarker = new maplibregl.Marker({ color: "#059669" })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
      markersRef.current.push(userMarker);
      bounds.extend([userLocation.lng, userLocation.lat]);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 600 });
    }
  }, [places, selectedId, onSelect, userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const place = places.find(item => item.id === selectedId);
    if (place?.geo) {
      map.flyTo({ center: [place.geo.lng, place.geo.lat], zoom: Math.max(map.getZoom(), 14), speed: 0.6 });
    }
  }, [selectedId, places]);

  const attribution = useMemo(
    () => (
      <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-slate-500 shadow">
        © OpenStreetMap contributors
      </div>
    ),
    [],
  );

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full rounded-3xl border border-slate-200" />
      {attribution}
    </div>
  );
}
