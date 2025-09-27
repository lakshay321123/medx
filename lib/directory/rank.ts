import type { DirectoryPlace } from "./types";

const METERS_FOR_FULL_DISTANCE_SCORE = 1000;
const METERS_FOR_ZERO_DISTANCE_SCORE = 5000;

function distanceScore(distance: number | null): number {
  if (distance == null || !Number.isFinite(distance)) return 0;
  if (distance <= METERS_FOR_FULL_DISTANCE_SCORE) return 1;
  if (distance >= METERS_FOR_ZERO_DISTANCE_SCORE) return 0;
  const range = METERS_FOR_ZERO_DISTANCE_SCORE - METERS_FOR_FULL_DISTANCE_SCORE;
  return 1 - (distance - METERS_FOR_FULL_DISTANCE_SCORE) / range;
}

function profileCompleteness(place: DirectoryPlace): number {
  let score = 0;
  if (place.phones.length > 0) score += 1;
  if (place.hours && Object.keys(place.hours).length > 0) score += 1;
  if (place.services.length > 0) score += 1;
  if (place.images.length > 0) score += 1;
  return score / 4;
}

export function rankPlace(place: DirectoryPlace): number {
  const ratingScore = place.rating ? Math.min(Math.max(place.rating / 5, 0), 1) : 0;
  const distanceComponent = distanceScore(place.distance_m);
  const openNowScore = place.open_now ? 1 : 0;
  const completeness = profileCompleteness(place);
  const reviewFreshness = place.last_checked ? 1 : 0;

  const w1 = 0.35;
  const w2 = 0.25;
  const w3 = 0.15;
  const w4 = 0.15;
  const w5 = 0.1;

  const score =
    w1 * distanceComponent +
    w2 * ratingScore +
    w3 * openNowScore +
    w4 * completeness +
    w5 * reviewFreshness;

  return Number(score.toFixed(4));
}
