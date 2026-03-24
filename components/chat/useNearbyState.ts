"use client";
import { useState, useRef, useCallback } from "react";
import type { NearbyKind, NearbyPlace } from "@/lib/nearby";

export const NEARBY_DEFAULT_RADIUS_KM = 2;
export const NEARBY_RADIUS_CHOICES = [1, 2, 3, 5, 8, 10] as const;
export const NEARBY_EXPAND_SEQUENCE = [2, 5, 8, 10];
export const NEARBY_SESSION_TTL_MS = 30 * 60 * 1000;
export const NEARBY_CHUNK_SIZE = 5;

// Intent detection patterns
export const NEARBY_PATTERNS = {
  confirm: /\b(yes|ok|okay|sure|go ahead|proceed|haan|haanji)\b/i,
  expand: /\b(expand|wider|broaden|increase range)\b/i,
  radius: /(\d+(?:\.\d+)?)\s*(km|kms|kilometers|kilometres|m|meter|meters)\b/i,
  refreshLocation: /\b(near me|use my location|refresh location)\b/i,
  showMore: /\b(show more|next)\b/i,
  previous: /\b(previous|back)\b/i,
  directions: /\b(?:directions|navigate)\s*#?(\d{1,2})\b/i,
  call: /\bcall\s*#?(\d{1,2})\b/i,
  openNow: /\b(open now|24\/?7|24x7|24-7)\b/i,
  changeCategory: /\b(change category|different (?:type|category)|another (?:category|type))\b/i,
  nearWord: /\b(near|nearby|around|close to|within)\b/i,
  pincode: /\b\d{5,6}\b/,
} as const;

export type NearbySession = {
  kind: NearbyKind;
  lat: number;
  lng: number;
  radiusKm: number;
  results: NearbyPlace[];
  chunkIdx: number;
  expandIdx: number;
  openNowOnly: boolean;
  searchedAt: number;
};

export function useNearbyState() {
  const [nearbySession, setNearbySession] = useState<NearbySession | null>(null);
  const [nearbyBusy, setNearbyBusy] = useState(false);
  const nearbyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNearbySession = useCallback(() => {
    setNearbySession(null);
    if (nearbyTimerRef.current) clearTimeout(nearbyTimerRef.current);
  }, []);

  const startSessionTimer = useCallback(() => {
    if (nearbyTimerRef.current) clearTimeout(nearbyTimerRef.current);
    nearbyTimerRef.current = setTimeout(clearNearbySession, NEARBY_SESSION_TTL_MS);
  }, [clearNearbySession]);

  return {
    nearbySession,
    setNearbySession,
    nearbyBusy,
    setNearbyBusy,
    clearNearbySession,
    startSessionTimer,
    NEARBY_PATTERNS,
  };
}
