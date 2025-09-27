"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { DirectoryPlace, DirectoryPlaceType } from "@/lib/directory/types";
import DirectoryHeader, { DirectoryFilters } from "./DirectoryHeader";
import DirectoryList from "./DirectoryList";
import DirectorySheet from "./DirectorySheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const DirectoryMap = dynamic(() => import("./DirectoryMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-3xl border border-slate-200 bg-slate-100" />,
});

type Coords = { lat: number; lng: number };

const FALLBACK_LOCATION: Coords = { lat: 28.5355, lng: 77.196 }; // South Delhi

const FEATURE_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_DIRECTORY === "1" || process.env.FEATURE_DIRECTORY === "1";

export default function DirectoryView() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<DirectoryPlaceType>("doctor");
  const [filters, setFilters] = useState<DirectoryFilters>({
    openNow: false,
    minRating: false,
    withinThreeKm: false,
    twentyFourSeven: false,
    cashless: false,
    wheelchair: false,
  });
  const [activeCoords, setActiveCoords] = useState<Coords>(FALLBACK_LOCATION);
  const [locationStatus, setLocationStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [approximate, setApproximate] = useState(true);
  const [locationLabel, setLocationLabel] = useState("South Delhi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [places, setPlaces] = useState<DirectoryPlace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [showMap, setShowMap] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 350);

  useEffect(() => {
    if (!FEATURE_ENABLED) return;
    if (!("geolocation" in navigator)) {
      setLocationStatus("denied");
      setApproximate(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const coords = { lat: Number(position.coords.latitude), lng: Number(position.coords.longitude) };
        setActiveCoords(coords);
        setLocationStatus("granted");
        setApproximate(false);
      },
      () => {
        setLocationStatus("denied");
        setApproximate(true);
        setActiveCoords(FALLBACK_LOCATION);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    if (!FEATURE_ENABLED) return;
    const controller = new AbortController();
    const { lat, lng } = activeCoords;
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));

    fetch(url.toString(), {
      headers: { "accept-language": "en", "user-agent": "MedxDirectory/1.0" },
      signal: controller.signal,
    })
      .then(response => response.json())
      .then(data => {
        if (data && typeof data === "object") {
          const locality = data.address?.suburb || data.address?.city || data.address?.state || "Nearby";
          setLocationLabel(locality);
        }
      })
      .catch(() => {
        setLocationLabel("Nearby");
      });

    return () => controller.abort();
  }, [activeCoords.lat, activeCoords.lng]);

  useEffect(() => {
    if (!FEATURE_ENABLED) return;
    setShowMap(isDesktop);
  }, [isDesktop]);

  useEffect(() => {
    if (!FEATURE_ENABLED) return;
    setLoading(true);
    setError(null);

    const radius = filters.withinThreeKm ? 3000 : 5000;
    const minRatingValue = filters.minRating ? 4 : 0;
    const maxKmValue = filters.withinThreeKm ? 3 : 0;

    const url = new URL("/api/directory/search", window.location.origin);
    url.searchParams.set("type", type);
    url.searchParams.set("lat", String(activeCoords.lat));
    url.searchParams.set("lng", String(activeCoords.lng));
    url.searchParams.set("radius", String(radius));
    if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
    if (filters.openNow) url.searchParams.set("open_now", "1");
    if (minRatingValue > 0) url.searchParams.set("min_rating", String(minRatingValue));
    if (maxKmValue > 0) url.searchParams.set("max_km", String(maxKmValue));

    fetch(url.toString())
      .then(res => {
        if (!res.ok) throw new Error("Could not load directory");
        return res.json();
      })
      .then(data => {
        setPlaces(Array.isArray(data.results) ? data.results : []);
        setUpdatedAt(data.updated_at ? new Date(data.updated_at) : new Date());
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : "Failed to load directory");
        setPlaces([]);
        setLoading(false);
      });
  }, [type, activeCoords, debouncedSearch, filters.openNow, filters.minRating, filters.withinThreeKm]);

  const filteredPlaces = useMemo(() => {
    let list = places.slice();
    if (filters.openNow) {
      list = list.filter(place => place.open_now !== false);
    }
    if (filters.twentyFourSeven) {
      list = list.filter(place => {
        if (place.open_now) return true;
        if (!place.hours) return false;
        return Object.values(place.hours).some(value => value.includes("24"));
      });
    }
    if (filters.cashless) {
      list = list.filter(place => place.amenities.some(amenity => amenity.toLowerCase().includes("cash")));
    }
    if (filters.wheelchair) {
      list = list.filter(place => place.amenities.some(amenity => amenity.toLowerCase().includes("wheelchair")));
    }
    return list;
  }, [places, filters.openNow, filters.twentyFourSeven, filters.cashless, filters.wheelchair]);

  useEffect(() => {
    if (!filteredPlaces.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredPlaces.some(place => place.id === selectedId)) {
      setSelectedId(filteredPlaces[0].id);
    }
  }, [filteredPlaces, selectedId]);

  const selectedPlace = filteredPlaces.find(place => place.id === selectedId) ?? null;

  const toggleFilter = (key: keyof DirectoryFilters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  return (
    <div className="flex w-full flex-1 flex-col bg-slate-50/60">
      {locationStatus === "denied" ? (
        <div className="bg-amber-100 px-4 py-2 text-xs text-amber-700">
          Allow location access to see the closest care providers. Showing approximate distances for {locationLabel}.
        </div>
      ) : null}

      <DirectoryHeader
        locationLabel={locationLabel}
        approximate={approximate}
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        filters={filters}
        onToggleFilter={toggleFilter}
        resultsCount={filteredPlaces.length}
        updatedAt={updatedAt}
        showMapToggle={!isDesktop}
        mapVisible={showMap}
        onToggleMap={() => setShowMap(value => !value)}
      />

      <div className={`flex min-h-0 flex-1 flex-col gap-4 px-0 py-4 md:flex-row md:px-4`}>
        <div className={`flex-1 overflow-y-auto md:pr-4 ${isDesktop ? "max-h-[calc(100vh-180px)]" : ""}`}>
          <DirectoryList
            places={filteredPlaces}
            loading={loading}
            error={error}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>
        {showMap ? (
          <div className="hidden min-h-[400px] flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-white/60 shadow-md md:block">
            <DirectoryMap places={filteredPlaces} selectedId={selectedId} onSelect={handleSelect} userLocation={activeCoords} />
          </div>
        ) : null}
      </div>

      {!isDesktop && showMap ? (
        <div className="px-4 pb-6">
          <div className="h-72 overflow-hidden rounded-3xl border border-slate-200">
            <DirectoryMap places={filteredPlaces} selectedId={selectedId} onSelect={handleSelect} userLocation={activeCoords} />
          </div>
        </div>
      ) : null}

      {!isDesktop && selectedPlace ? (
        <DirectorySheet place={selectedPlace} onClose={() => setSelectedId(null)} />
      ) : null}
    </div>
  );
}
